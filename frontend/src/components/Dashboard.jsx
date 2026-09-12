import { useEffect, useState } from 'react'
import { useSharedMetrics } from '../contexts/MetricsContext'
import { getCachedVgpuList, getCachedScripts, getCachedDatasets, invalidateDatasetsCache } from '../api/cache'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  Activity, Cpu, Database, Zap, Target, 
  Gauge, Info, PlayCircle, UploadCloud, Terminal, 
  Server, FileCode, CheckCircle2, AlertCircle 
} from 'lucide-react'

function Dashboard() {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])

  // ML Job Submission state
  const [vgpuList, setVgpuList] = useState([])
  const [scriptList, setScriptList] = useState([])
  const [datasetList, setDatasetList] = useState([])
  
  const [selectedVgpu, setSelectedVgpu] = useState('ALL_FLEET')
  const [selectedScript, setSelectedScript] = useState('my_ml_model.py')
  const [selectedDataset, setSelectedDataset] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState([
    " System: Ready for compute instruction. Select target node, script, and dataset below."
  ])
  const [activeLeaderboard, setActiveLeaderboard] = useState([])

  // Shared WebSocket connection (replaces per-component WS)
  const { metrics: wsMetrics, isConnected } = useSharedMetrics()

  // Fetch lists on mount
  useEffect(() => {
    fetchHardwareAndFiles()
  }, [])

  // Process incoming shared metrics
  useEffect(() => {
    if (!wsMetrics) return
    setData(wsMetrics)

    if (wsMetrics.recent_jobs?.[0]?.leaderboard) {
      setActiveLeaderboard(wsMetrics.recent_jobs[0].leaderboard)
    }

    if (wsMetrics.physical_gpus?.[0]) {
      setHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          utilization: wsMetrics.physical_gpus[0].gpu_utilization,
          memory: wsMetrics.physical_gpus[0].memory_used,
          temp: wsMetrics.physical_gpus[0].temperature
        }
        return [...prev.slice(-29), newEntry]
      })
    }
  }, [wsMetrics])

  const fetchHardwareAndFiles = async () => {
    try {
      const [vRes, sRes, dRes] = await Promise.all([
        getCachedVgpuList(),
        getCachedScripts(),
        getCachedDatasets()
      ])
      
      setVgpuList(vRes || [])
      setScriptList(sRes?.scripts || ['my_ml_model.py', 'test_script.py'])
      setDatasetList(dRes?.datasets || [])
      
      // Auto-select first dataset if available
      if (dRes?.datasets && dRes.datasets.length > 0 && !selectedDataset) {
        setSelectedDataset(dRes.datasets[0])
      }
    } catch (e) {
      console.error("Failed to load workspace data:", e)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setIsUploading(true)
    setTerminalLogs(prev => [...prev, ` System: Ingesting dataset file [${file.name}]...`])
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('http://localhost:8000/api/datasets/upload', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (result.status === 'success') {
        setTerminalLogs(prev => [...prev, ` System: Ingestion successful! Dataset [${file.name}] registered.`])
        // Refresh dataset lists
        invalidateDatasetsCache()
        const dRes = await getCachedDatasets(true)
        setDatasetList(dRes?.datasets || [])
        setSelectedDataset(file.name)
      } else {
        setTerminalLogs(prev => [...prev, ` System: Upload failure: ${result.message}`])
      }
    } catch(err) {
      setTerminalLogs(prev => [...prev, " System: Network connection failed during dataset upload."])
    } finally {
      setIsUploading(false)
    }
  }

  // Run Job Submission
  const handleInitializeCompute = async () => {
    setIsExecuting(true)
    setTerminalLogs([
      " Dispatching compute pipeline container...",
      ` Target Node: ${selectedVgpu === 'ALL_FLEET' ? 'Distributed Fleet Node Cluster' : `vGPU-${selectedVgpu.substring(0, 8)}`}`,
      ` Execution Script: ${selectedScript}`,
      ` Active Dataset: ${selectedDataset || 'Synthetic In-Memory Data Generator'}`,
      "⏳ Initializing virtual GPU thread allocations, training model in sandbox..."
    ])

    // Periodically simulate compute load spike in the cluster compute intensity graph
    const spikeInterval = setInterval(() => {
      setHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          utilization: Math.floor(Math.random() * 20) + 75, // Spike load between 75% and 95%
          memory: Math.floor(Math.random() * 500) + 4000,
          temp: Math.floor(Math.random() * 5) + 70
        }
        return [...prev.slice(-29), newEntry]
      })
    }, 500)
    
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
      
      clearInterval(spikeInterval)
      
      if (result && result.status !== 'error') {
        const accuracyText = result.accuracy ? ` Accuracy achieved: ${result.accuracy}%` : ''
        const speedText = result.speed ? ` Throughput: ${result.speed} samples/sec` : ''
        
        setTerminalLogs(prev => [
          ...prev,
          "--------------------------------------------",
          " Pipeline execution completed successfully!",
          accuracyText,
          speedText,
          "--------------------------------------------",
          result.raw_output || "No output logs captured."
        ])

        // Instantly update the AutoML leaderboard with score
        setData(prev => {
          if (!prev) return prev;
          const jobsList = prev.recent_jobs || [];
          if (jobsList.some(j => j.run_group === result.run_group)) {
            return prev;
          }
          return {
            ...prev,
            recent_jobs: [result, ...jobsList].slice(0, 10)
          };
        });

        if (result.leaderboard) {
          setActiveLeaderboard(result.leaderboard)
        }

        // Instantly add a final completed load point to history graph
        setHistory(prev => {
          const finalEntry = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            utilization: 15.0, // Drop down back to idle load
            memory: 800,
            temp: 52
          }
          return [...prev.slice(-29), finalEntry]
        })
        
        // Trigger file refresh
        fetchHardwareAndFiles()
      } else {
        setTerminalLogs(prev => [
          ...prev,
          " Pipeline terminated with execution error:",
          result?.message || "Internal runner environment failure."
        ])
      }
    } catch (e) {
      clearInterval(spikeInterval)
      setTerminalLogs(prev => [...prev, " System: Server communication failure during execution."])
    } finally {
      setIsExecuting(false)
    }
  }

  // Aggregate Metrics
  const physicalGpus = data?.physical_gpus || []
  const gpu = physicalGpus[0] || { gpu_utilization: 0, memory_used: 0, memory_total: 8192 }
  
  const clusterLoad = physicalGpus.length > 0 
    ? physicalGpus.reduce((acc, g) => acc + (g.gpu_utilization || 0), 0) / physicalGpus.length 
    : 0
    
  const totalVram = physicalGpus.reduce((acc, g) => acc + (g.memory_used || 0), 0)
  
  const recentJobs = data?.recent_jobs || []
  const clusterAccuracy = recentJobs.length > 0 
    ? (recentJobs.reduce((acc, j) => acc + (j.accuracy || 0), 0) / recentJobs.length).toFixed(1)
    : '--'
  const clusterThroughput = recentJobs.length > 0
    ? recentJobs.reduce((acc, j) => acc + (j.speed || 0), 0).toFixed(1)
    : '--'

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Telemetry Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>System Telemetry & Controls</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Cluster Core Plane: Provision nodes, upload datasets, and monitor virtual sandboxes.
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.35rem 0.75rem', 
          borderRadius: '50px', 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          background: isConnected ? 'rgba(118, 185, 0, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          color: isConnected ? 'var(--accent)' : 'var(--red)',
          border: `1px solid ${isConnected ? 'rgba(118, 185, 0, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isConnected ? 'var(--accent)' : 'var(--red)',
            boxShadow: `0 0 8px ${isConnected ? 'var(--accent)' : 'var(--red)'}`
          }} />
          {isConnected ? 'V-GPU CLUSTER ONLINE' : 'NODE DISCONNECTED'}
        </div>
      </div>

      {/* Top Level Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <StatCard icon={Cpu} label="Cluster Load" value={`${clusterLoad.toFixed(1)}%`} subtext="Active Fleet Execution" color="blue" />
        <StatCard icon={Database} label="VRAM Pool" value={`${totalVram.toFixed(0)} MB`} subtext="Memory Pressure" color="purple" />
        <StatCard icon={Zap} label="Model Accuracy" value={clusterAccuracy !== '--' ? `${clusterAccuracy}%` : '--'} subtext="Latest Pipeline Run" color="green" />
        <StatCard icon={Activity} label="Throughput" value={clusterThroughput !== '--' ? `${clusterThroughput} samples/s` : '--'} subtext="Aggregated Inference Rate" color="orange" />
      </div>

      {/* MIDDLE ZONE: EXECUTOR HUB AND TERMINAL */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem' }}>
        
        {/* COMPUTE PIPELINE LAUNCHER PANEL (7 COLS) */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <PlayCircle size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Initialize Compute Job</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Target Node Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target vGPU instance</label>
              <select 
                value={selectedVgpu} 
                onChange={e => setSelectedVgpu(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.6rem 0.75rem', 
                  background: '#000', 
                  border: '1px solid var(--border)', 
                  color: '#fff', 
                  outline: 'none', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="ALL_FLEET"> distributed fleet array (all nodes)</option>
                {vgpuList.map(v => (
                  <option key={v.id} value={v.id}>
                    vGPU-{v.id.substring(0,8)} ({v.vram_limit}MB, {v.compute_limit}% Compute)
                  </option>
                ))}
              </select>
            </div>

            {/* Script Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution ML Script</label>
              <select 
                value={selectedScript} 
                onChange={e => setSelectedScript(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.6rem 0.75rem', 
                  background: '#000', 
                  border: '1px solid var(--border)', 
                  color: '#fff', 
                  outline: 'none', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
              >
                {scriptList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>

          {/* Dataset Selection & Upload Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input Dataset (.CSV, .JSON, .TXT)</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select 
                value={selectedDataset} 
                onChange={e => setSelectedDataset(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '0.6rem 0.75rem', 
                  background: '#000', 
                  border: '1px solid var(--border)', 
                  color: '#fff', 
                  outline: 'none', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">None (Synthetic Data)</option>
                {datasetList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              
              <input 
                type="file" 
                id="dashboard-ds-upload" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => document.getElementById('dashboard-ds-upload').click()}
                disabled={isUploading}
                style={{ 
                  background: 'var(--light-gray)', 
                  border: '1px solid var(--border)', 
                  color: '#fff', 
                  padding: '0 1rem', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <UploadCloud size={14} />
                {isUploading ? 'Uploading...' : 'Ingest File'}
              </button>
            </div>
          </div>

          {/* Compute Dispatch Trigger Button */}
          <button
            onClick={handleInitializeCompute}
            disabled={isExecuting || isUploading}
            style={{ 
              background: 'linear-gradient(135deg, var(--accent) 0%, #5ba000 100%)', 
              border: 'none', 
              color: '#000', 
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '0.8rem', 
              borderRadius: '6px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              transition: 'transform 0.1s, filter 0.2s',
              boxShadow: '0 4px 12px rgba(118, 185, 0, 0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <PlayCircle size={16} />
            {isExecuting ? 'INITIALIZING PARALLEL EXECUTION SANDBOX...' : 'INITIALIZE COMPUTE JOB'}
          </button>
        </div>

        {/* COMPUTE TERMINAL OUTPUT ENGINE (5 COLS) */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Real-Time Terminal Output</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            </div>
          </div>

          <div 
            className="font-mono"
            style={{ 
              flex: 1, 
              background: '#000', 
              padding: '1rem', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              color: 'var(--accent)', 
              overflowY: 'auto', 
              maxHeight: '220px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.35rem',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
            }}
          >
            {terminalLogs.map((log, index) => (
              <div key={index} style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {log}
              </div>
            ))}
            {isExecuting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--blue)', marginTop: '0.5rem' }}>
                <span className="pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
                <span>TRAINING ACTIVE ON DOCKER CONTAINERS...</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM ZONE: TELEMENTRY GRAPH & ACTIVE JOBS TOPOLOGY */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem' }}>
        
        {/* Aggregated Fleet Compute Load Intensity (7 Cols) */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--accent)" />
              Cluster Compute Intensity
            </h3>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aggregated Fleet Load</span>
          </div>
          
          <div style={{ height: '200px', width: '100%' }}>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ background: '#111', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="utilization" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorUtil)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem', italic: 'true' }}>
                Awaiting fleet utilization stats stream...
              </div>
            )}
          </div>
        </div>

        {/* Model Leaderboard & History (5 Cols) */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} color="var(--accent)" />
              AutoML Model Leaderboard
            </h3>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Performers</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>
                  <th style={{ paddingBottom: '0.6rem' }}>Model Name</th>
                  <th style={{ paddingBottom: '0.6rem' }}>Inf Time</th>
                  <th style={{ paddingBottom: '0.6rem' }}>RMSE</th>
                  <th style={{ paddingBottom: '0.6rem' }}>MAE</th>
                  <th style={{ paddingBottom: '0.6rem' }}>R-Sq</th>
                </tr>
              </thead>
              <tbody>
                {activeLeaderboard && activeLeaderboard.length > 0 ? (
                  activeLeaderboard.map((model, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.6rem 0', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {model.name}
                      </td>
                      <td style={{ padding: '0.6rem 0', color: 'var(--accent)', fontWeight: 700 }}>{model.inf_time}</td>
                      <td style={{ padding: '0.6rem 0', color: 'var(--text-secondary)' }}>{model.rmse}</td>
                      <td style={{ padding: '0.6rem 0', color: 'var(--text-secondary)' }}>{model.mae}</td>
                      <td style={{ padding: '0.6rem 0', fontFamily: 'JetBrains Mono, monospace', color: 'var(--blue)', fontWeight: 600 }}>{model.r2}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No active training history detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  )
}

function StatCard({ icon: Icon, label, value, subtext, color }) {
  const colorMap = {
    blue: 'var(--blue)',
    purple: 'var(--purple)',
    green: 'var(--accent)',
    orange: 'var(--yellow)'
  }
  
  return (
    <div style={{ 
      background: 'var(--gray)', 
      border: '1px solid var(--border)', 
      borderRadius: '8px', 
      padding: '1.25rem', 
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '0.6rem', 
        borderRadius: '6px', 
        background: `rgba(${color === 'green' ? '118,185,0' : color === 'blue' ? '59,130,246' : color === 'purple' ? '139,92,246' : '245,158,11'}, 0.1)`, 
        color: colorMap[color],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={20} />
      </div>
      <div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{value}</div>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>{subtext}</span>
      </div>
    </div>
  )
}

export default Dashboard