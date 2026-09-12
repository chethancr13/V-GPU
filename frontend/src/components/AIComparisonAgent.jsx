import { useState, useEffect, useRef, memo } from 'react'
import { Sparkles, Send, X, Bot, Key, Trash2, ArrowRight, Activity, Thermometer, Cpu, Zap, BarChart3, HardDrive } from 'lucide-react'

// Inline metrics summary card component
function MetricsCard({ snapshot }) {
  if (!snapshot) return null

  const h = snapshot.system_health
  const gpus = snapshot.physical_gpus || []

  return (
    <div style={{
      background: 'rgba(118, 185, 0, 0.06)',
      border: '1px solid rgba(118, 185, 0, 0.2)',
      borderRadius: '8px',
      padding: '0.6rem 0.8rem',
      marginTop: '0.6rem',
      fontSize: '0.68rem',
      color: 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontWeight: 800,
        fontSize: '0.62rem',
        color: 'var(--accent)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <Activity size={10} />
        Live Metrics Snapshot
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.35rem'
      }}>
        {gpus.map(gpu => (
          <div key={gpu.gpu_id} style={{
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '4px',
            padding: '0.35rem 0.5rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', fontSize: '0.65rem' }}>
              GPU {gpu.gpu_id}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <MetricRow icon={<Thermometer size={9} />} label="Temp" value={`${gpu.temperature_c}°C`} warn={gpu.temperature_c > 75} />
              <MetricRow icon={<BarChart3 size={9} />} label="Load" value={`${gpu.utilization_pct}%`} />
              <MetricRow icon={<Zap size={9} />} label="Power" value={`${gpu.power_draw_w}W`} />
              <MetricRow icon={<HardDrive size={9} />} label="VRAM" value={`${gpu.memory_used_pct}%`} />
            </div>
          </div>
        ))}
      </div>
      {h && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(118, 185, 0, 0.12)',
          paddingTop: '0.35rem',
          fontSize: '0.6rem'
        }}>
          <span>vGPUs: <strong style={{ color: 'var(--text-primary)' }}>{h.total_vgpu_instances}</strong></span>
          <span>Power: <strong style={{ color: 'var(--text-primary)' }}>{h.cluster_total_power_draw_w}W</strong></span>
          <span>Jobs: <strong style={{ color: 'var(--text-primary)' }}>{snapshot.scheduler?.active_jobs || 0}</strong></span>
        </div>
      )}
    </div>
  )
}

function MetricRow({ icon, label, value, warn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-muted)' }}>
        {icon} {label}
      </span>
      <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: warn ? 'var(--red, #ef4444)' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

// Live metrics mini badge for header
function LiveMetricsBadge({ snapshot }) {
  if (!snapshot) return null

  const h = snapshot.system_health
  if (!h) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.58rem',
      fontFamily: 'JetBrains Mono, monospace',
      color: 'var(--text-secondary)',
      background: 'rgba(118, 185, 0, 0.06)',
      border: '1px solid rgba(118, 185, 0, 0.15)',
      borderRadius: '10px',
      padding: '0.15rem 0.5rem'
    }}>
      <span style={{
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: '#76B900',
        animation: 'pulse-live 2s infinite',
        flexShrink: 0
      }} />
      <span><Thermometer size={8} style={{ verticalAlign: 'middle' }} /> {h.cluster_avg_temperature_c}°C</span>
      <span>·</span>
      <span><BarChart3 size={8} style={{ verticalAlign: 'middle' }} /> {h.cluster_avg_utilization_pct}%</span>
    </div>
  )
}

