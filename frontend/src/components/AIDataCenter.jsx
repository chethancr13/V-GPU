import { useEffect, useState } from 'react'
import { Server, Database, Activity, Play, Terminal, Cpu, Network, Layers, RefreshCw, Send, Square, Check, AlertTriangle, Shield, CheckCircle } from 'lucide-react'

function AIDataCenter() {
  const [data, setData] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [scripts, setScripts] = useState([])
  
  // Custom server list state (initialized with defaults matching physical + logic topology)
  const [serversList, setServersList] = useState([
    { id: 'rack-gpu-0', name: 'GPU-HOST-01', x: 2, y: 2, type: 'gpu', gpuId: 0, label: 'ALPHA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350, initialTemp: 40 },
    { id: 'rack-gpu-1', name: 'GPU-HOST-02', x: 5, y: 2, type: 'gpu', gpuId: 1, label: 'BETA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350, initialTemp: 40 },
    { id: 'rack-scheduler', name: 'TASK SCHEDULER', x: 2, y: 5, type: 'scheduler', label: 'CONTROL CORE' },
    { id: 'rack-storage', name: 'NVMe ARRAY', x: 5, y: 5, type: 'storage', label: 'BLOCK STG' },
    { id: 'vent-01', name: 'Floor Vent 1', x: 2, y: 3, type: 'vent' },
    { id: 'vent-02', name: 'Floor Vent 2', x: 5, y: 3, type: 'vent' },
    { id: 'vent-03', name: 'Floor Vent 3', x: 3, y: 4, type: 'vent' },
    { id: 'vent-04', name: 'Floor Vent 4', x: 6, y: 4, type: 'vent' },
    { id: 'crac-01', name: 'CRAC Unit A', x: 0, y: 3, type: 'crac' },
    { id: 'crac-02', name: 'CRAC Unit B', x: 7, y: 3, type: 'crac' }
  ])

  // Drag-to-rotate states
  const [rotationAngle, setRotationAngle] = useState(45) // Continuous orbit rotation (0 to 360 deg)
  const [dragStart, setDragStart] = useState(null) // Drag details tracking: { x, angle }
  
  // View states
  const [viewMode, setViewMode] = useState('3D') // '3D' or 'PLAN'
  const [hubTab, setHubTab] = useState('SITES') // Bottom drawer tab selection
  const [activeTab, setActiveTab] = useState(null) // Currently inspected blade: { type, id }

  // Provision builder states
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provName, setProvName] = useState('GPU-NODE-03')
  const [provType, setProvType] = useState('gpu')
  const [provX, setProvX] = useState(2)
  const [provY, setProvY] = useState(4)
  const [provModel, setProvModel] = useState('NVIDIA A100 SXM (80GB)')
  const [provPower, setProvPower] = useState(300)
  const [provError, setProvError] = useState('')

  // Stress state trackers (supports both physical indexes and custom string IDs)
  const [gpuStressStates, setGpuStressStates] = useState({ 0: false, 1: false })
  const [isConnected, setIsConnected] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)

  // Custom server metrics simulation
  const [customTelemetry, setCustomTelemetry] = useState({})
  
  // Job execution form inside Scheduler inspector
  const [selectedScript, setSelectedScript] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [selectedVgpu, setSelectedVgpu] = useState('ALL_FLEET')
  const [dispatchMessage, setDispatchMessage] = useState('')

  // Cooling Advisor Interactive States
  const [vent5Replaced, setVent5Replaced] = useState(false)
  const [cracPumpHigh, setCracPumpHigh] = useState(false)
  const [allocationDefragged, setAllocationDefragged] = useState(false)

  // Load backend metrics and lists
  useEffect(() => {
    // 1. WebSocket Telemetry
    const wsUrl = 'ws://localhost:8000/ws/metrics'
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      try {
        const metrics = JSON.parse(event.data)
        setData(metrics)
      } catch (e) {
        console.error("WS error in Data Center:", e)
      }
    }

    // 2. Fetch Lists
    fetch('http://localhost:8000/api/datasets')
      .then(r => r.json())
      .then(res => {
        setDatasets(res.datasets || [])
        if (res.datasets?.length > 0) setSelectedDataset(res.datasets[0])
      })
      .catch(e => console.error(e))

    fetch('http://localhost:8000/api/scripts')
      .then(r => r.json())
      .then(res => {
        setScripts(res.scripts || [])
        if (res.scripts?.length > 0) setSelectedScript(res.scripts[0])
      })
      .catch(e => console.error(e))

    return () => ws.close()
  }, [])

  // Custom telemetries loop for custom servers
  useEffect(() => {
    const interval = setInterval(() => {
      setCustomTelemetry(prev => {
        const next = { ...prev }
        serversList.forEach(obj => {
          if (obj.type === 'gpu' && obj.gpuId && obj.gpuId.toString().startsWith('custom_')) {
            const isStressed = gpuStressStates[obj.gpuId]
            const baseTemp = obj.initialTemp || 38
            const maxPwr = obj.powerLimit || 300
            
            // Random noise
            const noiseUtil = Math.random() * 2
            const noiseTemp = Math.random() * 0.8 - 0.4
            
            if (isStressed) {
              next[obj.gpuId] = {
                gpu_utilization: 95.0 + Math.random() * 2,
                power_draw: maxPwr * 0.9 + Math.random() * 8,
                temperature: baseTemp + 44.0 + noiseTemp
              }
            } else {
              next[obj.gpuId] = {
                gpu_utilization: 0.5 + noiseUtil,
                power_draw: 42.0 + Math.random() * 4,
                temperature: baseTemp + noiseTemp
              }
            }
          }
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [serversList, gpuStressStates])

  // Drag Orbit Events
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

  const handleTouchStart = (e) => {
    if (e.touches[0]) {
      setDragStart({ x: e.touches[0].clientX, angle: rotationAngle })
    }
  }

  const handleTouchMove = (e) => {
    if (!dragStart || !e.touches[0]) return
    const deltaX = e.touches[0].clientX - dragStart.x
    let newAngle = (dragStart.angle + deltaX * 0.45) % 360
    if (newAngle < 0) newAngle += 360
    setRotationAngle(newAngle)
  }

  // Deploy Cabinet Form Submit
  const handleDeployCabinet = async () => {
    setProvError('')
    
    // Convert coordinate inputs
    const targetX = parseInt(provX)
    const targetY = parseInt(provY)
    
    // Check occupancy collision
    const occupied = serversList.find(o => o.x === targetX && o.y === targetY)
    if (occupied) {
      setProvError(` Cell (${targetX}, ${targetY}) is already occupied by ${occupied.name}.`)
      return
    }

    const name = provName || `CUSTOM-CABINET-${serversList.length}`
    let gpuId = null

    if (provType === 'gpu') {
      try {
        const response = await fetch('http://localhost:8000/api/gpu/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            vram_mb: provModel.includes('80GB') ? 81920 : provModel.includes('48GB') ? 49152 : 32768,
            compute_limit: 100.0
          })
        })
        if (!response.ok) {
          throw new Error('Backend registration failed')
        }
        const resData = await response.json()
        gpuId = resData.gpu_id
      } catch (err) {
        setProvError(' Failed to register physical GPU on backend: ' + err.message)
        return
      }
    }

    const customId = `rack-custom-${Date.now()}`
    
    const newCabinet = {
      id: customId,
      name: name,
      x: targetX,
      y: targetY,
      type: provType,
      label: provType === 'gpu' ? 'CUSTOM GPU' : provType === 'storage' ? 'CUSTOM STG' : 'CUSTOM CRAC',
      model: provType === 'gpu' ? provModel : '',
      powerLimit: provType === 'gpu' ? parseInt(provPower) : 350,
      gpuId: gpuId,
      initialTemp: 38
    }

    // Deploy
    setServersList([...serversList, newCabinet])
    setIsProvisioning(false)
    setProvName(`GPU-NODE-0${serversList.filter(o => o.type==='gpu').length + 1}`)
  }

  // Action: Toggle Stress (supports physical backend toggle & custom local simulation toggle)
  const handleToggleStress = async (gpuId) => {
    const isCustom = typeof gpuId === 'string' && gpuId.startsWith('custom_')
    const nextStressState = !gpuStressStates[gpuId]
    
    if (isCustom) {
      setGpuStressStates(prev => ({ ...prev, [gpuId]: nextStressState }))
    } else {
      try {
        const res = await fetch(`http://localhost:8000/api/gpu/${gpuId}/stress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stress: nextStressState })
        })
        const result = await res.json()
        if (result.status === 'success') {
          setGpuStressStates(prev => ({ ...prev, [gpuId]: nextStressState }))
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Action: Dispatch Job from Scheduler Inspector
  const handleDispatchJob = async () => {
    setIsDispatching(true)
    setDispatchMessage('Initializing container sandbox...')
    
    // Check if custom GPU target is chosen, run simulated execution loop
    if (selectedVgpu && selectedVgpu.toString().startsWith('custom_')) {
      await new Promise(r => setTimeout(r, 1500))
      setDispatchMessage(` [Custom Node] Dispatch success! Trained model on custom cluster. Accuracy: ${(90 + Math.random()*8).toFixed(2)}%, Speed: ${(300 + Math.random()*200).toFixed(0)} samples/sec.`)
      setIsDispatching(false)
      return
    }

    try {
      const res = await fetch('http://localhost:8000/api/jobs/ml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vgpu_id: selectedVgpu,
          script_name: selectedScript,
          dataset_name: selectedDataset || null
        })
      })
      const result = await res.json()
      if (result.status === 'completed') {
        setDispatchMessage(` Dispatch success! Accuracy: ${result.accuracy?.toFixed(2)}%, Speed: ${result.speed?.toFixed(0)} samples/sec.`)
      } else {
        setDispatchMessage(' Execution terminated with system code exception.')
      }
    } catch (err) {
      setDispatchMessage(' Connection error to FastAPI scheduler.')
    } finally {
      setIsDispatching(false)
    }
  }

  // Physical backend structures
  // Count custom CRAC units deployed
  const customCracCount = serversList.filter(o => o.type === 'crac' && o.id.startsWith('rack-custom-')).length

  // Cooling advisor offset calculations
  const coolingOffset = (vent5Replaced ? 4.5 : 0) + (cracPumpHigh ? 6.0 : 0) + (allocationDefragged ? 2.0 : 0) + (customCracCount * 3.8)

  // Get dynamic GPU temperature
  const getGpuTemperature = (gpuId) => {
    if (gpuId === null || gpuId === undefined) return 38
    if (gpuId.toString().startsWith('custom_')) {
      return customTelemetry[gpuId]?.temperature || 38
    }
    const gpuBack = data?.physical_gpus?.[gpuId]
    const baseTemp = gpuBack ? gpuBack.temperature : 40
    return Math.max(30, baseTemp - coolingOffset)
  }

  // Dynamic avg temp calculations
  const physicalGpuTemps = (data?.physical_gpus || []).map((gpu, i) => {
    return Math.max(30, gpu.temperature - coolingOffset)
  })
  if (physicalGpuTemps.length === 0) {
    physicalGpuTemps.push(Math.max(30, 40 - coolingOffset))
    physicalGpuTemps.push(Math.max(30, 40 - coolingOffset))
  }
  const avgTemp = physicalGpuTemps.reduce((acc, t) => acc + t, 0) / physicalGpuTemps.length

  // Compile loads with custom servers factored in
  let totalGpuPowerDraw = 0
  if (data?.physical_gpus && data.physical_gpus.length > 0) {
    totalGpuPowerDraw = data.physical_gpus.reduce((acc, g) => acc + g.power_draw, 0)
  } else {
    // default baseline power draw when WS is disconnected
    totalGpuPowerDraw = 100
  }
  serversList.forEach(obj => {
    if (obj.type === 'gpu' && obj.gpuId && obj.gpuId.toString().startsWith('custom_')) {
      const tel = customTelemetry[obj.gpuId] || { power_draw: 45 }
      totalGpuPowerDraw += tel.power_draw
    }
  })

  const activeJobs = data?.scheduler?.active_jobs || 0
  const queueLength = data?.scheduler?.queue_length || 0
  const itDcLoad = totalGpuPowerDraw + 120 // Base power draw
  const itAcLoad = activeJobs * 25 + queueLength * 8 + 310
  const coolingPower = (avgTemp * 4.2) + (cracPumpHigh ? 160 : 75) + (customCracCount * 45)
  const totalSitePower = itDcLoad + itAcLoad + coolingPower

  // Coordinate Projection Equations
  const spacingX = 35
  const spacingY = 17.5
  const cabinetHeight = 55
  const centerX = 440
  const centerY = 140

  const getIsoCoordinates = (x, y) => {
    // Project and rotate relative to grid center (3.5, 3.5)
    const theta = rotationAngle * Math.PI / 180
    const dx = x - 3.5
    const dy = y - 3.5
    
    const rx = dx * Math.cos(theta) - dy * Math.sin(theta)
    const ry = dx * Math.sin(theta) + dy * Math.cos(theta)
    
    const isoX = (rx - ry) * spacingX + centerX
    const isoY = (rx + ry) * spacingY + centerY
    return { x: isoX, y: isoY }
  }

  // Get dynamic boundary vertices for rotated cabinets
  const getBoxVertices = (x, y) => {
    const p1 = getIsoCoordinates(x, y)
    const p2 = getIsoCoordinates(x + 1, y)
    const p3 = getIsoCoordinates(x + 1, y + 1)
    const p4 = getIsoCoordinates(x, y + 1)
    
    const corners = [p1, p2, p3, p4]
    
    // Sort to identify leftmost, rightmost, topmost, and bottommost on screen
    const vL = corners.reduce((min, p) => p.x < min.x ? p : min, corners[0])
    const vR = corners.reduce((max, p) => p.x > max.x ? p : max, corners[0])
    const vT = corners.reduce((min, p) => p.y < min.y ? p : min, corners[0])
    const vB = corners.reduce((max, p) => p.y > max.y ? p : max, corners[0])
    
    return { vL, vR, vT, vB }
  }

  const inspected = activeTab ? (serversList.find(s => s.id === activeTab.id) || null) : null
  const inspectedBlade = inspected
  const inspectedRack = inspected // Matches object topology

  // Top level definitions for inspected items (for safety)
  const gpuId = inspectedBlade?.type === 'gpu' ? inspectedBlade.gpuId : null
  const isCustomGpu = gpuId !== null && gpuId.toString().startsWith('custom_')
  
  let gpuMetrics = { gpu_utilization: 0, memory_used: 0, memory_total: 32768, temperature: 40, power_draw: 50 }
  if (gpuId !== null) {
    if (isCustomGpu) {
      gpuMetrics = customTelemetry[gpuId] || { gpu_utilization: 1.0, memory_used: 4096, memory_total: inspectedBlade.powerLimit > 350 ? 40960 : 24576, temperature: 38, power_draw: 45 }
    } else {
      const gpuBack = data?.physical_gpus?.[gpuId] || { gpu_utilization: 0, memory_used: 0, memory_total: 32768, temperature: 40, power_draw: 50 }
      gpuMetrics = {
        ...gpuBack,
        temperature: getGpuTemperature(gpuId)
      }
    }
  }

  const isGpuStressed = gpuId !== null ? gpuStressStates[gpuId] : false
  const childVgpus = gpuId !== null && !isCustomGpu && data?.vgpu_instances
    ? data.vgpu_instances.filter(v => v.physical_gpu_id === gpuId)
    : []

  // Depth-sorted lists for correct overlapping
  // 1. Grid tiles sorted
  const sortedTiles = []
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      sortedTiles.push({ x, y, depthY: getIsoCoordinates(x, y).y })
    }
  }
  sortedTiles.sort((a, b) => a.depthY - b.depthY)

  // 2. Cabinets sorted
  const sortedCabinets = serversList.map(o => ({
    ...o,
    depthY: getIsoCoordinates(o.x, o.y).y
  }))
  sortedCabinets.sort((a, b) => a.depthY - b.depthY)

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#070b0e', minHeight: '100%', color: '#c9d1d9' }}>
      
      {/* Styles for animation inside the component */}
      <style>{`
        @keyframes dc-dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        @keyframes flow-cool {
          0% { stroke-dashoffset: 0; opacity: 0.1; }
          50% { opacity: 0.8; }
          100% { stroke-dashoffset: -50; opacity: 0.1; }
        }
        .animated-cable {
          stroke-dasharray: 6, 4;
          animation: dc-dash 1.5s linear infinite;
        }
        .cooling-flow {
          stroke-dasharray: 5, 10;
          animation: flow-cool 3s linear infinite;
        }
        .site-tab-active {
          border-bottom: 2px solid var(--accent);
          color: var(--text-primary);
          font-weight: 700;
        }
        .site-tab-inactive {
          color: var(--text-secondary);
          cursor: pointer;
        }
      `}</style>

      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.05em' }}>INFRASTRUCTURE CONTROL CENTER</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>EkkoSense DC Telemetry & Optimization</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setViewMode(viewMode === '3D' ? 'PLAN' : '3D')}
            style={{ padding: '0.35rem 0.75rem', background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
          >
            VIEW: {viewMode}
          </button>
          <button 
            onClick={() => setIsProvisioning(!isProvisioning)}
            style={{ padding: '0.35rem 0.75rem', background: isProvisioning ? 'rgba(118, 185, 0, 0.2)' : 'var(--gray)', border: isProvisioning ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: isProvisioning ? 'var(--accent)' : '#fff' }}
          >
            PROVISION CABINET
          </button>
        </div>
      </div>

      {/* Interactive 3D Room Schematic */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '330px', 
          background: '#0e141a', 
          border: '1px solid rgba(255,255,255,0.05)', 
          borderRadius: '8px', 
          overflow: 'hidden',
          cursor: dragStart ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >
        
        {/* SVG Drawing Layer */}
        <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          
          {/* 1. Floor grid tiles (rendered back to front based on rotation depth) */}
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

          {/* 2. Airflow vectors (Cooling flows from CRACs) */}
          {cracPumpHigh && (
            <>
              {/* CRAC A flows towards Alpha Host */}
              <path d={`M ${getIsoCoordinates(0, 3).x} ${getIsoCoordinates(0, 3).y + spacingY} Q 250 200 ${getIsoCoordinates(2, 3).x} ${getIsoCoordinates(2, 3).y + spacingY}`} fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="3" className="cooling-flow" />
              {/* CRAC B flows towards Beta Host */}
              <path d={`M ${getIsoCoordinates(7, 3).x} ${getIsoCoordinates(7, 3).y + spacingY} Q 600 200 ${getIsoCoordinates(5, 3).x} ${getIsoCoordinates(5, 3).y + spacingY}`} fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="3" className="cooling-flow" />
            </>
          )}

          {/* 3. Render grid objects (Vents first) */}
          {serversList.filter(o => o.type === 'vent').map(vent => {
            const { x: isoX, y: isoY } = getIsoCoordinates(vent.x, vent.y)
            return (
              <polygon
                key={vent.id}
                points={`${isoX},${isoY} ${isoX + spacingX},${isoY + spacingY} ${isoX},${isoY + 2*spacingY} ${isoX - spacingX},${isoY + spacingY}`}
                fill={vent5Replaced ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.08)'}
                stroke="#3b82f6"
                strokeWidth="1.2"
                style={{ transition: 'all 0.3s' }}
              />
            )
          })}

          {/* 4. Render 3D Cabinets and CRAC units (painters depth sorted) */}
          {viewMode === '3D' ? (
            sortedCabinets.filter(o => o.type !== 'vent').map(obj => {
              const { vL, vR, vT, vB } = getBoxVertices(obj.x, obj.y)
              
              const H = cabinetHeight
              const tvL = { x: vL.x, y: vL.y - H }
              const tvR = { x: vR.x, y: vR.y - H }
              const tvT = { x: vT.x, y: vT.y - H }
              const tvB = { x: vB.x, y: vB.y - H }

              // Calculate dynamic colors depending on state
              let fillFace = 'rgba(26, 38, 51, 0.75)'
              let strokeFace = '#2c3e50'
              let glowBlade = '#22c55e'

              if (obj.type === 'gpu') {
                const temp = getGpuTemperature(obj.gpuId)
                  
                const isStressed = gpuStressStates[obj.gpuId]
                if (isStressed) {
                  fillFace = 'rgba(220, 38, 38, 0.75)'
                  strokeFace = '#dc2626'
                  glowBlade = '#f85149'
                } else if (temp > 65) {
                  fillFace = 'rgba(217, 119, 6, 0.7)'
                  strokeFace = '#d97706'
                  glowBlade = '#f59e0b'
                } else {
                  fillFace = 'rgba(16, 185, 129, 0.65)'
                  strokeFace = '#10b981'
                  glowBlade = '#10b981'
                }
              } else if (obj.type === 'scheduler') {
                fillFace = activeJobs > 0 ? 'rgba(168, 85, 247, 0.65)' : 'rgba(74, 85, 104, 0.7)'
                strokeFace = '#a855f7'
                glowBlade = '#c084fc'
              } else if (obj.type === 'storage') {
                fillFace = 'rgba(245, 158, 11, 0.6)'
                strokeFace = '#f59e0b'
                glowBlade = '#fbbf24'
              } else if (obj.type === 'crac') {
                const isActive = obj.id.startsWith('rack-custom-') ? true : cracPumpHigh
                fillFace = isActive ? 'rgba(59, 130, 246, 0.7)' : 'rgba(30, 41, 59, 0.8)'
                strokeFace = '#3b82f6'
                glowBlade = '#60a5fa'
              }

              const isSelected = inspected?.id === obj.id

              return (
                <g 
                  key={obj.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab({ type: obj.type, id: obj.id })
                  }}
                >
                  {/* Left Shadow Face */}
                  <polygon
                    points={`${vL.x},${vL.y} ${vB.x},${vB.y} ${tvB.x},${tvB.y} ${tvL.x},${tvL.y}`}
                    fill={fillFace}
                    stroke={strokeFace}
                    strokeWidth={isSelected ? '2' : '1'}
                    style={{ opacity: isSelected ? 1 : 0.85 }}
                  />

                  {/* Right Front Face */}
                  <polygon
                    points={`${vR.x},${vR.y} ${vB.x},${vB.y} ${tvB.x},${tvB.y} ${tvR.x},${tvR.y}`}
                    fill={fillFace}
                    stroke={strokeFace}
                    strokeWidth={isSelected ? '2' : '1'}
                  />

                  {/* Top Face */}
                  <polygon
                    points={`${tvL.x},${tvL.y} ${tvT.x},${tvT.y} ${tvR.x},${tvR.y} ${tvB.x},${tvB.y}`}
                    fill={fillFace}
                    stroke={strokeFace}
                    strokeWidth={isSelected ? '2' : '1'}
                    style={{ opacity: 0.95 }}
                  />

                  {/* Draw server blades lines on Front-Right face (vB -> vR) */}
                  {obj.type !== 'crac' && (
                    <>
                      <line x1={vB.x + (vR.x - vB.x)*0.2} y1={vB.y + (vR.y - vB.y)*0.2 - H*0.2} x2={vB.x + (vR.x - vB.x)*0.8} y2={vB.y + (vR.y - vB.y)*0.8 - H*0.2} stroke={glowBlade} strokeWidth="2.5" style={{ opacity: 0.8 }} />
                      <line x1={vB.x + (vR.x - vB.x)*0.2} y1={vB.y + (vR.y - vB.y)*0.2 - H*0.4} x2={vB.x + (vR.x - vB.x)*0.8} y2={vB.y + (vR.y - vB.y)*0.8 - H*0.4} stroke={glowBlade} strokeWidth="2.5" style={{ opacity: 0.8 }} />
                      <line x1={vB.x + (vR.x - vB.x)*0.2} y1={vB.y + (vR.y - vB.y)*0.2 - H*0.6} x2={vB.x + (vR.x - vB.x)*0.8} y2={vB.y + (vR.y - vB.y)*0.8 - H*0.6} stroke={glowBlade} strokeWidth="2.5" style={{ opacity: 0.8 }} />
                      <line x1={vB.x + (vR.x - vB.x)*0.2} y1={vB.y + (vR.y - vB.y)*0.2 - H*0.8} x2={vB.x + (vR.x - vB.x)*0.8} y2={vB.y + (vR.y - vB.y)*0.8 - H*0.8} stroke={glowBlade} strokeWidth="2.5" style={{ opacity: 0.8 }} />
                    </>
                  )}

                  {/* Label tag above cabinet */}
                  {isSelected && (
                    <g transform={`translate(${vT.x}, ${tvT.y - 12})`}>
                      <rect x="-45" y="-12" width="90" height="18" rx="3" fill="#000" stroke={rackColor(obj, getGpuTemperature)} strokeWidth="1" />
                      <text x="0" y="1" fill="#fff" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                        {obj.label}
                      </text>
                    </g>
                  )}
                </g>
              )
            })
          ) : (
            // Flat Plan View
            sortedCabinets.filter(o => o.type !== 'vent').map(obj => {
              const { vL, vR, vT, vB } = getBoxVertices(obj.x, obj.y)
              let blockColor = '#475569'
              if (obj.type === 'gpu') {
                const temp = getGpuTemperature(obj.gpuId)
                blockColor = gpuStressStates[obj.gpuId] ? 'var(--red)' : temp > 65 ? 'var(--yellow)' : 'var(--accent)'
              } else if (obj.type === 'scheduler') {
                blockColor = '#a855f7'
              } else if (obj.type === 'storage') {
                blockColor = '#f59e0b'
              } else if (obj.type === 'crac') {
                blockColor = '#3b82f6'
              }
              const isSelected = inspected?.id === obj.id

              return (
                <polygon
                  key={obj.id}
                  points={`${vL.x},${vL.y} ${vT.x},${vT.y} ${vR.x},${vR.y} ${vB.x},${vB.y}`}
                  fill={blockColor}
                  stroke="#fff"
                  strokeWidth={isSelected ? '2' : '0.5'}
                  style={{ opacity: 0.85, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab({ type: obj.type, id: obj.id })
                  }}
                />
              )
            })
          )}
        </svg>

        {/* Dynamic Provisioning Panel Overlay */}
        {isProvisioning && (
          <div 
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag conflicts
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '260px', 
              height: '100%', 
              background: 'rgba(11, 16, 22, 0.95)', 
              backdropFilter: 'blur(10px)', 
              borderRight: '1px solid rgba(255,255,255,0.08)', 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              zIndex: 100, 
              fontSize: '0.7rem' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
              <span style={{ fontWeight: 800, color: '#fff' }}>PROVISION CABINET</span>
              <button onClick={() => setIsProvisioning(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.2rem', color: '#8b949e' }}>Cabinet Identifier</label>
              <input 
                type="text" 
                value={provName} 
                onChange={e => setProvName(e.target.value)} 
                style={{ width: '100%', padding: '0.3rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.2rem', color: '#8b949e' }}>System Type</label>
              <select 
                value={provType} 
                onChange={e => setProvType(e.target.value)} 
                style={{ width: '100%', padding: '0.3rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px' }}
              >
                <option value="gpu">GPU Node (Compute Core)</option>
                <option value="storage">NVMe Storage Array</option>
                <option value="crac">CRAC Cooling Host</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.2rem', color: '#8b949e' }}>Grid Coord X</label>
                <select value={provX} onChange={e => setProvX(e.target.value)} style={{ width: '100%', padding: '0.3rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px' }}>
                  {[0,1,2,3,4,5,6,7].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.2rem', color: '#8b949e' }}>Grid Coord Y</label>
                <select value={provY} onChange={e => setProvY(e.target.value)} style={{ width: '100%', padding: '0.3rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px' }}>
                  {[0,1,2,3,4,5,6,7].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {provType === 'gpu' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#8b949e' }}>Accelerator Model</label>
                  <select value={provModel} onChange={e => setProvModel(e.target.value)} style={{ width: '100%', padding: '0.3rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px' }}>
                    <option>NVIDIA H100 v3 (32GB)</option>
                    <option>NVIDIA A100 SXM (80GB)</option>
                    <option>NVIDIA L40S PCIe (48GB)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#8b949e' }}>Power Limit: {provPower}W</label>
                  <input 
                    type="range" 
                    min="150" 
                    max="450" 
                    step="50" 
                    value={provPower} 
                    onChange={e => setProvPower(e.target.value)} 
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              </>
            )}

            {provError && <div style={{ color: 'var(--red)', fontSize: '0.6rem', marginTop: '0.25rem' }}>{provError}</div>}

            <button
              onClick={handleDeployCabinet}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: '4px',
                background: 'var(--accent)',
                border: 'none',
                color: '#000',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 'auto'
              }}
            >
              Deploy Cabinet
            </button>
          </div>
        )}

        {/* Legend / Drag Instruction Overlay */}
        <div style={{ position: 'absolute', top: '0.75rem', left: '1rem', display: 'flex', gap: '0.5rem', fontSize: '0.6rem', background: 'rgba(5, 5, 5, 0.85)', padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', zIndex: 10, color: 'var(--text-muted)' }}>
          <span> DRAG TO ROTATE 360° FLOOR PLAN</span>
        </div>

      </div>

      {/* EkkoSense 4-Column Telemetry Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        
        {/* Column 1: Air Cooling */}
        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #06b6d4', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
            AIR COOLING
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>NOMINAL CAPACITY</span>
              <span style={{ fontWeight: 700 }}>630.0 kWc <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(100%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>OPERATIONAL LIMIT</span>
              <span style={{ fontWeight: 700 }}>550.0 kWc <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(87.3%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
              <span>MEASURED PEAK</span>
              <span style={{ fontWeight: 700 }}>{((coolingPower / 250) * 630).toFixed(1)} kWc <span style={{ fontSize: '0.6rem' }}>({(((coolingPower / 250) * 630)/630*100).toFixed(0)}%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>COOLING PUMPS ACTIVE</span>
              <span style={{ fontWeight: 700 }}>{2 + customCracCount} Units</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}>
              <span style={{ color: '#8b949e' }}>CAPACITY AVAILABLE</span>
              <span style={{ fontWeight: 700, color: '#06b6d4' }}>{(630.0 - ((coolingPower / 250) * 630)).toFixed(1)} kWc</span>
            </div>
          </div>
        </div>

        {/* Column 2: IT (AC) LOAD */}
        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #22c55e', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
            IT LOAD (AC)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>NOMINAL SUPPLY</span>
              <span style={{ fontWeight: 700 }}>900.0 kW <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(100%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>OPERATIONAL LIMIT</span>
              <span style={{ fontWeight: 700 }}>765.0 kW <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(85.0%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
              <span>MEASURED CURRENT</span>
              <span style={{ fontWeight: 700 }}>{itAcLoad.toFixed(1)} kW <span style={{ fontSize: '0.6rem' }}>({(itAcLoad / 900 * 100).toFixed(0)}%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>ACTIVE CLUSTER JOBS</span>
              <span style={{ fontWeight: 700 }}>{activeJobs} Run / {queueLength} Wait</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}>
              <span style={{ color: '#8b949e' }}>CAPACITY AVAILABLE</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{(900.0 - itAcLoad).toFixed(1)} kW</span>
            </div>
          </div>
        </div>

        {/* Column 3: IT (DC) LOAD */}
        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #f59e0b', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
            IT LOAD (DC)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>NOMINAL BUS LIMIT</span>
              <span style={{ fontWeight: 700 }}>1000.0 kW <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(100%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>OPERATIONAL LIMIT</span>
              <span style={{ fontWeight: 700 }}>900.0 kW <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(90.0%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
              <span>GPU MEASURED PEAK</span>
              <span style={{ fontWeight: 700 }}>{itDcLoad.toFixed(1)} kW <span style={{ fontSize: '0.6rem' }}>({(itDcLoad / 1000 * 100).toFixed(0)}%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>PROVISIONED RACKS</span>
              <span style={{ fontWeight: 700 }}>{serversList.filter(o => o.type==='gpu').length} Cabinets</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}>
              <span style={{ color: '#8b949e' }}>CAPACITY AVAILABLE</span>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>{(1000.0 - itDcLoad).toFixed(1)} kW</span>
            </div>
          </div>
        </div>

        {/* Column 4: SITE POWER */}
        <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #ef4444', borderRadius: '4px', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
            SITE TOTAL POWER
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>NOMINAL MAIN LIMIT</span>
              <span style={{ fontWeight: 700 }}>1350.0 kW <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(100%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>OPERATIONAL LIMIT</span>
              <span style={{ fontWeight: 700 }}>1147.5 kW <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>(85.0%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
              <span>CURRENT CONSUMED</span>
              <span style={{ fontWeight: 700 }}>{totalSitePower.toFixed(1)} kW <span style={{ fontSize: '0.6rem' }}>({(totalSitePower / 1350 * 100).toFixed(0)}%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b949e' }}>CO2 EMISSION INDEX</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>0.41 kg/kWh (Optimal)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}>
              <span style={{ color: '#8b949e' }}>TOTAL POWER RESERVE</span>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>{(1350.0 - totalSitePower).toFixed(1)} kW</span>
            </div>
          </div>
        </div>

      </div>

      {/* Capacity progress bar summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0e141a', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>
        <span>IT/DC SYSTEM CAPACITY:</span>
        <div style={{ flex: 1, height: '8px', background: '#11161d', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${Math.min(100, (itDcLoad / 1000) * 100)}%`, background: 'var(--accent)', transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontWeight: 700 }}>{itDcLoad.toFixed(1)} / 1000.0 kW</span>
        
        <span style={{ marginLeft: '1rem' }}>SITE MAIN POWER:</span>
        <div style={{ flex: 1, height: '8px', background: '#11161d', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${Math.min(100, (totalSitePower / 1350) * 100)}%`, background: totalSitePower > 900 ? 'var(--red)' : 'var(--yellow)', transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontWeight: 700 }}>{totalSitePower.toFixed(1)} / 1350.0 kW</span>
      </div>

      {/* Bottom Hub Panel with Tabs */}
      <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', display: 'grid', gridTemplateColumns: inspected ? '1fr 340px' : '1fr', gap: '0px' }}>
        
        {/* Left Side: Tabs + Main Data Panel */}
        <div style={{ borderRight: inspected ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          {/* Tab Header Selector */}
          <div style={{ background: '#11161d', display: 'flex', gap: '1.5rem', padding: '0 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setHubTab('SITES')}
              style={{ background: 'none', border: 'none', padding: '0.65rem 0', fontSize: '0.75rem', outline: 'none' }}
              className={hubTab === 'SITES' ? 'site-tab-active' : 'site-tab-inactive'}
            >
              SITES & ROOMS
            </button>
            <button 
              onClick={() => setHubTab('ADVISOR')}
              style={{ background: 'none', border: 'none', padding: '0.65rem 0', fontSize: '0.75rem', outline: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              className={hubTab === 'ADVISOR' ? 'site-tab-active' : 'site-tab-inactive'}
            >
              COOLING ADVISOR & TASKS
              {(avgTemp > 65 || totalSitePower > 1000) && !cracPumpHigh && (
                <span style={{ width: '6px', height: '6px', background: 'var(--red)', borderRadius: '50%', display: 'inline-block' }} />
              )}
            </button>
            <button 
              onClick={() => setHubTab('EDITOR')}
              style={{ background: 'none', border: 'none', padding: '0.65rem 0', fontSize: '0.75rem', outline: 'none' }}
              className={hubTab === 'EDITOR' ? 'site-tab-active' : 'site-tab-inactive'}
            >
              SYSTEM HYPERVISOR EDITOR
            </button>
          </div>

          {/* Tab Content Display */}
          <div style={{ padding: '1rem', minHeight: '135px' }}>
            
            {hubTab === 'SITES' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {/* Site Alpha */}
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                    <span>ALPHA_HOST_CLUSTER</span>
                    <span style={{ color: 'var(--accent)' }}>ONLINE</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: gpuStressStates[0] ? 'var(--red)' : 'var(--text-primary)' }}>
                    {getGpuTemperature(0).toFixed(1)}°C {getGpuTemperature(0) > 60 ? '' : ''}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>
                    Alarms: {getGpuTemperature(0) > 75 ? '1 Thermal' : '0'} | vGPUs: {data?.vgpu_instances?.filter(v => v.physical_gpu_id === 0).length || 0}
                  </div>
                </div>

                {/* Site Beta */}
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                    <span>BETA_HOST_CLUSTER</span>
                    <span style={{ color: 'var(--accent)' }}>ONLINE</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: gpuStressStates[1] ? 'var(--red)' : 'var(--text-primary)' }}>
                    {getGpuTemperature(1).toFixed(1)}°C {getGpuTemperature(1) > 60 ? '' : ''}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>
                    Alarms: {getGpuTemperature(1) > 75 ? '1 Thermal' : '0'} | vGPUs: {data?.vgpu_instances?.filter(v => v.physical_gpu_id === 1).length || 0}
                  </div>
                </div>

                {/* Storage Site */}
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                    <span>BLOCK_STORAGE_ROOM</span>
                    <span style={{ color: '#a855f7' }}>STANDBY</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                    31.5°C 
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>
                    Alarms: 0 General | Datasets: {datasets.length} Active
                  </div>
                </div>

                {/* Custom Servers Site info */}
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                    <span>CUSTOM_CABINET_ROOM</span>
                    <span style={{ color: customCracCount > 0 ? 'var(--accent)' : '#8b949e' }}>
                      {serversList.filter(o => o.id.startsWith('rack-custom-')).length > 0 ? 'ACTIVE' : 'EMPTY'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                    {serversList.filter(o => o.id.startsWith('rack-custom-')).length} Cabinets
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>
                    CRAC Coolers: {customCracCount} Deployed | Active Vents: 4
                  </div>
                </div>
              </div>
            )}

            {hubTab === 'ADVISOR' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', background: avgTemp > 65 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.05)', border: '1px solid', borderColor: avgTemp > 65 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', padding: '0.4rem 0.8rem', borderRadius: '4px', color: avgTemp > 65 ? 'var(--red)' : '#fff', marginBottom: '0.25rem' }}>
                  <AlertTriangle size={14} />
                  <span>
                    {avgTemp > 65 
                      ? `[High Temperature Warning] Datacenter temperature is elevated at ${avgTemp.toFixed(1)}°C. Deploy custom CRAC cabinets or replace vents to prevent vGPU thermal throttling.` 
                      : `[Thermal Safe Zone] Datacenter thermals are optimized. Cooling systems operating at high efficiency.`}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {/* Task 1 */}
                  <button 
                    onClick={() => setVent5Replaced(!vent5Replaced)}
                    style={{
                      background: vent5Replaced ? 'rgba(34, 197, 94, 0.08)' : '#070b0e',
                      border: vent5Replaced ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: vent5Replaced ? 'var(--accent)' : '#c9d1d9',
                      fontSize: '0.7rem'
                    }}
                  >
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid', borderColor: vent5Replaced ? 'var(--accent)' : '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {vent5Replaced && <Check size={10} />}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.75rem' }}>Replace Vent5 near Host Alpha</strong>
                      <span style={{ fontSize: '0.6rem', color: '#8b949e' }}>Optimizes supply air flow direction | Impact: -4.5°C Temp</span>
                    </div>
                  </button>

                  {/* Task 2 */}
                  <button 
                    onClick={() => setCracPumpHigh(!cracPumpHigh)}
                    style={{
                      background: cracPumpHigh ? 'rgba(34, 197, 94, 0.08)' : '#070b0e',
                      border: cracPumpHigh ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: cracPumpHigh ? 'var(--accent)' : '#c9d1d9',
                      fontSize: '0.7rem'
                    }}
                  >
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid', borderColor: cracPumpHigh ? 'var(--accent)' : '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cracPumpHigh && <Check size={10} />}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.75rem' }}>Set CRAC loop pump speed to HIGH (2800 RPM)</strong>
                      <span style={{ fontSize: '0.6rem', color: '#8b949e' }}>Increases liquid loop flow rate | Impact: -6.0°C Temp</span>
                    </div>
                  </button>

                  {/* Task 3 */}
                  <button 
                    onClick={() => setAllocationDefragged(!allocationDefragged)}
                    style={{
                      background: allocationDefragged ? 'rgba(34, 197, 94, 0.08)' : '#070b0e',
                      border: allocationDefragged ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: allocationDefragged ? 'var(--accent)' : '#c9d1d9',
                      fontSize: '0.7rem'
                    }}
                  >
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid', borderColor: allocationDefragged ? 'var(--accent)' : '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {allocationDefragged && <Check size={10} />}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.75rem' }}>Defragment allocated vGPU instances</strong>
                      <span style={{ fontSize: '0.6rem', color: '#8b949e' }}>Balances load to cooler channels | Impact: -2.0°C Temp</span>
                    </div>
                  </button>

                  {/* Task 4 */}
                  <div 
                    style={{
                      background: '#070b0e',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.7rem'
                    }}
                  >
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid rgba(34, 197, 94, 0.3)', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                      <Check size={10} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibrate Alpha Supply Temperature Sensor</strong>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Completed 2 hours ago | Calibration status: Nominal</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {hubTab === 'EDITOR' && (
              <div style={{ background: '#050505', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', color: '#22c55e', fontFamily: 'monospace', minHeight: '120px', overflowY: 'auto' }}>
                [hypervisor] Initializing Zenith-VMM kernel stack...<br />
                [hypervisor] Found {serversList.filter(o => o.type==='gpu').length} physical compute nodes.<br />
                [hypervisor] Custom components deployed on grid: {serversList.filter(o => o.id.startsWith('rack-custom-')).length} nodes<br />
                [hypervisor] Custom cooling boost factor: {customCracCount * 3.8}°C<br />
                [hypervisor] Active cgroups enforcement profile: isol_v1_limit_pct_active
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Cabinet Inspector drawer (if selected) */}
        {inspected ? (
          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#11161d' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.55rem', color: rackColor(inspected, getGpuTemperature), fontWeight: 800, textTransform: 'uppercase' }}>
                  {inspected.label}
                </span>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                  {inspected.name}
                </h4>
              </div>
              <button 
                onClick={() => setActiveTab(null)}
                style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem', outline: 'none' }}
              >
                ×
              </button>
            </div>

            {/* Inspector content based on type */}
            {inspected.type === 'gpu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  Model: {inspectedBlade.model || 'Custom Accelerator Node'}<br />
                  Max Power: {inspectedBlade.powerLimit || 350}W<br />
                  Bus: 5120-bit HBM3 | Liquid Cooling
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.55rem', color: '#8b949e' }}>TEMP</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: gpuMetrics.temperature > 75 ? 'var(--red)' : '#fff' }}>{gpuMetrics.temperature.toFixed(1)}°C</div>
                  </div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.55rem', color: '#8b949e' }}>POWER</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{gpuMetrics.power_draw.toFixed(0)}W</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.2rem' }}>
                    <span>Compute Load</span>
                    <span>{gpuMetrics.gpu_utilization.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '4px', background: '#070b0e', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${gpuMetrics.gpu_utilization}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Active Dataset Mount Selector */}
                <div style={{ background: '#070b0e', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.6rem', color: '#8b949e', fontWeight: 700 }}>ACTIVE MOUNTED DATASET</span>
                  <select 
                    value={inspectedBlade.activeDataset || ''}
                    onChange={(e) => {
                      const updatedDataset = e.target.value
                      setServersList(prev => prev.map(s => {
                        if (s.id === inspectedBlade.id) {
                          return { ...s, activeDataset: updatedDataset }
                        }
                        return s
                      }))
                    }}
                    style={{ width: '100%', padding: '0.25rem', fontSize: '0.65rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px', outline: 'none' }}
                  >
                    <option value="">Synthetic Data (Preloaded)</option>
                    {datasets.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => handleToggleStress(gpuId)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    background: isGpuStressed ? 'var(--red)' : 'rgba(118, 185, 0, 0.1)',
                    border: isGpuStressed ? '1px solid transparent' : '1px solid var(--accent)',
                    color: isGpuStressed ? '#fff' : 'var(--accent)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isGpuStressed ? 'STOP STRESS' : 'TRIGGER STRESS'}
                </button>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.65rem', marginBottom: '0.25rem' }}>Virtual Nodes ({childVgpus.length})</div>
                  {childVgpus.length === 0 ? (
                    <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>
                      {isCustomGpu 
                        ? 'Custom nodes partition automatically during job requests.' 
                        : 'No slices provisioned.'}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {childVgpus.map(v => (
                        <div key={v.id} style={{ background: '#070b0e', padding: '0.25rem 0.4rem', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                          <span>node-{v.id.substring(0,4)}</span>
                          <span>{(v.vram_limit / 1024).toFixed(0)}G VRAM</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {inspected.type === 'scheduler' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.55rem', color: '#8b949e' }}>RUNNING</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{activeJobs}</div>
                  </div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.55rem', color: '#8b949e' }}>QUEUED</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{queueLength}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.7rem' }}>Dispatch ML container:</span>
                  
                  <select 
                    value={selectedScript} 
                    onChange={e => setSelectedScript(e.target.value)}
                    style={{ padding: '0.35rem', fontSize: '0.65rem', background: '#070b0e', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}
                  >
                    {scripts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select 
                    value={selectedDataset} 
                    onChange={e => setSelectedDataset(e.target.value)}
                    style={{ padding: '0.35rem', fontSize: '0.65rem', background: '#070b0e', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}
                  >
                    <option value="">Synthetic Data</option>
                    {datasets.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <select 
                    value={selectedVgpu} 
                    onChange={e => {
                      const val = e.target.value
                      setSelectedVgpu(val)
                      
                      // Auto-select dataset based on target host GPU's mounted dataset
                      const vgpuObj = data?.vgpu_instances?.find(v => v.id === val)
                      if (vgpuObj) {
                        const hostGpu = serversList.find(s => s.type === 'gpu' && s.gpuId === vgpuObj.physical_gpu_id)
                        if (hostGpu && hostGpu.activeDataset !== undefined) {
                          setSelectedDataset(hostGpu.activeDataset)
                        }
                      } else {
                        // Check custom GPU matching val
                        const hostGpu = serversList.find(s => s.type === 'gpu' && s.gpuId === val)
                        if (hostGpu && hostGpu.activeDataset !== undefined) {
                          setSelectedDataset(hostGpu.activeDataset)
                        }
                      }
                    }}
                    style={{ padding: '0.35rem', fontSize: '0.65rem', background: '#070b0e', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}
                  >
                    <option value="ALL_FLEET">Distributed Fleet Cluster</option>
                    {/* Render physical vGPUs */}
                    {data?.vgpu_instances?.map(v => (
                      <option key={v.id} value={v.id}>
                        vGPU-{v.id.substring(0,8)} (Host 0{v.physical_gpu_id+1})
                      </option>
                    ))}
                    {/* Render custom GPUs */}
                    {serversList.filter(o => o.type==='gpu' && o.id.startsWith('rack-custom-')).map(c => (
                      <option key={c.gpuId} value={c.gpuId}>
                        {c.name} (Custom Accelerator Node)
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleDispatchJob}
                    disabled={isDispatching}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '4px',
                      background: 'var(--accent)',
                      border: 'none',
                      color: '#000',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: isDispatching ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isDispatching ? 'RUNNING...' : 'DISPATCH PIPELINE'}
                  </button>

                  {dispatchMessage && (
                    <div style={{ padding: '0.25rem', fontSize: '0.55rem', color: '#8b949e', background: '#050505', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
                      {dispatchMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {inspected.type === 'storage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  RAID Type: RAID-6 Distributed NVMe<br />
                  Total Size: 48.0 TB | Used: 14.2 TB<br />
                  Data Gateway: Ceph LIO Multipath
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.65rem', marginBottom: '0.25rem' }}>Available Datasets ({datasets.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '110px', overflowY: 'auto' }}>
                    {datasets.map(d => (
                      <div key={d} style={{ background: '#070b0e', padding: '0.25rem 0.4rem', borderRadius: '3px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Database size={10} color="#f59e0b" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {inspected.type === 'crac' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  Unit: CRAC HVAC Air Circulator Unit<br />
                  Loop Status: Liquid coolant active<br />
                  Cooling index: {inspected.id.startsWith('rack-custom-') ? '3.8°C Boost' : (cracPumpHigh ? '6.0°C Boost' : 'Nominal')}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SYSTEM DIAGNOSTIC</span>
                  <div style={{ background: '#050505', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.6rem', color: '#22c55e', fontFamily: 'monospace', minHeight: '60px' }}>
                    CRAC loop flow: nominal.<br />
                    Fan speed check: OK.<br />
                    Coolant temperature margins: within 100% boundary.
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: '#11161d', color: '#8b949e', textAlign: 'center' }}>
            <Server size={30} strokeWidth={1} color="rgba(255,255,255,0.15)" />
            <span style={{ fontSize: '0.7rem' }}>Select any cabinet rack blade on the floor grid to display dedicated hardware inspectors.</span>
          </div>
        )}

      </div>

    </div>
  )
}

// Helpers
const rackColor = (obj, getGpuTemperature) => {
  if (obj.type === 'gpu') {
    const t = getGpuTemperature(obj.gpuId)
    return t > 65 ? 'var(--red)' : 'var(--accent)'
  }
  if (obj.type === 'scheduler') return '#a855f7'
  if (obj.type === 'storage') return '#f59e0b'
  return '#3b82f6'
}

// Inspected items resolved inline

export default AIDataCenter
