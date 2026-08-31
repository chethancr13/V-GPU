import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, Cpu, Database, Zap, Activity, ThermometerSun } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────
   GPUServerTray – 3D animated GPU server sled visualisation
   Renders a perspective-transformed tray with GPU chip slots that
   light up / animate based on live vGPU instance data from the backend.
   ──────────────────────────────────────────────────────────────────── */

const CHIP_ROWS = 2
const CHIP_COLS = 4
const TOTAL_SLOTS = CHIP_ROWS * CHIP_COLS

// ── keyframe CSS injected once ──
const KEYFRAMES = `
@keyframes gpuPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(118,185,0,0.3), inset 0 0 6px rgba(118,185,0,0.15); }
  50%      { box-shadow: 0 0 22px rgba(118,185,0,0.65), inset 0 0 14px rgba(118,185,0,0.35); }
}
@keyframes gpuSlotIn {
  0%   { opacity: 0; transform: translateY(-18px) scale(0.85); }
  60%  { opacity: 1; transform: translateY(3px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes gpuSlotOut {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.7) translateY(12px); }
}
@keyframes glassSweep {
  0%   { transform: translateX(-120%) rotate(-15deg); }
  100% { transform: translateX(220%) rotate(-15deg); }
}
@keyframes traceDot {
  0%   { offset-distance: 0%; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
@keyframes connectorPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(118,185,0,0.15); }
  50%      { box-shadow: 0 0 12px rgba(118,185,0,0.45); }
}
@keyframes dataFlowHorizontal {
  0%   { left: -6px; opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@keyframes dataFlowVertical {
  0%   { top: -6px; opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
@keyframes boardGlow {
  0%, 100% { opacity: 0.03; }
  50%      { opacity: 0.08; }
}
@keyframes chipHeatPulse {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
`

