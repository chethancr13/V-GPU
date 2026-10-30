import { useEffect, useState } from 'react'
import { useSharedMetrics } from '../contexts/MetricsContext'
import { Droplet, Cpu, Activity, Zap, Info, Server, Network, Sliders, RefreshCw, BarChart2, ShieldAlert, Layers, Battery, Fuel, Power, Thermometer, Gauge, Bot, Sparkles, CheckCircle2, Calculator } from 'lucide-react'
import DataCenterCooling3D from './DataCenterCooling3D'

function WaterComputePlanner({ theme = 'light', isActive = true }) {
  const [data, setData] = useState(null)

  // Dynamic reactive theme detection synced with global theme toggle
  const [isLight, setIsLight] = useState(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme')
      return docTheme === 'light' || (!docTheme && theme === 'light')
    }
    return theme === 'light'
  })

  useEffect(() => {
    const updateTheme = () => {
      const docTheme = document.documentElement.getAttribute('data-theme')
      setIsLight(docTheme === 'light' || (!docTheme && theme === 'light'))
    }
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [theme])

  // Model & Estimator States
  const [modelSizeBillion, setModelSizeBillion] = useState(70) // 1B - 175B
  const [datasetSizeBillion, setDatasetSizeBillion] = useState(300) // 1B - 1000B
  const [targetDays, setTargetDays] = useState(14) // 1 - 60 days
  const [gpuModel, setGpuModel] = useState('H100') // 'H100', 'A100', 'L40S'

  // Cooling efficiency options (influences WUE)
  const [wueOptimized, setWueOptimized] = useState(true)

  // Qwen AI Computing Engine States
  const [aiComputing, setAiComputing] = useState(false)
  const [aiMathResult, setAiMathResult] = useState(null)
  const [activeFormulaTab, setActiveFormulaTab] = useState('cooling') // 'cooling' | 'training' | 'proof'

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

  // Call Qwen to compute and verify thermodynamic formulas
  const handleComputeWithQwen = async () => {
    setAiComputing(true)
    try {
      const res = await fetch('http://localhost:8000/api/ai/compute-water-power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_size_b: modelSizeBillion,
          dataset_tokens_b: datasetSizeBillion,
          target_days: targetDays,
          gpu_model: gpuModel,
          cooling_mode: wueOptimized ? 'liquid' : 'air'
        })
      })
      if (res.ok) {
        const result = await res.json()
        setAiMathResult(result)
      }
    } catch (e) {
      console.error('Qwen math compute failed:', e)
    } finally {
      setAiComputing(false)
    }
  }

  // Auto-fetch Qwen derivation when tab becomes active
  useEffect(() => {
    if (isActive && !aiMathResult) {
      handleComputeWithQwen()
    }
  }, [isActive])



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

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--black)', minHeight: '100%', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 800, letterSpacing: '0.05em' }}>ENVIRONMENTAL & RESOURCE PLANNING CONTROL</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>Water Consumption & Parallel Compute Planner</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={() => setWueOptimized(!wueOptimized)}
            style={{
              padding: '0.35rem 0.75rem',
              background: wueOptimized
                ? (isLight ? '#cffafe' : 'rgba(6, 182, 212, 0.2)')
                : (isLight ? '#ffffff' : 'var(--gray)'),
              border: wueOptimized
                ? '1px solid #06b6d4'
                : (isLight ? '1px solid #cbd5e1' : '1px solid var(--border)'),
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: wueOptimized ? (isLight ? '#0891b2' : '#06b6d4') : (isLight ? '#334155' : '#fff'),
              boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            WUE BOOST: {wueOptimized ? 'OPTIMIZED' : 'STANDARD'}
          </button>
        </div>
      </div>

      {/* Layout Split: Left 3D Loop visualizer, Right Water Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '1.5rem' }}>
        
        {/* 3D Digital Twin Visualizer Room (Matches Physical Data Center Blueprint) */}
        <DataCenterCooling3D
          waterConsumption={waterConsumptionLPerHour}
          wue={currentWUE}
          totalPowerKW={totalPowerKW}
          isActive={isActive}
          theme={isLight ? 'light' : 'dark'}
        />

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
            style={{
              marginTop: '0.4rem', padding: '3px 10px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer',
              background: genActive ? (isLight ? '#fee2e2' : 'rgba(239,68,68,0.15)') : (isLight ? '#dcfce7' : 'rgba(34,197,94,0.1)'),
              border: `1px solid ${genActive ? (isLight ? '#f87171' : 'rgba(239,68,68,0.3)') : (isLight ? '#86efac' : 'rgba(34,197,94,0.2)')}`,
              color: genActive ? (isLight ? '#dc2626' : '#ef4444') : (isLight ? '#16a34a' : '#22c55e'),
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
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
            style={{
              marginTop: '0.4rem', padding: '3px 10px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer',
              background: batteryCharging ? (isLight ? '#cffafe' : 'rgba(6,182,212,0.1)') : (isLight ? '#ffedd5' : 'rgba(249,115,22,0.1)'),
              border: `1px solid ${batteryCharging ? (isLight ? '#67e8f9' : 'rgba(6,182,212,0.3)') : (isLight ? '#fdba74' : 'rgba(249,115,22,0.3)')}`,
              color: batteryCharging ? (isLight ? '#0891b2' : '#22d3ee') : (isLight ? '#c2410c' : '#f97316'),
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
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

      {/* ──────────────────────────────────────────────────────────────────
          🤖 QWEN 2.5 AI MATHEMATICAL CALCULATION ENGINE & FORMULA PROOF
      ────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#0a0f14',
        border: '1px solid rgba(118, 185, 0, 0.25)',
        borderRadius: '8px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
      }}>
        {/* Panel Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(118, 185, 0, 0.12)', border: '1px solid rgba(118, 185, 0, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bot size={20} color="#76B900" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Qwen 2.5 AI Thermodynamic Calculation Engine
                <span style={{
                  fontSize: '0.58rem',
                  background: 'rgba(118, 185, 0, 0.12)',
                  color: '#76B900',
                  border: '1px solid rgba(118, 185, 0, 0.3)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  {aiMathResult?.engine || 'Local Ollama'}
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#8b949e', marginTop: '2px' }}>
                Active neural thermodynamic verification: models live platform telemetry and Transformer compute scaling laws.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Tab switchers */}
            <div style={{
              display: 'flex',
              background: isLight ? '#f1f5f9' : '#0e141a',
              padding: '3px',
              borderRadius: '6px',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.06)'
            }}>
              {[
                { id: 'cooling', label: '🌊 Cooling Formulas' },
                { id: 'training', label: '⚡ 6·N·D Scaling Law' },
                { id: 'proof', label: '📝 AI Derivation Proof' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormulaTab(tab.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: activeFormulaTab === tab.id
                      ? (isLight ? '#5a9100' : '#76B900')
                      : 'transparent',
                    color: activeFormulaTab === tab.id
                      ? '#ffffff'
                      : (isLight ? '#475569' : '#8b949e'),
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: activeFormulaTab === tab.id && isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleComputeWithQwen}
              disabled={aiComputing}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: aiComputing
                  ? (isLight ? 'rgba(90, 145, 0, 0.2)' : 'rgba(118, 185, 0, 0.2)')
                  : (isLight ? '#5a9100' : '#76B900'),
                border: 'none',
                color: '#ffffff',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: aiComputing ? 'not-allowed' : 'pointer',
                boxShadow: isLight ? '0 1px 3px rgba(90, 145, 0, 0.3)' : 'none'
              }}
            >
              <RefreshCw size={12} className={aiComputing ? 'spin' : ''} />
              {aiComputing ? 'Calculating...' : 'Re-calculate with Qwen'}
            </button>
          </div>
        </div>

        {/* TAB 1: SERVER COOLING FORMULAS */}
        {activeFormulaTab === 'cooling' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            
            {/* Card 1: Server Total Power */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
                <span>1. TOTAL SERVER POWER DRAW</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>P_total (kW)</span>
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#76B900'
              }}>
                P_server = (∑ P_gpus + 180W_aux) / 1000
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>Substituted Live Variables:</strong><br />
                ({(data?.physical_gpus?.reduce((acc, g) => acc + g.power_draw, 0) || 120).toFixed(0)}W GPU + 180W Aux) / 1000 = <span style={{ color: '#fff', fontWeight: 800 }}>{totalPowerKW.toFixed(3)} kW</span>
              </div>
            </div>

            {/* Card 2: Effective WUE */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
                <span>2. EFFECTIVE WUE EQUATION</span>
                <span style={{ color: '#06b6d4', fontFamily: 'JetBrains Mono, monospace' }}>WUE (L/kWh)</span>
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#06b6d4'
              }}>
                WUE = Base_WUE + ΔWUE_thermal
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>Substituted Live Variables:</strong><br />
                {baseWue} L/kWh + {(data?.physical_gpus?.[0]?.temperature > 70 ? 0.05 : 0).toFixed(2)} (T &gt; 70°C Penalty) = <span style={{ color: '#fff', fontWeight: 800 }}>{currentWUE.toFixed(3)} L/kWh</span>
              </div>
            </div>

            {/* Card 3: Hourly Water Draw */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
                <span>3. HOURLY WATER CONSUMPTION</span>
                <span style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>Water (L/hr)</span>
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#38bdf8'
              }}>
                Water_hr = P_server × WUE
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>Substituted Live Variables:</strong><br />
                {totalPowerKW.toFixed(3)} kW × {currentWUE.toFixed(3)} L/kWh = <span style={{ color: '#fff', fontWeight: 800 }}>{waterConsumptionLPerHour.toFixed(3)} Liters/hr</span>
              </div>
            </div>

            {/* Card 4: Chiller Flow & Evaporative Loss */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
                <span>4. CHILLER FLOW & EVAPORATION</span>
                <span style={{ color: '#a855f7', fontFamily: 'JetBrains Mono, monospace' }}>L/min & L/hr</span>
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#a855f7'
              }}>
                Flow = P_server × 1.5 × η | Evap = Water × 0.95
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>Substituted Live Variables:</strong><br />
                Chiller: <span style={{ color: '#fff', fontWeight: 800 }}>{chillerFlowRateLPerMin.toFixed(2)} L/min</span> | Evap: <span style={{ color: '#fff', fontWeight: 800 }}>{evaporativeLossLPerHour.toFixed(3)} L/hr</span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TRANSFORMER SCALING (6·N·D) */}
        {activeFormulaTab === 'training' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            
            {/* Card 1: 6 * N * D FLOPs */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e' }}>
                TRANSFORMER COMPUTE SCALING LAW (KAPLAN & CHINCHILLA)
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#76B900'
              }}>
                Total FLOPs = 6 × N_parameters × D_tokens
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                6 × ({modelSizeBillion} × 10⁹) × ({datasetSizeBillion} × 10⁹) = <strong style={{ color: '#fff' }}>{(totalFlopsRequired / 1e21).toFixed(3)} ZettaFLOPs</strong><br />
                <span style={{ color: '#8b949e' }}>Theoretical floating-point operations for training forward and backward passes.</span>
              </div>
            </div>

            {/* Card 2: GPU Cluster Provisioning */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e' }}>
                HARDWARE CLUSTER SIZING AT 30% MFU
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#06b6d4'
              }}>
                GPUs = ⌈ FLOPs / (Target_Sec × GPU_TFLOPs × 0.30 MFU) ⌉
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                Requires: <strong style={{ color: '#fff' }}>{totalGpusNeeded} {selectedGpu.label} GPUs</strong> ({totalServersNeeded} × 8-GPU Cabinets)<br />
                <span style={{ color: '#8b949e' }}>Target Deadline: {targetDays} Days ({secondsInTargetDays.toLocaleString()} seconds).</span>
              </div>
            </div>

            {/* Card 3: Lifecycle Water Footprint */}
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b949e' }}>
                LIFECYCLE WATER & ENERGY FOOTPRINT
              </div>
              <div style={{
                background: '#070b0e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px',
                padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#38bdf8'
              }}>
                Water_total (L) = Energy_MWh × 1000 × WUE
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {estimatedTotalMWh.toFixed(2)} MWh × 1000 × {baseWue} = <strong style={{ color: '#00f2fe' }}>{estimatedTotalWaterLiters.toLocaleString()} Liters</strong><br />
                <span style={{ color: '#8b949e' }}>Equivalent to {((estimatedTotalWaterLiters / 2500000) * 100).toFixed(2)}% of an Olympic swimming pool.</span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: QWEN AI MATHEMATICAL PROOF */}
        {activeFormulaTab === 'proof' && (
          <div style={{
            background: '#070b0e',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '6px',
            padding: '1rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.72rem',
            lineHeight: '1.6',
            color: '#e2e8f0',
            maxHeight: '260px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {aiMathResult?.qwen_derivation || (
              aiComputing ? '⏳ Qwen 2.5 is computing thermodynamic equations from live platform telemetry...' :
              'Click "Re-calculate with Qwen" to generate an on-the-fly thermodynamic mathematical proof.'
            )}
          </div>
        )}

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
