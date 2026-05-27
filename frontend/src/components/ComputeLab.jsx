import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PlayCircle, Activity, Server, Cpu, TrendingUp, Clock, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ComputeLab() {
  const [jobType, setJobType] = useState('matmul')
  const [size, setSize] = useState(1024)
  const [priority, setPriority] = useState('NORMAL')
  const [results, setResults] = useState([])

  const submitMutation = useMutation({
    mutationFn: (data) => fetch('http://localhost:8000/api/jobs/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data)
    }).then(res => res.json()),
    onSuccess: (data) => {
      setResults(prev => [...prev, { jobId: data.job_id, status: 'Submitted' }])
    }
  })

  const { data: jobStatuses } = useQuery({
    queryKey: ['job-statuses'],
    queryFn: async () => {
      const statuses = []
      for (const result of results) {
        const res = await fetch(`http://localhost:8000/api/jobs/${result.jobId}/status`)
        if (res.ok) {
          const status = await res.json()
          statuses.push(status)
        }
      }
      return statuses
    },
    refetchInterval: 1000,
    enabled: results.length > 0
  })

  const handleSubmit = () => {
    submitMutation.mutate({ job_type: jobType, size, priority })
  }

  // Calculate statistics across completed jobs
  const completedJobs = jobStatuses?.filter(j => j.status === 'COMPLETED') || []
  
  const peakGflops = completedJobs.length > 0 
    ? Math.max(...completedJobs.map(j => j.result?.gflops_achieved || 0)) 
    : 0

  const avgDuration = completedJobs.length > 0 
    ? completedJobs.reduce((sum, j) => sum + (j.execution_time || 0), 0) / completedJobs.length
    : 0

  const totalOps = completedJobs.length > 0 
    ? completedJobs.reduce((sum, j) => sum + ((j.result?.gflops_achieved || 0) * (j.execution_time || 0)), 0)
    : 0

  // Chart data formatting
  const chartData = completedJobs.map((job, idx) => ({
    name: `Run ${idx + 1}`,
    GFLOPS: Math.round(job.result?.gflops_achieved || 0),
    Duration: parseFloat(job.execution_time?.toFixed(3) || 0)
  }))

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Compute Lab</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Execute mathematical operations directly on the hardware plane to audit physical GFLOPS rates and plot throughput trends.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem' }}>

        {/* Left Side: Job Submission Form & List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Submission Card */}
          <div style={{ 
            background: 'var(--gray)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <Server size={18} color="var(--accent)" />
              Submit Compute Job
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Job Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
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
                  <option value="matmul">Matrix Multiply</option>
                  <option value="fft">FFT</option>
                  <option value="reduction">Reduction</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Size (N)</label>
                <input
                  type="number"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
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
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
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
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitMutation.isLoading}
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
              >
                <PlayCircle size={16} />
                {submitMutation.isLoading ? 'Submitting job...' : 'Submit Job'}
              </button>
            </div>
          </div>

          {/* Job Results List Card */}
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
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="var(--accent)" />
                Job History
              </h3>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                color: 'var(--accent)', 
                background: 'var(--accent-dim)', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px'
              }}>
                {jobStatuses?.length || 0} Runs
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '200px' }}>
              {jobStatuses && jobStatuses.length > 0 ? (
                jobStatuses.slice().reverse().map((status) => (
                  <div 
                    key={status.id} 
                    style={{ 
                      padding: '0.8rem', 
                      background: 'rgba(255,255,255,0.01)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ID: {status.id.substring(0, 8)}...
                      </span>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 700, 
                        padding: '0.1rem 0.3rem', 
                        borderRadius: '4px', 
                        background: status.status === 'COMPLETED' ? 'rgba(118, 185, 0, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        color: status.status === 'COMPLETED' ? 'var(--accent)' : 'var(--yellow)',
                        border: `1px solid ${status.status === 'COMPLETED' ? 'rgba(118, 185, 0, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                      }}>
                        {status.status}
                      </span>
                    </div>

                    {status.result && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.2rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.4rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Throughput:</span> {status.result.gflops_achieved?.toFixed(1)} GFLOPS
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Duration:</span> {status.execution_time?.toFixed(2)}s
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Cpu size={24} color="var(--border)" />
                  <div style={{ fontSize: '0.75rem' }}>No job history found.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Graphs & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {completedJobs.length > 0 ? (
            <>
              {/* Stats Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <TrendingUp size={12} color="var(--accent)" /> Peak GFLOPS
                  </h4>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {peakGflops.toFixed(1)}
                  </p>
                </div>

                <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} color="var(--yellow)" /> Avg Duration
                  </h4>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {avgDuration.toFixed(3)}s
                  </p>
                </div>

                <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Zap size={12} color="var(--blue)" /> Total Operations
                  </h4>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {Math.round(totalOps * 1000).toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MFLOP</span>
                  </p>
                </div>
              </div>

              {/* Performance Trend Chart */}
              <div style={{ 
                background: 'var(--gray)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--accent)" />
                  GFLOPS Throughput Trend
                </h3>
                <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGflops" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                      <Area type="monotone" dataKey="GFLOPS" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorGflops)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div style={{ 
              background: 'var(--gray)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '3rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '1rem',
              color: 'var(--text-muted)',
              height: '100%',
              minHeight: '400px'
            }}>
              <TrendingUp size={48} color="var(--border)" />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Awaiting Math Audit Data</div>
              <div style={{ fontSize: '0.75rem', textAlign: 'center', maxWidth: '300px', lineHeight: '1.4' }}>
                Launch numerical operations from the left panel to chart physical GFLOPS rates and performance trends in real-time.
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}

export default ComputeLab