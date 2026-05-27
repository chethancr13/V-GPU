import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Brain, Box, Zap, Activity, FileText } from 'lucide-react'

function AIInference() {
  const [model, setModel] = useState('resnet50')
  const [batchSize, setBatchSize] = useState(1)
  const [selectedDataset, setSelectedDataset] = useState('')
  const [results, setResults] = useState([])

  // Fetch list of uploaded datasets
  const { data: datasetsData } = useQuery({
    queryKey: ['datasets-list'],
    queryFn: () => fetch('http://localhost:8000/api/datasets').then(res => res.json()),
    refetchInterval: 3000
  })
  const datasets = datasetsData?.datasets || []

  const submitMutation = useMutation({
    mutationFn: (data) => fetch('http://localhost:8000/api/jobs/inference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: (data) => {
      setResults(prev => [...prev, { jobId: data.job_id, status: 'Submitted' }])
    }
  })

  const { data: jobStatuses } = useQuery({
    queryKey: ['inference-statuses'],
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
    submitMutation.mutate({ 
      model, 
      batch_size: batchSize, 
      dataset_name: selectedDataset || null,
      input_data: {} 
    })
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>AI Inference</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Evaluate custom real-time neural network layer execution speeds across deep learning architectures with integrated AI Agent analysis.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem' }}>

        {/* Inference Form */}
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
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <Brain size={18} color="var(--accent)" />
            Submit Inference Job
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Model Selection</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
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
                <option value="resnet50">ResNet50 (Computer Vision)</option>
                <option value="bert">BERT (Natural Language Processing)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Batch Size</label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                min="1"
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Select Dataset for AI Agent Analysis
              </label>
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
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
                <option value="">No Dataset Target (Pure Speed Test)</option>
                {datasets.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
              </select>
              {datasets.length === 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  No uploaded datasets found. Upload a dataset in the Dashboard first.
                </div>
              )}
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
              <Brain size={16} />
              {submitMutation.isLoading ? 'Submitting request...' : 'Submit Inference'}
            </button>
          </div>
        </div>

        {/* Inference Results View */}
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
              <Zap size={18} color="var(--accent)" />
              Inference Results
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '560px' }}>
            {jobStatuses && jobStatuses.length > 0 ? (
              jobStatuses.slice().reverse().map((status) => (
                <div 
                  key={status.id} 
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ID: {status.id.substring(0, 12)}...
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '4px', 
                      background: status.status === 'COMPLETED' ? 'rgba(118, 185, 0, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                      color: status.status === 'COMPLETED' ? 'var(--accent)' : 'var(--yellow)',
                      border: `1px solid ${status.status === 'COMPLETED' ? 'rgba(118, 185, 0, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                    }}>
                      {status.status}
                    </span>
                  </div>

                  {status.result && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Zap size={12} color="var(--yellow)" />
                          <span>Latency: {status.result.latency_ms?.toFixed(2)} ms</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Activity size={12} color="var(--accent)" />
                          <span>Rate: {status.result.throughput_req_per_sec?.toFixed(2)} r/s</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Box size={12} color="var(--blue)" />
                          <span>RAM: {status.result.memory_used?.toFixed(2)} MB</span>
                        </div>
                      </div>

                      {/* AI Agent log block */}
                      {status.result.agent_logs && (
                        <div style={{
                          background: '#020202',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '0.8rem',
                          marginTop: '0.75rem',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.75rem',
                          color: '#5ba000',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div style={{ fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Brain size={14} color="var(--accent)" />
                            🤖 AI Agent Execution Log
                          </div>
                          {status.result.agent_logs.map((log, lidx) => (
                            <div key={lidx}>{log}</div>
                          ))}
                        </div>
                      )}

                      {/* AI Agent findings block */}
                      {status.result.agent_findings && (
                        <div style={{
                          background: 'rgba(118, 185, 0, 0.04)',
                          border: '1px solid rgba(118, 185, 0, 0.15)',
                          borderRadius: '6px',
                          padding: '0.8rem',
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.4'
                        }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent)', marginRight: '0.25rem' }}>🤖 Agent Findings:</span>
                          {status.result.agent_findings}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Brain size={36} color="var(--border)" />
                <div style={{ fontSize: '0.8rem' }}>No active AI inferences run in this session.</div>
                <div style={{ fontSize: '0.7rem' }}>Launch deep learning runs on provisioned nodes.</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default AIInference