import { useEffect, useState } from 'react'
import { Terminal, AlignLeft } from 'lucide-react'

function Logs() {
  const [logs, setLogs] = useState([
    { timestamp: new Date().toISOString(), message: 'System started in cluster telemetry mode' },
    { timestamp: new Date().toISOString(), message: 'vGPU nvidia-smi driver dynamic kernel mapping initialized' },
    { timestamp: new Date().toISOString(), message: 'Zenith UI compute orchestration engine ready' },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message: `Periodic check: ${Math.random() > 0.8 ? 'Thread Limit warning triggered' : 'All sandboxes operating within bounds'}`
        }
      ].slice(-50)) // Keep last 50 logs
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>System Logs</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Monitor cluster event streams, sandbox logs, and kernel level GPU thread notifications.
        </p>
      </div>

      <div style={{ 
        background: 'var(--gray)', 
        border: '1px solid var(--border)', 
        borderRadius: '8px', 
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlignLeft size={18} color="var(--accent)" />
            Live System Log
          </h3>
          <span style={{ 
            fontSize: '0.65rem', 
            fontWeight: 700, 
            color: 'var(--accent)', 
            background: 'var(--accent-dim)', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            border: '1px solid rgba(118, 185, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
            Streaming Live
          </span>
        </div>

        <div style={{ 
          background: '#050505', 
          border: '1px solid var(--border)', 
          borderRadius: '6px', 
          padding: '1.25rem', 
          maxHeight: '400px', 
          overflowY: 'auto', 
          fontFamily: 'JetBrains Mono, monospace', 
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          {logs.map((log, index) => {
            const isError = log.message.toLowerCase().includes('warning') || log.message.toLowerCase().includes('violation');
            
            return (
              <div key={index} style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                color: isError ? 'var(--red)' : 'var(--text-secondary)'
              }}>
                <span style={{ color: 'var(--accent)', shrink: 0, whiteSpace: 'nowrap' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span style={{ wordBreak: 'break-all' }}>{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default Logs