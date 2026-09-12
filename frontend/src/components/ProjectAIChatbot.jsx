import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Bot, User, Sparkles, RefreshCw, Key, Trash2, Send,
  FileCode, Layers, ShieldCheck, Database, Info, ExternalLink, ChevronRight, X,
  Activity, Thermometer, BarChart3, Zap, HardDrive, Cpu, Search, Bell,
  Maximize2, Minimize2, Paperclip, Image as ImageIcon,
  Smile, Mic, MicOff, Camera, Plus, CheckSquare, Calendar, Star, MessageSquare,
  Sliders, ArrowUpRight, Check, Volume2, Copy, Menu, Share2, CornerDownLeft,
  RotateCcw, Download, Terminal, Clock, Bookmark, HelpCircle
} from 'lucide-react'

// ─── Chatbot Avatar & Topic Badge ───────────────────────────────────────────
function BotAvatar({ type = 'bot', size = 36, active = false }) {
  const getColors = () => {
    switch (type) {
      case 'rag':
        return { bg: '#e0f2fe', iconColor: '#0284c7', border: '#bae6fd' }
      case 'metrics':
        return { bg: '#fef3c7', iconColor: '#d97706', border: '#fde68a' }
      case 'scheduler':
        return { bg: '#f3e8ff', iconColor: '#9333ea', border: '#e9d5ff' }
      case 'automl':
        return { bg: '#fee2e2', iconColor: '#dc2626', border: '#fecaca' }
      case 'hardware':
        return { bg: '#dcfce7', iconColor: '#16a34a', border: '#bbf7d0' }
      default:
        return { bg: 'rgba(118, 185, 0, 0.15)', iconColor: '#76B900', border: 'rgba(118, 185, 0, 0.3)' }
    }
  }

  const c = getColors()

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '10px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: active ? '0 0 10px rgba(118, 185, 0, 0.35)' : 'none'
      }}>
        {type === 'metrics' ? (
          <Activity size={Math.round(size * 0.52)} color={c.iconColor} />
        ) : type === 'scheduler' ? (
          <Layers size={Math.round(size * 0.52)} color={c.iconColor} />
        ) : type === 'automl' ? (
          <Cpu size={Math.round(size * 0.52)} color={c.iconColor} />
        ) : type === 'rag' ? (
          <Database size={Math.round(size * 0.52)} color={c.iconColor} />
        ) : (
          <Bot size={Math.round(size * 0.54)} color={c.iconColor} />
        )}
      </div>
      {active && (
        <span style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid #ffffff',
          boxShadow: '0 0 4px rgba(34, 197, 94, 0.8)'
        }} />
      )}
    </div>
  )
}

// ─── Live Metrics Status Strip ──────────────────────────────────────────────
function LiveMetricsStrip({ snapshot }) {
  if (!snapshot) return null

  const h = snapshot.system_health
  const gpus = snapshot.physical_gpus || []

  return (
    <div style={{
      padding: '0.45rem 1.25rem',
      background: 'rgba(118, 185, 0, 0.05)',
      borderBottom: '1px solid rgba(118, 185, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '1.25rem',
      overflowX: 'auto',
      flexShrink: 0,
      scrollbarWidth: 'none',
      fontSize: '0.7rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontWeight: 800,
        color: '#76B900',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        flexShrink: 0
      }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: '#76B900',
          animation: 'pulse-live 2s infinite',
          display: 'inline-block'
        }} />
        LIVE CLUSTER
      </div>

      {gpus.map(gpu => (
        <div key={gpu.gpu_id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: 'var(--text-secondary, #94a3b8)',
          flexShrink: 0
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary, #e2e8f0)' }}>GPU {gpu.gpu_id}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            <Thermometer size={11} color={gpu.temperature_c > 75 ? '#ef4444' : '#76B900'} />
            {gpu.temperature_c}°C
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            <BarChart3 size={11} color="#3b82f6" />
            {gpu.utilization_pct}%
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            <Zap size={11} color="#eab308" />
            {gpu.power_draw_w}W
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            <HardDrive size={11} color="#a855f7" />
            {gpu.memory_used_pct}%
          </span>
        </div>
      ))}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        marginLeft: 'auto',
        color: 'var(--text-secondary, #94a3b8)',
        flexShrink: 0
      }}>
        <span>vGPUs: <strong style={{ color: 'var(--text-primary, #e2e8f0)' }}>{h?.total_vgpu_instances ?? 0}</strong></span>
        <span>Active Jobs: <strong style={{ color: 'var(--text-primary, #e2e8f0)' }}>{snapshot.scheduler?.active_jobs ?? 0}</strong></span>
      </div>
    </div>
  )
}

