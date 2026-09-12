import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Database, Server, Zap } from 'lucide-react'

/* ─── Keyframe animations for GPU tray ─── */
const TRAY_KEYFRAMES = `
@keyframes gpuPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(118,185,0,0.3), inset 0 0 6px rgba(118,185,0,0.15); }
  50%      { box-shadow: 0 0 22px rgba(118,185,0,0.65), inset 0 0 14px rgba(118,185,0,0.35); }
}
@keyframes gpuSlotIn {
  0%   { opacity: 0; transform: translateY(-20px) scale(0.8); filter: brightness(2.5); }
  40%  { opacity: 1; transform: translateY(4px) scale(1.05); filter: brightness(1.6); }
  70%  { transform: translateY(-2px) scale(0.98); filter: brightness(1.2); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1); }
}
@keyframes gpuSlotOut {
  0%   { opacity: 1; transform: scale(1); filter: brightness(1); }
  40%  { filter: brightness(0.5); }
  100% { opacity: 0; transform: scale(0.6) translateY(16px); filter: brightness(0); }
}
@keyframes glassSweep {
  0%   { transform: translateX(-130%) rotate(-15deg); }
  100% { transform: translateX(230%) rotate(-15deg); }
}
@keyframes connectorPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(118,185,0,0.15); }
  50%      { box-shadow: 0 0 14px rgba(118,185,0,0.5); }
}
@keyframes dataFlowH {
  0%   { left: -6px; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@keyframes dataFlowV {
  0%   { top: -6px; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
@keyframes boardGlow {
  0%, 100% { opacity: 0.03; }
  50%      { opacity: 0.08; }
}
@keyframes chipHeat {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@keyframes slotFlash {
  0%   { box-shadow: 0 0 0 0 rgba(118,185,0,0); }
  30%  { box-shadow: 0 0 30px 8px rgba(118,185,0,0.6); }
  100% { box-shadow: 0 0 0 0 rgba(118,185,0,0); }
}
`

const CHIP_ROWS = 2
const CHIP_COLS = 4
const TOTAL_SLOTS = CHIP_ROWS * CHIP_COLS

/* ── Profile colour helpers ── */
const PROFILE_COLORS = {
  compute: { bg: '#5aa0ff', label: 'COMPUTE', gradient: 'linear-gradient(135deg, #2f6fd6 0%, #5aa0ff 50%, #2f6fd6 100%)' },
  graphics: { bg: '#ffd14d', label: 'GRAPHICS', gradient: 'linear-gradient(135deg, #d9a300 0%, #ffd14d 50%, #d9a300 100%)' },
  default: { bg: '#76B900', label: 'DEFAULT', gradient: 'linear-gradient(135deg, #5a9100 0%, #76B900 50%, #5a9100 100%)' },
}

function getChipProfile(vgpu) {
  const cl = vgpu?.compute_limit || 0
  const vl = vgpu?.vram_limit || 0
  // heuristic: high compute + lower vram → compute, high vram + lower compute → graphics
  if (cl >= 70 && vl <= 2048) return 'compute'
  if (vl >= 3072 && cl <= 50) return 'graphics'
  return 'default'
}

