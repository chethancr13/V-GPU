import { useEffect, useState } from 'react'
import { useSharedMetrics } from '../contexts/MetricsContext'
import { getCachedDatasets, getCachedScripts } from '../api/cache'
import { Server, Database, Activity, Play, Terminal, Cpu, Network, Layers, RefreshCw, Send, Square, Check, AlertTriangle, Shield, CheckCircle, Battery, Droplet, Zap, Fuel, Power, Cable, Thermometer, Gauge } from 'lucide-react'

function AIDataCenter({ isActive = true }) {
  const [data, setData] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [scripts, setScripts] = useState([])
  
  const [serversList, setServersList] = useState([
    { id: 'rack-gpu-0', name: 'GPU-HOST-01', x: 2, y: 2, type: 'gpu', gpuId: 0, label: 'ALPHA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350, initialTemp: 40 },
    { id: 'rack-gpu-1', name: 'GPU-HOST-02', x: 5, y: 2, type: 'gpu', gpuId: 1, label: 'BETA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350, initialTemp: 40 },
    { id: 'rack-scheduler', name: 'TASK SCHEDULER', x: 2, y: 5, type: 'scheduler', label: 'CONTROL CORE' },
    { id: 'rack-storage', name: 'NVMe ARRAY', x: 5, y: 5, type: 'storage', label: 'BLOCK STG' },
    { id: 'rack-pdu-1', name: 'PDU-A', x: 0, y: 2, type: 'pdu', label: 'POWER DIST A', phase: 'A', capacity: 60 },
    { id: 'rack-pdu-2', name: 'PDU-B', x: 0, y: 5, type: 'pdu', label: 'POWER DIST B', phase: 'B', capacity: 60 },
    { id: 'rack-ups', name: 'MAIN UPS', x: 7, y: 2, type: 'ups', label: 'UPS SYSTEM', rating: 500 },
    { id: 'rack-generator', name: 'DIESEL GEN', x: 7, y: 5, type: 'generator', label: 'BACKUP GEN', rating: 600 },
    { id: 'rack-battery', name: 'BATTERY BANK', x: 7, y: 0, type: 'battery', label: 'LI-ION BANK' },
    { id: 'rack-chiller', name: 'COOLANT CHILLER', x: 3, y: 0, type: 'chiller', label: 'WATER CHILLER' },
    { id: 'vent-01', name: 'Floor Vent 1', x: 2, y: 3, type: 'vent' },
    { id: 'vent-02', name: 'Floor Vent 2', x: 5, y: 3, type: 'vent' },
    { id: 'vent-03', name: 'Floor Vent 3', x: 3, y: 4, type: 'vent' },
    { id: 'vent-04', name: 'Floor Vent 4', x: 6, y: 4, type: 'vent' },
    { id: 'crac-01', name: 'CRAC Unit A', x: 0, y: 3, type: 'crac' },
    { id: 'crac-02', name: 'CRAC Unit B', x: 7, y: 3, type: 'crac' }
  ])

  const [rotationAngle, setRotationAngle] = useState(45)
  const [dragStart, setDragStart] = useState(null)
  const [viewMode, setViewMode] = useState('3D')
  const [hubTab, setHubTab] = useState('SITES')
  const [activeTab, setActiveTab] = useState(null)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provName, setProvName] = useState('GPU-NODE-03')
  const [provType, setProvType] = useState('gpu')
  const [provX, setProvX] = useState(2)
  const [provY, setProvY] = useState(4)
  const [provModel, setProvModel] = useState('NVIDIA A100 SXM (80GB)')
  const [provPower, setProvPower] = useState(300)
  const [provError, setProvError] = useState('')
  const [gpuStressStates, setGpuStressStates] = useState({ 0: false, 1: false })

  const [isDispatching, setIsDispatching] = useState(false)
  const [customTelemetry, setCustomTelemetry] = useState({})
  const [selectedScript, setSelectedScript] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [selectedVgpu, setSelectedVgpu] = useState('ALL_FLEET')
  const [dispatchMessage, setDispatchMessage] = useState('')
  const [vent5Replaced, setVent5Replaced] = useState(false)
  const [cracPumpHigh, setCracPumpHigh] = useState(false)
  const [allocationDefragged, setAllocationDefragged] = useState(false)
  const [genActive, setGenActive] = useState(false)
  const [batteryCharging, setBatteryCharging] = useState(true)
  const [showWiring, setShowWiring] = useState(true)

  const [powerTel, setPowerTel] = useState({
    upsLoad: 45, upsBattery: 87,
    genFuel: 92, genRpm: 1800, genOutput: 0,
    batteryCharge: 78, batteryTemp: 32,
    pdu1Load: 62, pdu2Load: 55,
    chillerFlow: 240, chillerSupply: 12, chillerReturn: 28,
    waterConsumption: 180, wue: 0.31,
  })

  // Simulated power/UPS telemetry — slowed from 1.5s to 3s to reduce re-renders
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setPowerTel(prev => ({
        ...prev,
        upsLoad: Math.max(20, Math.min(95, prev.upsLoad + (Math.random() - 0.5) * 4)),
        upsBattery: Math.max(10, Math.min(100, prev.upsBattery + (Math.random() - 0.5) * 0.5)),
        genRpm: genActive ? 1800 + Math.random() * 20 : 0,
        genOutput: genActive ? 350 + Math.random() * 20 : 0,
        genFuel: genActive ? Math.max(5, prev.genFuel - 0.05) : prev.genFuel,
        batteryCharge: batteryCharging ? Math.min(100, prev.batteryCharge + 0.1) : Math.max(20, prev.batteryCharge - 0.15),
        batteryTemp: prev.batteryTemp + (Math.random() - 0.5) * 0.3,
        pdu1Load: Math.max(30, Math.min(90, prev.pdu1Load + (Math.random() - 0.5) * 3)),
        pdu2Load: Math.max(30, Math.min(90, prev.pdu2Load + (Math.random() - 0.5) * 3)),
        chillerFlow: Math.max(180, Math.min(350, prev.chillerFlow + (Math.random() - 0.5) * 5)),
        waterConsumption: Math.max(150, Math.min(250, prev.waterConsumption + (Math.random() - 0.5) * 3)),
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [genActive, batteryCharging, isActive])

  // Shared WebSocket connection (replaces per-component WS)
  const { metrics: wsMetrics, isConnected } = useSharedMetrics()

  useEffect(() => {
    if (wsMetrics) setData(wsMetrics)
  }, [wsMetrics])

  useEffect(() => {
    getCachedDatasets().then(res => {
      setDatasets(res.datasets || [])
      if (res.datasets?.length > 0) setSelectedDataset(res.datasets[0])
    }).catch(e => console.error(e))
    getCachedScripts().then(res => {
      setScripts(res.scripts || [])
      if (res.scripts?.length > 0) setSelectedScript(res.scripts[0])
    }).catch(e => console.error(e))
  }, [])

  // Custom server telemetry simulation — slowed from 1s to 3s to reduce re-renders
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setCustomTelemetry(prev => {
        const next = { ...prev }
        serversList.forEach(obj => {
          if (obj.type === 'gpu' && obj.gpuId && obj.gpuId.toString().startsWith('custom_')) {
            const isStressed = gpuStressStates[obj.gpuId]
            const baseTemp = obj.initialTemp || 38
            const maxPwr = obj.powerLimit || 300
            if (isStressed) {
              next[obj.gpuId] = { gpu_utilization: 95.0 + Math.random() * 2, power_draw: maxPwr * 0.9 + Math.random() * 8, temperature: baseTemp + 44.0 + (Math.random() - 0.5) * 0.8 }
            } else {
              next[obj.gpuId] = { gpu_utilization: 0.5 + Math.random() * 2, power_draw: 42.0 + Math.random() * 4, temperature: baseTemp + (Math.random() - 0.5) * 0.8 }
            }
          }
        })
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [serversList, gpuStressStates, isActive])

  const handleMouseDown = (e) => { setDragStart({ x: e.clientX, angle: rotationAngle }) }
  const handleMouseMove = (e) => {
    if (!dragStart) return
    const deltaX = e.clientX - dragStart.x
    let newAngle = (dragStart.angle + deltaX * 0.45) % 360
    if (newAngle < 0) newAngle += 360
    setRotationAngle(newAngle)
  }
  const handleMouseUp = () => { setDragStart(null) }
  const handleTouchStart = (e) => { if (e.touches[0]) setDragStart({ x: e.touches[0].clientX, angle: rotationAngle }) }
  const handleTouchMove = (e) => {
    if (!dragStart || !e.touches[0]) return
    const deltaX = e.touches[0].clientX - dragStart.x
    let newAngle = (dragStart.angle + deltaX * 0.45) % 360
    if (newAngle < 0) newAngle += 360
    setRotationAngle(newAngle)
  }

  const handleDeployCabinet = async () => {
    setProvError('')
    const targetX = parseInt(provX)
    const targetY = parseInt(provY)
    const occupied = serversList.find(o => o.x === targetX && o.y === targetY)
    if (occupied) { setProvError(`Cell (${targetX}, ${targetY}) occupied by ${occupied.name}.`); return }
    const name = provName || `CUSTOM-CABINET-${serversList.length}`
    let gpuId = null
    if (provType === 'gpu') {
      try {
        const response = await fetch('http://localhost:8000/api/gpu/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, vram_mb: provModel.includes('80GB') ? 81920 : provModel.includes('48GB') ? 49152 : 32768, compute_limit: 100.0 })
        })
        if (!response.ok) throw new Error('Registration failed')
        const resData = await response.json()
        gpuId = resData.gpu_id
      } catch (err) { setProvError('Failed to register GPU: ' + err.message); return }
    }
    const customId = `rack-custom-${Date.now()}`
    setServersList([...serversList, { id: customId, name, x: targetX, y: targetY, type: provType, label: provType === 'gpu' ? 'CUSTOM GPU' : provType === 'storage' ? 'CUSTOM STG' : 'CUSTOM CRAC', model: provType === 'gpu' ? provModel : '', powerLimit: provType === 'gpu' ? parseInt(provPower) : 350, gpuId, initialTemp: 38 }])
    setIsProvisioning(false)
    setProvName(`GPU-NODE-0${serversList.filter(o => o.type === 'gpu').length + 1}`)
  }

  const handleToggleStress = async (gpuId) => {
    const isCustom = typeof gpuId === 'string' && gpuId.startsWith('custom_')
    const nextStressState = !gpuStressStates[gpuId]
    if (isCustom) { setGpuStressStates(prev => ({ ...prev, [gpuId]: nextStressState })) } else {
      try {
        const res = await fetch(`http://localhost:8000/api/gpu/${gpuId}/stress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stress: nextStressState })
        })
        const result = await res.json()
        if (result.status === 'success') setGpuStressStates(prev => ({ ...prev, [gpuId]: nextStressState }))
      } catch (err) { console.error(err) }
    }
  }

  const handleDispatchJob = async () => {
    setIsDispatching(true); setDispatchMessage('Initializing container sandbox...')
    if (selectedVgpu && selectedVgpu.toString().startsWith('custom_')) {
      await new Promise(r => setTimeout(r, 1500))
      setDispatchMessage(`Dispatch success! Trained on custom cluster. Accuracy: ${(90 + Math.random() * 8).toFixed(2)}%, Speed: ${(300 + Math.random() * 200).toFixed(0)} smp/s.`)
      setIsDispatching(false); return
    }
    try {
      const res = await fetch('http://localhost:8000/api/jobs/ml', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vgpu_id: selectedVgpu, script_name: selectedScript, dataset_name: selectedDataset || null })
      })
      const result = await res.json()
      setDispatchMessage(result.status === 'completed' ? `Success! Acc: ${result.accuracy?.toFixed(2)}%, Speed: ${result.speed?.toFixed(0)} smp/s.` : 'Execution terminated.')
    } catch (err) { setDispatchMessage('Connection error.') } finally { setIsDispatching(false) }
  }

  const customCracCount = serversList.filter(o => o.type === 'crac' && o.id.startsWith('rack-custom-')).length
  const coolingOffset = (vent5Replaced ? 4.5 : 0) + (cracPumpHigh ? 6.0 : 0) + (allocationDefragged ? 2.0 : 0) + (customCracCount * 3.8)

  const getGpuTemperature = (gpuId) => {
    if (gpuId === null || gpuId === undefined) return 38
    if (gpuId.toString().startsWith('custom_')) return customTelemetry[gpuId]?.temperature || 38
    const gpuBack = data?.physical_gpus?.[gpuId]
    return Math.max(30, (gpuBack ? gpuBack.temperature : 40) - coolingOffset)
  }

  const physicalGpuTemps = (data?.physical_gpus || []).map((gpu, i) => Math.max(30, gpu.temperature - coolingOffset))
  if (physicalGpuTemps.length === 0) { physicalGpuTemps.push(Math.max(30, 40 - coolingOffset)); physicalGpuTemps.push(Math.max(30, 40 - coolingOffset)) }
  const avgTemp = physicalGpuTemps.reduce((acc, t) => acc + t, 0) / physicalGpuTemps.length

  let totalGpuPowerDraw = 0
  if (data?.physical_gpus && data.physical_gpus.length > 0) {
    totalGpuPowerDraw = data.physical_gpus.reduce((acc, g) => acc + g.power_draw, 0)
  } else { totalGpuPowerDraw = 100 }
  serversList.forEach(obj => {
    if (obj.type === 'gpu' && obj.gpuId && obj.gpuId.toString().startsWith('custom_')) {
      const tel = customTelemetry[obj.gpuId] || { power_draw: 45 }
      totalGpuPowerDraw += tel.power_draw
    }
  })

  const activeJobs = data?.scheduler?.active_jobs || 0
  const queueLength = data?.scheduler?.queue_length || 0
  const itDcLoad = totalGpuPowerDraw + 120 + powerTel.pdu1Load * 2 + powerTel.pdu2Load * 2
  const itAcLoad = activeJobs * 25 + queueLength * 8 + 310
  const coolingPower = (avgTemp * 4.2) + (cracPumpHigh ? 160 : 75) + (customCracCount * 45) + powerTel.chillerFlow * 0.3
  const totalSitePower = itDcLoad + itAcLoad + coolingPower

  const handleInspect = (id) => {
    let targetId = id;
    if (id.startsWith('custom-')) {
      const index = parseInt(id.split('-')[1]);
      const customServers = serversList.filter(s => s.id.startsWith('rack-custom-'));
      if (customServers[index]) {
        targetId = customServers[index].id;
      } else {
        setIsProvisioning(true);
        return;
      }
    }
    const found = serversList.find(s => s.id === targetId);
    if (found) {
      setActiveTab(found);
    }
  };

  const isInspected = (id) => {
    if (!activeTab) return false;
    if (id.startsWith('custom-')) {
      const index = parseInt(id.split('-')[1]);
      const customServers = serversList.filter(s => s.id.startsWith('rack-custom-'));
      return activeTab.id === customServers[index]?.id;
    }
    return activeTab.id === id;
  };

  const inspected = activeTab ? (serversList.find(s => s.id === activeTab.id) || null) : null
  const gpuId = inspected?.type === 'gpu' ? inspected.gpuId : null
  const isCustomGpu = gpuId !== null && gpuId.toString().startsWith('custom_')
  let gpuMetrics = { gpu_utilization: 0, memory_used: 0, memory_total: 32768, temperature: 40, power_draw: 50 }
  if (gpuId !== null) {
    if (isCustomGpu) {
      gpuMetrics = customTelemetry[gpuId] || { gpu_utilization: 1.0, memory_used: 4096, memory_total: inspected.powerLimit > 350 ? 40960 : 24576, temperature: 38, power_draw: 45 }
    } else {
      const gpuBack = data?.physical_gpus?.[gpuId] || { gpu_utilization: 0, memory_used: 0, memory_total: 32768, temperature: 40, power_draw: 50 }
      gpuMetrics = { ...gpuBack, temperature: getGpuTemperature(gpuId) }
    }
  }
  const isGpuStressed = gpuId !== null ? gpuStressStates[gpuId] : false
  const childVgpus = gpuId !== null && !isCustomGpu && data?.vgpu_instances ? data.vgpu_instances.filter(v => v.physical_gpu_id === gpuId) : []

  // Helper to render a light silver/white server rack
  const renderDataCenterServerRack = (rx, ry, id) => {
    const h = 28;
    const w = 7;
    const d = 11;
    
    const t1 = { x: rx, y: ry - h }
    const t2 = { x: rx - w, y: ry - h + w*0.5 }
    const t3 = { x: rx - w + d, y: ry - h + w*0.5 + d*0.5 }
    const t4 = { x: rx + d, y: ry - h + d*0.5 }
    
    const b2 = { x: rx - w, y: ry + w*0.5 }
    const b3 = { x: rx - w + d, y: ry + w*0.5 + d*0.5 }
    const b4 = { x: rx + d, y: ry + d*0.5 }
    
    const active = isInspected(id);
    
    return (
      <g 
        key={`rack-${id}`}
        onClick={() => handleInspect(id)}
        style={{ cursor: 'pointer' }}
        filter={active ? 'url(#glow)' : ''}
      >
        <polygon points={`${rx},${ry} ${rx-w},${ry+w*0.5} ${rx-w+d},${ry+w*0.5+d*0.5} ${rx+d},${ry+d*0.5}`} fill="black" opacity="0.25" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill={active ? '#06b6d4' : '#94a3b8'} stroke={active ? '#00f2fe' : '#64748b'} strokeWidth="0.5" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill={active ? '#22d3ee' : '#cbd5e1'} stroke={active ? '#00f2fe' : '#64748b'} strokeWidth="0.5" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill={active ? '#e0f2fe' : '#f1f5f9'} stroke={active ? '#00f2fe' : '#cbd5e1'} strokeWidth="0.5" />
        
        {Array.from({ length: 5 }).map((_, idx) => {
          const ly = t4.y + (idx + 1) * (h / 6);
          const lx1 = t4.x - (t4.x - t3.x) * 0.15;
          const lx2 = t4.x - (t4.x - t3.x) * 0.85;
          return (
            <line
              key={idx}
              x1={lx1}
              y1={ly - idx * 0.4 + 1}
              x2={lx2}
              y2={ly - idx * 0.4 + 3}
              stroke={active ? '#083344' : '#475569'}
              strokeWidth="0.8"
            />
          )
        })}
      </g>
    )
  }

  // Helper to render cooling system air handlers
  const renderCoolingCabinet = (cx, cy, id) => {
    const h = 45;
    const w = 11;
    const d = 15;
    
    const t1 = { x: cx, y: cy - h }
    const t2 = { x: cx - w, y: cy - h + w*0.5 }
    const t3 = { x: cx - w + d, y: cy - h + w*0.5 + d*0.5 }
    const t4 = { x: cx + d, y: cy - h + d*0.5 }
    
    const b2 = { x: cx - w, y: cy + w*0.5 }
    const b3 = { x: cx - w + d, y: cy + w*0.5 + d*0.5 }
    const b4 = { x: cx + d, y: cy + d*0.5 }
    
    const active = isInspected(id);
    
    return (
      <g 
        key={`cab-${id}`}
        onClick={() => handleInspect(id)}
        style={{ cursor: 'pointer' }}
        filter={active ? 'url(#glow)' : ''}
      >
        <polygon points={`${cx},${cy} ${cx-w},${cy+w*0.5} ${cx-w+d},${cy+w*0.5+d*0.5} ${cx+d},${cy+d*0.5}`} fill="black" opacity="0.2" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill={active ? '#0e7490' : '#7f97c7'} stroke={active ? '#06b6d4' : '#5d729e'} strokeWidth="0.5" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill={active ? '#06b6d4' : '#b4c6e7'} stroke={active ? '#06b6d4' : '#5d729e'} strokeWidth="0.5" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill={active ? '#cffafe' : '#d9e1f2'} stroke={active ? '#06b6d4' : '#b4c6e7'} strokeWidth="0.5" />
      </g>
    )
  }

  // Helper to render water cooling towers with active fan spinners
  const renderAIWaterCoolingTower = (tx, ty, id) => {
    const h = 42;
    const w = 24;
    const d = 26;
    
    const t1 = { x: tx, y: ty - h }
    const t2 = { x: tx - w, y: ty - h + w*0.5 }
    const t3 = { x: tx - w + d, y: ty - h + w*0.5 + d*0.5 }
    const t4 = { x: tx + d, y: ty - h + d*0.5 }
    
    const b2 = { x: tx - w, y: ty + w*0.5 }
    const b3 = { x: tx - w + d, y: ty + w*0.5 + d*0.5 }
    const b4 = { x: tx + d, y: ty + d*0.5 }
    
    const fc = { x: (t1.x + t3.x)/2, y: (t1.y + t3.y)/2 }
    
    const active = isInspected('rack-chiller');
    
    return (
      <g 
        key={`cooltower-${id}`}
        onClick={() => handleInspect('rack-chiller')}
        style={{ cursor: 'pointer' }}
        filter={active ? 'url(#glow)' : ''}
      >
        <polygon points={`${tx},${ty} ${tx-w},${ty+w*0.5} ${tx-w+d},${ty+w*0.5+d*0.5} ${tx+d},${ty+d*0.5}`} fill="black" opacity="0.25" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill={active ? '#155e75' : '#29505a'} stroke={active ? '#22d3ee' : '#1c373e'} strokeWidth="0.8" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill={active ? '#06b6d4' : '#3f7685'} stroke={active ? '#22d3ee' : '#1c373e'} strokeWidth="0.8" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill={active ? '#e0f2fe' : '#64a5b5'} stroke={active ? '#22d3ee' : '#3f7685'} strokeWidth="0.8" />
        
        {Array.from({ length: 4 }).map((_, idx) => {
          const ly = t4.y + (idx + 1) * (h / 5);
          const lx1 = t4.x - (t4.x - t3.x) * 0.15;
          const lx2 = t4.x - (t4.x - t3.x) * 0.85;
          return (
            <line
              key={idx}
              x1={lx1}
              y1={ly - idx * 0.4 + 1}
              x2={lx2}
              y2={ly - idx * 0.4 + 3}
              stroke={active ? '#083344' : '#132a30'}
              strokeWidth="1.5"
            />
          )
        })}

        <ellipse cx={fc.x} cy={fc.y} rx="16" ry="8" fill="#132a30" stroke="#0b1b1f" strokeWidth="1" />
        
        <g transform={`translate(${fc.x}, ${fc.y}) scale(1, 0.5)`}>
          <g className="fan-spinner" style={{ animationDuration: avgTemp > 50 ? '0.3s' : '0.65s' }}>
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" stroke="#94a3b8" strokeWidth="2" />
            <line x1="8.5" y1="-8.5" x2="-8.5" y2="8.5" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="0" cy="0" r="3" fill="#cbd5e1" />
          </g>
        </g>

        <path d={`M ${fc.x - 6} ${fc.y - 12} Q ${fc.x - 10} ${fc.y - 25} ${fc.x - 5} ${fc.y - 35}`} className="wind-wave" style={{ animationDelay: '0s' }} />
        <path d={`M ${fc.x + 6} ${fc.y - 10} Q ${fc.x + 2} ${fc.y - 22} ${fc.x + 8} ${fc.y - 32}`} className="wind-wave" style={{ animationDelay: '0.8s' }} />
      </g>
    )
  }

  // Helper to render UPS battery racks (blue/red)
  const renderUPSRack = (ux, uy, isRed, id) => {
    const h = 34;
    const w = 9;
    const d = 13;
    
    const t1 = { x: ux, y: uy - h }
    const t2 = { x: ux - w, y: uy - h + w*0.5 }
    const t3 = { x: ux - w + d, y: uy - h + w*0.5 + d*0.5 }
    const t4 = { x: ux + d, y: uy - h + d*0.5 }
    
    const b2 = { x: ux - w, y: uy + w*0.5 }
    const b3 = { x: ux - w + d, y: uy + w*0.5 + d*0.5 }
    const b4 = { x: ux + d, y: uy + d*0.5 }
    
    const active = isInspected('rack-ups');
    const sideColor = isRed ? '#991b1b' : '#1e3a8a';
    const frontColor = isRed ? '#ef4444' : '#3b82f6';
    const strokeColor = active ? '#f59e0b' : (isRed ? '#7f1d1d' : '#1d4ed8');
    
    return (
      <g 
        key={`ups-${id}`}
        onClick={() => handleInspect('rack-ups')}
        style={{ cursor: 'pointer' }}
        filter={active ? 'url(#glow)' : ''}
      >
        <polygon points={`${ux},${uy} ${ux-w},${uy+w*0.5} ${ux-w+d},${uy+w*0.5+d*0.5} ${ux+d},${uy+d*0.5}`} fill="black" opacity="0.2" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill={sideColor} stroke={strokeColor} strokeWidth="0.5" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill={frontColor} stroke={strokeColor} strokeWidth="0.5" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill="#e2e8f0" stroke={active ? '#f59e0b' : '#cbd5e1'} strokeWidth="0.5" />
        
        {/* Status LEDs on front face */}
        <circle cx={t4.x - (t4.x-t3.x)*0.3} cy={t4.y + 6} r="1.5" fill="#22c55e" />
        <circle cx={t4.x - (t4.x-t3.x)*0.6} cy={t4.y + 6} r="1.5" fill="#eab308" />
      </g>
    )
  }

  // Helper to render diesel generators with active fans and backup exhaust puffs
  const renderDieselGenerator = (gx, gy, id) => {
    const h = 38;
    const w = 18;
    const d = 30;
    
    const t1 = { x: gx, y: gy - h }
    const t2 = { x: gx - w, y: gy - h + w*0.5 }
    const t3 = { x: gx - w + d, y: gy - h + w*0.5 + d*0.5 }
    const t4 = { x: gx + d, y: gy - h + d*0.5 }
    
    const b2 = { x: gx - w, y: gy + w*0.5 }
    const b3 = { x: gx - w + d, y: gy + w*0.5 + d*0.5 }
    const b4 = { x: gx + d, y: gy + d*0.5 }
    
    const active = isInspected('rack-generator');
    const strokeColor = active ? '#f59e0b' : '#b45309';
    
    return (
      <g 
        key={`gen-${id}`}
        onClick={() => handleInspect('rack-generator')}
        style={{ cursor: 'pointer' }}
        filter={active ? 'url(#glow)' : ''}
      >
        <polygon points={`${gx},${gy} ${gx-w},${gy+w*0.5} ${gx-w+d},${gy+w*0.5+d*0.5} ${gx+d},${gy+d*0.5}`} fill="black" opacity="0.3" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill="#d97706" stroke={strokeColor} strokeWidth="0.8" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill="#f59e0b" stroke={strokeColor} strokeWidth="0.8" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill="#fef08a" stroke={strokeColor} strokeWidth="0.8" />
        
        <line x1={t2.x + 5} y1={t2.y + w*0.5 + 4} x2={t2.x + 5} y2={b2.y + w*0.5 - 4} stroke={strokeColor} strokeWidth="2" />
        <line x1={t2.x + 12} y1={t2.y + w*0.5 + 7} x2={t2.x + 12} y2={b2.y + w*0.5 - 1} stroke={strokeColor} strokeWidth="2" />
        
        <path d={`M ${t1.x + d*0.3} ${t1.y + d*0.15} L ${t1.x + d*0.3} ${t1.y - 12} L ${t1.x + d*0.3 + 8} ${t1.y - 16}`} fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        {genActive && (
          <circle cx={t1.x + d*0.3 + 12} cy={t1.y - 18} r="4" fill="#64748b" opacity="0.6" className="wind-wave" />
        )}

        <g transform={`translate(${t3.x - 14}, ${t3.y - 12})`}>
          <circle cx="0" cy="0" r="16" fill="#1e293b" stroke={strokeColor} strokeWidth="2" />
          <circle cx="0" cy="0" r="14" fill="#0f172a" />
          <g className="fan-spinner" style={{ animationDuration: genActive ? '0.2s' : '0.9s' }}>
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#94a3b8" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="3.5" fill="#cbd5e1" />
          </g>
        </g>
      </g>
    )
  }

  // Helper to render white admin / control cabinets
  const renderAdminCabinet = (ax, ay, id) => {
    const h = 32;
    const w = 12;
    const d = 16;
    
    const t1 = { x: ax, y: ay - h }
    const t2 = { x: ax - w, y: ay - h + w*0.5 }
    const t3 = { x: ax - w + d, y: ay - h + w*0.5 + d*0.5 }
    const t4 = { x: ax + d, y: ay - h + d*0.5 }
    
    const b2 = { x: ax - w, y: ay + w*0.5 }
    const b3 = { x: ax - w + d, y: ay + w*0.5 + d*0.5 }
    const b4 = { x: ax + d, y: ay + d*0.5 }
    
    const active = isInspected('rack-battery');
    const strokeColor = active ? '#06b6d4' : '#cbd5e1';
    
    return (
      <g 
        key={`admin-${id}`}
        onClick={() => handleInspect('rack-battery')}
        style={{ cursor: 'pointer' }}
        filter={active ? 'url(#glow)' : ''}
      >
        <polygon points={`${ax},${ay} ${ax-w},${ay+w*0.5} ${ax-w+d},${ay+w*0.5+d*0.5} ${ax+d},${ay+d*0.5}`} fill="black" opacity="0.25" />
        <polygon points={`${t2.x},${t2.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b2.x},${b2.y}`} fill="#e2e8f0" stroke={strokeColor} strokeWidth="0.8" />
        <polygon points={`${t4.x},${t4.y} ${t3.x},${t3.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`} fill="#cbd5e1" stroke={strokeColor} strokeWidth="0.8" />
        <polygon points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} fill="#f8fafc" stroke={strokeColor} strokeWidth="0.8" />
        <line x1={t4.x - (t4.x-t3.x)*0.5} y1={t4.y + 4} x2={t4.x - (t4.x-t3.x)*0.5} y2={b4.y + 4} stroke={active ? '#06b6d4' : '#94a3b8'} strokeWidth="1" />
      </g>
    )
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#070b0e', minHeight: '100%', color: '#c9d1d9' }}>
      
      <style>{`
        @keyframes dc-dash { to { stroke-dashoffset: -40; } }
        @keyframes flow-cool { 0% { stroke-dashoffset: 0; opacity: 0.1; } 50% { opacity: 0.8; } 100% { stroke-dashoffset: -50; opacity: 0.1; } }
        @keyframes spin-fan { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wind-wave-anim { 0% { transform: translateY(0) scaleX(0.8); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(-22px) scaleX(1.15); opacity: 0; } }
        .animated-cable { stroke-dasharray: 6, 4; animation: dc-dash 1.5s linear infinite; }
        .cooling-flow { stroke-dasharray: 5, 10; animation: flow-cool 3s linear infinite; }
        .power-flow { stroke-dasharray: 8, 6; animation: dc-dash 2s linear infinite; }
        .water-flow { stroke-dasharray: 4, 8; animation: flow-cool 2.5s linear infinite; }
        .site-tab-active { border-bottom: 2px solid var(--accent); color: var(--text-primary); font-weight: 700; }
        .site-tab-inactive { color: var(--text-secondary); cursor: pointer; }
        .fan-spinner { animation: spin-fan 0.65s linear infinite; transform-origin: 0px 0px; }
        .wind-wave { animation: wind-wave-anim 1.8s ease-out infinite; stroke: #64a5b5; stroke-width: 1.2; fill: none; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.05em' }}>AI POWER SUPPLY & COOLING CONTROLS</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>AI Power Supply • Grid • Substation • Cooling Systems</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowWiring(!showWiring)}
            style={{ padding: '0.35rem 0.75rem', background: showWiring ? 'rgba(118,185,0,0.15)' : 'var(--gray)', border: showWiring ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: showWiring ? 'var(--accent)' : '#fff' }}>
            {showWiring ? 'HIDE WIRING' : 'SHOW WIRING'}
          </button>
          <button onClick={() => setIsProvisioning(!isProvisioning)}
            style={{ padding: '0.35rem 0.75rem', background: isProvisioning ? 'rgba(118,185,0,0.2)' : 'var(--gray)', border: isProvisioning ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: isProvisioning ? 'var(--accent)' : '#fff' }}>
            PROVISION CABINET
          </button>
        </div>
      </div>

      {/* Layout Split: Left Visualizer, Right Telemetry & Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.5fr 4.5fr', gap: '1.5rem', marginBottom: '1rem' }}>
        
        {/* Visualizer Area */}
        <div 
          style={{ 
            position: 'relative', 
            width: '100%', 
            height: '450px', 
            background: '#0e141a', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            userSelect: 'none' 
          }}
        >
          <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} viewBox="0 0 900 500">
            <defs>
              <filter id="shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              
              <linearGradient id="pylonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              <marker id="substation-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#eab308" />
              </marker>
            </defs>

            {/* Wrapper Group for Alignment and Fitting */}
            <g transform="translate(10, 15) scale(0.95)">
              
              {/* Green Lawn Isometric Base Plate */}
              <polygon points="40,290 410,70 870,270 480,490" fill="#142217" stroke="#22c55e" strokeWidth="1.2" opacity="0.3" />
              
              {/* Small green bushes / plants on the left */}
              <circle cx="65" cy="300" r="10" fill="#1b381e" stroke="#2c5e32" strokeWidth="1" />
              <circle cx="80" cy="315" r="8" fill="#1b381e" stroke="#2c5e32" strokeWidth="1" />
              <circle cx="60" cy="330" r="12" fill="#152b17" stroke="#224825" strokeWidth="1" />

              {/* ELECTRICITY TRANSMISSION PATHS */}
              {/* Pulsing yellow electricity wires from Pylon to Substation */}
              {showWiring && (
                <g style={{ opacity: 0.85 }}>
                  <path d="M 95 125 Q 110 220 170 300" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="6,8" className="power-flow" filter="url(#glow)" />
                  <path d="M 165 125 Q 170 220 180 300" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="6,8" className="power-flow" filter="url(#glow)" />
                  <path d="M 102 95 Q 130 210 190 300" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="6,8" className="power-flow" filter="url(#glow)" />
                  <path d="M 158 95 Q 140 210 200 300" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="6,8" className="power-flow" filter="url(#glow)" />
                </g>
              )}

              {/* Substation conduit going into Computer Room */}
              {showWiring && (
                <path d="M 220 340 Q 250 355 280 270" fill="none" stroke="#e3a808" strokeWidth="3" className="power-flow" opacity="0.75" />
              )}

              {/* --- Electricity Transmission Tower (Pylon) --- */}
              <g transform="translate(130, 270)">
                {/* Shadow */}
                <ellipse cx="0" cy="0" rx="30" ry="15" fill="black" opacity="0.45" filter="url(#shadow-blur)" />
                {/* Structure Lines */}
                <line x1="-25" y1="-15" x2="-5" y2="-140" stroke="url(#pylonGrad)" strokeWidth="2.5" />
                <line x1="25" y1="-15" x2="5" y2="-140" stroke="url(#pylonGrad)" strokeWidth="2.5" />
                <line x1="0" y1="0" x2="0" y2="-140" stroke="url(#pylonGrad)" strokeWidth="2.5" opacity="0.6" />
                <line x1="0" y1="-30" x2="0" y2="-140" stroke="url(#pylonGrad)" strokeWidth="2.5" opacity="0.6" />
                {/* Upper shaft */}
                <line x1="-5" y1="-140" x2="-3" y2="-200" stroke="url(#pylonGrad)" strokeWidth="2" />
                <line x1="5" y1="-140" x2="3" y2="-200" stroke="url(#pylonGrad)" strokeWidth="2" />
                <line x1="-3" y1="-200" x2="0" y2="-225" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="3" y1="-200" x2="0" y2="-225" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                {/* Cross braces */}
                <line x1="-25" y1="-15" x2="0" y2="-70" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="25" y1="-15" x2="0" y2="-70" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="0" y1="0" x2="0" y2="-70" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="-25" y1="-15" x2="0" y2="-110" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="25" y1="-15" x2="0" y2="-110" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="-5" y1="-140" x2="5" y2="-175" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                <line x1="5" y1="-140" x2="-5" y2="-175" stroke="url(#pylonGrad)" strokeWidth="1.5" />
                {/* Crossarms */}
                <line x1="-35" y1="-160" x2="35" y2="-160" stroke="url(#pylonGrad)" strokeWidth="2.2" />
                <line x1="-28" y1="-190" x2="28" y2="-190" stroke="url(#pylonGrad)" strokeWidth="2.2" />
                {/* Crossarm struts */}
                <line x1="-35" y1="-160" x2="0" y2="-145" stroke="url(#pylonGrad)" strokeWidth="1.2" />
                <line x1="35" y1="-160" x2="0" y2="-145" stroke="url(#pylonGrad)" strokeWidth="1.2" />
                <line x1="-28" y1="-190" x2="0" y2="-175" stroke="url(#pylonGrad)" strokeWidth="1.2" />
                <line x1="28" y1="-190" x2="0" y2="-175" stroke="url(#pylonGrad)" strokeWidth="1.2" />
                {/* Insulators */}
                <line x1="-35" y1="-160" x2="-35" y2="-145" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="35" y1="-160" x2="35" y2="-145" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="-28" y1="-190" x2="-28" y2="-175" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="28" y1="-190" x2="28" y2="-175" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2,2" />
              </g>

              {/* --- Substation / Transformers --- */}
              <g>
                {/* Transformer 1 (back) */}
                <g>
                  <ellipse cx="180" cy="330" rx="20" ry="10" fill="black" opacity="0.3" filter="url(#shadow-blur)" />
                  <polygon points="165,305 195,320 195,335 165,320" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="0.8" />
                  <polygon points="195,320 195,335 205,330 205,315" fill="#991b1b" stroke="#7f1d1d" strokeWidth="0.8" />
                  <polygon points="165,305 195,320 205,315 175,300" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
                  {/* Cooling fins */}
                  <line x1="172" y1="324" x2="172" y2="312" stroke="#7f1d1d" strokeWidth="1.2" />
                  <line x1="179" y1="327" x2="179" y2="315" stroke="#7f1d1d" strokeWidth="1.2" />
                  <line x1="186" y1="331" x2="186" y2="319" stroke="#7f1d1d" strokeWidth="1.2" />
                  {/* HV bushings */}
                  <line x1="175" y1="305" x2="175" y2="297" stroke="#94a3b8" strokeWidth="1.5" />
                  <line x1="185" y1="310" x2="185" y2="302" stroke="#94a3b8" strokeWidth="1.5" />
                  <circle cx="175" cy="297" r="2.2" fill="#ef4444" />
                  <circle cx="185" cy="302" r="2.2" fill="#ef4444" />
                </g>

                {/* Transformer 2 (front) */}
                <g>
                  <ellipse cx="220" cy="355" rx="20" ry="10" fill="black" opacity="0.3" filter="url(#shadow-blur)" />
                  <polygon points="205,330 235,345 235,360 205,345" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="0.8" />
                  <polygon points="235,345 235,360 245,355 245,340" fill="#991b1b" stroke="#7f1d1d" strokeWidth="0.8" />
                  <polygon points="205,330 235,345 245,340 215,325" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
                  {/* Cooling fins */}
                  <line x1="212" y1="349" x2="212" y2="337" stroke="#7f1d1d" strokeWidth="1.2" />
                  <line x1="219" y1="352" x2="219" y2="340" stroke="#7f1d1d" strokeWidth="1.2" />
                  <line x1="226" y1="356" x2="226" y2="344" stroke="#7f1d1d" strokeWidth="1.2" />
                  {/* HV bushings */}
                  <line x1="215" y1="330" x2="215" y2="322" stroke="#94a3b8" strokeWidth="1.5" />
                  <line x1="225" y1="335" x2="225" y2="327" stroke="#94a3b8" strokeWidth="1.5" />
                  <circle cx="215" cy="322" r="2.2" fill="#ef4444" />
                  <circle cx="225" cy="327" r="2.2" fill="#ef4444" />
                </g>
              </g>

              {/* --- Computer Room --- */}
              <g>
                {/* Platform Slab */}
                <polygon points="380,150  550,235  380,320  210,235" fill="#1c2530" stroke="#334155" strokeWidth="1" />
                {/* 3D Extrusion Side */}
                <polygon points="210,235  380,320  380,328  210,243" fill="#101720" stroke="#253545" strokeWidth="0.5" />
                <polygon points="550,235  380,320  380,328  550,243" fill="#0b1016" stroke="#253545" strokeWidth="0.5" />
                
                {/* Enclosure Fence Post Verticals */}
                <line x1="210" y1="235" x2="210" y2="185" stroke="#475569" strokeWidth="1.8" />
                <line x1="380" y1="150" x2="380" y2="100" stroke="#475569" strokeWidth="1.8" />
                <line x1="550" y1="235" x2="550" y2="185" stroke="#475569" strokeWidth="1.8" />
                <line x1="380" y1="320" x2="380" y2="270" stroke="#475569" strokeWidth="1.8" />
                {/* Enclosure Horizontal Rails */}
                <path d="M 210 175 L 380 90 L 550 175 L 380 260 Z" fill="none" stroke="#475569" strokeWidth="1.5" />
                <path d="M 210 200 L 380 115 L 550 200 L 380 285 Z" fill="none" stroke="#334155" strokeWidth="1.2" />
                {/* Semi-transparent Glass panels */}
                <polygon points="210,235 210,175 380,90 380,140" fill="rgba(148,163,184,0.06)" stroke="none" />
                <polygon points="380,140 380,90 550,175 550,225" fill="rgba(148,163,184,0.06)" stroke="none" />

                {/* Fire Suppression Gas Cylinders at entrance */}
                <g transform="translate(235, 245)">
                  <ellipse cx="0" cy="0" rx="6" ry="3" fill="black" opacity="0.3" />
                  <rect x="-3" y="-18" width="6" height="18" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
                  <rect x="-3" y="-18" width="1.5" height="18" fill="#fca5a5" opacity="0.6" />
                  <path d="M -1 -18 L -1 -22 L 1 -22" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
                </g>
                <g transform="translate(245, 250)">
                  <ellipse cx="0" cy="0" rx="6" ry="3" fill="black" opacity="0.3" />
                  <rect x="-3" y="-18" width="6" height="18" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
                  <rect x="-3" y="-18" width="1.5" height="18" fill="#fca5a5" opacity="0.6" />
                  <path d="M -1 -18 L -1 -22 L 1 -22" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
                </g>

                {/* Server Cabinets inside - Rendered Back to Front */}
                {/* Row 1 (back-left) */}
                {renderDataCenterServerRack(290, 205, 'rack-gpu-0')}
                {renderDataCenterServerRack(320, 190, 'rack-gpu-1')}
                {renderDataCenterServerRack(350, 175, 'rack-scheduler')}
                {/* Row 2 (middle) */}
                {renderDataCenterServerRack(320, 230, 'rack-storage')}
                {renderDataCenterServerRack(350, 215, 'rack-pdu-1')}
                {renderDataCenterServerRack(380, 200, 'rack-pdu-2')}
                {/* Row 3 (front-right) */}
                {renderDataCenterServerRack(350, 255, 'custom-0')}
                {renderDataCenterServerRack(380, 240, 'custom-1')}
                {renderDataCenterServerRack(410, 225, 'custom-2')}
              </g>

              {/* --- Cooling System Cabinets (Back Center) --- */}
              <g>
                {renderCoolingCabinet(470, 180, 'crac-01')}
                {renderCoolingCabinet(500, 165, 'crac-02')}
                {renderCoolingCabinet(530, 150, 'crac-03')}
              </g>

              {/* --- UPS Battery Racks (Red/Blue) --- */}
              <g>
                {renderUPSRack(500, 250, false, 'ups-01')}
                {renderUPSRack(530, 235, true, 'ups-02')}
                {renderUPSRack(560, 220, false, 'ups-03')}
              </g>

              {/* --- Control Room Desk & Operator --- */}
              <g transform="translate(430, 340)">
                {/* Shadow */}
                <ellipse cx="0" cy="0" rx="22" ry="10" fill="black" opacity="0.3" />
                {/* Desk Frame */}
                <polygon points="-20,-5 20,-15 20,-3 -20,7" fill="#475569" stroke="#334155" strokeWidth="0.5" />
                <polygon points="-20,-15 -20,-5 -5,2 -5,-8" fill="#1e293b" />
                <polygon points="20,-25 20,-15 5,-8 5,-18" fill="#334155" />
                {/* Desktop surface (curved console) */}
                <polygon points="-20,-15 20,-25 10,-30 -10,-20" fill="#334155" stroke="#1e293b" strokeWidth="0.5" />
                {/* Glowing Monitor screens */}
                <g transform="translate(-10, -26) scale(0.6)">
                  <rect x="-8" y="-12" width="16" height="10" fill="#030712" stroke="#00f2fe" strokeWidth="1" filter="url(#glow)" />
                  <path d="M -6 -7 L -2 -9 L 2 -6 L 6 -10" fill="none" stroke="#22d3ee" strokeWidth="0.8" />
                </g>
                <g transform="translate(5, -28) scale(0.6)">
                  <rect x="-8" y="-12" width="16" height="10" fill="#030712" stroke="#00f2fe" strokeWidth="1" filter="url(#glow)" />
                  <path d="M -6 -10 L 0 -5 L 6 -8" fill="none" stroke="#22d3ee" strokeWidth="0.8" />
                </g>
                {/* Chair & Operator */}
                <circle cx="-5" cy="5" r="5" fill="#475569" />
                <circle cx="-5" cy="-2" r="3.5" fill="#f8fafc" />
                <path d="M -8 5 Q -5 -2 -2 5 Z" fill="#334155" />
              </g>

              {/* --- White Administration / Control Cabinets --- */}
              <g>
                {renderAdminCabinet(600, 270, 'admin-01')}
                {renderAdminCabinet(630, 255, 'admin-02')}
                {renderAdminCabinet(660, 240, 'admin-03')}
              </g>

              {/* --- Blue Cooling Water Pipeline --- */}
              <g>
                <path d="M 690 310 L 465 425" fill="none" stroke="#1d4ed8" strokeWidth="4.5" />
                {/* Moving water flow indicators */}
                <path d="M 690 310 L 465 425" fill="none" stroke="#60a5fa" strokeWidth="4.5" strokeDasharray="5,15" className="water-flow" filter="url(#glow)" />
                {/* Incoming water blue arrow */}
                <path d="M 675 298 L 695 308 L 680 318" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                {/* Floating water droplets */}
                <circle cx="690" cy="285" r="2" fill="#60a5fa" className="wind-wave" style={{ animationDelay: '0s' }} />
                <circle cx="700" cy="295" r="3.2" fill="#3b82f6" className="wind-wave" style={{ animationDelay: '0.6s' }} />
                <circle cx="682" cy="298" r="1.8" fill="#93c5fd" className="wind-wave" style={{ animationDelay: '1.2s' }} />
              </g>

              {/* --- Cooling Towers (Front Right) --- */}
              <g>
                {renderAIWaterCoolingTower(500, 390, 'tower-01')}
                {renderAIWaterCoolingTower(560, 360, 'tower-02')}
                {renderAIWaterCoolingTower(620, 330, 'tower-03')}
              </g>

              {/* --- Diesel Generators & Wall Condenser Fans (Far Right) --- */}
              <g>
                {renderDieselGenerator(710, 310, 'gen-01')}
                {renderDieselGenerator(770, 280, 'gen-02')}
                {renderDieselGenerator(830, 250, 'gen-03')}
              </g>

              {/* --- Connector Lines & Badge Labels (Matching Merged Reference Images) --- */}
              <g style={{ fontFamily: 'system-ui, sans-serif', fontSize: '9px', fontWeight: 'bold' }}>
                {/* 1. Electricity Badge */}
                <line x1="130" y1="95" x2="110" y2="60" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(75, 42)" onClick={() => handleInspect('rack-pdu-1')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="65" height="18" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="1" filter="url(#glow)" />
                  <text x="32.5" y="12" fill="#854d0e" textAnchor="middle" fontSize="9">Electricity</text>
                </g>

                {/* 2. Computer Room Badge */}
                <line x1="350" y1="175" x2="280" y2="120" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(235, 102)" onClick={() => handleInspect('rack-gpu-0')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="85" height="18" rx="4" fill="#bbf7d0" stroke="#22c55e" strokeWidth="1" filter="url(#glow)" />
                  <text x="42.5" y="12" fill="#166534" textAnchor="middle" fontSize="9">Computer Room</text>
                </g>

                {/* 3. Cooling system Badge */}
                <line x1="500" y1="165" x2="600" y2="105" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(565, 87)" onClick={() => handleInspect('crac-01')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="85" height="18" rx="4" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" filter="url(#glow)" />
                  <text x="42.5" y="12" fill="#1e40af" textAnchor="middle" fontSize="9">Cooling system</text>
                </g>

                {/* 4. Cooling Tower Badge */}
                <line x1="620" y1="330" x2="720" y2="280" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(685, 262)" onClick={() => handleInspect('rack-chiller')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="80" height="18" rx="4" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" filter="url(#glow)" />
                  <text x="40" y="12" fill="#1e40af" textAnchor="middle" fontSize="9">Cooling Tower</text>
                </g>

                {/* 5. Water Badge */}
                <line x1="690" y1="310" x2="760" y2="265" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(740, 247)" onClick={() => handleInspect('rack-chiller')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="45" height="18" rx="4" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" filter="url(#glow)" />
                  <text x="22.5" y="12" fill="#ffffff" textAnchor="middle" fontSize="9">Water</text>
                </g>

                {/* 6. UPS Badge */}
                <line x1="530" y1="235" x2="495" y2="195" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(470, 177)" onClick={() => handleInspect('rack-ups')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="45" height="18" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="1" filter="url(#glow)" />
                  <text x="22.5" y="12" fill="#854d0e" textAnchor="middle" fontSize="9">UPS</text>
                </g>

                {/* 7. Diesel Generator Badge */}
                <line x1="770" y1="280" x2="815" y2="350" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(775, 332)" onClick={() => handleInspect('rack-generator')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="95" height="18" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="1" filter="url(#glow)" />
                  <text x="47.5" y="12" fill="#854d0e" textAnchor="middle" fontSize="9">Diesel Generator</text>
                </g>

                {/* 8. Administration Badge */}
                <line x1="630" y1="255" x2="570" y2="310" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(525, 292)" onClick={() => handleInspect('rack-battery')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="85" height="18" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="1" filter="url(#glow)" />
                  <text x="42.5" y="12" fill="#854d0e" textAnchor="middle" fontSize="9">Administration</text>
                </g>

                {/* 9. Control Panel Badge */}
                <line x1="430" y1="340" x2="355" y2="400" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(310, 382)" onClick={() => handleInspect('rack-scheduler')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="80" height="18" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="1" filter="url(#glow)" />
                  <text x="40" y="12" fill="#854d0e" textAnchor="middle" fontSize="9">Control Panel</text>
                </g>

                {/* 10. Flooding Sys Badge */}
                <line x1="240" y1="255" x2="190" y2="210" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <g transform="translate(145, 192)" onClick={() => handleInspect('rack-storage')} style={{ cursor: 'pointer' }}>
                  <rect x="0" y="0" width="75" height="18" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="1" filter="url(#glow)" />
                  <text x="37.5" y="12" fill="#854d0e" textAnchor="middle" fontSize="9">Flooding Sys</text>
                </g>
              </g>

            </g>
          </svg>
        </div>

        {/* Right side controls/stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
          
          {/* Telemetry Panels in 2x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1 }}>
            
            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #06b6d4', borderRadius: '4px', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>WATER COOLING</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>CHILLER FLOW</span><span style={{ fontWeight: 700 }}>{powerTel.chillerFlow.toFixed(0)} L/min</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>SUPPLY / RETURN</span><span style={{ fontWeight: 700 }}>{powerTel.chillerSupply.toFixed(1)}°C / {powerTel.chillerReturn.toFixed(1)}°C</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}><span>WATER CONSUMPTION</span><span style={{ fontWeight: 700 }}>{powerTel.waterConsumption.toFixed(0)} L/hr</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>WUE</span><span style={{ fontWeight: 700 }}>{powerTel.wue.toFixed(2)} L/kWh</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}><span style={{ color: '#8b949e' }}>DELTA T</span><span style={{ fontWeight: 700, color: '#06b6d4' }}>{(powerTel.chillerReturn - powerTel.chillerSupply).toFixed(1)}°C</span></div>
              </div>
            </div>

            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #f97316', borderRadius: '4px', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>UPS & POWER DIST</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>UPS LOAD</span><span style={{ fontWeight: 700, color: powerTel.upsLoad > 80 ? '#ef4444' : '#f97316' }}>{powerTel.upsLoad.toFixed(0)}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>UPS BATTERY</span><span style={{ fontWeight: 700, color: powerTel.upsBattery < 30 ? '#ef4444' : '#f97316' }}>{powerTel.upsBattery.toFixed(0)}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>PDU-A LOAD</span><span style={{ fontWeight: 700 }}>{powerTel.pdu1Load.toFixed(0)}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>PDU-B LOAD</span><span style={{ fontWeight: 700 }}>{powerTel.pdu2Load.toFixed(0)}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}><span style={{ color: '#8b949e' }}>TOTAL DIST</span><span style={{ fontWeight: 700, color: '#f97316' }}>{(powerTel.pdu1Load + powerTel.pdu2Load).toFixed(0)}%</span></div>
              </div>
            </div>

            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #ef4444', borderRadius: '4px', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>BACKUP GENERATOR</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>STATUS</span><span style={{ fontWeight: 700, color: genActive ? '#ef4444' : '#22c55e' }}>{genActive ? 'ACTIVE' : 'STANDBY'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>FUEL LEVEL</span><span style={{ fontWeight: 700, color: powerTel.genFuel < 20 ? '#ef4444' : '#f59e0b' }}>{powerTel.genFuel.toFixed(0)}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>RPM</span><span style={{ fontWeight: 700 }}>{genActive ? powerTel.genRpm.toFixed(0) : '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>OUTPUT</span><span style={{ fontWeight: 700 }}>{powerTel.genOutput.toFixed(0)} kW</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}><span style={{ color: '#8b949e' }}>RUNTIME REM</span><span style={{ fontWeight: 700, color: genActive ? '#ef4444' : '#8b949e' }}>{genActive ? `${(powerTel.genFuel / 100 * 48).toFixed(1)}h` : 'N/A'}</span></div>
              </div>
            </div>

            <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderTop: '3px solid #06b6d4', borderRadius: '4px', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>BATTERY STORAGE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>SOC</span><span style={{ fontWeight: 700, color: powerTel.batteryCharge < 30 ? '#ef4444' : '#06b6d4' }}>{powerTel.batteryCharge.toFixed(0)}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>TEMPERATURE</span><span style={{ fontWeight: 700 }}>{powerTel.batteryTemp.toFixed(1)}°C</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>MODE</span><span style={{ fontWeight: 700, color: batteryCharging ? '#22c55e' : '#f97316' }}>{batteryCharging ? 'CHARGING' : 'DISCHARGING'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>CAPACITY</span><span style={{ fontWeight: 700 }}>2.4 MWh LFP</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}><span style={{ color: '#8b949e' }}>SOH</span><span style={{ fontWeight: 700, color: '#06b6d4' }}>94.2%</span></div>
              </div>
            </div>

          </div>

          {/* IT/DC capacity controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#0e141a', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>IT/DC SYSTEM CAPACITY:</span>
              <span style={{ fontWeight: 700 }}>{itDcLoad.toFixed(1)} / 1000.0 kW</span>
            </div>
            <div style={{ height: '6px', background: '#11161d', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (itDcLoad / 1000) * 100)}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.5s ease' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <span>SITE MAIN POWER:</span>
              <span style={{ fontWeight: 700 }}>{totalSitePower.toFixed(1)} / 1350.0 kW</span>
            </div>
            <div style={{ height: '6px', background: '#11161d', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (totalSitePower / 1350) * 100)}%`, height: '100%', background: totalSitePower > 900 ? 'var(--red)' : 'var(--yellow)', transition: 'width 0.5s ease' }} />
            </div>
          </div>

        </div>

      </div>

      <div style={{ background: '#0e141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', display: 'grid', gridTemplateColumns: inspected ? '1fr 340px' : '1fr', gap: '0px' }}>
        
        <div style={{ borderRight: inspected ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          <div style={{ background: '#11161d', display: 'flex', gap: '1.5rem', padding: '0 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setHubTab('SITES')} style={{ background: 'none', border: 'none', padding: '0.65rem 0', fontSize: '0.75rem', outline: 'none' }} className={hubTab === 'SITES' ? 'site-tab-active' : 'site-tab-inactive'}>
              SITES & ROOMS
            </button>
            <button onClick={() => setHubTab('ADVISOR')} style={{ background: 'none', border: 'none', padding: '0.65rem 0', fontSize: '0.75rem', outline: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }} className={hubTab === 'ADVISOR' ? 'site-tab-active' : 'site-tab-inactive'}>
              COOLING ADVISOR & TASKS
              {(avgTemp > 65 || totalSitePower > 1000) && !cracPumpHigh && <span style={{ width: '6px', height: '6px', background: 'var(--red)', borderRadius: '50%', display: 'inline-block' }} />}
            </button>
            <button onClick={() => setHubTab('EDITOR')} style={{ background: 'none', border: 'none', padding: '0.65rem 0', fontSize: '0.75rem', outline: 'none' }} className={hubTab === 'EDITOR' ? 'site-tab-active' : 'site-tab-inactive'}>
              SYSTEM HYPERVISOR EDITOR
            </button>
          </div>

          <div style={{ padding: '1rem', minHeight: '135px' }}>
            
            {hubTab === 'SITES' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}><span>ALPHA_HOST_CLUSTER</span><span style={{ color: 'var(--accent)' }}>ONLINE</span></div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: gpuStressStates[0] ? 'var(--red)' : 'var(--text-primary)' }}>{getGpuTemperature(0).toFixed(1)}°C</div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>Alarms: {getGpuTemperature(0) > 75 ? '1 Thermal' : '0'} | vGPUs: {data?.vgpu_instances?.filter(v => v.physical_gpu_id === 0).length || 0}</div>
                </div>
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}><span>BETA_HOST_CLUSTER</span><span style={{ color: 'var(--accent)' }}>ONLINE</span></div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: gpuStressStates[1] ? 'var(--red)' : 'var(--text-primary)' }}>{getGpuTemperature(1).toFixed(1)}°C</div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>Alarms: {getGpuTemperature(1) > 75 ? '1 Thermal' : '0'} | vGPUs: {data?.vgpu_instances?.filter(v => v.physical_gpu_id === 1).length || 0}</div>
                </div>
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}><span>POWER_SYSTEM_ROOM</span><span style={{ color: '#f97316' }}>ONLINE</span></div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: genActive ? '#ef4444' : '#06b6d4' }}>{genActive ? 'GEN ACTIVE' : 'MAINS POWER'}</div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>UPS: {powerTel.upsBattery.toFixed(0)}% | Battery: {powerTel.batteryCharge.toFixed(0)}% | PUE: {((totalSitePower / (itDcLoad + 1)) * 0.92).toFixed(3)}</div>
                </div>
                <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}><span>WATER_COOLING_LOOP</span><span style={{ color: '#22d3ee' }}>FLOWING</span></div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#22d3ee' }}>{powerTel.chillerFlow.toFixed(0)} L/min</div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e' }}>Supply: {powerTel.chillerSupply.toFixed(1)}°C | Return: {powerTel.chillerReturn.toFixed(1)}°C | {powerTel.waterConsumption.toFixed(0)} L/hr</div>
                </div>
              </div>
            )}

            {hubTab === 'ADVISOR' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', background: avgTemp > 65 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.05)', border: '1px solid', borderColor: avgTemp > 65 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', padding: '0.4rem 0.8rem', borderRadius: '4px', color: avgTemp > 65 ? 'var(--red)' : '#fff', marginBottom: '0.25rem' }}>
                  <AlertTriangle size={14} />
                  <span>{avgTemp > 65 ? `Thermal Warning: ${avgTemp.toFixed(1)}°C. Deploy CRAC or replace vents.` : `Thermal Safe: ${avgTemp.toFixed(1)}°C. Systems optimized.`}</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button onClick={() => setVent5Replaced(!vent5Replaced)}
                    style={{ background: vent5Replaced ? 'rgba(34,197,94,0.08)' : '#070b0e', border: vent5Replaced ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', cursor: 'pointer', color: vent5Replaced ? 'var(--accent)' : '#c9d1d9', fontSize: '0.7rem' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid', borderColor: vent5Replaced ? 'var(--accent)' : '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{vent5Replaced && <Check size={10} />}</div>
                    <div><strong style={{ display: 'block', fontSize: '0.75rem' }}>Replace Vent5</strong><span style={{ fontSize: '0.6rem', color: '#8b949e' }}>Impact: -4.5°C Temp</span></div>
                  </button>
                  <button onClick={() => setCracPumpHigh(!cracPumpHigh)}
                    style={{ background: cracPumpHigh ? 'rgba(34,197,94,0.08)' : '#070b0e', border: cracPumpHigh ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', cursor: 'pointer', color: cracPumpHigh ? 'var(--accent)' : '#c9d1d9', fontSize: '0.7rem' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid', borderColor: cracPumpHigh ? 'var(--accent)' : '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cracPumpHigh && <Check size={10} />}</div>
                    <div><strong style={{ display: 'block', fontSize: '0.75rem' }}>CRAC Pump HIGH</strong><span style={{ fontSize: '0.6rem', color: '#8b949e' }}>Impact: -6.0°C Temp</span></div>
                  </button>
                  <button onClick={() => setAllocationDefragged(!allocationDefragged)}
                    style={{ background: allocationDefragged ? 'rgba(34,197,94,0.08)' : '#070b0e', border: allocationDefragged ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', cursor: 'pointer', color: allocationDefragged ? 'var(--accent)' : '#c9d1d9', fontSize: '0.7rem' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid', borderColor: allocationDefragged ? 'var(--accent)' : '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{allocationDefragged && <Check size={10} />}</div>
                    <div><strong style={{ display: 'block', fontSize: '0.75rem' }}>Defragment vGPU</strong><span style={{ fontSize: '0.6rem', color: '#8b949e' }}>Impact: -2.0°C Temp</span></div>
                  </button>
                  <div style={{ background: '#070b0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><Check size={10} /></div>
                    <div><strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibrate Temp Sensor</strong><span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Completed 2h ago</span></div>
                  </div>
                </div>
              </div>
            )}

            {hubTab === 'EDITOR' && (
              <div style={{ background: '#050505', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', color: '#22c55e', fontFamily: 'monospace', minHeight: '120px', overflowY: 'auto' }}>
                [hypervisor] Initializing Zenith-VMM kernel stack...<br />
                [hypervisor] Found {serversList.filter(o => o.type === 'gpu').length} physical compute nodes.<br />
                [hypervisor] Power systems: UPS online, PDU-A/B active, Generator {genActive ? 'ACTIVE' : 'STANDBY'}, Battery {batteryCharging ? 'CHARGING' : 'DISCHARGING'}<br />
                [hypervisor] Water cooling: Chiller flow {powerTel.chillerFlow.toFixed(0)} L/min, {powerTel.waterConsumption.toFixed(0)} L/hr consumption<br />
                [hypervisor] Custom components on grid: {serversList.filter(o => o.id.startsWith('rack-custom-')).length} nodes<br />
                [hypervisor] Active cgroups enforcement: isol_v1_limit_pct_active
              </div>
            )}

          </div>
        </div>

        {inspected ? (
          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#11161d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.55rem', color: rackColor(inspected, getGpuTemperature), fontWeight: 800, textTransform: 'uppercase' }}>{inspected.label}</span>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{inspected.name}</h4>
              </div>
              <button onClick={() => setActiveTab(null)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem', outline: 'none' }}>×</button>
            </div>

            {inspected.type === 'gpu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  Model: {inspected.model || 'Custom'}<br />
                  Max Power: {inspected.powerLimit || 350}W<br />
                  Bus: 5120-bit HBM3 | Liquid Cooled
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.2rem' }}><span>Compute Load</span><span>{gpuMetrics.gpu_utilization.toFixed(1)}%</span></div>
                  <div style={{ height: '4px', background: '#070b0e', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${gpuMetrics.gpu_utilization}%`, background: 'var(--accent)', transition: 'width 0.3s' }} /></div>
                </div>
                <div style={{ background: '#070b0e', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.6rem', color: '#8b949e', fontWeight: 700 }}>ACTIVE DATASET</span>
                  <select value={inspected.activeDataset || ''} onChange={(e) => { const d = e.target.value; setServersList(prev => prev.map(s => s.id === inspected.id ? { ...s, activeDataset: d } : s)) }} style={{ width: '100%', padding: '0.25rem', fontSize: '0.65rem', background: '#050505', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '3px', outline: 'none' }}>
                    <option value="">Synthetic Data</option>{datasets.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <button onClick={() => handleToggleStress(gpuId)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: isGpuStressed ? 'var(--red)' : 'rgba(118,185,0,0.1)', border: isGpuStressed ? '1px solid transparent' : '1px solid var(--accent)', color: isGpuStressed ? '#fff' : 'var(--accent)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                  {isGpuStressed ? 'STOP STRESS' : 'TRIGGER STRESS'}
                </button>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.65rem', marginBottom: '0.25rem' }}>Virtual Nodes ({childVgpus.length})</div>
                  {childVgpus.length === 0 ? <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>{isCustomGpu ? 'Custom nodes partition during job requests.' : 'No slices provisioned.'}</span> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>{childVgpus.map(v => <div key={v.id} style={{ background: '#070b0e', padding: '0.25rem 0.4rem', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}><span>node-{v.id.substring(0,4)}</span><span>{(v.vram_limit / 1024).toFixed(0)}G</span></div>)}</div>
                  )}
                </div>
              </div>
            )}

            {inspected.type === 'scheduler' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>RUNNING</span><div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{activeJobs}</div></div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>QUEUED</span><div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{queueLength}</div></div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.7rem' }}>Dispatch ML container:</span>
                  <select value={selectedScript} onChange={e => setSelectedScript(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.65rem', background: '#070b0e', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    {scripts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.65rem', background: '#070b0e', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    <option value="">Synthetic Data</option>{datasets.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={selectedVgpu} onChange={e => { setSelectedVgpu(e.target.value); const vgpuObj = data?.vgpu_instances?.find(v => v.id === e.target.value); if (vgpuObj) { const hostGpu = serversList.find(s => s.type === 'gpu' && s.gpuId === vgpuObj.physical_gpu_id); if (hostGpu && hostGpu.activeDataset) setSelectedDataset(hostGpu.activeDataset) } }} style={{ padding: '0.35rem', fontSize: '0.65rem', background: '#070b0e', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    <option value="ALL_FLEET">Distributed Fleet Cluster</option>
                    {data?.vgpu_instances?.map(v => <option key={v.id} value={v.id}>vGPU-{v.id.substring(0,8)} (Host 0{v.physical_gpu_id+1})</option>)}
                    {serversList.filter(o => o.type==='gpu' && o.id.startsWith('rack-custom-')).map(c => <option key={c.gpuId} value={c.gpuId}>{c.name} (Custom)</option>)}
                  </select>
                  <button onClick={handleDispatchJob} disabled={isDispatching} style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--accent)', border: 'none', color: '#000', fontSize: '0.7rem', fontWeight: 700, cursor: isDispatching ? 'not-allowed' : 'pointer' }}>
                    {isDispatching ? 'RUNNING...' : 'DISPATCH PIPELINE'}
                  </button>
                  {dispatchMessage && <div style={{ padding: '0.25rem', fontSize: '0.55rem', color: '#8b949e', background: '#050505', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>{dispatchMessage}</div>}
                </div>
              </div>
            )}

            {inspected.type === 'storage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>RAID: RAID-6 NVMe<br />Size: 48.0 TB | Used: 14.2 TB<br />Gateway: Ceph LIO</div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.65rem', marginBottom: '0.25rem' }}>Datasets ({datasets.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '110px', overflowY: 'auto' }}>
                    {datasets.map(d => <div key={d} style={{ background: '#070b0e', padding: '0.25rem 0.4rem', borderRadius: '3px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Database size={10} color="#f59e0b" /><span>{d}</span></div>)}
                  </div>
                </div>
              </div>
            )}

            {inspected.type === 'crac' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  Unit: CRAC HVAC Air Handler<br />Loop: {cracPumpHigh ? 'HIGH FLOW' : 'Normal'}<br />Offset: {coolingOffset.toFixed(1)}°C
                </div>
                <div style={{ background: '#050505', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.6rem', color: '#22c55e', fontFamily: 'monospace', minHeight: '60px' }}>
                  CRAC flow: {cracPumpHigh ? 'HIGH' : 'nominal'}.<br />Fan check: OK.<br />Coolant margins: within {cracPumpHigh ? '85' : '100'}%.
                </div>
              </div>
            )}

            {inspected.type === 'ups' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>LOAD</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: powerTel.upsLoad > 80 ? '#ef4444' : '#f97316' }}>{powerTel.upsLoad.toFixed(0)}%</div></div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>BATTERY</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: powerTel.upsBattery < 30 ? '#ef4444' : '#f97316' }}>{powerTel.upsBattery.toFixed(0)}%</div></div>
                </div>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  Rating: 500 kVA | Eff: 96.2%<br />Runtime: {((powerTel.upsBattery / 100) * 18).toFixed(1)} min
                </div>
              </div>
            )}

            {inspected.type === 'generator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>STATUS</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: genActive ? '#ef4444' : '#22c55e' }}>{genActive ? 'ACTIVE' : 'STANDBY'}</div></div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>FUEL</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: powerTel.genFuel < 20 ? '#ef4444' : '#f59e0b' }}>{powerTel.genFuel.toFixed(0)}%</div></div>
                </div>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  600 kVA Diesel | Tank: 1,200L<br />Runtime: {genActive ? `${(powerTel.genFuel / 100 * 48).toFixed(1)}h` : 'Standby'}
                </div>
              </div>
            )}

            {inspected.type === 'battery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>CHARGE</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: powerTel.batteryCharge < 30 ? '#ef4444' : '#06b6d4' }}>{powerTel.batteryCharge.toFixed(0)}%</div></div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>TEMP</span><div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{powerTel.batteryTemp.toFixed(1)}°C</div></div>
                </div>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  2.4 MWh LFP | SOH: 94.2%<br />Mode: {batteryCharging ? 'CHARGING' : 'DISCHARGING'}
                </div>
              </div>
            )}

            {inspected.type === 'pdu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>PHASE</span><div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{inspected.phase || 'A'}</div></div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>LOAD</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#eab308' }}>{(inspected.id === 'rack-pdu-1' ? powerTel.pdu1Load : powerTel.pdu2Load).toFixed(0)}%</div></div>
                </div>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  480V In / 208V Out | {inspected.capacity || 60}A<br />42 C13 + 6 C19 outlets
                </div>
              </div>
            )}

            {inspected.type === 'chiller' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>FLOW</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#22d3ee' }}>{powerTel.chillerFlow.toFixed(0)} L/min</div></div>
                  <div style={{ background: '#070b0e', padding: '0.35rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}><span style={{ fontSize: '0.55rem', color: '#8b949e' }}>DELTA T</span><div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#22d3ee' }}>{(powerTel.chillerReturn - powerTel.chillerSupply).toFixed(1)}°C</div></div>
                </div>
                <div style={{ background: '#070b0e', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                  350 kW Cooling | WUE: {powerTel.wue.toFixed(2)} L/kWh<br />Water: {powerTel.waterConsumption.toFixed(0)} L/hr
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: '#11161d', color: '#8b949e', textAlign: 'center' }}>
            <Server size={30} strokeWidth={1} color="rgba(255,255,255,0.15)" />
            <span style={{ fontSize: '0.7rem' }}>Select any cabinet on the grid to inspect it.</span>
          </div>
        )}

      </div>

    </div>
  )
}

const rackColor = (obj, getGpuTemperature) => {
  if (obj.type === 'gpu') { const t = getGpuTemperature(obj.gpuId); return t > 65 ? 'var(--red)' : 'var(--accent)' }
  if (obj.type === 'scheduler') return '#a855f7'
  if (obj.type === 'storage') return '#f59e0b'
  if (obj.type === 'crac' || obj.type === 'chiller') return '#3b82f6'
  if (obj.type === 'pdu') return '#eab308'
  if (obj.type === 'ups') return '#f97316'
  if (obj.type === 'generator') return '#ef4444'
  if (obj.type === 'battery') return '#06b6d4'
  return '#3b82f6'
}

export default AIDataCenter
