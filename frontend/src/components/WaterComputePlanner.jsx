import { useEffect, useState } from 'react'
import { useSharedMetrics } from '../contexts/MetricsContext'
import { Droplet, Cpu, Activity, Zap, Info, Server, Network, Sliders, RefreshCw, BarChart2, ShieldAlert, Layers, Battery, Fuel, Power, Thermometer, Gauge } from 'lucide-react'

function WaterComputePlanner({ isActive = true }) {
  const [data, setData] = useState(null)

  // 3D Visualizer States
  const [activePipeType, setActivePipeType] = useState('ALL') // 'ALL', 'WATER', 'POWER'


  // Model & Estimator States
  const [modelSizeBillion, setModelSizeBillion] = useState(70) // 1B - 175B
  const [datasetSizeBillion, setDatasetSizeBillion] = useState(300) // 1B - 1000B
  const [targetDays, setTargetDays] = useState(14) // 1 - 60 days
  const [gpuModel, setGpuModel] = useState('H100') // 'H100', 'A100', 'L40S'

  // Cooling efficiency options (influences WUE)
  const [wueOptimized, setWueOptimized] = useState(true)

  // Power & Backup system states
  const [genActive, setGenActive] = useState(false)
  const [batteryCharging, setBatteryCharging] = useState(true)
  const [powerTel, setPowerTel] = useState({
    upsLoad: 45, upsBattery: 87,
    genFuel: 92, genOutput: 0,
    batteryCharge: 78, batteryTemp: 32,
  })

  // Simulated power telemetry — slowed from 2s to 4s to reduce re-renders
  useEffect(() => {
    if (!isActive) return
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
    }, 4000)
    return () => clearInterval(interval)
  }, [genActive, batteryCharging, isActive])



  // Shared WebSocket connection (replaces per-component WS)
  const { metrics: wsMetrics, isConnected } = useSharedMetrics()

  useEffect(() => {
    if (wsMetrics) setData(wsMetrics)
  }, [wsMetrics])



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

  // Helper to render a cooling tower
  const renderCoolingTower = (tx, ty) => {
    return (
      <g key={`tower-${tx}-${ty}`}>
        {/* Base shadow */}
        <ellipse cx={tx} cy={ty} rx={22} ry={11} fill="black" opacity="0.3" />
        {/* Tower body */}
        <path
          d={`M ${tx - 20} ${ty} 
              Q ${tx - 15} ${ty - 25} ${tx - 11} ${ty - 45} 
              L ${tx + 11} ${ty - 45} 
              Q ${tx + 15} ${ty - 25} ${tx + 20} ${ty} Z`}
          fill="url(#towerGradient)"
          stroke="#1b2430"
          strokeWidth="0.8"
        />
        {/* Top Lip */}
        <ellipse cx={tx} cy={ty - 45} rx={11} ry={5.5} fill="#11161f" stroke="#253243" strokeWidth="0.8" />
        {/* Bottom air intake slots */}
        <ellipse cx={tx} cy={ty - 2} rx={19} ry={9.5} fill="none" stroke="#0e131a" strokeWidth="3" strokeDasharray="3,2" />
        {/* Steam rising particles */}
        <circle cx={tx - 4} cy={ty - 48} r={4} className="steam-cloud" style={{ animationDelay: '0s' }} />
        <circle cx={tx + 4} cy={ty - 52} r={5} className="steam-cloud" style={{ animationDelay: '1.2s' }} />
        <circle cx={tx} cy={ty - 55} r={3} className="steam-cloud" style={{ animationDelay: '2.5s' }} />
      </g>
    )
  }

  // Helper to render a storage tank
  const renderStorageTank = (tx, ty) => {
    return (
      <g key={`tank-${tx}-${ty}`}>
        {/* Tank Shadow */}
        <ellipse cx={tx} cy={ty} rx={14} ry={7} fill="black" opacity="0.3" />
        {/* Cylindrical body */}
        <path
          d={`M ${tx - 12} ${ty} 
              L ${tx - 12} ${ty - 30} 
              A 12 6 0 0 1 ${tx + 12} ${ty - 30} 
              L ${tx + 12} ${ty} Z`}
          fill="url(#tankGradient)"
          stroke="#1d2633"
          strokeWidth="0.8"
        />
        {/* Top Dome */}
        <path
          d={`M ${tx - 12} ${ty - 30} 
              A 12 10 0 0 1 ${tx + 12} ${ty - 30} Z`}
          fill="#314052"
          stroke="#1d2633"
          strokeWidth="0.8"
        />
      </g>
    )
  }

  // Helper to render a server rack
  const renderServerRack = (rx, ry, id) => {
    const h = 32; // height
    const w = 10; // width along left-down axis
    const d = 16; // depth along right-down axis
    
    // Top face corners
    const t1 = { x: rx, y: ry - h }
    const t2 = { x: rx - w, y: ry - h + w*0.5 }
    const t3 = { x: rx - w + d, y: ry - h + w*0.5 + d*0.5 }
    const t4 = { x: rx + d, y: ry - h + d*0.5 }
    
    // Bottom face corners
    const b2 = { x: rx - w, y: ry + w*0.5 }
    const b3 = { x: rx - w + d, y: ry + w*0.5 + d*0.5 }
    const b4 = { x: rx + d, y: ry + d*0.5 }
    
    return (
      <g key={`rack-${id}`}>
        <polygon points={`${rx},${ry} ${rx-w},${ry+w*0.5} ${rx-w+d},${ry+w*0.5+d*0.5} ${rx+d},${ry+d*0.5}`} fill="black" opacity="0.35" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill="#161f28" stroke="#253545" strokeWidth="0.5" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill="#0f1620" stroke="#253545" strokeWidth="0.5" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill="#253344" stroke="#374b63" strokeWidth="0.5" />
        
        {Array.from({ length: 6 }).map((_, idx) => {
          const ly = t4.y + (idx + 1) * (h / 7);
          const lx1 = t4.x - (t4.x - t3.x) * 0.2;
          const ly1 = t4.y + (idx + 1) * (h / 7) + (t3.y - t4.y) * 0.2;
          const lx2 = t4.x - (t4.x - t3.x) * 0.8;
          const ly2 = t4.y + (idx + 1) * (h / 7) + (t3.y - t4.y) * 0.8;
          const ledColor = idx % 2 === 0 ? '#00f2fe' : '#09f';
          return (
            <line
              key={idx}
              x1={lx1}
              y1={ly - idx * 0.5 + 2}
              x2={lx2}
              y2={ly - idx * 0.5 + 4}
              stroke={ledColor}
              strokeWidth="1.2"
              opacity="0.85"
              filter="url(#glow)"
            />
          )
        })}
      </g>
    )
  }

  // Helper to render a clarifying tank
  const renderClarifierTank = (cx, cy, id) => {
    return (
      <g key={`clarifier-${id}`}>
        <ellipse cx={cx} cy={cy + 4} rx={32} ry={16} fill="black" opacity="0.3" />
        <path
          d={`M ${cx - 30} ${cy} 
              L ${cx - 30} ${cy + 8} 
              A 30 15 0 0 0 ${cx + 30} ${cy + 8} 
              L ${cx + 30} ${cy} Z`}
          fill="#2c3540"
          stroke="#1d2633"
          strokeWidth="0.8"
        />
        <ellipse cx={cx} cy={cy} rx={30} ry={15} fill="#1f2730" stroke="#3b4856" strokeWidth="1" />
        <ellipse cx={cx} cy={cy} rx={27} ry={13.5} fill="#14a3b8" opacity="0.75" />
        <ellipse cx={cx} cy={cy} rx={22} ry={11} fill="none" stroke="#22d3ee" strokeWidth="0.5" opacity="0.5" />
        <ellipse cx={cx} cy={cy} rx={4} ry={2} fill="#718096" stroke="#4a5568" strokeWidth="0.5" />
        <path d={`M ${cx - 1} ${cy} L ${cx - 1} ${cy - 4} A 1 0.5 0 0 1 ${cx + 1} ${cy - 4} L ${cx + 1} ${cy} Z`} fill="#718096" />
        <g transform={`translate(${cx}, ${cy}) scale(1, 0.5)`}>
          <line
            x1="0"
            y1="0"
            x2="27"
            y2="0"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            className="scraper-bridge"
            style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }}
          />
        </g>
      </g>
    )
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#070b0e', minHeight: '100%', color: '#c9d1d9' }}>
      
      {/* Styles for animated flow pipelines */}
      <style>{`
        @keyframes steam-rise {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.45;
          }
          100% {
            transform: translateY(-35px) scale(1.3);
            opacity: 0;
          }
        }
        @keyframes rotate-scraper {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes flow-dots {
          to {
            stroke-dashoffset: -40;
          }
        }
        .steam-cloud {
          animation: steam-rise 3.5s ease-out infinite;
          fill: rgba(224, 242, 254, 0.45);
          filter: blur(1.5px);
        }
        .scraper-bridge {
          animation: rotate-scraper 24s linear infinite;
          transform-origin: 0px 0px;
        }
        .flow-line {
          stroke-dasharray: 6, 4;
          animation: flow-dots 2s linear infinite;
        }
        .flow-line-fast {
          stroke-dasharray: 5, 3;
          animation: flow-dots 1.2s linear infinite;
        }
        .flow-line-reverse {
          stroke-dasharray: 6, 4;
          animation: flow-dots 2s linear infinite;
          animation-direction: reverse;
        }
        .flow-btn-active {
          background: rgba(6, 182, 212, 0.25);
          border: 1px solid #06b6d4;
          color: #00f2fe;
        }
        .flow-btn-inactive {
          background: #111820;
          border: 1px solid rgba(255,255,255,0.08);
          color: #8b949e;
        }
        .flow-btn-inactive:hover {
          color: #fff;
          border-color: rgba(255,255,255,0.2);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 800, letterSpacing: '0.05em' }}>ENVIRONMENTAL & RESOURCE PLANNING CONTROL</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>Water Consumption & Parallel Compute Planner</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          style={{ 
            position: 'relative', 
            height: '380px', 
            background: '#0e141a', 
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '8px', 
            overflow: 'hidden',
            userSelect: 'none'
          }}
        >
          {/* Sustainability Pill Badge */}
          <div style={{ position: 'absolute', top: '1rem', left: '1.25rem', background: '#fff', color: '#07121b', padding: '0.25rem 0.75rem', borderRadius: '15px', fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.08em', zIndex: 10 }}>
            SUSTAINABILITY
          </div>

          {/* Overlay Filter Buttons */}
          <div style={{ position: 'absolute', top: '1rem', right: '1.25rem', display: 'flex', gap: '0.4rem', zIndex: 10 }}>
            {['ALL', 'WATER', 'POWER'].map(t => (
              <button 
                key={t}
                onClick={() => setActivePipeType(t)}
                style={{ padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}
                className={activePipeType === t ? 'flow-btn-active' : 'flow-btn-inactive'}
              >
                {t} FLOWS
              </button>
            ))}
          </div>

          <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} viewBox="0 0 850 500">
            <defs>
              <filter id="shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="towerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2c3746" />
                <stop offset="35%" stopColor="#45546b" />
                <stop offset="75%" stopColor="#2c3746" />
                <stop offset="100%" stopColor="#1a222c" />
              </linearGradient>

              <linearGradient id="tankGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1b323c" />
                <stop offset="40%" stopColor="#2c5364" />
                <stop offset="80%" stopColor="#1b323c" />
                <stop offset="100%" stopColor="#0f2027" />
              </linearGradient>

              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00f2fe" />
              </marker>
              <marker id="arrow-yellow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#eab308" />
              </marker>
              <marker id="arrow-pink" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
            </defs>

            <g style={{
              transform: 'translate(-30px, -26px) scale(0.85)'
            }}>
              {/* FLOW PIPELINES / LINKS */}
              {/* 1. Water Treatment -> Power Plant (Cyan - Dotted) */}
              {(activePipeType === 'ALL' || activePipeType === 'WATER') && (
                <path
                  d="M 640 210 L 510 145 L 430 185"
                  fill="none"
                  stroke="#00f2fe"
                  strokeWidth="2.5"
                  className="flow-line"
                  markerEnd="url(#arrow-cyan)"
                  filter="url(#glow)"
                />
              )}

              {/* 2. Water Treatment -> Datacenter (Cyan - Dotted Double Lines) */}
              {(activePipeType === 'ALL' || activePipeType === 'WATER') && (
                <>
                  <path
                    d="M 650 230 L 590 195 L 530 225 L 530 280 L 570 300 L 590 320"
                    fill="none"
                    stroke="#00f2fe"
                    strokeWidth="2"
                    className="flow-line"
                    markerEnd="url(#arrow-cyan)"
                    filter="url(#glow)"
                  />
                  <path
                    d="M 660 240 L 610 215 L 545 247 L 545 292 L 580 310 L 598 328"
                    fill="none"
                    stroke="#00f2fe"
                    strokeWidth="2"
                    className="flow-line-fast"
                    markerEnd="url(#arrow-cyan)"
                    filter="url(#glow)"
                  />
                </>
              )}

              {/* 3. Power Plant -> Wastewater Treatment (Pink/Red - Dotted) */}
              {(activePipeType === 'ALL' || activePipeType === 'WATER') && (
                <path
                  d="M 320 195 L 260 225 L 340 345 L 390 370 L 390 410"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  className="flow-line-reverse"
                  markerEnd="url(#arrow-pink)"
                  filter="url(#glow)"
                />
              )}

              {/* 4. Power Plant -> Datacenter (Yellow - Electric Power) */}
              {(activePipeType === 'ALL' || activePipeType === 'POWER') && (
                <path
                  d="M 420 210 L 520 260 L 560 280 L 560 315"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  className="flow-line-fast"
                  markerEnd="url(#arrow-yellow)"
                  filter="url(#glow)"
                />
              )}

              {/* 5. Datacenter -> Wastewater (Blue/Grey - Blowdown) */}
              {(activePipeType === 'ALL' || activePipeType === 'WATER') && (
                <path
                  d="M 530 380 L 460 415"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  className="flow-line"
                  markerEnd="url(#arrow-blue)"
                  filter="url(#glow)"
                />
              )}

              {/* 6. Wastewater -> Datacenter (Green - Reclaimed/Recycled Water) */}
              {(activePipeType === 'ALL' || activePipeType === 'WATER') && (
                <path
                  d="M 490 435 L 550 405"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  className="flow-line-reverse"
                  markerEnd="url(#arrow-green)"
                  filter="url(#glow)"
                />
              )}

              {/* ================= PLATFORMS & COMPONENTS ================= */}

              {/* --- Wastewater Treatment Plant Platform --- */}
              <g>
                {/* Shadow */}
                <ellipse cx="440" cy="460" rx="110" ry="60" fill="black" opacity="0.4" filter="url(#shadow-blur)" />
                {/* 3D Slab */}
                <polygon points="440,390  550,450  440,510  330,450" fill="#1b242f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="330,450  440,510  440,518  330,458" fill="#11171f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="550,450  440,510  440,518  550,458" fill="#0c1016" stroke="#2b3b4d" strokeWidth="1" />
                {/* Contents */}
                {renderClarifierTank(405, 435, 1)}
                {renderClarifierTank(465, 465, 2)}
                {/* Platform Label */}
                <text x="440" y="524" textAnchor="middle" fill="#8b949e" fontSize="9px" fontWeight="700" letterSpacing="0.05em">WASTEWATER TREATMENT PLANT</text>
              </g>

              {/* --- Datacenter Platform --- */}
              <g>
                {/* Shadow */}
                <ellipse cx="600" cy="370" rx="110" ry="60" fill="black" opacity="0.4" filter="url(#shadow-blur)" />
                {/* 3D Slab */}
                <polygon points="600,300  710,360  600,420  490,360" fill="#1b242f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="490,360  600,420  600,428  490,368" fill="#11171f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="710,360  600,420  600,428  710,368" fill="#0c1016" stroke="#2b3b4d" strokeWidth="1" />
                {/* Contents - Server Racks */}
                {/* Row 2 (back) */}
                {renderServerRack(580, 325, 4)}
                {renderServerRack(600, 335, 5)}
                {renderServerRack(620, 345, 6)}
                {/* Row 1 (front) */}
                {renderServerRack(550, 340, 1)}
                {renderServerRack(570, 350, 2)}
                {renderServerRack(590, 360, 3)}
                {/* Platform Label */}
                <text x="600" y="434" textAnchor="middle" fill="#8b949e" fontSize="9px" fontWeight="700" letterSpacing="0.05em">DATACENTER</text>
              </g>

              {/* --- Water Treatment Plant Platform --- */}
              <g>
                {/* Shadow */}
                <ellipse cx="700" cy="230" rx="100" ry="55" fill="black" opacity="0.4" filter="url(#shadow-blur)" />
                {/* 3D Slab */}
                <polygon points="700,165  800,220  700,275  600,220" fill="#1b242f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="600,220  700,275  700,283  600,228" fill="#11171f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="800,220  700,275  700,283  800,228" fill="#0c1016" stroke="#2b3b4d" strokeWidth="1" />
                {/* Contents */}
                {renderStorageTank(660, 205)}
                {/* Pump/Machinery Boxes */}
                <polygon points="710,210  740,195  725,187  695,202" fill="#06b6d4" opacity="0.8" stroke="#0891b2" strokeWidth="0.5" />
                <polygon points="695,202  725,187  725,193  695,208" fill="#0891b2" stroke="#0891b2" strokeWidth="0.5" />
                <polygon points="710,210  725,187  725,193  710,216" fill="#0e131a" stroke="#0891b2" strokeWidth="0.5" />

                <polygon points="730,225  760,210  745,202  715,217" fill="#22d3ee" opacity="0.85" stroke="#0891b2" strokeWidth="0.5" />
                <polygon points="715,217  745,202  745,208  715,223" fill="#0891b2" stroke="#0891b2" strokeWidth="0.5" />
                <polygon points="730,225  745,202  745,208  730,231" fill="#0e131a" stroke="#0891b2" strokeWidth="0.5" />
                {/* Piping details */}
                <path d="M 672 205 L 705 220" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                {/* Platform Label */}
                <text x="700" y="289" textAnchor="middle" fill="#8b949e" fontSize="9px" fontWeight="700" letterSpacing="0.05em">WATER TREATMENT PLANT</text>
              </g>

              {/* --- Power Plant Platform --- */}
              <g>
                {/* Shadow */}
                <ellipse cx="370" cy="190" rx="100" ry="55" fill="black" opacity="0.4" filter="url(#shadow-blur)" />
                {/* 3D Slab */}
                <polygon points="370,125  470,180  370,235  270,180" fill="#1b242f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="270,180  370,235  370,243  270,188" fill="#11171f" stroke="#2b3b4d" strokeWidth="1" />
                <polygon points="470,180  370,235  370,243  470,188" fill="#0c1016" stroke="#2b3b4d" strokeWidth="1" />
                {/* Contents */}
                {renderCoolingTower(335, 175)}
                {renderCoolingTower(385, 200)}
                {/* Platform Label */}
                <text x="370" y="249" textAnchor="middle" fill="#8b949e" fontSize="9px" fontWeight="700" letterSpacing="0.05em">POWER PLANT</text>
              </g>
            </g>
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
