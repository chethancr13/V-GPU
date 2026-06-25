import { useEffect, useState } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity, Cpu, Database, Zap, Thermometer, Play, Square } from 'lucide-react'

function GPUMonitor() {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [gpuStressStates, setGpuStressStates] = useState({ 0: false, 1: false })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const wsUrl = 'ws://localhost:8000/ws/metrics'
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setIsLoading(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      try {
        const metrics = JSON.parse(event.data)
        setData(metrics)
        setIsLoading(false)

        if (metrics.physical_gpus) {
          setHistory(prev => {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            const gpu0 = metrics.physical_gpus[0] || { gpu_utilization: 0, memory_used: 0, temperature: 40, power_draw: 50 }
            const gpu1 = metrics.physical_gpus[1] || { gpu_utilization: 0, memory_used: 0, temperature: 40, power_draw: 50 }
            
            const newEntry = {
              time: timeStr,
              gpu0_util: gpu0.gpu_utilization,
              gpu0_mem: gpu0.memory_used,
              gpu0_temp: gpu0.temperature,
              gpu0_power: gpu0.power_draw,
              gpu1_util: gpu1.gpu_utilization,
              gpu1_mem: gpu1.memory_used,
              gpu1_temp: gpu1.temperature,
              gpu1_power: gpu1.power_draw,
            }
            return [...prev.slice(-29), newEntry]
          })
        }
      } catch (e) {
        console.error("Failed to parse WS metrics in GPU Monitor:", e)
      }
    }

    return () => ws.close()
  }, [])

  const handleToggleStress = async (gpuId) => {
    const nextStressState = !gpuStressStates[gpuId]
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
      console.error(`Failed to toggle stress on GPU ${gpuId}:`, err)
    }
  }

  // Calculate aggregates
  const gpu0 = data?.physical_gpus?.[0]
  const gpu1 = data?.physical_gpus?.[1]

  const totalPhysical = data?.physical_gpus?.length || 2
  const totalVgpu = data?.vgpu_instances?.length || 0
  
  const avgUtilization = gpu0 && gpu1 
    ? ((gpu0.gpu_utilization + gpu1.gpu_utilization) / 2) 
    : 0.0
    
  const totalUsedMem = (gpu0?.memory_used || 0) + (gpu1?.memory_used || 0)
  const totalMaxMem = (gpu0?.memory_total || 32768) + (gpu1?.memory_total || 32768)
  const memPct = totalMaxMem > 0 ? (totalUsedMem / totalMaxMem) * 100 : 0

  const avgTemp = gpu0 && gpu1 
    ? ((gpu0.temperature + gpu1.temperature) / 2) 
    : 40.0

  const totalPower = (gpu0?.power_draw || 0) + (gpu1?.power_draw || 0)

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--black)', minHeight: '100%' }}>
        <span className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span>Connecting to live vGPU hardware telemetry server...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="var(--accent)" />
            GPU Telemetry & Monitoring
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            View live hardware execution streams, utilization grids, thermal margins, and execute simulated workload stress testing.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: isConnected ? 'var(--accent)' : 'var(--red)', background: 'var(--gray)', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
          <span className={isConnected ? "pulse" : ""} style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? 'var(--accent)' : 'var(--red)', display: 'inline-block' }} />
          {isConnected ? 'TELEMETRY ONLINE' : 'TELEMETRY DISCONNECTED'}
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PHYSICAL HOSTS</span>
            <Cpu size={14} color="var(--text-secondary)" />
          </div>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalPhysical}</p>
        </div>
        
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE vGPUS</span>
            <Cpu size={14} color="var(--accent)" />
          </div>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{totalVgpu}</p>
        </div>

        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLUSTER LOAD</span>
            <Activity size={14} color="var(--accent)" />
          </div>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{avgUtilization.toFixed(1)}%</p>
        </div>

        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VRAM OCCUPANCY</span>
            <Database size={14} color="var(--blue)" />
          </div>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{memPct.toFixed(1)}%</p>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{(totalUsedMem / 1024).toFixed(1)} / {(totalMaxMem / 1024).toFixed(0)} GB</span>
        </div>

        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVG TEMP</span>
            <Thermometer size={14} color="var(--yellow)" />
          </div>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: avgTemp > 75 ? 'var(--red)' : avgTemp > 60 ? 'var(--yellow)' : 'var(--text-primary)' }}>{avgTemp.toFixed(1)}°C</p>
        </div>

        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL POWER</span>
            <Zap size={14} color="var(--yellow)" />
          </div>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalPower.toFixed(0)}W</p>
        </div>
      </div>

      {/* Real-time Telemetry Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Utilization Chart */}
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color="var(--accent)" />
            Real-time GPU Compute Load
          </h3>
          <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" name="GPU 0 (Host A)" dataKey="gpu0_util" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" name="GPU 1 (Host B)" dataKey="gpu1_util" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VRAM Chart */}
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} color="var(--blue)" />
            Real-time VRAM Allocation
          </h3>
          <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis domain={[0, 32768]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1024).toFixed(0)}G`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Area type="monotone" name="GPU 0 VRAM" dataKey="gpu0_mem" stroke="var(--accent)" fill="rgba(118, 185, 0, 0.05)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" name="GPU 1 VRAM" dataKey="gpu1_mem" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.05)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Chart */}
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Thermometer size={16} color="var(--yellow)" />
            Real-time Temperatures
          </h3>
          <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis domain={[30, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}°C`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" name="GPU 0 Temp" dataKey="gpu0_temp" stroke="var(--accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" name="GPU 1 Temp" dataKey="gpu1_temp" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Power Draw Chart */}
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={16} color="var(--yellow)" />
            Real-time Power Consumption
          </h3>
          <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis domain={[0, 450]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}W`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" name="GPU 0 Power" dataKey="gpu0_power" stroke="var(--accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" name="GPU 1 Power" dataKey="gpu1_power" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hardware Device Grid (Physical GPUs) */}
      <div>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Physical Node Hardware Inventory</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {(data?.physical_gpus || []).map((gpu, gpuId) => {
            const gpuMetrics = gpu || {
              gpu_utilization: 0,
              memory_used: 0,
              memory_total: 32768,
              temperature: 40,
              power_draw: 50,
              clock_speeds: { graphics: 1200, memory: 7000 }
            }
            const isStressed = gpuStressStates[gpuId]
            const childVgpus = data?.vgpu_instances?.filter(v => v.physical_gpu_id === gpuId) || []

            return (
              <div 
                key={gpuId} 
                style={{ 
                  background: 'var(--gray)', 
                  border: isStressed ? '1px solid var(--red)' : '1px solid var(--border)', 
                  borderRadius: '8px', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  position: 'relative',
                  boxShadow: isStressed ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      GPU-HOST-0{gpuId + 1}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      NVIDIA Ampere Tensor-Core H100 v3 (32GB HBM3)
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleStress(gpuId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '4px',
                      border: '1px solid transparent',
                      background: isStressed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(118, 185, 0, 0.1)',
                      borderColor: isStressed ? 'var(--red)' : 'var(--accent)',
                      color: isStressed ? 'var(--red)' : 'var(--accent)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isStressed ? <Square size={12} fill="var(--red)" /> : <Play size={12} fill="var(--accent)" />}
                    {isStressed ? 'TERMINATE STRESS' : 'SIMULATE STRESS'}
                  </button>
                </div>

                {/* Substats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', background: '#050505', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Load</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{gpuMetrics.gpu_utilization.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>VRAM</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{(gpuMetrics.memory_used / 1024).toFixed(1)} GB</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Temp</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: gpuMetrics.temperature > 75 ? 'var(--red)' : 'var(--text-primary)' }}>{gpuMetrics.temperature.toFixed(0)}°C</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clocks</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{gpuMetrics.clock_speeds?.graphics || 1200} MHz</div>
                  </div>
                </div>

                {/* Power Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>Power Allocation</span>
                    <span style={{ fontWeight: 700 }}>{gpuMetrics.power_draw.toFixed(0)}W / 350W</span>
                  </div>
                  <div style={{ height: '6px', background: '#050505', borderRadius: '3px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, (gpuMetrics.power_draw / 350) * 100)}%`, 
                        background: gpuMetrics.power_draw > 280 ? 'var(--red)' : 'var(--accent)',
                        transition: 'width 0.5s ease-out'
                      }} 
                    />
                  </div>
                </div>

                {/* Child Virtual instances */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Provisioned Virtual Nodes ({childVgpus.length})
                  </span>
                  
                  {childVgpus.length === 0 ? (
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No active vGPU allocations on this physical device.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {childVgpus.map(inst => (
                        <div 
                          key={inst.id}
                          style={{
                            background: '#050505',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                node-{inst.id.substring(0, 8)}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                docker://{inst.container_id?.substring(0, 12) || 'simulated'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>{(inst.vram_limit / 1024).toFixed(1)}GB</span> VRAM | <span style={{ fontWeight: 600 }}>{inst.compute_limit}%</span> Comp
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default GPUMonitor