function GPUServerTray() {
  const styleRef = useRef(null)
  const [prevIds, setPrevIds] = useState(new Set())
  const [animatingIn, setAnimatingIn] = useState(new Set())
  const [animatingOut, setAnimatingOut] = useState(new Set())
  const [hoveredChip, setHoveredChip] = useState(null)

  // inject keyframes once
  useEffect(() => {
    if (!styleRef.current) {
      const s = document.createElement('style')
      s.textContent = KEYFRAMES
      document.head.appendChild(s)
      styleRef.current = s
    }
    return () => { if (styleRef.current) { styleRef.current.remove(); styleRef.current = null } }
  }, [])

  // ── live vGPU data ──
  const { data: vGPUs = [] } = useQuery({
    queryKey: ['vgpus'],
    queryFn: () => fetch('http://localhost:8000/api/vgpu/list').then(r => r.json()),
    refetchInterval: 2000
  })

  // detect additions / removals for animation
  useEffect(() => {
    const currentIds = new Set((vGPUs || []).map(v => v.id))
    // new chips -> animate in
    const newIn = new Set()
    currentIds.forEach(id => { if (!prevIds.has(id)) newIn.add(id) })
    if (newIn.size) {
      setAnimatingIn(newIn)
      setTimeout(() => setAnimatingIn(new Set()), 700)
    }
    // removed chips -> animate out
    const newOut = new Set()
    prevIds.forEach(id => { if (!currentIds.has(id)) newOut.add(id) })
    if (newOut.size) {
      setAnimatingOut(newOut)
      setTimeout(() => setAnimatingOut(new Set()), 500)
    }
    setPrevIds(currentIds)
  }, [vGPUs])

  // map vGPU list into slot positions
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => vGPUs?.[i] || null)
  const activeCount = (vGPUs || []).length
  const totalVram = (vGPUs || []).reduce((s, v) => s + (v.vram_limit || 0), 0)
  const avgCompute = activeCount ? ((vGPUs || []).reduce((s, v) => s + (v.compute_limit || 0), 0) / activeCount).toFixed(0) : 0

  /* ─── PCB TRACES ─── */
  const renderTraces = useCallback(() => {
    const traces = []
    // horizontal main buses
    for (let r = 0; r < CHIP_ROWS; r++) {
      const yPct = 28 + r * 44
      traces.push(
        <div key={`h-${r}`} style={{
          position: 'absolute', left: '6%', right: '8%', top: `${yPct}%`, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(118,185,0,0.12) 15%, rgba(118,185,0,0.18) 50%, rgba(118,185,0,0.12) 85%, transparent)',
          zIndex: 1,
        }}>
          {/* animated flowing dot */}
          <div style={{
            position: 'absolute', width: '6px', height: '6px', borderRadius: '50%',
            background: 'radial-gradient(circle, #76B900 0%, transparent 70%)',
            boxShadow: '0 0 8px #76B900',
            animation: `dataFlowHorizontal ${2.5 + r * 0.7}s linear infinite`,
            animationDelay: `${r * 1.2}s`,
            top: '-2.5px',
          }} />
        </div>
      )
    }
    // vertical distribution lines to each column
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
            animation: `dataFlowVertical ${3 + c * 0.5}s linear infinite`,
            animationDelay: `${c * 0.8}s`,
            left: '-2px',
          }} />
        </div>
      )
    }
    // diagonal accent traces
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

  /* ─── POWER CONNECTORS ─── */
  const renderConnectors = useCallback(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const isActive = i < Math.ceil(activeCount / 2)
      return (
        <div key={`conn-${i}`} style={{
          width: '22px', height: '52px', borderRadius: '11px',
          background: isActive
            ? 'linear-gradient(180deg, #3a3a3a 0%, #252525 40%, #1a1a1a 100%)'
            : 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 40%, #111 100%)',
          border: `1px solid ${isActive ? 'rgba(118,185,0,0.25)' : 'rgba(255,255,255,0.06)'}`,
          position: 'relative',
          animation: isActive ? 'connectorPulse 2s ease-in-out infinite' : 'none',
          animationDelay: `${i * 0.4}s`,
          transition: 'all 0.5s ease',
        }}>
          {/* connector pin marks */}
          <div style={{
            position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
            width: '10px', height: '3px', borderRadius: '1px',
            background: isActive ? 'rgba(118,185,0,0.5)' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.5s',
          }} />
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            width: '10px', height: '3px', borderRadius: '1px',
            background: isActive ? 'rgba(118,185,0,0.5)' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.5s',
          }} />
          {/* active indicator LED */}
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

  /* ─── SINGLE GPU CHIP ─── */
  const renderChip = useCallback((slot, index) => {
    const isActive = !!slot
    const isNew = slot && animatingIn.has(slot.id)
    const isHovered = hoveredChip === index

    // compute colour based on utilisation
    const computeLoad = slot?.compute_limit || 0
    const chipColor = isActive
      ? computeLoad > 75
        ? 'linear-gradient(135deg, #76B900 0%, #8fdc14 50%, #76B900 100%)'
        : computeLoad > 40
          ? 'linear-gradient(135deg, #5a9100 0%, #76B900 50%, #5a9100 100%)'
          : 'linear-gradient(135deg, #3d6b00 0%, #5a9100 50%, #3d6b00 100%)'
      : 'linear-gradient(135deg, #1a1a1a 0%, #222 50%, #1a1a1a 100%)'

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
          background: chipColor,
          backgroundSize: '200% 200%',
          border: isActive
            ? '1.5px solid rgba(118,185,0,0.4)'
            : '1.5px dashed rgba(255,255,255,0.08)',
          cursor: isActive ? 'pointer' : 'default',
          animation: isActive
            ? isNew
              ? 'gpuSlotIn 0.6s ease-out forwards, chipHeatPulse 4s ease infinite'
              : 'gpuPulse 2.5s ease-in-out infinite, chipHeatPulse 4s ease infinite'
            : 'none',
          animationDelay: isNew ? '0s' : `${index * 0.3}s`,
          transition: 'all 0.4s ease',
          transform: isHovered && isActive ? 'scale(1.08)' : 'scale(1)',
          zIndex: isHovered ? 10 : 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* die pattern */}
        {isActive && (
          <>
            {/* top capacitor row */}
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
            {/* bottom capacitor row */}
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
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <Cpu size={14} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
              {/* tiny die grid */}
              <div style={{
                position: 'absolute', inset: '3px',
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: '1px',
                opacity: 0.15,
              }}>
                {[...Array(6)].map((_, j) => (
                  <div key={j} style={{ background: '#76B900', borderRadius: '1px' }} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* inactive empty slot */}
        {!isActive && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            opacity: 0.3,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '4px',
              border: '1px dashed rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Server size={14} color="rgba(255,255,255,0.2)" />
            </div>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
              SLOT {index}
            </span>
          </div>
        )}

        {/* hover tooltip */}
        {isActive && isHovered && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(118,185,0,0.3)',
            borderRadius: '8px', padding: '10px 14px', minWidth: '180px',
            zIndex: 100, pointerEvents: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(118,185,0,0.1)',
            backdropFilter: 'blur(12px)',
          }}>
            {/* arrow */}
            <div style={{
              position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
              width: '10px', height: '10px',
              background: 'rgba(10,10,10,0.95)', borderRight: '1px solid rgba(118,185,0,0.3)',
              borderBottom: '1px solid rgba(118,185,0,0.3)',
            }} />
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#76B900', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
              vGPU-{slot.id.substring(0, 8)}
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
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', marginTop: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${slot.compute_limit}%`, borderRadius: '2px', background: 'linear-gradient(90deg, #76B900, #8fdc14)', transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }, [animatingIn, hoveredChip])

  /* ─── MAIN RENDER ─── */
  return (
    <div style={{
      padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem',
      background: 'var(--black)', minHeight: '100%',
    }}>
      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Server size={22} color="var(--accent)" />
          VM Scheduler
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Real-time 3D server tray — GPU chip slots light up as vGPU instances are provisioned.
        </p>
      </div>

      {/* ── Top stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {[
          { icon: Activity, label: 'Active Chips', value: `${activeCount} / ${TOTAL_SLOTS}`, color: '#76B900' },
          { icon: Database, label: 'Total VRAM', value: `${(totalVram / 1024).toFixed(1)} GB`, color: '#5aa0ff' },
          { icon: Zap, label: 'Avg Compute', value: `${avgCompute}%`, color: '#ffd14d' },
          { icon: ThermometerSun, label: 'Slot Utilisation', value: `${((activeCount / TOTAL_SLOTS) * 100).toFixed(0)}%`, color: activeCount >= TOTAL_SLOTS ? '#ef4444' : '#76B900' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'var(--dark-gray)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: `${color}12`, border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3D Tray Scene ── */}
      <div style={{
        perspective: '1200px',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '2rem 0',
      }}>
        <div style={{
          transform: 'rotateX(28deg) rotateZ(-8deg) rotateY(8deg)',
          transformStyle: 'preserve-3d',
          display: 'flex', alignItems: 'stretch', gap: '0px',
          transition: 'transform 0.6s ease',
          position: 'relative',
        }}>
          {/* ── Tray Body ── */}
          <div style={{
            position: 'relative',
            width: '640px', height: '340px',
            background: 'linear-gradient(160deg, #1c2028 0%, #14171d 40%, #0e1015 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            {/* ── Subtle board texture ── */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(118,185,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(118,185,0,0.02) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              animation: 'boardGlow 5s ease-in-out infinite',
              pointerEvents: 'none',
            }} />

            {/* ── PCB Traces ── */}
            {renderTraces()}

            {/* ── GPU Chip Grid ── */}
            <div style={{
              position: 'absolute',
              top: '14%', left: '6%', right: '8%', bottom: '14%',
              display: 'grid',
              gridTemplateColumns: `repeat(${CHIP_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${CHIP_ROWS}, 1fr)`,
              gap: '14px',
              zIndex: 3,
            }}>
              {slots.map((slot, i) => renderChip(slot, i))}
            </div>

            {/* ── Board labels ── */}
            <div style={{
              position: 'absolute', bottom: '6px', left: '12px',
              fontSize: '0.5rem', fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(118,185,0,0.2)', fontWeight: 600, letterSpacing: '0.1em',
              zIndex: 2,
            }}>
              V-GPU HGX PCB REV 3.1
            </div>
            <div style={{
              position: 'absolute', top: '6px', right: '12px',
              fontSize: '0.45rem', fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(255,255,255,0.1)', letterSpacing: '0.08em',
              zIndex: 2,
            }}>
              SXM5 · NVLink 4.0
            </div>

            {/* ── Edge connector pads (bottom) ── */}
            <div style={{
              position: 'absolute', bottom: 0, left: '20%', right: '20%',
              height: '6px', display: 'flex', gap: '3px', justifyContent: 'center',
              zIndex: 2,
            }}>
              {[...Array(24)].map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '100%',
                  background: `rgba(${i < activeCount * 3 ? '118,185,0' : '255,255,255'},${i < activeCount * 3 ? '0.2' : '0.03'})`,
                  borderRadius: '1px 1px 0 0',
                  transition: 'background 0.5s',
                }} />
              ))}
            </div>

            {/* ── Glass / Acrylic Cover ── */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(120,180,255,0.04) 0%, rgba(100,160,255,0.02) 50%, rgba(80,140,255,0.04) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.04)',
              pointerEvents: 'none',
              zIndex: 5,
              overflow: 'hidden',
            }}>
              {/* animated light sweep */}
              <div style={{
                position: 'absolute', top: '-30%', left: 0, width: '40%', height: '160%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 100%)',
                animation: 'glassSweep 6s ease-in-out infinite',
              }} />
              {/* glass edge highlights */}
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

          {/* ── Power Connectors (right side) ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: '8px', paddingLeft: '4px',
            transform: 'translateZ(-2px)',
          }}>
            {renderConnectors()}
          </div>
        </div>
      </div>

      {/* ── Chip Legend / Status Grid ── */}
      <div style={{
        background: 'var(--dark-gray)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Chip Slot Mapping</h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#76B900', display: 'inline-block' }} /> Active
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, border: '1px dashed rgba(255,255,255,0.15)', display: 'inline-block' }} /> Empty
            </span>
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem',
        }}>
          {slots.map((slot, i) => (
            <div key={slot?.id || `legend-${i}`} style={{
              padding: '0.7rem 0.9rem', borderRadius: '6px',
              background: slot ? 'rgba(118,185,0,0.04)' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${slot ? 'rgba(118,185,0,0.15)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '4px',
                background: slot ? 'rgba(118,185,0,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${slot ? 'rgba(118,185,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 800,
                color: slot ? '#76B900' : 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {i}
              </div>
              {slot ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    vGPU-{slot.id.substring(0, 8)}
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
          ))}
        </div>
      </div>
    </div>
  )
}

export default GPUServerTray