const AIComparisonAgent = memo(function AIComparisonAgent({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('vgpu-chat-messages')
    return saved ? JSON.parse(saved) : [
      {
        id: 'welcome',
        text: 'Hello! I am your V-GPU Copilot with **live metrics** access. I can answer both general AI questions AND query your platform\'s real-time state.\n\nTry asking me:\n* **"What\'s the current GPU temperature?"**\n* **"How many vGPU instances are running?"**\n* **"What is gradient descent?"**\n* **"Take me to the GPU Monitor"**',
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  })
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vgpu-gemini-key') || '')
  const [liveSnapshot, setLiveSnapshot] = useState(null)
  const [loadingLabel, setLoadingLabel] = useState('Thinking...')
  
  const messagesEndRef = useRef(null)

  // Persist messages
  useEffect(() => {
    localStorage.setItem('vgpu-chat-messages', JSON.stringify(messages))
  }, [messages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, messages, isLoading])

  // Fetch live metrics periodically when panel is open
  useEffect(() => {
    if (!isOpen) return
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/metrics/snapshot')
        if (res.ok) {
          const data = await res.json()
          setLiveSnapshot(data)
        }
      } catch (e) {
        // Silently fail — metrics badge just won't show
      }
    }
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [isOpen])

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText
    if (!text.trim()) return

    if (!textToSend) setInputText('')
    
    const userMessage = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Detect metrics-related queries for loading label
    const metricsKw = ['temperature', 'temp', 'gpu', 'power', 'watt', 'vram', 'memory', 'job', 'scheduler', 'utilization', 'load', 'metrics', 'status', 'health', 'instance', 'vgpu', 'cluster']
    const isMetrics = metricsKw.some(kw => text.toLowerCase().includes(kw))
    setLoadingLabel(isMetrics ? 'Scanning live metrics...' : 'Thinking...')

    // Build history for backend (limit to last 6 messages)
    const historyPayload = messages.slice(-6).map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.text
    }))

    try {
      // Use the new unified /api/chat endpoint
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Key': apiKey
        },
        body: JSON.stringify({
          message: text,
          session_id: 'copilot_drawer',
          api_key: apiKey,
          history: historyPayload
        })
      })

      if (!response.ok) {
        throw new Error('API Request Failed')
      }

      const data = await response.json()
      
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        text: data.answer || 'No response received from agent.',
        sender: 'agent',
        metricsUsed: data.metrics_used || false,
        metricsSnapshot: data.metrics_snapshot || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, agentMessage])

      if (data.navigate) {
        setActiveTab(data.navigate)
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          text: `🔄 Navigating to ${data.navigate.toUpperCase().replace('_', ' ')}...`,
          sender: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }])
      }

    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: `⚠️ Error contacting the agent backend: ${err.message}. Please verify the backend uvicorn is running.`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveKey = (e) => {
    e.preventDefault()
    localStorage.setItem('vgpu-gemini-key', apiKey)
    setShowSettings(false)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: apiKey.trim() ? '🔑 Gemini API Key updated! Full conversational AI with live metrics is now active.' : '🔑 Gemini API Key cleared. Using local offline engine with live metrics.',
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
  }

  const handleClearHistory = () => {
    if (confirm('Clear chat history?')) {
      const reset = [
        {
          id: 'welcome',
          text: 'Hello! I am your V-GPU Copilot with **live metrics** access. I can answer both general AI questions AND query your platform\'s real-time state.\n\nTry asking me:\n* **"What\'s the current GPU temperature?"**\n* **"How many vGPU instances are running?"**\n* **"What is gradient descent?"**\n* **"Take me to the GPU Monitor"**',
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
      setMessages(reset)
    }
  }

  // Smart markdown formatter
  const parseText = (text) => {
    if (!text) return null
    
    const tokens = []
    const lines = text.split('\n')
    let inCodeBlock = false
    let codeBlockLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          tokens.push({
            type: 'code-block',
            content: codeBlockLines.join('\n')
          })
          codeBlockLines = []
          inCodeBlock = false
        } else {
          inCodeBlock = true;
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockLines.push(line)
        continue
      }

      // Check for table rows
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tokens.push({ type: 'table-row', content: line })
        continue
      }

      // Check for heading (##)
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
      if (headingMatch) {
        tokens.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] })
        continue
      }

      // Check bullet point
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ')
      let lineContent = isBullet ? line.trim().substring(2) : line

      // Inline formatter: Bold (**text**) and code (`code`)
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
          parts.push(<strong key={matchIndex} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{tokenVal.slice(2, -2)}</strong>)
        } else if (tokenVal.startsWith('`') && tokenVal.endsWith('`')) {
          parts.push(
            <code key={matchIndex} style={{ 
              background: 'var(--surface-3)', 
              padding: '1px 5px', 
              borderRadius: '3px', 
              fontFamily: 'JetBrains Mono, monospace', 
              fontSize: '0.72rem',
              color: 'var(--accent)',
              border: '1px solid var(--border)'
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
        return (
          <pre key={idx} style={{ 
            background: '#020202', 
            padding: '0.6rem 0.8rem', 
            borderRadius: '4px', 
            margin: '0.6rem 0', 
            overflowX: 'auto', 
            fontFamily: 'JetBrains Mono, monospace', 
            fontSize: '0.68rem', 
            border: '1px solid var(--border)', 
            color: '#88ecff',
            lineHeight: 1.3
          }}>
            <code>{token.content}</code>
          </pre>
        )
      }
      if (token.type === 'heading') {
        const fontSize = token.level === 1 ? '0.9rem' : token.level === 2 ? '0.82rem' : '0.78rem'
        return (
          <div key={idx} style={{ fontSize, fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0 0.3rem 0' }}>
            {token.content}
          </div>
        )
      }
      if (token.type === 'table-row') {
        // Skip separator rows
        if (token.content.replace(/[|\-\s]/g, '') === '') return null
        const cells = token.content.split('|').filter(c => c.trim())
        return (
          <div key={idx} style={{
            display: 'flex',
            gap: '0.5rem',
            fontSize: '0.7rem',
            padding: '0.15rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            {cells.map((cell, ci) => (
              <span key={ci} style={{
                flex: 1,
                color: ci === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                fontWeight: ci === 0 ? 400 : 600,
                fontFamily: ci > 0 ? 'JetBrains Mono, monospace' : 'inherit'
              }}>{cell.trim()}</span>
            ))}
          </div>
        )
      }
      if (token.type === 'bullet') {
        return (
          <li key={idx} style={{ marginBottom: '0.3rem', marginLeft: '0.8rem', listStyleType: 'disc', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {token.content}
          </li>
        )
      }
      if (!token.content || token.content.length === 0 || (token.content.length === 1 && token.content[0] === '')) {
        return <div key={idx} style={{ height: '0.4rem' }} />
      }
      return (
        <p key={idx} style={{ margin: '0.4rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          {token.content}
        </p>
      )
    })
  }

  // Metrics-aware suggested prompt chips
  const suggestedChips = [
    { text: '🌡️ GPU Temps', query: 'What are the current GPU temperatures?' },
    { text: '📊 Cluster Status', query: 'Show me the cluster health overview' },
    { text: '💾 VRAM Usage', query: 'How much VRAM is being used right now?' },
    { text: '⚡ Active Jobs', query: 'How many jobs are currently running?' },
    { text: '🖥️ vGPU Instances', query: 'List all active vGPU instances' },
    { text: '🚀 Run ML Job', query: 'How do I run an ML job?' },
  ]

  return (
    <>
      {/* Inject keyframe animation for live pulse */}
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes scan-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ─── CHAT LAUNCHER BUTTON ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--gray)',
          border: '1px solid var(--border)',
          color: 'var(--accent)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(118, 185, 0, 0.25)',
          zIndex: 1000,
          transition: 'all 0.25s ease',
          outline: 'none'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 0 15px var(--accent-glow)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(118, 185, 0, 0.25)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        {isOpen ? <X size={22} /> : <Bot size={22} className="pulse-glow" />}
      </button>

      {/* ─── CHAT PANEL DIALOG ─── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '400px',
            height: '560px',
            background: 'var(--glass)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <header
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--dark-gray)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                <Bot size={20} color="var(--accent)" />
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#76B900',
                    border: '1.5px solid var(--dark-gray)'
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  V-GPU Copilot
                  <span style={{
                    fontSize: '0.55rem',
                    background: 'rgba(118, 185, 0, 0.12)',
                    color: '#76B900',
                    border: '1px solid rgba(118, 185, 0, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    fontWeight: 600
                  }}>
                    AI + Metrics
                  </span>
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                  {apiKey ? 'Online Engine (Gemini)' : 'Offline Local Engine'} · Live Data
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LiveMetricsBadge snapshot={liveSnapshot} />
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="API Key Settings"
                style={{
                  background: 'none',
                  border: 'none',
                  color: showSettings ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => { if(!showSettings) e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Key size={15} />
              </button>
              
              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </header>

          {/* Settings Overlay Drawer */}
          {showSettings && (
            <form
              onSubmit={handleSaveKey}
              style={{
                position: 'absolute',
                top: '48px',
                left: 0,
                right: 0,
                background: 'var(--gray)',
                borderBottom: '1px solid var(--border)',
                padding: '1.1rem',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gemini API Key Configuration</span>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Connect your Gemini API key to enable full conversational AI with live metrics awareness. Without a key, the Copilot uses a local engine with real-time metric data.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--black)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.35rem 0.6rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--accent)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.35rem 0.75rem',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              background: 'rgba(5, 5, 5, 0.4)'
            }}
          >
            {!apiKey && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.68rem',
                  color: 'var(--yellow)',
                  lineHeight: '1.4',
                  marginBottom: '0.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  flexShrink: 0
                }}
              >
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>⚠️ Running in Local Offline Mode</span>
                </div>
                <span>Connect your Gemini API Key (🔑) to unlock full generative AI. Live metrics are always available!</span>
              </div>
            )}

            {messages.map(msg => {
              if (msg.sender === 'system') {
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.68rem',
                      color: 'var(--accent)',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  >
                    {msg.text}
                  </div>
                )
              }

              const isUser = msg.sender === 'user'
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '88%'
                  }}
                >
                  <div
                    style={{
                      background: isUser ? 'var(--accent-dim)' : 'var(--gray)',
                      border: isUser ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '0.6rem 0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {/* Metrics badge if AI used live data */}
                    {!isUser && msg.metricsUsed && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.58rem',
                        background: 'rgba(118, 185, 0, 0.1)',
                        color: '#76B900',
                        border: '1px solid rgba(118, 185, 0, 0.25)',
                        borderRadius: '8px',
                        padding: '1px 6px',
                        marginBottom: '0.35rem',
                        fontWeight: 600
                      }}>
                        <Activity size={8} />
                        Used Live Metrics
                      </div>
                    )}
                    {parseText(msg.text)}
                  </div>

                  {/* Inline metrics card for metrics-powered responses */}
                  {!isUser && msg.metricsUsed && msg.metricsSnapshot && (
                    <MetricsCard snapshot={msg.metricsSnapshot} />
                  )}

                  <span
                    style={{
                      fontSize: '0.58rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.2rem',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      padding: '0 0.2rem'
                    }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              )
            })}

            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div
                  style={{
                    background: 'var(--gray)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '0.6rem 0.85rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.78rem'
                  }}
                >
                  <Sparkles size={14} color="var(--accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>{loadingLabel}</span>
                </div>
                {loadingLabel === 'Scanning live metrics...' && (
                  <div style={{
                    marginTop: '0.3rem',
                    height: '2px',
                    borderRadius: '1px',
                    background: 'linear-gradient(90deg, transparent, #76B900, transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'scan-shimmer 1.5s ease-in-out infinite'
                  }} />
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompt chips */}
          {!inputText.trim() && !isLoading && (
            <div
              style={{
                display: 'flex',
                gap: '0.35rem',
                padding: '0 0.75rem 0.4rem 0.75rem',
                overflowX: 'auto',
                flexShrink: 0,
                scrollbarWidth: 'none'
              }}
            >
              {suggestedChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.query)}
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '0.22rem 0.6rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.65rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {chip.text}
                </button>
              ))}
            </div>
          )}

          {/* Input field footer */}
          <footer
            style={{
              padding: '0.7rem 0.8rem',
              background: 'var(--dark-gray)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <input
              type="text"
              placeholder="Ask anything — AI, metrics, navigation..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend()
              }}
              style={{
                flex: 1,
                background: 'var(--black)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.5rem 0.8rem',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputText.trim()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: inputText.trim() ? 'var(--accent)' : 'var(--light-gray)',
                color: '#000',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <Send size={14} />
            </button>
          </footer>
        </div>
      )}
    </>
  )
})

export default AIComparisonAgent
