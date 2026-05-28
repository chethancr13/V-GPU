import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Database } from 'lucide-react'

function VGPUManager() {
  const [vram, setVram] = useState(1024)
  const [compute, setCompute] = useState(50)
  const [profile, setProfile] = useState('default')

  const queryClient = useQueryClient()

  const { data: vGPUs, isLoading } = useQuery({
    queryKey: ['vgpus'],
    queryFn: () => fetch('http://localhost:8000/api/vgpu/list').then(res => res.json()),
    refetchInterval: 2000
  })

  const provisionMutation = useMutation({
    mutationFn: (data) => fetch('http://localhost:8000/api/vgpu/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data)
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.detail || 'Failed to provision vGPU') })
      }
      return res.json()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vgpus'])
      provisionMutation.reset()
    }
  })

  const destroyMutation = useMutation({
    mutationFn: (vgpuId) => fetch(`http://localhost:8000/api/vgpu/${vgpuId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries(['vgpus'])
  })

  const handleProvision = () => {
    provisionMutation.mutate({ vram_mb: vram, compute_pct: compute, profile })
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--black)', minHeight: '100%' }}>
        <span className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span>Loading active virtual GPU nodes...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>vGPU Manager</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Provision custom containerized virtual GPU nodes, allocate specific VRAM blocks, and limit compute shares.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

        {/* Provision Form */}
        <div style={{ 
          background: 'var(--gray)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          height: 'fit-content'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <Plus size={18} color="var(--accent)" />
            Create Instance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* VRAM Allocation Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={14} color="var(--accent)" />
                  VRAM Allocation
                </label>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{vram} MB</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={vram}
                onChange={(e) => {
                  setVram(e.target.value)
                  provisionMutation.reset()
                }}
                style={{ 
                  width: '100%', 
                  accentColor: 'var(--accent)', 
                  background: 'var(--light-gray)',
                  height: '6px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Compute Share Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Cpu size={14} color="var(--accent)" />
                  Compute Share
                </label>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{compute}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={compute}
                onChange={(e) => {
                  setCompute(e.target.value)
                  provisionMutation.reset()
                }}
                style={{ 
                  width: '100%', 
                  accentColor: 'var(--accent)', 
                  background: 'var(--light-gray)',
                  height: '6px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Profile Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Compute Profile</label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
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
                <option value="default">Default</option>
                <option value="compute">Compute Intensive</option>
                <option value="graphics">Graphics Intensive</option>
              </select>
            </div>

            <button
              onClick={handleProvision}
              disabled={provisionMutation.isLoading}
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
              <Plus size={16} />
              {provisionMutation.isLoading ? 'Provisioning node...' : 'Create vGPU'}
            </button>
            {provisionMutation.isError && (
              <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center', lineHeight: '1.4' }}>
                ⚠️ {provisionMutation.error.message}
              </div>
            )}
          </div>
        </div>

        {/* vGPU List */}
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
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Active Instances</h3>
            <span style={{ 
              fontSize: '0.7rem', 
              fontWeight: 700, 
              color: 'var(--accent)', 
              background: 'var(--accent-dim)', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '4px',
              border: '1px solid rgba(118, 185, 0, 0.2)'
            }}>
              {vGPUs?.length || 0} Nodes Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '360px' }}>
            {vGPUs?.length > 0 ? (
              vGPUs.map((vgpu) => (
                <div 
                  key={vgpu.id} 
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '4px', 
                      background: 'rgba(118, 185, 0, 0.05)', 
                      border: '1px solid rgba(118, 185, 0, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Cpu size={18} color="var(--accent)" />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Node ID: <span style={{ color: 'var(--text-secondary)' }}>vGPU-{vgpu.id.substring(0, 8)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Database size={11} /> {vgpu.vram_limit} MB VRAM
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Cpu size={11} /> {vgpu.compute_limit}% Compute Share
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => destroyMutation.mutate(vgpu.id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer', 
                      padding: '0.5rem', 
                      borderRadius: '4px', 
                      display: 'flex', 
                      transition: 'color 0.2s, background 0.2s' 
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                    title="Destroy Instance"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Database size={36} color="var(--border)" />
                <div style={{ fontSize: '0.8rem' }}>No active vGPU instances found.</div>
                <div style={{ fontSize: '0.7rem' }}>Create one using the form on the left.</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default VGPUManager