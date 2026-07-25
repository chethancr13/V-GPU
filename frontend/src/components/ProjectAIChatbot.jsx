import React, { useState, useEffect, useRef } from 'react'
import {
  Bot, User, Sparkles, RefreshCw, Key, Trash2, Send,
  FileCode, Layers, ShieldCheck, Database, Info, ExternalLink, ChevronRight, X
} from 'lucide-react'

export default function ProjectAIChatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [indexStats, setIndexStats] = useState({ total_files: 0, total_chunks: 0, last_synced: 0 })
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vgpu-gemini-key') || '')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState(null)
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 9))

  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchIndexStatus()
    loadHistory()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    
    // Welcome message
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: `👋 **Welcome to the V-GPU Project Assistant!**\n\nI am scoped strictly to this specific repository — including code (\`core/\`, \`main.py\`), documentation (\`COMMANDS.md\`, \`README.md\`), data schemas (\`my_data.csv\`), and config files.\n\nAsk me anything about the architecture, module logic, data flows, or inconsistency checks!`,
        citations: []
      }
    ])
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
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'system',
            text: `✅ **Project Re-Indexed Successfully!** Scanned ${stats.scanned_files} files, indexed ${stats.indexed_files} modified files (${stats.total_chunks} total chunks).`
          }
        ])
      }
    } catch (e) {
      console.error('Resync failed:', e)
    } finally {
      setSyncing(false)
    }
  }

  const handleSend = async (queryText) => {
    const messageToSend = queryText || input
    if (!messageToSend.trim()) return

    if (!queryText) setInput('')

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageToSend
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
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

      const data = await res.json()

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.answer,
        citations: data.citations || []
      }

      setMessages(prev => [...prev, assistantMsg])
      fetchIndexStatus()
    } catch (e) {
      console.error('Query error:', e)
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'system',
          text: `⚠️ Error contacting the project RAG backend: ${e.message}. Ensure backend is running on http://localhost:8000.`
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
        text: "Chat session cleared. What would you like to know about the project?",
        citations: []
      }
    ])
  }

  const handleSaveKey = (e) => {
    e.preventDefault()
    localStorage.setItem('vgpu-gemini-key', apiKey)
    setShowSettings(false)
  }

  const presetQuestions = [
    "Summarize overall V-GPU project architecture",
    "What does core/automl_engine.py do?",
    "Compare core/scheduler.py vs core/job_executor.py",
    "What API endpoints exist in main.py?",
    "Are there any inconsistencies between COMMANDS.md and start_dev.py?"
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--black, #0a0a0c)',
      color: 'var(--text-primary, #e2e8f0)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* --- Top Header Bar --- */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'var(--dark-gray, #121318)',
        borderBottom: '1px solid var(--border, #222530)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #76B900 0%, #2e7d32 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(118, 185, 0, 0.4)'
          }}>
            <Bot size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Project AI Assistant <span style={{ fontSize: '0.75rem', background: '#76B90022', color: '#76B900', border: '1px solid #76B90055', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px' }}>RAG Engine</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
              Grounded exclusively in V-GPU code, documentation, scripts & schemas
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Index Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#1a1d24',
            border: '1px solid #2e3440',
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.75rem',
            color: '#cbd5e1'
          }}>
            <Database size={14} color="#76B900" />
            <span>Indexed: <strong>{indexStats.total_files}</strong> files / <strong>{indexStats.total_chunks}</strong> chunks</span>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleResyncIndex}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: syncing ? '#1e293b' : 'transparent',
              border: '1px solid var(--border, #2a2e3d)',
              color: '#ffffff',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Indexing...' : 'Re-Sync Index'}
          </button>

          {/* API Key Modal Button */}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: apiKey ? '#76B90020' : 'transparent',
              border: apiKey ? '1px solid #76B90055' : '1px solid var(--border, #2a2e3d)',
              color: apiKey ? '#76B900' : '#ffffff',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            <Key size={14} />
            {apiKey ? 'Gemini Key Connected' : 'Connect Gemini Key'}
          </button>

          {/* Clear Session */}
          <button
            onClick={handleClearHistory}
            title="Clear Chat History"
            style={{
              background: 'transparent',
              border: '1px solid var(--border, #2a2e3d)',
              color: '#ef4444',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* --- Main Chat Stream Area --- */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {messages.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} style={{
                alignSelf: 'center',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                fontSize: '0.8rem',
                padding: '0.4rem 1rem',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
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
                gap: '0.85rem',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: isUser ? '80%' : '90%'
              }}
            >
              {!isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#76B900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={18} color="#000000" />
                </div>
              )}

              <div style={{
                background: isUser ? '#76B90022' : '#14161d',
                border: isUser ? '1px solid #76B90055' : '1px solid #232733',
                borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '1rem 1.25rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '0.9rem',
                  color: isUser ? '#f1f5f9' : '#e2e8f0'
                }}>
                  {msg.text}
                </div>

                {/* Source Citation Pills */}
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: '1rem', pt: '0.75rem', borderTop: '1px solid #222634' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#76B900', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📌 Grounded Project Sources ({msg.citations.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {msg.citations.map((cit, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCitation(cit)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#1a1d26',
                            border: '1px solid #2b3040',
                            color: '#94a3b8',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#76B900'; e.currentTarget.style.color = '#ffffff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2b3040'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                          <FileCode size={12} color="#76B900" />
                          <span>{cit.file_path}:L{cit.start_line}-{cit.end_line}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={18} color="#ffffff" />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '0.85rem', alignSelf: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#76B900', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="#000000" />
            </div>
            <div style={{ background: '#14161d', border: '1px solid #232733', padding: '0.85rem 1.25rem', borderRadius: '12px', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="#76B900" className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              Scanning index & retrieving grounded project context...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Preset Questions Bar --- */}
      {messages.length <= 2 && (
        <div style={{ padding: '0.75rem 1.5rem', background: '#0e1014', borderTop: '1px solid #1a1d26' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
            SUGGESTED PROJECT QUESTIONS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {presetQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                style={{
                  background: '#161922',
                  border: '1px solid #262b3a',
                  color: '#cbd5e1',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#76B900'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#262b3a'; e.currentTarget.style.color = '#cbd5e1'; }}
              >
                💡 {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Input Form Bar --- */}
      <div style={{ padding: '1rem 1.5rem', background: '#121318', borderTop: '1px solid #222530' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about V-GPU code, architecture, data schemas, or configs..."
            style={{
              flex: 1,
              background: '#1a1d26',
              border: '1px solid #2c3244',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? '#2a3040' : '#76B900',
              border: 'none',
              color: loading || !input.trim() ? '#64748b' : '#000000',
              fontWeight: 700,
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background 0.2s ease'
            }}
          >
            <span>Ask RAG</span>
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* --- API Key Settings Modal --- */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#161822',
            border: '1px solid #2e3448',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '480px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="#76B900" />
                Gemini API Key Settings
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '1rem' }}>
              The RAG chatbot operates fully offline using built-in semantic vector retrieval. Connecting a Gemini API Key unlocks full multi-turn conversational synthesis.
            </p>
            <form onSubmit={handleSaveKey}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Gemini API Key..."
                style={{
                  width: '100%',
                  background: '#0e1017',
                  border: '1px solid #2e3448',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setApiKey(''); localStorage.removeItem('vgpu-gemini-key'); setShowSettings(false); }}
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Clear Key
                </button>
                <button
                  type="submit"
                  style={{ background: '#76B900', border: 'none', color: '#000000', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Citation Inspection Modal --- */}
      {selectedCitation && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#161822',
            border: '1px solid #2e3448',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '560px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={18} color="#76B900" />
                Source File: {selectedCitation.file_path}
              </h3>
              <button onClick={() => setSelectedCitation(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ background: '#0e1017', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #222634', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              <div><strong>Lines:</strong> L{selectedCitation.start_line} - L{selectedCitation.end_line}</div>
              <div><strong>Symbol / Section:</strong> {selectedCitation.title}</div>
              <div><strong>Match Score:</strong> {selectedCitation.score}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedCitation(null)}
                style={{ background: '#76B900', border: 'none', color: '#000000', fontWeight: 700, padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
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