function VGPUManager() {
  const [vram, setVram] = useState(1024)
  const [compute, setCompute] = useState(50)
  const [profile, setProfile] = useState('default')
  const [hoveredChip, setHoveredChip] = useState(null)
  const [animatingIn, setAnimatingIn] = useState(new Set())
  const [animatingOut, setAnimatingOut] = useState(new Set())


  const prevIdsRef = useRef(new Set())
  const styleRef = useRef(null)

  // inject keyframes once
  useEffect(() => {
    if (!styleRef.current) {
      const s = document.createElement('style')
      s.textContent = TRAY_KEYFRAMES
      document.head.appendChild(s)
      styleRef.current = s
    }
    return () => { if (styleRef.current) { styleRef.current.remove(); styleRef.current = null } }
  }, [])

  const queryClient = useQueryClient()

  const { data: vGPUs, isLoading } = useQuery({
    queryKey: ['vgpus'],
    queryFn: () => fetch('http://localhost:8000/api/vgpu/list').then(res => res.json()),
    refetchInterval: 2000
  })

  // track additions / removals for chip animations
  useEffect(() => {
    const currentIds = new Set((vGPUs || []).map(v => v.id))
    const prev = prevIdsRef.current

    const added = new Set()
    currentIds.forEach(id => { if (!prev.has(id)) added.add(id) })
    if (added.size) {
      setAnimatingIn(added)
      setTimeout(() => setAnimatingIn(new Set()), 800)
    }

    const removed = new Set()
    prev.forEach(id => { if (!currentIds.has(id)) removed.add(id) })
    if (removed.size) {
      setAnimatingOut(removed)
      setTimeout(() => setAnimatingOut(new Set()), 600)
    }

    prevIdsRef.current = currentIds
  }, [vGPUs])

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
    mutationFn: (vgpuId) => fetch(`http://localhost:8000/api/vgpu/${vgpuId}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.detail || 'Failed to destroy vGPU instance') })
      }
      return res.json()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vgpus'])
    }
  })

  const handleProvision = () => {
    provisionMutation.mutate({ vram_mb: vram, compute_pct: compute, profile })
  }

  // map instances into tray slots
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => vGPUs?.[i] || null)
  const activeCount = (vGPUs || []).length

  /* ─── PCB Traces ─── */
  const renderTraces = useCallback(() => {
    const traces = []
    for (let r = 0; r < CHIP_ROWS; r++) {
      const yPct = 28 + r * 44
      traces.push(
        <div key={`h-${r}`} style={{
          position: 'absolute', left: '6%', right: '8%', top: `${yPct}%`, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(118,185,0,0.12) 15%, rgba(118,185,0,0.18) 50%, rgba(118,185,0,0.12) 85%, transparent)',
          zIndex: 1,
        }}>
          <div style={{
            position: 'absolute', width: '6px', height: '6px', borderRadius: '50%',
            background: 'radial-gradient(circle, #76B900 0%, transparent 70%)',
            boxShadow: '0 0 8px #76B900',
            animation: `dataFlowH ${2.5 + r * 0.7}s linear infinite`,
            animationDelay: `${r * 1.2}s`,
            top: '-2.5px',
          }} />
        </div>
      )
    }
    for (let c = 0; c < CHIP_COLS; c++) {
      const xPct = 15 + c * 20.5
      traces.push(
        <div key={`v-${c}`} style={{
          position: 'absolute', top: '15%', bottom: '18%', left: `${xPct}%`, width: '1px',
          background: 'linear-gradient(180deg, transparent, rgba(118,185,0,0.1) 20%, rgba(118,185,0,0.15) 50%, rgba(118,185,0,0.1) 80%, transparent)',
          zIndex: 1,
        }}>
          <div style={{
            position: 'absolute', width: '5px', height: '5px', borderRadius: '50%',
            background: 'radial-gradient(circle, #76B900 0%, transparent 70%)',
            boxShadow: '0 0 6px #76B900',
            animation: `dataFlowV ${3 + c * 0.5}s linear infinite`,
            animationDelay: `${c * 0.8}s`,
            left: '-2px',
          }} />
        </div>
      )
    }
    traces.push(
      <div key="diag-1" style={{
        position: 'absolute', left: '4%', top: '12%', width: '18%', height: '1px',
        background: 'rgba(118,185,0,0.06)',
        transform: 'rotate(25deg)', transformOrigin: 'left center', zIndex: 1,
      }} />,
      <div key="diag-2" style={{
        position: 'absolute', right: '10%', bottom: '15%', width: '15%', height: '1px',
        background: 'rgba(118,185,0,0.06)',
        transform: 'rotate(-20deg)', transformOrigin: 'right center', zIndex: 1,
      }} />
    )
    return traces
  }, [])

  /* ─── Power connectors ─── */
  const renderConnectors = useCallback(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const isActive = i < Math.ceil(activeCount / 2)
      return (
        <div key={`conn-${i}`} style={{
          width: '22px', height: '52px', borderRadius: '11px',
          background: isActive
            ? 'linear-gradient(180deg, var(--light-gray) 0%, var(--gray) 40%, var(--dark-gray) 100%)'
            : 'linear-gradient(180deg, var(--gray) 0%, var(--dark-gray) 40%, var(--black) 100%)',
          border: `1px solid ${isActive ? 'rgba(118,185,0,0.25)' : 'var(--border)'}`,
          position: 'relative',
          animation: isActive ? 'connectorPulse 2s ease-in-out infinite' : 'none',
          animationDelay: `${i * 0.4}s`,
          transition: 'all 0.5s ease',
        }}>
          <div style={{
            position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
            width: '10px', height: '3px', borderRadius: '1px',
            background: isActive ? 'rgba(118,185,0,0.5)' : 'var(--border)',
            transition: 'background 0.5s',
          }} />
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            width: '10px', height: '3px', borderRadius: '1px',
            background: isActive ? 'rgba(118,185,0,0.5)' : 'var(--border)',
            transition: 'background 0.5s',
          }} />
          {isActive && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '4px', height: '4px', borderRadius: '50%',
              background: '#76B900', boxShadow: '0 0 6px #76B900',
            }} />
          )}
        </div>
      )
    })
  }, [activeCount])

  /* ─── Single GPU chip ─── */
  const renderChip = useCallback((slot, index) => {
    const isActive = !!slot
    const isNew = slot && animatingIn.has(slot.id)
    const isHovered = hoveredChip === index
    const chipProfile = isActive ? getChipProfile(slot) : 'default'
    const pColors = PROFILE_COLORS[chipProfile]

    const chipBg = isActive ? pColors.gradient : 'linear-gradient(135deg, var(--gray) 0%, var(--light-gray) 50%, var(--gray) 100%)'

    return (
      <div
        key={slot?.id || `empty-${index}`}
        onMouseEnter={() => setHoveredChip(index)}
        onMouseLeave={() => setHoveredChip(null)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1.15',
          borderRadius: '6px',
          background: chipBg,
          backgroundSize: '200% 200%',
          border: isActive
            ? `1.5px solid ${pColors.bg}66`
            : '1.5px dashed var(--border)',
          cursor: isActive ? 'pointer' : 'default',
          animation: isActive
            ? isNew
              ? 'gpuSlotIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, slotFlash 0.9s ease-out'
              : 'gpuPulse 2.5s ease-in-out infinite, chipHeat 4s ease infinite'
            : 'none',
          animationDelay: isNew ? '0s' : `${index * 0.3}s`,
          transition: 'all 0.4s ease',
          transform: isHovered && isActive ? 'scale(1.1)' : 'scale(1)',
          zIndex: isHovered ? 10 : 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        }}
      >
        {isActive && (
          <>
            {/* capacitor rows */}
            <div style={{
              position: 'absolute', top: '4px', left: '8%', right: '8%',
              display: 'flex', justifyContent: 'space-between',
            }}>
              {[...Array(6)].map((_, j) => (
                <div key={j} style={{
                  width: '6%', height: '3px', borderRadius: '1px',
                  background: 'rgba(0,0,0,0.35)',
                }} />
              ))}
            </div>
            <div style={{
              position: 'absolute', bottom: '4px', left: '8%', right: '8%',
              display: 'flex', justifyContent: 'space-between',
            }}>
              {[...Array(6)].map((_, j) => (
                <div key={j} style={{
                  width: '6%', height: '3px', borderRadius: '1px',
                  background: 'rgba(0,0,0,0.35)',
                }} />
              ))}
            </div>
            {/* die core */}
            <div style={{
              width: '58%', height: '50%', borderRadius: '3px',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <Cpu size={14} color="var(--text-muted)" strokeWidth={1.5} />
              <div style={{
                position: 'absolute', inset: '3px',
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: '1px',
                opacity: 0.15,
              }}>
                {[...Array(6)].map((_, j) => (
                  <div key={j} style={{ background: pColors.bg, borderRadius: '1px' }} />
                ))}
              </div>
            </div>
            {/* profile badge */}
            <div style={{
              position: 'absolute', bottom: '-1px', left: '50%', transform: 'translateX(-50%)',
              fontSize: '0.38rem', fontWeight: 800, letterSpacing: '0.08em',
              color: pColors.bg, opacity: 0.7,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {pColors.label}
            </div>
          </>
        )}

        {!isActive && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            opacity: 0.3,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '4px',
              border: '1px dashed var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Server size={14} color="var(--text-muted)" />
            </div>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              SLOT {index}
            </span>
          </div>
        )}

        {/* Hover tooltip */}
        {isActive && isHovered && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--dark-gray)', border: `1px solid ${pColors.bg}55`,
            borderRadius: '8px', padding: '10px 14px', minWidth: '185px',
            zIndex: 100, pointerEvents: 'none',
            boxShadow: `var(--card-shadow), 0 0 0 1px ${pColors.bg}22`,
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{
              position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
              width: '10px', height: '10px',
              background: 'var(--dark-gray)', borderRight: `1px solid ${pColors.bg}55`,
              borderBottom: `1px solid ${pColors.bg}55`,
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '0.5rem', fontWeight: 800, color: '#000',
                background: pColors.bg, padding: '1px 5px', borderRadius: '3px',
                letterSpacing: '0.05em',
              }}>{pColors.label}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pColors.bg, fontFamily: 'JetBrains Mono, monospace' }}>
                vGPU-{slot.id.substring(0, 8)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Database size={10} /> VRAM</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(slot.vram_limit / 1024).toFixed(1)} GB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={10} /> Compute</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{slot.compute_limit}%</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', marginTop: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${slot.compute_limit}%`, borderRadius: '2px', background: `linear-gradient(90deg, ${pColors.bg}88, ${pColors.bg})`, transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }, [animatingIn, hoveredChip])

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
                 {provisionMutation.error.message}
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
                    background: 'var(--gray)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
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

      {/* ════════════════════════════════════════════════════════════════
          3D GPU SERVER TRAY — animated visualization below the manager
          ════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--dark-gray)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '1.5rem', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={16} color="var(--accent)" />
            GPU Server Tray
          </h3>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
          }}>
            {activeCount} / {TOTAL_SLOTS} SLOTS ACTIVE
          </span>
        </div>

        {/* 3D perspective scene */}
        <div 
          style={{
            perspective: '1200px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '1.5rem 0 2rem',
          }}
        >
          <div style={{
            transform: 'rotateX(28deg) rotateZ(-8deg) rotateY(8deg)',
            transformStyle: 'preserve-3d',
            display: 'flex', alignItems: 'stretch', gap: '0px',
            transition: 'transform 0.6s ease',
            position: 'relative',
          }}>
            {/* Tray body */}
            <div style={{
              position: 'relative',
              width: '580px', height: '310px',
              background: 'linear-gradient(160deg, var(--gray) 0%, var(--dark-gray) 40%, var(--black) 100%)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow)',
              overflow: 'hidden',
            }}>
              {/* Board grid texture */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(var(--accent-dim) 1px, transparent 1px), linear-gradient(90deg, var(--accent-dim) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                animation: 'boardGlow 5s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* PCB Traces */}
              {renderTraces()}

              {/* GPU Chip Grid */}
              <div style={{
                position: 'absolute',
                top: '14%', left: '6%', right: '8%', bottom: '14%',
                display: 'grid',
                gridTemplateColumns: `repeat(${CHIP_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${CHIP_ROWS}, 1fr)`,
                gap: '12px',
                zIndex: 3,
              }}>
                {slots.map((slot, i) => renderChip(slot, i))}
              </div>

              {/* Board labels */}
              <div style={{
                position: 'absolute', bottom: '6px', left: '12px',
                fontSize: '0.5rem', fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--accent)', opacity: 0.3, fontWeight: 600, letterSpacing: '0.1em',
                zIndex: 2,
              }}>
                V-GPU HGX PCB REV 3.1
              </div>
              <div style={{
                position: 'absolute', top: '6px', right: '12px',
                fontSize: '0.45rem', fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-muted)', opacity: 0.4, letterSpacing: '0.08em',
                zIndex: 2,
              }}>
                SXM5 · NVLink 4.0
              </div>

              {/* Edge connector pads */}
              <div style={{
                position: 'absolute', bottom: 0, left: '20%', right: '20%',
                height: '6px', display: 'flex', gap: '3px', justifyContent: 'center',
                zIndex: 2,
              }}>
                {[...Array(24)].map((_, i) => (
                  <div key={i} style={{
                    width: '8px', height: '100%',
                    background: i < activeCount * 3 ? 'var(--accent-dim)' : 'var(--border)',
                    borderRadius: '1px 1px 0 0',
                    transition: 'background 0.5s',
                  }} />
                ))}
              </div>

              {/* Glass / Acrylic cover */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(120,180,255,0.06) 0%, rgba(100,160,255,0.03) 50%, rgba(80,140,255,0.06) 100%)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                pointerEvents: 'none',
                zIndex: 5,
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-30%', left: 0, width: '40%', height: '160%',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 100%)',
                  animation: 'glassSweep 6s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                  background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)',
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
                  background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.04) 50%, transparent 90%)',
                }} />
              </div>
            </div>

            {/* Power connectors (right side) */}
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              gap: '8px', paddingLeft: '4px',
              transform: 'translateZ(-2px)',
            }}>
              {renderConnectors()}
            </div>
          </div>
        </div>

        {/* Profile Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
          {Object.entries(PROFILE_COLORS).map(([key, val]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: val.bg, display: 'inline-block', opacity: 0.8 }} />
              {val.label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, border: '1px dashed var(--border)', display: 'inline-block' }} />
            EMPTY
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          CHIP SLOT MAPPING — detailed grid below the tray
          ════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--dark-gray)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Chip Slot Mapping</h3>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem',
        }}>
          {slots.map((slot, i) => {
            const chipProfile = slot ? getChipProfile(slot) : null
            const pColors = chipProfile ? PROFILE_COLORS[chipProfile] : null
            return (
              <div key={slot?.id || `legend-${i}`} style={{
                padding: '0.7rem 0.9rem', borderRadius: '6px',
                background: slot ? `${pColors.bg}08` : 'var(--gray)',
                border: `1px solid ${slot ? `${pColors.bg}25` : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '4px',
                  background: slot ? `${pColors.bg}18` : 'var(--light-gray)',
                  border: `1px solid ${slot ? `${pColors.bg}30` : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800,
                  color: slot ? pColors.bg : 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {i}
                </div>
                {slot ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.45rem', fontWeight: 800, color: '#000',
                        background: pColors.bg, padding: '0px 4px', borderRadius: '2px',
                        letterSpacing: '0.04em', lineHeight: '1.4',
                      }}>{pColors.label}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        vGPU-{slot.id.substring(0, 8)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{(slot.vram_limit / 1024).toFixed(1)}G</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{slot.compute_limit}%</span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty slot</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default VGPUManager