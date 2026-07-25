import { useEffect, useState } from 'react'
import { Droplet, Cpu, Activity, Zap, Info, Server, Network, Sliders, RefreshCw, BarChart2, ShieldAlert, Layers, Battery, Fuel, Power, Thermometer, Gauge } from 'lucide-react'

function WaterComputePlanner() {
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  // 3D Visualizer States
  const [rotationAngle, setRotationAngle] = useState(45)
  const [dragStart, setDragStart] = useState(null)
  const [viewMode, setViewMode] = useState('3D') // '3D' or 'PLAN'
  const [activePipeType, setActivePipeType] = useState('ALL') // 'ALL', 'WATER', 'NETWORK'

  // Model & Estimator States
  const [modelSizeBillion, setModelSizeBillion] = useState(70) // 1B - 175B
  const [datasetSizeBillion, setDatasetSizeBillion] = useState(300) // 1B - 1000B
  const [targetDays, setTargetDays] = useState(14) // 1 - 60 days
  const [gpuModel, setGpuModel] = useState('H100') // 'H100', 'A100', 'L40S'

  // Cooling efficiency options (influences WUE)
  const [wueOptimized, setWueOptimized] = useState(true)
  const [displayLayer, setDisplayLayer] = useState('COMBINED') // 'COMBINED', 'SERVERS', 'PIPELINES'

  // Power & Backup system states
  const [genActive, setGenActive] = useState(false)
  const [batteryCharging, setBatteryCharging] = useState(true)
  const [powerTel, setPowerTel] = useState({
    upsLoad: 45, upsBattery: 87,
    genFuel: 92, genOutput: 0,
    batteryCharge: 78, batteryTemp: 32,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setPowerTel(prev => ({
        ...prev,
        upsLoad: Math.max(20, Math.min(95, prev.upsLoad + (Math.random() - 0.5) * 4)),
        upsBattery: Math.max(10, Math.min(100, prev.upsBattery + (Math.random() - 0.5) * 0.5)),
        genOutput: genActive ? 350 + Math.random() * 20 : 0,
        genFuel: genActive ? Math.max(5, prev.genFuel - 0.05) : prev.genFuel,
        batteryCharge: batteryCharging ? Math.min(100, prev.batteryCharge + 0.1) : Math.max(20, prev.batteryCharge - 0.15),
        batteryTemp: prev.batteryTemp + (Math.random() - 0.5) * 0.3,
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [genActive, batteryCharging])

  // Helper opacities for different layer highlights
  const getPipelineOpacity = () => {
    if (displayLayer === 'SERVERS') return 0.08;
    return 1.0;
  }

  const getServerOpacity = (obj) => {
    if (displayLayer === 'PIPELINES') {
      return obj.type === 'chiller' || obj.type === 'pump' || obj.type === 'scheduler' ? 0.35 : 0.08;
    }
    return 1.0;
  }

  // Default server layout for 3D visualizer
  const [serversList] = useState([
    { id: 'rack-gpu-0', name: 'GPU-HOST-01', x: 2, y: 2, type: 'gpu', label: 'ALPHA HOST' },
    { id: 'rack-gpu-1', name: 'GPU-HOST-02', x: 5, y: 2, type: 'gpu', label: 'BETA HOST' },
    { id: 'rack-scheduler', name: 'TASK SCHEDULER', x: 2, y: 5, type: 'scheduler', label: 'CONTROL CORE' },
    { id: 'rack-storage', name: 'NVMe ARRAY', x: 5, y: 5, type: 'storage', label: 'BLOCK STG' },
    { id: 'cooling-chiller', name: 'Cooling Loop Chiller', x: 3, y: 0, type: 'chiller', label: 'MAIN CHILLER' },
    { id: 'cooling-pump', name: 'Coolant Pump', x: 4, y: 0, type: 'pump', label: 'PRIMARY PUMP' }
  ])

  // WebSocket connection for real-time baseline values
  useEffect(() => {
    const wsUrl = 'ws://localhost:8000/ws/metrics'
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      try {
        const metrics = JSON.parse(event.data)
        setData(metrics)
      } catch (e) {
        console.error("WS error in Water Planner:", e)
      }
    }
    return () => ws.close()
  }, [])

  // Drag rotation handlers
  const handleMouseDown = (e) => {
    setDragStart({ x: e.clientX, angle: rotationAngle })
  }

  const handleMouseMove = (e) => {
    if (!dragStart) return
    const deltaX = e.clientX - dragStart.x
    let newAngle = (dragStart.angle + deltaX * 0.45) % 360
    if (newAngle < 0) newAngle += 360
    setRotationAngle(newAngle)
  }

  const handleMouseUp = () => {
    setDragStart(null)
  }

  // Math: Water Telemetry calculations
  const totalPowerKW = ((data?.physical_gpus?.reduce((acc, g) => acc + g.power_draw, 0) || 120) + 180) / 1000.0 // kW
  const baseWue = wueOptimized ? 0.28 : 0.45 // Liters per kWh
  const currentWUE = baseWue + (data?.physical_gpus?.[0]?.temperature > 70 ? 0.05 : 0) // elevated temps reduce cooling efficiency

  const waterConsumptionLPerHour = totalPowerKW * currentWUE
  const chillerFlowRateLPerMin = totalPowerKW * 1.5 * (wueOptimized ? 1.2 : 0.8)
  const evaporativeLossLPerHour = waterConsumptionLPerHour * 0.95
  const waterRecirculatedLPerHour = chillerFlowRateLPerMin * 60 - evaporativeLossLPerHour

  // Math: Compute Estimator calculations
  const gpuSpecs = {
    H100: { tflops: 350, powerW: 700, price: 30000, label: 'NVIDIA H100 SXM5 (80GB)' },
    A100: { tflops: 156, powerW: 400, price: 10000, label: 'NVIDIA A100 SXM4 (80GB)' },
    L40S: { tflops: 91, powerW: 350, price: 7000, label: 'NVIDIA L40S PCIe (48GB)' }
  }

  const selectedGpu = gpuSpecs[gpuModel]
  // FLOPs required for training = 6 * N * D (A common compute scaling estimation for Transformers)
  const totalFlopsRequired = 6 * modelSizeBillion * 1e9 * datasetSizeBillion * 1e9
  const mfuEfficiency = 0.30 // assume 30% Model FLOPs Utilization (typical training MFU)

  const secondsInTargetDays = targetDays * 24 * 3600
  const targetTflopsNeeded = totalFlopsRequired / (secondsInTargetDays * 1e12)
  const totalGpusNeeded = Math.ceil(targetTflopsNeeded / (selectedGpu.tflops * mfuEfficiency))
  
  // Group into 8-GPU server nodes
  const totalServersNeeded = Math.ceil(totalGpusNeeded / 8)
  const actualGpusAllocated = totalServersNeeded * 8

  // Estimator Power & Water
  const estimatedClusterPowerKW = (actualGpusAllocated * selectedGpu.powerW + totalServersNeeded * 450) / 1000.0
  const estimatedTotalMWh = (estimatedClusterPowerKW * targetDays * 24) / 1000.0
  const estimatedTotalWaterLiters = (estimatedTotalMWh * 1000) * baseWue

  // Math: Parallel computing metrics scaling list (Amdahl's law with network latency)
  const parallelFraction = 0.988 // 98.8% parallelizable workload
  const getSpeedupAndEfficiency = (nodes) => {
    // Amdahl's Law modified with communication scaling penalty
    const commPenalty = 0.0012 * Math.pow(nodes, 1.25) 
    const speedup = 1 / ((1 - parallelFraction) + (parallelFraction / nodes) + commPenalty)
    const efficiency = speedup / nodes
    return {
      nodes,
      gpus: nodes * 8,
      speedup: Math.min(nodes, speedup),
      efficiency: Math.max(0.1, Math.min(1.0, efficiency))
    }
  }

  const scalingData = [1, 2, 4, 8, 16, 32, 64].map(nodes => getSpeedupAndEfficiency(nodes))

  // Coordinate Projection Equations
  const spacingX = 35
  const spacingY = 17.5
  const cabinetHeight = 55
  const centerX = 440
  const centerY = 140

  const getIsoCoordinates = (x, y) => {
    const theta = rotationAngle * Math.PI / 180
    const dx = x - 3.5
    const dy = y - 3.5
    const rx = dx * Math.cos(theta) - dy * Math.sin(theta)
    const ry = dx * Math.sin(theta) + dy * Math.cos(theta)
    
    const isoX = (rx - ry) * spacingX + centerX
    const isoY = (rx + ry) * spacingY + centerY
    return { x: isoX, y: isoY }
  }

  const getBoxVertices = (x, y) => {
    const p1 = getIsoCoordinates(x, y)
    const p2 = getIsoCoordinates(x + 1, y)
    const p3 = getIsoCoordinates(x + 1, y + 1)
    const p4 = getIsoCoordinates(x, y + 1)
    
    const corners = [p1, p2, p3, p4]
    const vL = corners.reduce((min, p) => p.x < min.x ? p : min, corners[0])
    const vR = corners.reduce((max, p) => p.x > max.x ? p : max, corners[0])
    const vT = corners.reduce((min, p) => p.y < min.y ? p : min, corners[0])
    const vB = corners.reduce((max, p) => p.y > max.y ? p : max, corners[0])
    
    return { vL, vR, vT, vB }
  }

  const sortedTiles = []
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      sortedTiles.push({ x, y, depthY: getIsoCoordinates(x, y).y })
    }
  }
  sortedTiles.sort((a, b) => a.depthY - b.depthY)

  const sortedCabinets = serversList.map(o => ({
    ...o,
    depthY: getIsoCoordinates(o.x, o.y).y
  }))
  sortedCabinets.sort((a, b) => a.depthY - b.depthY)

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#070b0e', minHeight: '100%', color: '#c9d1d9' }}>
      
      {/* Styles for animated flow pipelines */}
      <style>{`
        @keyframes water-flow-cold {
          to { stroke-dashoffset: -30; }
        }
        @keyframes water-flow-hot {
          to { stroke-dashoffset: 30; }
        }
        @keyframes network-activity {
          to { stroke-dashoffset: -40; }
        }
        .water-cold-pipe {
          stroke-dasharray: 6, 4;
          animation: water-flow-cold 1s linear infinite;
        }
        .water-hot-pipe {
          stroke-dasharray: 6, 4;
          animation: water-flow-hot 1.2s linear infinite;
        }
        .network-link-pipe {
          stroke-dasharray: 5, 5;
          animation: network-activity 0.8s linear infinite;
        }
        .flow-btn-active {
          background: rgba(118, 185, 0, 0.2);
          border: 1px solid var(--accent);
          color: var(--accent);
        }
        .flow-btn-inactive {
          background: var(--gray);
          border: 1px solid var(--border);
          color: #fff;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.05em' }}>ENVIRONMENTAL & RESOURCE PLANNING CONTROL</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>Water Consumption & Parallel Compute Planner</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Display Layer Selector (Segmented buttons) */}
          <div style={{ display: 'flex', background: 'var(--gray)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            {[
              { id: 'COMBINED', name: 'Combined', icon: Layers },
              { id: 'SERVERS', name: 'Hardware', icon: Server },
              { id: 'PIPELINES', name: 'Pipelines', icon: Network }
            ].map(layer => {
              const Icon = layer.icon;
              const isSelected = displayLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setDisplayLayer(layer.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '3px',
                    border: 'none',
                    background: isSelected ? 'rgba(118, 185, 0, 0.15)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Icon size={12} />
                  {layer.name}
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => setViewMode(viewMode === '3D' ? 'PLAN' : '3D')}
            style={{ padding: '0.35rem 0.75rem', background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
          >
            VIEW: {viewMode}
          </button>
          
          <button 
            onClick={() => setWueOptimized(!wueOptimized)}
            style={{ padding: '0.35rem 0.75rem', background: wueOptimized ? 'rgba(6, 182, 212, 0.2)' : 'var(--gray)', border: wueOptimized ? '1px solid #06b6d4' : '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: wueOptimized ? '#06b6d4' : '#fff' }}
          >
            WUE BOOST: {wueOptimized ? 'OPTIMIZED' : 'STANDARD'}
          </button>
        </div>
      </div>

      {/* Layout Split: Left 3D Loop visualizer, Right Water Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '1.5rem' }}>
        
        {/* 3D Visualizer Room */}
        <div 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            position: 'relative', 
            height: '350px', 
            background: '#0e141a', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '8px', 
            overflow: 'hidden',
            cursor: dragStart ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          {/* Overlay Filter Buttons */}
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.35rem', zIndex: 10 }}>
            {['ALL', 'WATER', 'NETWORK'].map(t => (
              <button 
                key={t}
                onClick={() => setActivePipeType(t)}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 800, cursor: 'pointer' }}
                className={activePipeType === t ? 'flow-btn-active' : 'flow-btn-inactive'}
              >
                {t} FLOWS
              </button>
            ))}
          </div>

          <div style={{ position: 'absolute', top: '0.75rem', left: '1rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            <span> 3D COOLANT LOOPS & DATA BACKBONES</span>
          </div>

          <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            
            {/* Draw Floor Tiles */}
            {sortedTiles.map(tile => {
              const { x: isoX, y: isoY } = getIsoCoordinates(tile.x, tile.y)
              return (
                <polygon
                  key={`tile-${tile.x}-${tile.y}`}
                  points={`${isoX},${isoY} ${isoX + spacingX},${isoY + spacingY} ${isoX},${isoY + 2*spacingY} ${isoX - spacingX},${isoY + spacingY}`}
                  fill="#11161d"
                  stroke="#1b222d"
                  strokeWidth="0.8"
                />
              )
            })}

            {/* COOLANT PIPE LINES (Liquid Flow Paths) */}
            {(activePipeType === 'ALL' || activePipeType === 'WATER') && (
              <g style={{ opacity: getPipelineOpacity(), transition: 'opacity 0.25s' }}>
                {/* Cold water pipe running from Pump (4,0) to compute hosts (2,2) and (5,2) */}
                <path 
                  d={`M ${getIsoCoordinates(3, 0).x} ${getIsoCoordinates(3, 0).y + spacingY} 
                      L ${getIsoCoordinates(3, 2).x} ${getIsoCoordinates(3, 2).y + spacingY} 
                      L ${getIsoCoordinates(2, 2).x + spacingX / 2} ${getIsoCoordinates(2, 2).y + spacingY}`}
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="3.5" 
                  className="water-cold-pipe" 
                />
                <path 
                  d={`M ${getIsoCoordinates(3, 2).x} ${getIsoCoordinates(3, 2).y + spacingY} 
                      L ${getIsoCoordinates(5, 2).x - spacingX / 2} ${getIsoCoordinates(5, 2).y + spacingY}`}
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="3.5" 
                  className="water-cold-pipe" 
                />

                {/* Hot water pipe running from compute hosts back to Chiller (3,0) */}
                <path 
                  d={`M ${getIsoCoordinates(2, 2).x} ${getIsoCoordinates(2, 2).y + spacingY * 1.5} 
                      L ${getIsoCoordinates(2, 3).x} ${getIsoCoordinates(2, 3).y}
                      L ${getIsoCoordinates(4, 3).x} ${getIsoCoordinates(4, 3).y}
                      L ${getIsoCoordinates(4, 0).x} ${getIsoCoordinates(4, 0).y + spacingY}`}
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="3.5" 
                  className="water-hot-pipe" 
                />
                <path 
                  d={`M ${getIsoCoordinates(5, 2).x} ${getIsoCoordinates(5, 2).y + spacingY * 1.5} 
                      L ${getIsoCoordinates(5, 3).x} ${getIsoCoordinates(5, 3).y}
                      L ${getIsoCoordinates(4, 3).x} ${getIsoCoordinates(4, 3).y}`}
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="3.5" 
                  className="water-hot-pipe" 
                />
              </g>
            )}

            {/* NETWORK DATA BACKBONE LINES */}
            {(activePipeType === 'ALL' || activePipeType === 'NETWORK') && (
              <g style={{ opacity: getPipelineOpacity(), transition: 'opacity 0.25s' }}>
                {/* Network bus lines connecting compute/storage to scheduler control node */}
                <path 
                  d={`M ${getIsoCoordinates(2, 5).x} ${getIsoCoordinates(2, 5).y + spacingY} 
                      L ${getIsoCoordinates(2, 2).x} ${getIsoCoordinates(2, 2).y + spacingY * 1.5}`}
                  fill="none" 
                  stroke="#eab308" 
                  strokeWidth="2.5" 
                  className="network-link-pipe" 
                />
                <path 
                  d={`M ${getIsoCoordinates(2, 5).x} ${getIsoCoordinates(2, 5).y + spacingY} 
                      L ${getIsoCoordinates(5, 2).x} ${getIsoCoordinates(5, 2).y + spacingY * 1.5}`}
                  fill="none" 
                  stroke="#eab308" 
                  strokeWidth="2.5" 
                  className="network-link-pipe" 
                />
                <path 
                  d={`M ${getIsoCoordinates(2, 5).x} ${getIsoCoordinates(2, 5).y + spacingY} 
                      L ${getIsoCoordinates(5, 5).x} ${getIsoCoordinates(5, 5).y + spacingY}`}
                  fill="none" 
                  stroke="#eab308" 
                  strokeWidth="2.5" 
                  className="network-link-pipe" 
                />
              </g>
            )}

            {/* Draw 3D Cabinets and Chillers */}
            {viewMode === '3D' ? (
              sortedCabinets.map(obj => {
                const { vL, vR, vT, vB } = getBoxVertices(obj.x, obj.y)
                const H = obj.type === 'chiller' || obj.type === 'pump' ? 35 : cabinetHeight
                
                const tvL = { x: vL.x, y: vL.y - H }
                const tvR = { x: vR.x, y: vR.y - H }
                const tvT = { x: vT.x, y: vT.y - H }
                const tvB = { x: vB.x, y: vB.y - H }

                let fillFace = 'rgba(26, 38, 51, 0.75)'
                let strokeFace = '#2c3e50'
                let glowColor = 'var(--accent)'

                if (obj.type === 'chiller') {
                  fillFace = 'rgba(6, 182, 212, 0.65)'
                  strokeFace = '#06b6d4'
                  glowColor = '#06b6d4'
                } else if (obj.type === 'pump') {
                  fillFace = 'rgba(59, 130, 246, 0.65)'
                  strokeFace = '#3b82f6'
                  glowColor = '#3b82f6'
                } else if (obj.type === 'gpu') {
                  fillFace = 'rgba(16, 185, 129, 0.6)'
                  strokeFace = '#10b981'
                  glowColor = '#10b981'
                } else if (obj.type === 'storage') {
                  fillFace = 'rgba(245, 158, 11, 0.55)'
                  strokeFace = '#f59e0b'
                  glowColor = '#f59e0b'
                } else {
                  fillFace = 'rgba(168, 85, 247, 0.55)'
                  strokeFace = '#a855f7'
                  glowColor = '#a855f7'
                }

                return (
                  <g key={obj.id} style={{ opacity: getServerOpacity(obj), transition: 'opacity 0.25s' }}>
                    {/* Shadow base */}
                    <polygon points={`${vL.x},${vL.y} ${vB.x},${vB.y} ${tvB.x},${tvB.y} ${tvL.x},${tvL.y}`} fill={fillFace} stroke={strokeFace} strokeWidth="1" />
                    <polygon points={`${vR.x},${vR.y} ${vB.x},${vB.y} ${tvB.x},${tvB.y} ${tvR.x},${tvR.y}`} fill={fillFace} stroke={strokeFace} strokeWidth="1" />
                    <polygon points={`${tvL.x},${tvL.y} ${tvT.x},${tvT.y} ${tvR.x},${tvR.y} ${tvB.x},${tvB.y}`} fill={fillFace} stroke={strokeFace} strokeWidth="1" />
                    
                    {/* Visual details on server face */}
                    {obj.type !== 'chiller' && obj.type !== 'pump' && (
                      <>
                        <line x1={vB.x + (vR.x - vB.x)*0.3} y1={vB.y + (vR.y - vB.y)*0.3 - H*0.3} x2={vB.x + (vR.x - vB.x)*0.7} y2={vB.y + (vR.y - vB.y)*0.7 - H*0.3} stroke={glowColor} strokeWidth="2" />
                        <line x1={vB.x + (vR.x - vB.x)*0.3} y1={vB.y + (vR.y - vB.y)*0.3 - H*0.6} x2={vB.x + (vR.x - vB.x)*0.7} y2={vB.y + (vR.y - vB.y)*0.7 - H*0.6} stroke={glowColor} strokeWidth="2" />
                      </>
                    )}
                  </g>
                )
              })
            ) : (
              // Plan View polygons
              sortedCabinets.map(obj => {
                const { vL, vR, vT, vB } = getBoxVertices(obj.x, obj.y)
                let blockColor = '#475569'
                if (obj.type === 'chiller' || obj.type === 'pump') blockColor = '#06b6d4'
                else if (obj.type === 'gpu') blockColor = 'var(--accent)'
                else if (obj.type === 'storage') blockColor = '#f59e0b'
                else blockColor = '#a855f7'

                return (
                  <polygon
                    key={obj.id}
                    points={`${vL.x},${vL.y} ${vT.x},${vT.y} ${vR.x},${vR.y} ${vB.x},${vB.y}`}
                    fill={blockColor}
                    stroke="#fff"
                    strokeWidth="0.5"
                    style={{ opacity: getServerOpacity(obj) * 0.8, transition: 'opacity 0.25s' }}
                  />
                )
              })
            )}

          </svg>
        </div>

        {/* Real-time Environmental Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #06b6d4', borderRadius: '4px', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>WATER CONSUMPTION</span>
              <Droplet size={14} color="#06b6d4" />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {waterConsumptionLPerHour.toFixed(2)} L/hr
            </div>
            <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
               WUE: {currentWUE.toFixed(3)} L/kWh | Evaporated: {evaporativeLossLPerHour.toFixed(2)} L/hr
            </div>
          </div>

          <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #3b82f6', borderRadius: '4px', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>COOLANT RECIRCULATION</span>
              <RefreshCw size={14} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {(chillerFlowRateLPerMin * 60).toFixed(0)} L/hr
            </div>
            <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
              Recirculated Coolant flow rate: {chillerFlowRateLPerMin.toFixed(1)} L/min
            </div>
          </div>

          <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid var(--accent)', borderRadius: '4px', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>IT THERMAL LOAD</span>
              <Zap size={14} color="var(--accent)" />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {(totalPowerKW).toFixed(3)} kW
            </div>
            <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
              Heat dissipated directly to secondary loops.
            </div>
          </div>

        </div>

      </div>

      {/* Power & Backup Systems Monitoring */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        
        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #f97316', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>UPS SYSTEM</span>
            <Power size={14} color="#f97316" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{powerTel.upsLoad.toFixed(0)}%</div>
          <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
            Load: {powerTel.upsLoad.toFixed(0)}% | Battery: {powerTel.upsBattery.toFixed(0)}% | 500 kVA
          </div>
          <div style={{ height: '4px', background: '#0a0f14', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${powerTel.upsLoad}%`, background: powerTel.upsLoad > 80 ? '#ef4444' : '#f97316', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
        </div>

        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #ef4444', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>BACKUP GENERATOR</span>
            <Fuel size={14} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: genActive ? '#ef4444' : '#22c55e' }}>{genActive ? 'ACTIVE' : 'STANDBY'}</div>
          <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
            Fuel: {powerTel.genFuel.toFixed(0)}% | Output: {powerTel.genOutput.toFixed(0)} kW
          </div>
          <button onClick={() => setGenActive(!genActive)}
            style={{ marginTop: '0.4rem', padding: '3px 10px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer', background: genActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)', border: `1px solid ${genActive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`, color: genActive ? '#ef4444' : '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {genActive ? 'DEACTIVATE' : 'ACTIVATE'}
          </button>
        </div>

        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #06b6d4', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>BATTERY STORAGE</span>
            <Battery size={14} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{powerTel.batteryCharge.toFixed(0)}%</div>
          <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
            Temp: {powerTel.batteryTemp.toFixed(1)}°C | {batteryCharging ? 'CHARGING' : 'DISCHARGING'} | 2.4 MWh LFP
          </div>
          <button onClick={() => setBatteryCharging(!batteryCharging)}
            style={{ marginTop: '0.4rem', padding: '3px 10px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer', background: batteryCharging ? 'rgba(6,182,212,0.1)' : 'rgba(249,115,22,0.1)', border: `1px solid ${batteryCharging ? 'rgba(6,182,212,0.3)' : 'rgba(249,115,22,0.3)'}`, color: batteryCharging ? '#22d3ee' : '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {batteryCharging ? 'DISCHARGE' : 'CHARGE'}
          </button>
        </div>

        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid var(--accent)', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b949e' }}>POWER USAGE EFFECTIVENESS</span>
            <Gauge size={14} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            {((totalPowerKW * 1000 + powerTel.upsLoad * 5 + powerTel.genOutput) / (totalPowerKW * 1000 + 1) * 0.92).toFixed(3)}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '0.25rem' }}>
            pPUE | Site Power: {(totalPowerKW + (powerTel.upsLoad * 5 + powerTel.genOutput) / 1000).toFixed(2)} kW
          </div>
        </div>

      </div>

      {/* Interactive AI Computing Resource Estimator */}
      <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
          <Sliders size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: 0 }}>AI Computing & Scalability Estimator</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
          
          {/* Controls Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', fontSize: '0.75rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#8b949e', marginBottom: '0.35rem' }}>GPU Architecture Model</label>
                <select 
                  value={gpuModel} 
                  onChange={e => setGpuModel(e.target.value)}
                  style={{ width: '100%', padding: '0.35rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="H100">NVIDIA H100 SXM5 (350 TFLOPS, 700W)</option>
                  <option value="A100">NVIDIA A100 SXM4 (156 TFLOPS, 400W)</option>
                  <option value="L40S">NVIDIA L40S PCIe (91 TFLOPS, 350W)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#8b949e', marginBottom: '0.35rem' }}>Training Deadline</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="range" min="1" max="60" value={targetDays} 
                    onChange={e => setTargetDays(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontWeight: 800, width: '45px', textAlign: 'right' }}>{targetDays} days</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', marginBottom: '0.35rem' }}>
                <span>AI Model Parameter Size</span>
                <span style={{ color: '#fff', fontWeight: 800 }}>{modelSizeBillion} Billion Parameters</span>
              </div>
              <input 
                type="range" min="1" max="175" value={modelSizeBillion} 
                onChange={e => setModelSizeBillion(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', marginBottom: '0.35rem' }}>
                <span>Dataset Size</span>
                <span style={{ color: '#fff', fontWeight: 800 }}>{datasetSizeBillion} Billion Tokens</span>
              </div>
              <input 
                type="range" min="10" max="1000" step="10" value={datasetSizeBillion} 
                onChange={e => setDatasetSizeBillion(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div style={{ background: 'rgba(234, 179, 8, 0.04)', border: '1px solid rgba(234, 179, 8, 0.1)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Info size={14} color="#eab308" />
              <span>
                Calculated compute footprint: <strong>{(totalFlopsRequired / 1e24).toFixed(3)} YottaFLOPs</strong> ($6 \times N \times D$). Estimated at 30% MFU efficiency.
              </span>
            </div>

          </div>

          {/* Compute Outputs card */}
          <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.7rem' }}>
            
            <div style={{ fontSize: '0.75rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem', color: 'var(--accent)' }}>
              RESOURCE PLANNER OUTPUT
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#0a0f14', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <span style={{ color: '#8b949e', fontSize: '0.55rem', display: 'block' }}>REQUIRED GPU CARDS</span>
                <strong style={{ fontSize: '1rem', color: '#fff' }}>{totalGpusNeeded} GPUs</strong>
              </div>
              <div style={{ background: '#0a0f14', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <span style={{ color: '#8b949e', fontSize: '0.55rem', display: 'block' }}>SERVER CABINETS (8-GPU)</span>
                <strong style={{ fontSize: '1rem', color: '#fff' }}>{totalServersNeeded} Servers</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8b949e' }}>Peak Cluster Power</span>
                <span style={{ fontWeight: 700 }}>{estimatedClusterPowerKW.toFixed(1)} kW</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8b949e' }}>Total Energy Consumed</span>
                <span style={{ fontWeight: 700 }}>{estimatedTotalMWh.toFixed(2)} MWh</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06b6d4' }}>
                <span>Estimated Water Footprint</span>
                <span style={{ fontWeight: 700 }}>{estimatedTotalWaterLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8b949e' }}>Hardware Budget Cost</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${(actualGpusAllocated * selectedGpu.price).toLocaleString()}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Dynamic Parallel Scaling Metrics Table */}
      <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network size={16} color="var(--accent)" />
          Parallel Scale Efficiency Metrics (Amdahl's Law + Network Communication Loss)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#8b949e' }}>
                <th style={{ padding: '0.5rem' }}>Cabinet Nodes</th>
                <th style={{ padding: '0.5rem' }}>GPU Core Count</th>
                <th style={{ padding: '0.5rem' }}>Ideal Speedup</th>
                <th style={{ padding: '0.5rem' }}>Calculated Speedup</th>
                <th style={{ padding: '0.5rem' }}>Scale Efficiency</th>
                <th style={{ padding: '0.5rem' }}>Network Overhead Loss</th>
              </tr>
            </thead>
            <tbody>
              {scalingData.map((d, index) => {
                const ideal = d.nodes
                const lossPct = (1 - d.efficiency) * 100
                return (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 800 }}>{d.nodes} Node(s)</td>
                    <td style={{ padding: '0.5rem' }}>{d.gpus} Cores</td>
                    <td style={{ padding: '0.5rem', color: '#8b949e' }}>{ideal.toFixed(1)}x</td>
                    <td style={{ padding: '0.5rem', color: 'var(--accent)', fontWeight: 700 }}>{d.speedup.toFixed(2)}x</td>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '6px', background: '#11161d', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${d.efficiency * 100}%`, height: '100%', background: d.efficiency > 0.8 ? 'var(--accent)' : d.efficiency > 0.6 ? 'var(--yellow)' : 'var(--red)' }} />
                        </div>
                        <span>{(d.efficiency * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', color: lossPct > 20 ? 'var(--red)' : '#8b949e' }}>
                      {lossPct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default WaterComputePlanner