// ─── Inline Metrics Card for Assistant responses ───────────────────────────
function InlineMetricsCard({ snapshot }) {
  if (!snapshot) return null

  const gpus = snapshot.physical_gpus || []

  return (
    <div style={{
      background: 'rgba(118, 185, 0, 0.04)',
      border: '1px solid rgba(118, 185, 0, 0.2)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      marginTop: '0.75rem',
      fontSize: '0.75rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontWeight: 700,
        fontSize: '0.68rem',
        color: '#76B900',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: '0.5rem'
      }}>
        <Activity size={12} />
        Live Telemetry Referenced
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
        {gpus.map(gpu => (
          <div key={gpu.gpu_id} style={{
            background: 'var(--gray, rgba(0,0,0,0.25))',
            borderRadius: '6px',
            padding: '0.45rem 0.65rem',
            border: '1px solid var(--border, #222530)'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)', marginBottom: '0.25rem', fontSize: '0.72rem' }}>
              GPU {gpu.gpu_id}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.68rem', color: 'var(--text-secondary, #94a3b8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🌡️ Temp</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: gpu.temperature_c > 75 ? '#ef4444' : 'inherit' }}>{gpu.temperature_c}°C</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📊 Load</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{gpu.utilization_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>⚡ Power</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{gpu.power_draw_w}W</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>💾 VRAM</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{gpu.memory_used_pct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function ProjectAIChatbot({ theme, isActive = true }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [indexStats, setIndexStats] = useState({ total_files: 0, total_chunks: 0, last_synced: 0 })
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vgpu-gemini-key') || '')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState(null)
  const [sessionId, setSessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 9))
  const [liveSnapshot, setLiveSnapshot] = useState(null)
  const [loadingLabel, setLoadingLabel] = useState('Scanning index & retrieving grounded context...')
  
  // UI States matching reference mockup
  const [chatCategory, setChatCategory] = useState('all') // 'all' | 'rag' | 'metrics'
  const [chatSearch, setChatSearch] = useState('')
  const [activeSessionId, setActiveSessionId] = useState('s-1')
  const [isRecording, setIsRecording] = useState(false)
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null)
  const [notificationToast, setNotificationToast] = useState(null)
  const [showPresetsMenu, setShowPresetsMenu] = useState(false)

  const messagesEndRef = useRef(null)

  // Chat History Sessions in the Left Column
  const [chatSessions, setChatSessions] = useState([
    {
      id: 's-1',
      title: 'V-GPU Core Architecture',
      category: 'rag',
      type: 'bot',
      time: 'Just now',
      lastSnippet: 'RAG index active. Grounded in architecture, scheduler, and AutoML engine.'
    },
    {
      id: 's-2',
      title: 'GPU 0 Thermal & Load Audit',
      category: 'metrics',
      type: 'metrics',
      time: '10:30pm',
      lastSnippet: 'GPU 0 running at 40.8°C with 56W power draw across 2 vGPUs.'
    },
    {
      id: 's-3',
      title: 'Scheduler Dynamic Queue',
      category: 'rag',
      type: 'scheduler',
      time: 'Yesterday',
      lastSnippet: 'core/scheduler.py balances priority batch jobs across physical GPUs.'
    },
    {
      id: 's-4',
      title: 'AutoML Kernel Optimization',
      category: 'rag',
      type: 'automl',
      time: '2 days ago',
      lastSnippet: 'AutoML engine hyperparameter search space configured.'
    },
    {
      id: 's-5',
      title: 'VFIO & Hardware Passthrough',
      category: 'metrics',
      type: 'hardware',
      time: '3 days ago',
      lastSnippet: 'IOMMU grouping verified for isolated PCI virtualization.'
    }
  ])

  // Notifications for the Right Column
  const notifications = [
    {
      id: 'n1',
      type: 'metrics',
      name: 'Thermal Guard',
      time: '10m ago',
      text: 'Physical GPU 0 operating at optimal temperature (40.8°C).'
    },
    {
      id: 'n2',
      type: 'scheduler',
      name: 'Dynamic Scheduler',
      time: '1h ago',
      text: 'Workload balanced across cluster without memory contention.'
    },
    {
      id: 'n3',
      type: 'rag',
      name: 'RAG Knowledge Base',
      time: '3h ago',
      text: `${indexStats.total_chunks || 42} code chunks indexed with vector embeddings.`
    },
    {
      id: 'n4',
      type: 'automl',
      name: 'AutoML Compiler',
      time: 'Yesterday',
      text: 'Model performance benchmark completed for H100 node.'
    }
  ]

  // Suggested Inquiries for the Right Column
  const suggestions = [
    {
      id: 's1',
      type: 'rag',
      name: 'Architecture Overview',
      mutual: 'Summarize overall V-GPU project architecture',
      actionPrompt: 'Summarize overall V-GPU project architecture and data flow'
    },
    {
      id: 's2',
      type: 'metrics',
      name: 'Live Hardware Telemetry',
      mutual: "What's the current GPU temperature & power draw?",
      actionPrompt: "What's the current GPU temperature and power draw right now?"
    },
    {
      id: 's3',
      type: 'scheduler',
      name: 'Scheduler Queue State',
      mutual: 'How many vGPU instances are currently running?',
      actionPrompt: 'How many vGPU instances are running on the cluster and what is the scheduler status?'
    },
    {
      id: 's4',
      type: 'automl',
      name: 'AutoML Module Audit',
      mutual: 'Explain core/automl_engine.py and its features',
      actionPrompt: 'What does core/automl_engine.py do and how does it interface with the rest of V-GPU?'
    },
    {
      id: 's5',
      type: 'hardware',
      name: 'Memory Allocation Check',
      mutual: 'Audit VRAM usage and inspect potential bottlenecks',
      actionPrompt: 'Audit VRAM allocation and check if any vGPU instance has high memory pressure'
    }
  ]

  // Filter sessions based on tab & search
  const filteredSessions = useMemo(() => {
    return chatSessions.filter(s => {
      const matchesCategory = chatCategory === 'all' || s.category === chatCategory
      const matchesSearch = !chatSearch || s.title.toLowerCase().includes(chatSearch.toLowerCase()) || s.lastSnippet.toLowerCase().includes(chatSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [chatSessions, chatCategory, chatSearch])

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0]

  // Initial Data Fetch
  useEffect(() => {
    fetchIndexStatus()
    loadHistory()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Poll live metrics every 5 seconds only when active
  useEffect(() => {
    if (!isActive) return
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/metrics/snapshot')
        if (res.ok) {
          const data = await res.json()
          setLiveSnapshot(data)
        }
      } catch (e) {
        // Silently catch
      }
    }
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [isActive])

  const fetchIndexStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/chatbot/index/status')
      if (res.ok) {
        const data = await res.json()
        setIndexStats(data)
      }
    } catch (e) {
      console.error('Error fetching index status:', e)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/chatbot/history/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.history && data.history.length > 0) {
          const formatted = data.history.map((h, i) => ({
            id: i.toString(),
            sender: h.sender === 'user' ? 'user' : 'assistant',
            time: '09:25',
            text: h.message,
            citations: h.citations || []
          }))
          setMessages(formatted)
          return
        }
      }
    } catch (e) {
      console.error('Error loading history:', e)
    }

    // Default seed conversation for the active assistant thread
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        time: '09:25',
        text: `👋 **Welcome to the V-GPU Project AI Assistant!**\n\nI am directly connected to your codebase and real-time hardware telemetry:\n\n- **Project RAG**: Grounded in architecture, scheduler logic, and virtualization modules\n- **Live Hardware Telemetry**: Monitored GPU temps, utilization, power, and VRAM\n- **Unified AI Engine**: Natural language analysis powered by offline RAG or Gemini\n\nAsk me about cluster state, code implementation, or platform architecture!`,
        citations: []
      }
    ])
  }

  const handleCreateNewChat = () => {
    const newId = 's-' + Date.now()
    const newSession = {
      id: newId,
      title: 'New Conversation',
      category: 'rag',
      type: 'bot',
      time: 'Just now',
      lastSnippet: 'Start asking anything about V-GPU code or live metrics.'
    }
    setChatSessions(prev => [newSession, ...prev])
    setActiveSessionId(newId)
    setSessionId('session_' + Math.random().toString(36).substring(2, 9))
    setMessages([
      {
        id: 'msg-new',
        sender: 'assistant',
        time: 'Just now',
        text: "Started a new conversation thread. How can I assist you with V-GPU platform development or hardware telemetry today?",
        citations: []
      }
    ])
    showToast('✨ New chat session started.')
  }

  const handleDeleteSession = (e, sId) => {
    e.stopPropagation()
    setChatSessions(prev => prev.filter(s => s.id !== sId))
    if (activeSessionId === sId) {
      const remaining = chatSessions.filter(s => s.id !== sId)
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id)
      } else {
        handleCreateNewChat()
      }
    }
    showToast('Session removed from history.')
  }

  const handleResyncIndex = async () => {
    setSyncing(true)
    try {
      const res = await fetch('http://localhost:8000/api/chatbot/index/resync', {
        method: 'POST',
        headers: { 'X-Gemini-Key': apiKey }
      })
      if (res.ok) {
        const stats = await res.json()
        setIndexStats({
          total_files: stats.total_files,
          total_chunks: stats.total_chunks,
          last_synced: Date.now() / 1000
        })
        showToast(`✅ Index re-synced! ${stats.scanned_files} files scanned, ${stats.total_chunks} chunks ready.`)
      }
    } catch (e) {
      console.error('Resync failed:', e)
      showToast('⚠️ Index re-sync failed. Ensure backend is running.')
    } finally {
      setSyncing(false)
    }
  }

  const showToast = (msg) => {
    setNotificationToast(msg)
    setTimeout(() => setNotificationToast(null), 4000)
  }

  const isMetricsQuery = (text) => {
    const metricsKw = [
      'temperature', 'temp', 'how hot', 'power draw', 'watt', 'utilization',
      'gpu load', 'vram usage', 'memory usage', 'how many instance', 'how many vgpu',
      'scheduler status', 'active job', 'pending job', 'cluster health', 'current stats',
      'right now', 'live metrics', 'what is gradient', 'explain', 'what is backprop'
    ]
    const lower = text.toLowerCase()
    return metricsKw.some(kw => lower.includes(kw))
  }

  const handleSend = async (queryText) => {
    const messageToSend = queryText || input
    if (!messageToSend.trim()) return

    if (!queryText) setInput('')

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      time: timeStr,
      text: messageToSend
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Update session title & snippet in the left column
    setChatSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: s.title === 'New Conversation' ? messageToSend.slice(0, 30) + '...' : s.title,
          lastSnippet: messageToSend,
          time: 'Just now'
        }
      }
      return s
    }))

    const metricsQuery = isMetricsQuery(messageToSend)
    setLoadingLabel(metricsQuery ? 'Scanning live platform telemetry & GPU status...' : 'Scanning index & retrieving grounded project context...')

    try {
      let data

      if (metricsQuery) {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Gemini-Key': apiKey
          },
          body: JSON.stringify({
            message: messageToSend,
            session_id: sessionId,
            api_key: apiKey,
            history: messages.slice(-6).map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              content: m.text
            }))
          })
        })
        if (!res.ok) throw new Error('Failed to query Chat Engine')
        data = await res.json()
      } else {
        const res = await fetch('http://localhost:8000/api/chatbot/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Gemini-Key': apiKey
          },
          body: JSON.stringify({
            message: messageToSend,
            session_id: sessionId,
            api_key: apiKey
          })
        })
        if (!res.ok) throw new Error('Failed to query RAG Engine')
        data = await res.json()

        if (data.answer && data.answer.includes("I don't have information about that")) {
          const fallbackRes = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Gemini-Key': apiKey
            },
            body: JSON.stringify({
              message: messageToSend,
              session_id: sessionId,
              api_key: apiKey,
              history: messages.slice(-6).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                content: m.text
              }))
            })
          })
          if (fallbackRes.ok) {
            data = await fallbackRes.json()
          }
        }
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        time: timeStr,
        text: data.answer,
        citations: data.citations || [],
        metricsUsed: data.metrics_used || false,
        metricsSnapshot: data.metrics_snapshot || null
      }

      setMessages(prev => [...prev, assistantMsg])
      fetchIndexStatus()
    } catch (e) {
      console.error('Query error:', e)
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          time: timeStr,
          text: `⚠️ Error contacting the project backend: ${e.message}. Ensure the backend is running on http://localhost:8000.`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      await fetch(`http://localhost:8000/api/chatbot/history/${sessionId}`, { method: 'DELETE' })
    } catch (e) {
      console.error(e)
    }
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'assistant',
        time: 'Just now',
        text: "Conversation history cleared. What would you like to inquire about V-GPU code, live GPU metrics, or platform architecture?",
        citations: []
      }
    ])
    showToast('Chat history cleared.')
  }

  const handleExportChat = () => {
    const transcript = messages.map(m => `[${m.time || ''}] ${m.sender.toUpperCase()}:\n${m.text}\n`).join('\n---\n\n')
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `vgpu-chat-${Date.now()}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('💾 Chat conversation exported as Markdown.')
  }

  const handleSaveKey = (e) => {
    e.preventDefault()
    localStorage.setItem('vgpu-gemini-key', apiKey)
    setShowSettings(false)
    showToast('Gemini API key saved!')
  }

  // Markdown Formatter with high-contrast styling and copy button
  const parseText = (text, msgId) => {
    if (!text) return null

    const tokens = []
    const lines = text.split('\n')
    let inCodeBlock = false
    let codeBlockLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          tokens.push({ type: 'code-block', content: codeBlockLines.join('\n') })
          codeBlockLines = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockLines.push(line)
        continue
      }

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tokens.push({ type: 'table-row', content: line })
        continue
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
      if (headingMatch) {
        tokens.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] })
        continue
      }

      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ')
      let lineContent = isBullet ? line.trim().substring(2) : line

      const parts = []
      const regex = /(\*\*.*?\*\*|`.*?`)/g
      let match
      let currentIndex = 0

      while ((match = regex.exec(lineContent)) !== null) {
        const matchIndex = match.index
        if (matchIndex > currentIndex) {
          parts.push(lineContent.substring(currentIndex, matchIndex))
        }
        const tokenVal = match[0]
        if (tokenVal.startsWith('**') && tokenVal.endsWith('**')) {
          parts.push(<strong key={matchIndex} style={{ fontWeight: 700, color: 'inherit' }}>{tokenVal.slice(2, -2)}</strong>)
        } else if (tokenVal.startsWith('`') && tokenVal.endsWith('`')) {
          parts.push(
            <code key={matchIndex} style={{
              background: 'rgba(0,0,0,0.06)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.78rem',
              color: '#0284c7'
            }}>
              {tokenVal.slice(1, -1)}
            </code>
          )
        }
        currentIndex = regex.lastIndex
      }
      if (currentIndex < lineContent.length) {
        parts.push(lineContent.substring(currentIndex))
      }

      tokens.push({
        type: isBullet ? 'bullet' : 'paragraph',
        content: parts
      })
    }

    return tokens.map((token, idx) => {
      if (token.type === 'code-block') {
        const isCopied = copiedCodeIdx === `${msgId}-${idx}`
        return (
          <div key={idx} style={{ position: 'relative', margin: '0.65rem 0' }}>
            <pre style={{
              background: '#0d1117',
              color: '#e6edf3',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              overflowX: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.78rem',
              border: '1px solid rgba(255,255,255,0.1)',
              lineHeight: 1.45
            }}>
              <code>{token.content}</code>
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(token.content)
                setCopiedCodeIdx(`${msgId}-${idx}`)
                setTimeout(() => setCopiedCodeIdx(null), 2000)
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                padding: '3px 7px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isCopied ? <Check size={11} color="#22c55e" /> : <Copy size={11} />}
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )
      }
      if (token.type === 'heading') {
        return (
          <div key={idx} style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0.65rem 0 0.35rem 0' }}>
            {token.content}
          </div>
        )
      }
      if (token.type === 'table-row') {
        if (token.content.replace(/[|\-\s]/g, '') === '') return null
        const cells = token.content.split('|').filter(c => c.trim())
        return (
          <div key={idx} style={{
            display: 'flex',
            gap: '0.75rem',
            fontSize: '0.8rem',
            padding: '0.3rem 0.5rem',
            borderBottom: '1px solid rgba(0,0,0,0.06)'
          }}>
            {cells.map((cell, ci) => (
              <span key={ci} style={{ flex: 1, fontWeight: ci === 0 ? 600 : 400 }}>{cell.trim()}</span>
            ))}
          </div>
        )
      }
      if (token.type === 'bullet') {
        return (
          <li key={idx} style={{ marginBottom: '0.3rem', marginLeft: '1.2rem', fontSize: '0.86rem', lineHeight: '1.5' }}>
            {token.content}
          </li>
        )
      }
      if (!token.content || token.content.length === 0 || (token.content.length === 1 && token.content[0] === '')) {
        return <div key={idx} style={{ height: '0.35rem' }} />
      }
      return (
        <p key={idx} style={{ margin: '0.35rem 0', fontSize: '0.86rem', lineHeight: '1.55' }}>
          {token.content}
        </p>
      )
    })
  }

  return (
    <div className="chatbot-root-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface-0, #f4f6fb)',
      color: 'var(--text-primary, #1e293b)',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes pulse-live { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.9); } }
        @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 0.4; } 100% { transform: scale(0.95); opacity: 0.8; } }
        @keyframes shimmer-sweep { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        /* Scrollbar styles matching the mockup */
        .chat-scroll-area::-webkit-scrollbar { width: 6px; }
        .chat-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll-area::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 999px; }
        .chat-scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }

        /* Dark / Light card surface tokens */
        .dashboard-glass-card {
          background: var(--dark-gray, #ffffff);
          border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        }

        .session-item-del-btn {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .session-item-container:hover .session-item-del-btn {
          opacity: 1;
        }
      `}</style>

      {/* ──────────────────────────────────────────────────────────────────
          TOP APP HEADER BAR (Matches reference mockup top bar)
      ────────────────────────────────────────────────────────────────── */}
      <header style={{
        height: '64px',
        padding: '0 1.5rem',
        background: 'var(--dark-gray, #ffffff)',
        borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10
      }}>
        {/* Left: Chat Bot Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Glowing Yellow/Amber Chat Bubble Brand Icon from mockup */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(234, 179, 8, 0.35)'
            }}>
              <MessageSquare size={20} color="#ffffff" fill="#ffffff" />
            </div>
            <div>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text-primary, #0f172a)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                Chat Bot
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>
                Project AI Assistant & Telemetry
              </div>
            </div>
          </div>

          {/* Sub-navigation action strip (from reference image) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.5rem',
            background: 'var(--gray, #f1f5f9)',
            borderRadius: '8px',
            border: '1px solid var(--border, rgba(0,0,0,0.05))'
          }}>
            <button
              onClick={handleCreateNewChat}
              title="New Chat Session"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #64748b)', padding: '5px', cursor: 'pointer', borderRadius: '4px' }}
            >
              <Plus size={16} />
            </button>
            <button
              title="Current Active Chat"
              style={{ background: 'var(--dark-gray, #ffffff)', border: 'none', color: '#3b82f6', padding: '5px 7px', cursor: 'pointer', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={() => handleSend("Audit system logs and report warnings")}
              title="Audit Cluster Logs"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #64748b)', padding: '5px', cursor: 'pointer', borderRadius: '4px' }}
            >
              <FileCode size={16} />
            </button>
            <button
              onClick={() => handleSend("What jobs are queued in the scheduler?")}
              title="Scheduler Tasks"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #64748b)', padding: '5px', cursor: 'pointer', borderRadius: '4px' }}
            >
              <CheckSquare size={16} />
            </button>
            <button
              onClick={handleExportChat}
              title="Export Conversation"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #64748b)', padding: '5px', cursor: 'pointer', borderRadius: '4px' }}
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Right: Search, Notifications, Profile, Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Re-sync Index Badge Button */}
          <button
            onClick={handleResyncIndex}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: syncing ? 'var(--gray, #e2e8f0)' : 'rgba(118, 185, 0, 0.1)',
              border: '1px solid rgba(118, 185, 0, 0.3)',
              color: '#76B900',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: syncing ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{syncing ? 'Indexing...' : `Indexed (${indexStats.total_chunks} chunks)`}</span>
          </button>

          {/* Search Pill from mockup */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '200px'
          }}>
            <input
              type="text"
              placeholder="Search..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 2rem 0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                background: 'var(--gray, #f1f5f9)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <Search size={14} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', right: '0.75rem' }} />
          </div>

          {/* Notification Bell */}
          <button
            title="Cluster Alerts"
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #64748b)',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ef4444'
            }} />
          </button>

          {/* User Profile Avatar */}
          <div
            title="Active User Session"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent, #76B900)',
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(118, 185, 0, 0.35)'
            }}
          >
            US
          </div>

          {/* Settings Button: Gemini Key */}
          <button
            onClick={() => setShowSettings(true)}
            title="Gemini API Key & AI Settings"
            style={{
              background: apiKey ? 'rgba(59, 130, 246, 0.1)' : 'none',
              border: apiKey ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
              color: apiKey ? '#3b82f6' : 'var(--text-secondary, #64748b)',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Sliders size={18} />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────
          3-COLUMN DASHBOARD BODY
      ────────────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '290px 1fr 280px',
        gap: '1rem',
        padding: '1rem',
        overflow: 'hidden',
        minHeight: 0
      }}>

        {/* ══════════════════════════════════════════════════════════════════
            COLUMN 1: CHAT HISTORIES & SESSIONS (Left Column)
        ══════════════════════════════════════════════════════════════════ */}
        <section className="dashboard-glass-card" style={{
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Top mini-icons bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
            color: 'var(--text-secondary, #64748b)'
          }}>
            <button onClick={handleCreateNewChat} title="New Chat" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>
              <MessageSquare size={17} />
            </button>
            <button onClick={() => setChatCategory('rag')} title="Filter RAG Code" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <Database size={17} />
            </button>
            <button onClick={() => setChatCategory('metrics')} title="Filter Telemetry" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <Activity size={17} />
            </button>
            <button onClick={() => setShowSettings(true)} title="API Settings" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <Key size={17} />
            </button>
            <BotAvatar type="bot" size={24} />
          </div>

          {/* "Chats" Header & New Chat (+) Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem 0.5rem 1.25rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--text-primary, #0f172a)'
            }}>
              Chats
            </h3>
            <button
              onClick={handleCreateNewChat}
              title="New Chat Session"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#3b82f6',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.35)'
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Segmented Control: [ Direct ] [ Group ] [ Public ] or [ All ] [ Code RAG ] [ Live GPU ] */}
          <div style={{ padding: '0.5rem 1.25rem' }}>
            <div style={{
              display: 'flex',
              background: 'var(--gray, #f1f5f9)',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid var(--border, rgba(0,0,0,0.05))'
            }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'rag', label: 'RAG Code' },
                { id: 'metrics', label: 'Live GPU' }
              ].map(cat => {
                const isActive = chatCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setChatCategory(cat.id)}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.2rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#4f75fe' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 8px rgba(79, 117, 254, 0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search bar inside chats list */}
          <div style={{ padding: '0.35rem 1.25rem 0.75rem 1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search history..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 2rem 0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  background: 'var(--gray, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
              <Search size={13} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Conversations History List */}
          <div className="chat-scroll-area" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 0.75rem 0.75rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            {filteredSessions.map(session => {
              const isSelected = activeSessionId === session.id
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id)
                    setSessionId(session.id)
                    showToast(`Loaded: ${session.title}`)
                  }}
                  className="session-item-container"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(79, 117, 254, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(79, 117, 254, 0.25)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--gray, rgba(0,0,0,0.03))'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <BotAvatar type={session.type} size={38} active={isSelected} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-primary, #0f172a)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {session.title}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted, #94a3b8)',
                        whiteSpace: 'nowrap'
                      }}>
                        {session.time}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary, #64748b)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {session.lastSnippet}
                    </div>
                  </div>

                  {/* Delete session button on hover */}
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="session-item-del-btn"
                    title="Delete Conversation"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      padding: '4px',
                      cursor: 'pointer',
                      borderRadius: '4px'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            COLUMN 2: MAIN CHAT TIMELINE & INPUT (Middle Column)
        ══════════════════════════════════════════════════════════════════ */}
        <section className="dashboard-glass-card" style={{
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Active Chat Header */}
          <div style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--dark-gray, #ffffff)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <BotAvatar type={activeSession.type} size={42} active={true} />
              <div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--text-primary, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {activeSession.title}
                  <span style={{
                    fontSize: '0.62rem',
                    background: 'rgba(118, 185, 0, 0.15)',
                    color: '#76B900',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '12px'
                  }}>
                    RAG Ready
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                  Online • Dual-Purpose AI (Project Code + Live Telemetry)
                </div>
              </div>
            </div>

            {/* Chatbot Action Buttons (NO video call, NO phone call!) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary, #64748b)' }}>
              <button
                onClick={handleResyncIndex}
                disabled={syncing}
                title="Re-Sync RAG Index"
                style={{
                  background: 'var(--gray, #f1f5f9)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  color: 'inherit',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                <span>Re-Sync</span>
              </button>

              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                style={{
                  background: 'var(--gray, #f1f5f9)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  color: '#ef4444',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>

              <button
                onClick={handleExportChat}
                title="Export Conversation"
                style={{
                  background: 'var(--gray, #f1f5f9)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  color: 'inherit',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Share2 size={15} />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                title="Gemini API Key Settings"
                style={{
                  background: apiKey ? 'rgba(59, 130, 246, 0.1)' : 'var(--gray, #f1f5f9)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  color: apiKey ? '#3b82f6' : 'inherit',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Key size={15} />
              </button>
            </div>
          </div>

          {/* Integrated Live Metrics Strip */}
          <LiveMetricsStrip snapshot={liveSnapshot} />

          {/* Message Stream Area */}
          <div className="chat-scroll-area" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            background: 'var(--surface-0, rgba(244, 246, 251, 0.4))'
          }}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user'

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    width: '100%'
                  }}
                >
                  {/* Message Bubble Card */}
                  <div style={{
                    maxWidth: isUser ? '72%' : '85%',
                    position: 'relative'
                  }}>
                    {!isUser ? (
                      /* ── Assistant Card (Exact look from reference mockup) ── */
                      <div style={{
                        background: 'var(--dark-gray, #ffffff)',
                        border: '1px solid var(--border, rgba(0,0,0,0.08))',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        color: 'var(--text-primary, #1e293b)'
                      }}>
                        {/* Header inside assistant card */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.65rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <BotAvatar type={activeSession.type} size={24} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                              V-GPU Assistant
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {msg.time || '09:25'}
                          </span>
                        </div>

                        {/* Metrics used badge */}
                        {msg.metricsUsed && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.65rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            marginBottom: '0.5rem',
                            fontWeight: 600
                          }}>
                            <Activity size={10} />
                            Live Metrics Referenced
                          </div>
                        )}

                        {/* Content */}
                        <div style={{ lineHeight: 1.6, fontSize: '0.88rem' }}>
                          {parseText(msg.text, msg.id)}
                        </div>

                        {/* Inline metrics card if any */}
                        {msg.metricsUsed && msg.metricsSnapshot && (
                          <InlineMetricsCard snapshot={msg.metricsSnapshot} />
                        )}

                        {/* Source citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border, rgba(0,0,0,0.06))' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#76B900', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              📌 Grounded Project Sources ({msg.citations.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {msg.citations.map((cit, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedCitation(cit)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    background: 'var(--gray, #f1f5f9)',
                                    border: '1px solid var(--border, rgba(0,0,0,0.1))',
                                    color: 'var(--text-secondary, #475569)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <FileCode size={11} color="#76B900" />
                                  <span>{cit.file_path}:L{cit.start_line}-{cit.end_line}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── User Message (Vibrant Blue Pill Bubble matching mockup) ── */
                      <div style={{
                        background: '#4f75fe',
                        color: '#ffffff',
                        borderRadius: '14px',
                        padding: '0.85rem 1.25rem',
                        boxShadow: '0 4px 14px rgba(79, 117, 254, 0.25)'
                      }}>
                        {/* Header inside user bubble */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          marginBottom: '0.4rem',
                          opacity: 0.95
                        }}>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace', opacity: 0.85 }}>
                            {msg.time || '09:41'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>You</span>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              color: '#4f75fe',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              US
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ fontSize: '0.88rem', lineHeight: 1.5, fontWeight: 400 }}>
                          {msg.text}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Loading Indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: '0.85rem', alignSelf: 'flex-start' }}>
                <BotAvatar type="bot" size={32} active={true} />
                <div style={{
                  background: 'var(--dark-gray, #ffffff)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  color: 'var(--text-secondary, #64748b)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <Sparkles size={15} color="#3b82f6" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>{loadingLabel}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ────────────────────────────────────────────────────────────────
              BOTTOM RICH MESSAGE INPUT BAR (Matching reference mockup)
          ──────────────────────────────────────────────────────────────── */}
          <div style={{
            padding: '1rem 1.5rem',
            background: 'var(--dark-gray, #ffffff)',
            borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
            position: 'relative'
          }}>
            {/* Quick Presets Drawer if open */}
            {showPresetsMenu && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '1.5rem',
                right: '1.5rem',
                marginBottom: '8px',
                background: 'var(--dark-gray, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                borderRadius: '12px',
                padding: '0.85rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                zIndex: 20
              }}>
                {[
                  "Summarize overall V-GPU project architecture",
                  "What does core/automl_engine.py do?",
                  "Current GPU temperature and power draw?",
                  "How many vGPU instances are running?",
                  "Show me the scheduler queue status",
                  "Compare core/scheduler.py vs job_executor.py"
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setShowPresetsMenu(false)
                      handleSend(promptText)
                    }}
                    style={{
                      textAlign: 'left',
                      background: 'var(--gray, #f8fafc)',
                      border: '1px solid var(--border, rgba(0,0,0,0.06))',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary, #0f172a)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4f75fe'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border, rgba(0,0,0,0.06))'}
                  >
                    <Sparkles size={13} color="#4f75fe" />
                    <span>{promptText}</span>
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                background: 'var(--gray, #f8fafc)',
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                borderRadius: '30px',
                padding: '0.35rem 0.5rem 0.35rem 1.25rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about V-GPU code, live metrics, or platform..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.9rem',
                  padding: '0.4rem 0'
                }}
              />

              {/* Action Toolbar Icons from mockup */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary, #94a3b8)' }}>
                {/* Link / Attachment */}
                <button
                  type="button"
                  onClick={() => showToast('Grounded code & documentation links active.')}
                  title="Inspect Source Citations"
                  style={{ background: 'none', border: 'none', color: 'inherit', padding: '6px', cursor: 'pointer', borderRadius: '50%' }}
                >
                  <Paperclip size={16} />
                </button>

                {/* Picture / Diagram Viewer */}
                <button
                  type="button"
                  onClick={() => showToast('Virtualization Topology viewer ready.')}
                  title="View Architecture Topology"
                  style={{ background: 'none', border: 'none', color: 'inherit', padding: '6px', cursor: 'pointer', borderRadius: '50%' }}
                >
                  <ImageIcon size={16} />
                </button>

                {/* Prompt Presets Drawer */}
                <button
                  type="button"
                  onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                  title="Preset Inquiries"
                  style={{ background: 'none', border: 'none', color: showPresetsMenu ? '#4f75fe' : 'inherit', padding: '6px', cursor: 'pointer', borderRadius: '50%' }}
                >
                  <Smile size={16} />
                </button>

                {/* Microphone / Audio */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRecording(!isRecording)
                    if (!isRecording) showToast('🎙️ Microphone active: speech recognition listening...')
                  }}
                  title="Voice Input"
                  style={{
                    background: isRecording ? '#ef4444' : 'none',
                    border: 'none',
                    color: isRecording ? '#ffffff' : 'inherit',
                    padding: '6px',
                    cursor: 'pointer',
                    borderRadius: '50%'
                  }}
                >
                  <Mic size={16} />
                </button>

                {/* Camera / Telemetry Snapshot */}
                <button
                  type="button"
                  onClick={() => {
                    if (liveSnapshot) {
                      handleSend(`Here is our live snapshot: GPU 0 temp is ${liveSnapshot.physical_gpus?.[0]?.temperature_c}°C with ${liveSnapshot.physical_gpus?.[0]?.utilization_pct}% load. Explain this status.`)
                    }
                  }}
                  title="Capture Telemetry Snapshot & Send"
                  style={{ background: 'none', border: 'none', color: 'inherit', padding: '6px', cursor: 'pointer', borderRadius: '50%' }}
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* Round Blue Send Button with Paper Airplane */}
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: loading || !input.trim() ? '#94a3b8' : '#4f75fe',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 10px rgba(79, 117, 254, 0.35)',
                  flexShrink: 0,
                  transition: 'background 0.2s ease'
                }}
              >
                <Send size={16} style={{ marginLeft: '1px' }} />
              </button>
            </form>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            COLUMN 3: SYSTEM NOTIFICATIONS & SUGGESTIONS (Right Column)
        ══════════════════════════════════════════════════════════════════ */}
        <section className="dashboard-glass-card" style={{
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Floating quick tools palette docked on right edge (from reference mockup) */}
          <div style={{
            position: 'absolute',
            right: '-1px',
            top: '48%',
            transform: 'translateY(-50%)',
            background: 'var(--dark-gray, #ffffff)',
            border: '1px solid var(--border, rgba(0,0,0,0.1))',
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            padding: '6px 4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '-3px 4px 12px rgba(0,0,0,0.06)',
            zIndex: 5
          }}>
            <button
              onClick={() => {
                if (liveSnapshot) {
                  showToast(`GPU 0: ${liveSnapshot.physical_gpus?.[0]?.temperature_c}°C, ${liveSnapshot.physical_gpus?.[0]?.power_draw_w}W`)
                }
              }}
              title="Telemetry Snapshot"
              style={{ background: '#e0f2fe', border: 'none', color: '#0284c7', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Camera size={14} />
            </button>
            <button
              onClick={() => showToast('Virtualization Topology layers active.')}
              title="Topology Layers"
              style={{ background: '#fce7f3', border: 'none', color: '#db2777', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Layers size={14} />
            </button>
            <button
              onClick={() => handleSend("Explain dynamic vGPU scheduling")}
              title="AI Prompt Quick Action"
              style={{ background: '#fef3c7', border: 'none', color: '#d97706', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Sparkles size={14} />
            </button>
          </div>

          <div className="chat-scroll-area" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Section 1: Notification */}
            <div>
              <h4 style={{
                margin: '0 0 0.85rem 0',
                fontSize: '0.98rem',
                fontWeight: 800,
                color: 'var(--text-primary, #0f172a)'
              }}>
                Notification
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      gap: '0.65rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    <BotAvatar type={n.type} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                          {n.name}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {n.time}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.35, marginTop: '2px' }}>
                        {n.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border, rgba(0,0,0,0.06))' }} />

            {/* Section 2: Suggestions */}
            <div>
              <h4 style={{
                margin: '0 0 0.85rem 0',
                fontSize: '0.98rem',
                fontWeight: 800,
                color: 'var(--text-primary, #0f172a)'
              }}>
                Suggestions
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                      <BotAvatar type={s.type} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                          {s.name}
                        </div>
                        <div style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted, #94a3b8)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {s.mutual}
                        </div>
                      </div>
                    </div>

                    {/* Blue "Add" / "Ask" Button matching reference mockup */}
                    <button
                      onClick={() => handleSend(s.actionPrompt)}
                      style={{
                        background: '#4f75fe',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(79, 117, 254, 0.28)',
                        flexShrink: 0,
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          NOTIFICATION TOAST
      ────────────────────────────────────────────────────────────────── */}
      {notificationToast && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.65rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Sparkles size={14} color="#76B900" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          API KEY SETTINGS MODAL
      ────────────────────────────────────────────────────────────────── */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'var(--dark-gray, #ffffff)',
            border: '1px solid var(--border, rgba(0,0,0,0.12))',
            borderRadius: '14px',
            padding: '1.75rem',
            width: '90%',
            maxWidth: '480px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            color: 'var(--text-primary, #0f172a)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="#76B900" />
                Gemini API Key Settings
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              Connect your Gemini API Key to enable conversational AI synthesis. The offline RAG embeddings and live metrics function locally — the API key powers high-level conversational synthesis.
            </p>
            <form onSubmit={handleSaveKey}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  width: '100%',
                  background: 'var(--gray, #f1f5f9)',
                  border: '1px solid var(--border, rgba(0,0,0,0.15))',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.88rem',
                  marginBottom: '1.25rem',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => { setApiKey(''); localStorage.removeItem('vgpu-gemini-key'); setShowSettings(false); showToast('Key removed.'); }}
                  style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Clear Key
                </button>
                <button
                  type="submit"
                  style={{ background: '#76B900', border: 'none', color: '#000000', fontWeight: 700, padding: '0.5rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          CITATION SOURCE CODE INSPECTOR MODAL
      ────────────────────────────────────────────────────────────────── */}
      {selectedCitation && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'var(--dark-gray, #ffffff)',
            border: '1px solid var(--border, rgba(0,0,0,0.12))',
            borderRadius: '14px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '560px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            color: 'var(--text-primary, #0f172a)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={18} color="#76B900" />
                Source File: {selectedCitation.file_path}
              </h3>
              <button onClick={() => setSelectedCitation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{
              background: 'var(--gray, #f8fafc)',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(0,0,0,0.08))',
              fontSize: '0.82rem',
              color: 'var(--text-secondary, #475569)',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div><strong>Line Range:</strong> L{selectedCitation.start_line} - L{selectedCitation.end_line}</div>
              <div><strong>Section / Symbol:</strong> {selectedCitation.title}</div>
              <div><strong>Match Confidence Score:</strong> {selectedCitation.score}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedCitation(null)}
                style={{ background: '#76B900', border: 'none', color: '#000000', fontWeight: 700, padding: '0.45rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
