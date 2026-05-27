import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Briefcase, Settings } from 'lucide-react'

function SchedulerView() {
  const { data: stats } = useQuery({
    queryKey: ['scheduler-stats'],
    queryFn: () => fetch('http://localhost:8000/api/scheduler/stats').then(res => res.json()),
    refetchInterval: 1000
  })

  const { data: queueStatus } = useQuery({
    queryKey: ['queue-status'],
    queryFn: () => fetch('http://localhost:8000/api/scheduler/stats').then(res => res.json()), // Simplified
    refetchInterval: 1000
  })

  if (!stats) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--black)', minHeight: '100%' }}>
        <span className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span>Loading live task scheduler statistics...</span>
      </div>
    )
  }

  const chartData = [
    { name: 'Queued', value: queueStatus?.queued_jobs || 0 },
    { name: 'Running', value: queueStatus?.running_jobs || 0 },
    { name: 'Completed', value: queueStatus?.completed_jobs || 0 },
  ]

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Scheduler View</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Monitor live job queue scheduling allocations and balance execution metrics across nodes.
        </p>
      </div>

      {/* Grid Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Jobs</h4>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total_jobs}</p>
        </div>
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Wait Time</h4>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)' }}>{stats.avg_wait_time?.toFixed(2)}s</p>
        </div>
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Throughput</h4>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.avg_throughput?.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>jobs/s</span></p>
        </div>
        <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilization Balance</h4>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue)' }}>{stats.utilization_balance?.toFixed(2)}%</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Queue Chart */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem' 
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} color="var(--accent)" />
            Job Queue Status
          </h3>
          <div style={{ background: '#050505', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.01)' }}
                  contentStyle={{ backgroundColor: 'var(--gray)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Policy Selector */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          height: 'fit-content'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="var(--accent)" />
            Scheduling Policy
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Active Policy</label>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>Round Robin (Simulated)</div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Change Policy</label>
              <select
                disabled
                style={{ 
                  width: '100%', 
                  padding: '0.6rem 0.75rem', 
                  background: '#000', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-muted)', 
                  outline: 'none', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  cursor: 'not-allowed'
                }}
              >
                <option>Round Robin</option>
                <option>Priority Based</option>
                <option>Best Fit</option>
              </select>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Policy configuration is locked to current physical hardware bounds.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default SchedulerView