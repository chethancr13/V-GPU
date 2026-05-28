import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  Server, Cpu, Database, Activity, Zap, 
  Terminal, ShieldAlert, Monitor, Info, Layers, RefreshCw
} from 'lucide-react'

function VMInspector() {
  const [selectedId, setSelectedId] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('cpu')
  const [telemetryHistory, setTelemetryHistory] = useState([])

  // 1. Fetch live vGPU list
  const { data: vGPUs, isLoading } = useQuery({
    queryKey: ['vgpus-inspector'],
    queryFn: () => fetch('http://localhost:8000/api/vgpu/list').then(res => res.json()),
    refetchInterval: 3000,
    onSuccess: (data) => {
      if (data && data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
      }
    }
  })

  // Keep track of the latest vGPUs array in a ref to avoid stale closures in interval
  const vGpusRef = useRef(vGPUs)
  useEffect(() => {
    vGpusRef.current = vGPUs
  }, [vGPUs])

  // Set default selection if none active
  useEffect(() => {
    if (vGPUs && vGPUs.length > 0 && !selectedId) {
      setSelectedId(vGPUs[0].id)
    }
  }, [vGPUs, selectedId])

  // 2. Fetch CPU-Z details for selected VM
  const { data: cpuzData, isFetching: isCpuzFetching } = useQuery({
    queryKey: ['vgpu-cpuz', selectedId],
    queryFn: () => 
      selectedId 
        ? fetch(`http://localhost:8000/api/vgpu/${selectedId}/cpuz`).then(res => res.json())
        : null,
    enabled: !!selectedId,
    refetchInterval: 10000 // CPU-Z hardware specs are static, slow poll is fine
  })

  // 3. Generate smooth, live-updating telemetry specific to selected VM
  useEffect(() => {
    if (!selectedId) {
      setTelemetryHistory([])
      return
    }

    // Set initial dummy data once on selectedId change
    setTelemetryHistory(prev => {
      // Only set initial data if it was empty or ID changed
      if (prev.length === 0 || prev[0].id !== selectedId) {
        return Array.from({ length: 20 }, (_, i) => ({
          id: selectedId,
          time: new Date(Date.now() - (20 - i) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          load: Math.floor(Math.random() * 8) + 2,
          memory: Math.floor(Math.random() * 50) + 120,
          temp: 38,
          power: 12
        }))
      }
      return prev
    })

    const interval = setInterval(() => {
      setTelemetryHistory(prev => {
        const lastEntry = prev[prev.length - 1] || { load: 5, memory: 150, temp: 40, power: 15 }
        
        // Read from ref to avoid stale closure and prevent re-running effect
        const latestVGPUs = vGpusRef.current
        const target = selectedId ? latestVGPUs?.find(v => v.id === selectedId) : null
        const compLimit = target ? target.compute_limit : 50
        const vramLimit = target ? target.vram_limit : 1024

        // Utilization walk
        const loadChange = (Math.random() - 0.5) * 6
        const newLoad = Math.max(2, Math.min(compLimit, lastEntry.load + loadChange))

        // Memory walk
        const memoryChange = (Math.random() - 0.5) * 15
        const newMemory = Math.max(50, Math.min(vramLimit, lastEntry.memory + memoryChange))

        // Thermal math based on utilization
        const expectedTemp = 36 + (newLoad * 0.45)
        const tempChange = (expectedTemp - lastEntry.temp) * 0.1 + (Math.random() - 0.5) * 0.5
        const newTemp = Math.max(30, Math.min(95, lastEntry.temp + tempChange))

        // Power math based on load
        const expectedPower = 10 + (newLoad * 0.8)
        const powerChange = (expectedPower - lastEntry.power) * 0.1 + (Math.random() - 0.5) * 0.4
        const newPower = Math.max(5, Math.min(250, lastEntry.power + powerChange))

        const newEntry = {
          id: selectedId,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          load: parseFloat(newLoad.toFixed(1)),
          memory: Math.round(newMemory),
          temp: parseFloat(newTemp.toFixed(1)),
          power: parseFloat(newPower.toFixed(1))
        }

        return [...prev.slice(-29), newEntry]
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [selectedId])

  const selectedVM = vGPUs?.find(v => v.id === selectedId)

  // Empty state
  if (isLoading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--black)', minHeight: '100%' }}>
        <span className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span>Syncing virtual hardware manager...</span>
      </div>
    )
  }

  if (!vGPUs || vGPUs.length === 0) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--black)', minHeight: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          padding: '3rem', 
          borderRadius: '12px', 
          textAlign: 'center', 
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', color: 'var(--red)' }}>
            <ShieldAlert size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>No Sandboxed VMs Found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              The elastic compute plane has zero active virtual machines provisioned. Head over to the vGPU Manager workspace tab to allocate custom VRAM nodes and cores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get active telemetry value
  const latestTelemetry = telemetryHistory[telemetryHistory.length - 1] || { load: 0, memory: 0, temp: 0, power: 0 }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>VM Inspector & Diagnostics</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Real-time hypervisor properties, clock speed, cache hierarchies, and detailed dynamic CPU-Z hardware profiles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={12} className="pulse" />
          <span>LIVE VIRTUAL CORE FEED</span>
        </div>
      </div>

      {/* Main Grid: Sidebar vs Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3.2fr', gap: '1.5rem' }}>
        
        {/* Sidebar List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>ACTIVE VM ARRAY</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
            {vGPUs.map((vm) => {
              const isSelected = vm.id === selectedId
              return (
                <button
                  key={vm.id}
                  onClick={() => setSelectedId(vm.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                    background: isSelected ? 'var(--accent-dim)' : 'var(--gray)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 4px 12px rgba(118, 185, 0, 0.05)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--gray)'
                    }
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(118, 185, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid',
                    borderColor: isSelected ? 'rgba(118, 185, 0, 0.3)' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)'
                  }}>
                    <Monitor size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      VM-{vm.id.substring(0, 8)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {vm.compute_limit}% share • {vm.vram_limit}MB
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Diagnostic Panel Content */}
        {selectedVM && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Top Telemetry Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Cpu size={12} color="var(--blue)" /> CORE LOAD
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {latestTelemetry.load?.toFixed(1)}%
                </div>
              </div>
              <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Database size={12} color="var(--accent)" /> ACTIVE VRAM
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.25rem' }}>
                  {latestTelemetry.memory} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>MB</span>
                </div>
              </div>
              <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Activity size={12} color="var(--red)" /> TEMP CORE
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {latestTelemetry.temp?.toFixed(1)}°C
                </div>
              </div>
              <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Zap size={12} color="var(--yellow)" /> POWER DRAW
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {latestTelemetry.power?.toFixed(1)}W
                </div>
              </div>
            </div>

            {/* Central Hardware Grid: CPU-Z & Live Area Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem' }}>
              
              {/* CPU-Z Carbon Hardware diagnostics card */}
              <div style={{ 
                background: '#0d0d0d', 
                border: '1.5px solid #222', 
                borderRadius: '8px', 
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                position: 'relative'
              }}>
                {/* Hardware header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={16} color="var(--accent)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>CPU-Z DIAGNOSTICS</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#666' }}>vGPU-Z v1.94</span>
                </div>

                {/* Sub Tab Headers */}
                <div style={{ display: 'flex', borderBottom: '1px solid #222', gap: '0.25rem', paddingBottom: '1px', marginBottom: '1rem' }}>
                  {['cpu', 'clocks', 'system'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveSubTab(t)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: activeSubTab === t ? '#1a1a1a' : 'transparent',
                        color: activeSubTab === t ? 'var(--accent)' : '#888',
                        border: '1px solid',
                        borderColor: activeSubTab === t ? '#222' : 'transparent',
                        borderBottomColor: activeSubTab === t ? 'transparent' : '#222',
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        marginBottom: '-1px'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {isCpuzFetching ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.75rem', minHeight: '180px' }}>
                    Syncing CPU-Z core parameters...
                  </div>
                ) : cpuzData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '180px', fontSize: '0.75rem' }}>
                    
                    {activeSubTab === 'cpu' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Processor Name</span>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{cpuzData.processor_name}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Codename</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.codename}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Technology / Nodes</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.technology}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Cores Allocated</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{cpuzData.cores} Virtual Cores</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Instruction Sets</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{cpuzData.instructions}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>L3 Cache / Memory</span>
                          <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{cpuzData.caches?.l3_cache}</span>
                        </div>
                      </>
                    )}

                    {activeSubTab === 'clocks' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Core Speed (Graphics)</span>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{cpuzData.clocks?.core_speed}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Memory Speed</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.clocks?.memory_speed}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Bus Width / Bandwidth</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.clocks?.bus_width}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>L1 Data Cache</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.caches?.l1_data}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>L2 Cache</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.caches?.l2_cache}</span>
                        </div>
                      </>
                    )}

                    {activeSubTab === 'system' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Virtual Guest OS</span>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{cpuzData.virtual_os}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Hypervisor Engine</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.hypervisor}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Sandbox Architecture</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{cpuzData.architecture}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', borderBottom: '1px solid #181818', paddingBottom: '0.4rem' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Docker Socket Mounts</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>rw result / ro datasets</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr' }}>
                          <span style={{ color: '#666', fontWeight: 600 }}>Node Allocation Uptime</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {Math.round((Date.now() / 1000 - selectedVM.created_at) / 60)} minutes
                          </span>
                        </div>
                      </>
                    )}

                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.75rem', minHeight: '180px' }}>
                    Failed to query CPU-Z diagnostics properties.
                  </div>
                )}
              </div>

              {/* Dynamic Performance Area Chart */}
              <div style={{ 
                background: 'var(--gray)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} color="var(--accent)" />
                    Core Load Fluctuations (%)
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Real-Time area plot</span>
                </div>
                
                <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', flex: 1, minHeight: '180px' }}>
                  {telemetryHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telemetryHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="time" hide />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, selectedVM.compute_limit]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
                        />
                        <Area type="monotone" dataKey="load" name="Load %" stroke="var(--accent)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorLoad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Initializing load plot stream...
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Memory Telemetry Line Chart */}
            <div style={{ 
              background: 'var(--gray)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={16} color="var(--blue)" />
                  VRAM Allocation Diagnostics (MB)
                </h3>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Memory pressure scan</span>
              </div>
              
              <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', height: '160px' }}>
                {telemetryHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={telemetryHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="var(--blue)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, selectedVM.vram_limit]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
                      />
                      <Area type="monotone" dataKey="memory" name="VRAM MB" stroke="var(--blue)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorMemory)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Initializing memory plot stream...
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default VMInspector
