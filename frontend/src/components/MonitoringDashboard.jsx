import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts'
import {
  Activity, Cpu, Database, Zap, ExternalLink, RefreshCw,
  Server, CheckCircle2, AlertCircle, Play, Eye, Sparkles, Terminal,
  Sliders, ShieldCheck, Gauge, ArrowUpRight, Layers, Lock, Archive,
  ShieldAlert, Check, Undo2, RotateCw, Trash2
} from 'lucide-react'

export default function MonitoringDashboard({ theme = 'dark' }) {
  const [tokenStats, setTokenStats] = useState(null)
  const [monitoringStatus, setMonitoringStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [viewMode, setViewMode] = useState('native') // 'native', 'grafana', or 'sysdesign'
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [rawMetrics, setRawMetrics] = useState('')
  const [showRawMetrics, setShowRawMetrics] = useState(false)
  const [testPrompt, setTestPrompt] = useState('Explain how vGPU memory isolation works in 2 sentences.')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // System Design & Architecture State
  const [cacheStats, setCacheStats] = useState(null)
  const [queueStats, setQueueStats] = useState(null)
  const [securityStatus, setSecurityStatus] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [backups, setBackups] = useState([])
  const [ipToBlock, setIpToBlock] = useState('')
  const [actionFeedback, setActionFeedback] = useState(null)

  // Fetch all telemetry data including System Design subsystems
  const fetchAllData = async () => {
    try {
      setIsRefreshing(true)
      const [tokenRes, statusRes, cacheRes, queueRes, secRes, auditRes, backupRes] = await Promise.all([
        axios.get('http://localhost:8000/api/metrics/ai-tokens'),
        axios.get('http://localhost:8000/api/metrics/monitoring-status'),
        axios.get('http://localhost:8000/api/cache/stats').catch(() => ({ data: null })),
        axios.get('http://localhost:8000/api/queue/stats').catch(() => ({ data: null })),
        axios.get('http://localhost:8000/api/security/status').catch(() => ({ data: null })),
        axios.get('http://localhost:8000/api/security/audit-logs?limit=20').catch(() => ({ data: [] })),
        axios.get('http://localhost:8000/api/backup/list').catch(() => ({ data: [] }))
      ])

      setTokenStats(tokenRes.data)
      setMonitoringStatus(statusRes.data)
      if (cacheRes.data) setCacheStats(cacheRes.data)
      if (queueRes.data) setQueueStats(queueRes.data)
      if (secRes.data) setSecurityStatus(secRes.data)
      if (auditRes.data) setAuditLogs(auditRes.data)
      if (backupRes.data) setBackups(backupRes.data)

      // Add to historical rate graph
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setHistory(prev => {
        const entry = {
          time: nowStr,
          totalTokens: tokenRes.data.total_tokens || 0,
          promptTokens: tokenRes.data.prompt_tokens || 0,
          completionTokens: tokenRes.data.completion_tokens || 0,
          tps: tokenRes.data.tokens_per_second || 0
        }
        return [...prev.slice(-29), entry]
      })
    } catch (err) {
      console.error('Failed to fetch monitoring telemetry:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch raw prometheus text
  const fetchRawMetrics = async () => {
    try {
      const res = await axios.get('http://localhost:8000/metrics')
      setRawMetrics(res.data)
    } catch (err) {
      setRawMetrics(`Failed to fetch /metrics: ${err.message}`)
    }
  }

  useEffect(() => {
    fetchAllData()
    const timer = setInterval(fetchAllData, 2500)
    return () => clearInterval(timer)
  }, [])

  // Send a test inference request to watch tokens increment
  const handleTestInference = async () => {
    if (!testPrompt.trim() || isTesting) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await axios.post('http://localhost:8000/api/chat', {
        message: testPrompt,
        session_id: 'monitoring_test_session'
      })
      setTestResult(res.data)
      await fetchAllData()
    } catch (err) {
      setTestResult({ error: err.message })
    } finally {
      setIsTesting(false)
    }
  }

  // System Design Action Handlers
  const handleClearCache = async () => {
    try {
      await axios.post('http://localhost:8000/api/cache/clear', {})
      setActionFeedback({ type: 'success', text: 'Multi-tier cache flushed successfully.' })
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Failed to flush cache: ${err.message}` })
    }
  }

  const handleDispatchQueueJob = async (priority = 'NORMAL') => {
    try {
      const res = await axios.post('http://localhost:8000/api/queue/enqueue', {
        name: 'ml_training',
        payload: { script: 'test_script.py', vgpu_id: 'auto_worker', timestamp: Date.now() },
        priority: priority,
        max_retries: 3
      })
      setActionFeedback({ type: 'success', text: `Enqueued ${priority} task: ${res.data.job?.job_id}` })
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Enqueue failed: ${err.message}` })
    }
  }

  const handleReplayDLQ = async (jobId) => {
    try {
      await axios.post(`http://localhost:8000/api/queue/jobs/${jobId}/replay`)
      setActionFeedback({ type: 'success', text: `Replayed Dead-Letter job ${jobId}` })
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Failed replaying job: ${err.message}` })
    }
  }

  const handleBlockIp = async () => {
    if (!ipToBlock.trim()) return
    try {
      await axios.post('http://localhost:8000/api/security/block-ip', { ip: ipToBlock.trim() })
      setActionFeedback({ type: 'success', text: `IP ${ipToBlock} quarantined by firewall.` })
      setIpToBlock('')
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Failed to block IP: ${err.message}` })
    }
  }

  const handleUnblockIp = async (ip) => {
    try {
      await axios.post('http://localhost:8000/api/security/unblock-ip', { ip })
      setActionFeedback({ type: 'success', text: `IP ${ip} released from quarantine.` })
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Failed unblocking IP: ${err.message}` })
    }
  }

  const handleCreateBackup = async () => {
    try {
      setActionFeedback({ type: 'info', text: 'Generating cryptographic SHA-256 backup archive...' })
      const res = await axios.post('http://localhost:8000/api/backup/create', { label: 'manual', description: 'Snapshot created from Operations Hub' })
      setActionFeedback({ type: 'success', text: `Created snapshot ${res.data.manifest?.backup_id} (${res.data.manifest?.size_mb} MB)` })
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Backup failed: ${err.message}` })
    }
  }

  const handleVerifyBackup = async (backupId) => {
    try {
      const res = await axios.post(`http://localhost:8000/api/backup/${backupId}/verify`)
      if (res.data?.valid) {
        setActionFeedback({ type: 'success', text: `Verified SHA-256 integrity of ${backupId}. Archive valid!` })
      } else {
        setActionFeedback({ type: 'error', text: `Integrity check failed: ${res.data?.error}` })
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Verify error: ${err.message}` })
    }
  }

  const handleRestoreBackup = async (backupId) => {
    if (!window.confirm(`Are you sure you want to restore cluster databases from ${backupId}? Existing state will be overwritten.`)) return
    try {
      await axios.post(`http://localhost:8000/api/backup/${backupId}/restore`)
      setActionFeedback({ type: 'success', text: `Successfully restored cluster state from ${backupId}!` })
      await fetchAllData()
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Restore failed: ${err.message}` })
    }
  }

  const promOnline = monitoringStatus?.prometheus?.online
  const grafanaOnline = monitoringStatus?.grafana?.online

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Top Banner: Title & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={28} color="#10b981" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Prometheus & Grafana Telemetry
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live AI Model Token consumption, inference latency, cluster compute, and green-compute telemetry.
          </p>
        </div>

        {/* Action Buttons & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--dark-gray)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('native')}
              style={{
                padding: '0.45rem 0.9rem',
                border: 'none',
                borderRadius: '6px',
                background: viewMode === 'native' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'native' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Cpu size={16} /> Native AI Token Hub
            </button>
            <button
              onClick={() => setViewMode('grafana')}
              style={{
                padding: '0.45rem 0.9rem',
                border: 'none',
                borderRadius: '6px',
                background: viewMode === 'grafana' ? '#f97316' : 'transparent',
                color: viewMode === 'grafana' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Gauge size={16} /> Embedded Grafana
            </button>
            <button
              onClick={() => setViewMode('sysdesign')}
              style={{
                padding: '0.45rem 0.9rem',
                border: 'none',
                borderRadius: '6px',
                background: viewMode === 'sysdesign' ? '#8b5cf6' : 'transparent',
                color: viewMode === 'sysdesign' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <ShieldCheck size={16} /> System Design & Ops
            </button>
          </div>

          <button
            onClick={fetchAllData}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              background: 'var(--gray)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Connection Status Pill Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Prometheus Target Card */}
        <div style={{
          background: 'var(--card-bg, #16181d)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: promOnline ? '#10b981' : '#f59e0b',
              boxShadow: promOnline ? '0 0 10px #10b981' : '0 0 10px #f59e0b'
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Prometheus (Port 9090)
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: promOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: promOnline ? '#10b981' : '#f59e0b',
                  fontWeight: 600
                }}>
                  {promOnline ? 'ONLINE' : 'CONTAINER WAITING'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Target: <a href="http://localhost:8000/metrics" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>:8000/metrics</a>
              </div>
            </div>
          </div>

          <a
            href="http://localhost:9090"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              padding: '0.35rem 0.65rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              textDecoration: 'none'
            }}
          >
            Open UI <ExternalLink size={12} />
          </a>
        </div>

        {/* Grafana Target Card */}
        <div style={{
          background: 'var(--card-bg, #16181d)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: grafanaOnline ? '#f97316' : '#f59e0b',
              boxShadow: grafanaOnline ? '0 0 10px #f97316' : '0 0 10px #f59e0b'
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Grafana (Port 3001)
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: grafanaOnline ? 'rgba(249, 115, 22, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: grafanaOnline ? '#f97316' : '#f59e0b',
                  fontWeight: 600
                }}>
                  {grafanaOnline ? 'ONLINE' : 'CONTAINER WAITING'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Auto-provisioned V-GPU & AI Tokens Dashboard
              </div>
            </div>
          </div>

          <a
            href="http://localhost:3001/d/vgpu-ai-tokens/v-gpu-cluster-ai-model-tokens-monitoring?orgId=1&kiosk=tv"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              padding: '0.35rem 0.65rem',
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              borderRadius: '6px',
              color: '#f97316',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            Dashboard <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* IF VIEW MODE IS GRAFANA */}
      {viewMode === 'grafana' && (
        <div style={{
          background: 'var(--card-bg, #16181d)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 230px)'
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gauge size={16} color="#f97316" />
              Live Grafana Dashboard Embedding (Port 3001)
            </div>
            <a
              href="http://localhost:3001/d/vgpu-ai-tokens/v-gpu-cluster-ai-model-tokens-monitoring?orgId=1"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
            >
              Open Fullscreen <ArrowUpRight size={14} />
            </a>
          </div>

          {grafanaOnline ? (
            <iframe
              src={`http://localhost:3001/d/vgpu-ai-tokens/v-gpu-cluster-ai-model-tokens-monitoring?orgId=1&kiosk=tv&theme=${theme === 'light' ? 'light' : 'dark'}`}
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                background: theme === 'light' ? '#ffffff' : '#111217'
              }}
              title="V-GPU Grafana Monitoring"
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <AlertCircle size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Grafana Container is Starting or Offline</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '550px', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                To launch the Grafana and Prometheus Docker stack, run:
              </p>
              <pre style={{
                background: 'var(--terminal-bg)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--accent)',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }}>
                python3 scripts/start_monitoring.py
              </pre>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                You can switch back to the <strong>Native AI Token Hub</strong> tab to inspect live tokens anytime.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: actionFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : actionFeedback.type === 'info' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${actionFeedback.type === 'error' ? '#ef4444' : actionFeedback.type === 'info' ? '#38bdf8' : '#10b981'}`,
          color: actionFeedback.type === 'error' ? '#fca5a5' : actionFeedback.type === 'info' ? '#7dd3fc' : '#6ee7b7',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {actionFeedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {actionFeedback.text}
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* IF VIEW MODE IS SYSTEM DESIGN & OPERATIONS */}
      {viewMode === 'sysdesign' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Row: 4 Architectural System Design Pillar Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem'
          }}>
            {/* 1. Multi-Tier Cache */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em' }}>
                    MULTI-TIER CACHE (L1/L2)
                  </span>
                  <Layers size={18} color="#a78bfa" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c4b5fd', marginTop: '0.35rem' }}>
                  {cacheStats?.hit_ratio_pct || 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Hit Ratio ({cacheStats?.hits || 0} hits / {cacheStats?.misses || 0} misses)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {cacheStats?.size || 0} items cached • {cacheStats?.evictions || 0} evictions
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleClearCache}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    background: 'rgba(167, 139, 250, 0.15)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    borderRadius: '6px',
                    color: '#c4b5fd',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <RotateCw size={13} /> Flush L1 Cache
                </button>
              </div>
            </div>

            {/* 2. Asynchronous Task Queue */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
                    ASYNC QUEUE & WORKERS
                  </span>
                  <Zap size={18} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.35rem' }}>
                  {queueStats?.active_executing || 0} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {queueStats?.concurrency || 4} Active</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Queue Depth: {queueStats?.pending_in_queue || 0} pending
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {queueStats?.total_completed || 0} completed • {queueStats?.dlq_size || 0} in DLQ
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleDispatchQueueJob('HIGH')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + Enqueue High Job
                </button>
                <button
                  onClick={() => handleDispatchQueueJob('CRITICAL')}
                  style={{
                    padding: '0.45rem 0.65rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Critical
                </button>
              </div>
            </div>

            {/* 3. Network Protection & Anti-DDoS */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>
                    SECURITY & RATE LIMITER
                  </span>
                  <Lock size={18} color="#10b981" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '0.35rem' }}>
                  {securityStatus?.rate_limiter?.burst_limit || 180} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>req/min</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Sliding-Window Token Bucket Protected
                </div>
                <div style={{ fontSize: '0.75rem', color: securityStatus?.rate_limiter?.blocked_ips_count ? '#f87171' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {securityStatus?.rate_limiter?.blocked_ips_count || 0} IPs Quarantined / Blocked
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="IP e.g. 192.168.1.50"
                  value={ipToBlock}
                  onChange={(e) => setIpToBlock(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--gray)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleBlockIp}
                  style={{
                    padding: '0.4rem 0.65rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Block
                </button>
              </div>
            </div>

            {/* 4. Disaster Recovery & Backups */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em' }}>
                    DISASTER RECOVERY & BACKUPS
                  </span>
                  <Archive size={18} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.35rem' }}>
                  {backups.length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Snapshots</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Cryptographic SHA-256 Verified
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Auto-retention: Max 10 versions preserved
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCreateBackup}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '6px',
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Archive size={13} /> + Create SHA-256 Snapshot
                </button>
              </div>
            </div>
          </div>

          {/* Middle Row: Two Column Grid for Queues & Backups + Security Logs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Left Column: Dead-Letter Queue & Disaster Recovery Snapshots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Dead-Letter Queue Inspector */}
              <div style={{
                background: 'var(--card-bg, #16181d)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldAlert size={16} color="#ef4444" /> Dead-Letter Queue (DLQ) & Failed Tasks
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Tasks exceeding exponential retry limits routed to DLQ with diagnostic traces
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    {queueStats?.dlq_size || 0} Poison Messages
                  </span>
                </div>

                {queueStats?.dead_letter_jobs && queueStats.dead_letter_jobs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {queueStats.dead_letter_jobs.map(job => (
                      <div
                        key={job.job_id}
                        style={{
                          background: 'rgba(239, 68, 68, 0.05)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fca5a5' }}>
                            {job.job_id} ({job.name})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Error: {job.error || 'Unknown failure'} • Attempts: {job.retry_count}/{job.max_retries}
                          </div>
                        </div>
                        <button
                          onClick={() => handleReplayDLQ(job.job_id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Undo2 size={13} /> Replay
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    Dead-Letter Queue is empty. All background worker tasks executing cleanly!
                  </div>
                )}
              </div>

              {/* Snapshots & Restore Table */}
              <div style={{
                background: 'var(--card-bg, #16181d)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Archive size={16} color="#f59e0b" /> Disaster Recovery Snapshot Repository
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      SHA-256 cryptographic archives for full database & platform point-in-time recovery
                    </p>
                  </div>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {backups.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.5rem' }}>Snapshot ID</th>
                          <th style={{ padding: '0.5rem' }}>Size</th>
                          <th style={{ padding: '0.5rem' }}>SHA-256 Hash</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map(b => (
                          <tr key={b.backup_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.backup_id}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{b.iso_time || 'Recent'}</div>
                            </td>
                            <td style={{ padding: '0.5rem', color: '#fbbf24', fontWeight: 600 }}>
                              {b.size_mb} MB
                            </td>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {b.sha256 ? `${b.sha256.substring(0, 12)}...` : 'N/A'}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem' }}>
                                <button
                                  onClick={() => handleVerifyBackup(b.backup_id)}
                                  title="Verify cryptographic SHA-256 integrity"
                                  style={{
                                    padding: '0.3rem 0.5rem',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    borderRadius: '4px',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                  }}
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => handleRestoreBackup(b.backup_id)}
                                  title="Restore cluster databases to this snapshot"
                                  style={{
                                    padding: '0.3rem 0.5rem',
                                    background: 'rgba(245, 158, 11, 0.2)',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    borderRadius: '4px',
                                    color: '#fbbf24',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                  }}
                                >
                                  Restore
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No backup snapshots created yet. Click "+ Create SHA-256 Snapshot" above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Real-Time Security Audit Stream & Blocked IPs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Quarantined IP List */}
              {securityStatus?.rate_limiter?.blocked_ips && securityStatus.rate_limiter.blocked_ips.length > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>
                    Currently Quarantined IP Addresses:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {securityStatus.rate_limiter.blocked_ips.map(ip => (
                      <div
                        key={ip}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <span style={{ color: '#fff', fontFamily: 'monospace' }}>{ip}</span>
                        <button
                          onClick={() => handleUnblockIp(ip)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#34d399',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Audit Log Table */}
              <div style={{
                background: 'var(--card-bg, #16181d)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem',
                flex: 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Lock size={16} color="#10b981" /> Live Security Audit Log
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Tamper-evident log of authorization, rate limiting, and firewall events
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                    Active Shield
                  </span>
                </div>

                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem' }}>Time</th>
                        <th style={{ padding: '0.5rem' }}>Severity</th>
                        <th style={{ padding: '0.5rem' }}>Event</th>
                        <th style={{ padding: '0.5rem' }}>Client IP</th>
                        <th style={{ padding: '0.5rem' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(log.timestamp * 1000).toLocaleTimeString()}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: log.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : log.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: log.severity === 'CRITICAL' ? '#f87171' : log.severity === 'WARNING' ? '#fbbf24' : '#34d399'
                              }}>
                                {log.severity}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.event_type}
                            </td>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                              {log.client_ip}
                            </td>
                            <td style={{ padding: '0.5rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.details}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            No security incidents detected. System protected by token-bucket rate limiter and firewall.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IF VIEW MODE IS NATIVE */}
      {viewMode === 'native' && (
        <>
          {/* AI Token KPI Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Total Tokens */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                TOTAL AI TOKENS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.35rem' }}>
                {(tokenStats?.total_tokens || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Across all models & sessions
              </div>
            </div>

            {/* Prompt Tokens */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                PROMPT (INPUT) TOKENS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', marginTop: '0.35rem' }}>
                {(tokenStats?.prompt_tokens || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {tokenStats?.total_tokens ? Math.round(((tokenStats.prompt_tokens || 0) / tokenStats.total_tokens) * 100) : 0}% of total volume
              </div>
            </div>

            {/* Completion Tokens */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                COMPLETION (OUTPUT) TOKENS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '0.35rem' }}>
                {(tokenStats?.completion_tokens || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Generated response volume
              </div>
            </div>

            {/* Generation Velocity (TPS) */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                GENERATION SPEED
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.35rem' }}>
                {tokenStats?.tokens_per_second || 0} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tokens/s</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Total requests: {tokenStats?.total_requests || 0}
              </div>
            </div>
          </div>

          {/* Real-time Token Velocity Chart & Test Generator */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            {/* Live Chart */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    Token Consumption Timeline
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Continuous 30-sample sliding telemetry window
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                  Live Stream
                </div>
              </div>

              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--gray)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Area type="monotone" dataKey="totalTokens" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#tokenGrad)" name="Total Tokens" />
                    <Area type="monotone" dataKey="completionTokens" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#compGrad)" name="Completion Tokens" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Test Inference Trigger */}
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  Test AI Inference & Token Monitor
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                Dispatch a live query to the backend model. Watch the prompt tokens, completion tokens, and Prometheus counters update immediately.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter test prompt..."
                  style={{
                    flex: 1,
                    background: 'var(--gray)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.6rem 0.85rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestInference()}
                />
                <button
                  onClick={handleTestInference}
                  disabled={isTesting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: isTesting ? 'var(--gray)' : 'var(--accent)',
                    color: isTesting ? 'var(--text-muted)' : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isTesting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Play size={14} />
                  {isTesting ? 'Inferring...' : 'Send Query'}
                </button>
              </div>

              {testResult && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  flex: 1,
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                      MODEL: {testResult.engine || 'Local Engine'}
                    </span>
                    {testResult.token_usage && (
                      <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                        +{testResult.token_usage.total_tokens} tokens ({testResult.token_usage.duration_s}s)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {testResult.answer || testResult.error || 'Done.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Model Breakdown Cards */}
          {tokenStats?.models && Object.keys(tokenStats.models).length > 0 && (
            <div style={{
              background: 'var(--card-bg, #16181d)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
                Per-Model Token Breakdown
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {Object.entries(tokenStats.models).map(([modelName, m]) => (
                  <div
                    key={modelName}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {modelName}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {m.requests} calls
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Prompt</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#818cf8' }}>{m.prompt_tokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completion</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>{m.completion_tokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Speed</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }}>{m.avg_tps} tps</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Token Events Table */}
          <div style={{
            background: 'var(--card-bg, #16181d)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  Recent AI Model Inference Events
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Granular token usage, prompt snippets, and generation speeds
                </p>
              </div>

              <button
                onClick={() => {
                  fetchRawMetrics()
                  setShowRawMetrics(!showRawMetrics)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  background: 'var(--gray)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <Terminal size={14} />
                {showRawMetrics ? 'Hide Raw /metrics' : 'Inspect Raw /metrics'}
              </button>
            </div>

            {showRawMetrics && (
              <div style={{
                marginBottom: '1.25rem',
                background: 'var(--terminal-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
                maxHeight: '260px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: theme === 'light' ? '#15803d' : '#a3e635'
              }}>
                <pre style={{ margin: 0 }}>{rawMetrics || 'Loading /metrics...'}</pre>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Time</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Model / Engine</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Prompt Preview</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Tokens (In / Out)</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Total</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Latency</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenStats?.recent_events && tokenStats.recent_events.length > 0 ? (
                    tokenStats.recent_events.map((evt, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(evt.timestamp * 1000).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.model}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{evt.engine}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evt.prompt_preview || '-'}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          <span style={{ color: '#818cf8' }}>{evt.prompt_tokens}</span>
                          {' / '}
                          <span style={{ color: '#34d399' }}>{evt.completion_tokens}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: '#38bdf8' }}>
                          {evt.total_tokens}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                          {evt.duration_s}s
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#f59e0b', fontWeight: 600 }}>
                          {evt.tokens_per_sec} tps
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No inference events captured yet. Use the Test AI Inference box above or ask the Copilot to start streaming tokens!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
