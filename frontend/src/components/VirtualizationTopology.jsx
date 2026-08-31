import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, Box, Layers, Cpu, Database, Activity, Monitor, Play, RefreshCw, Network, Zap } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────
   IsometricBox – A helper that builds a true closed 3D cuboid box.
   ──────────────────────────────────────────────────────────────────── */
function IsometricBox({ width, depth, height, x, y, z, color, label, isGlass = false, children }) {
  const topBg = isGlass ? 'rgba(6, 182, 212, 0.12)' : `linear-gradient(135deg, ${color}dd 0%, ${color} 100%)`
  const frontBg = isGlass ? 'rgba(6, 182, 212, 0.18)' : `linear-gradient(180deg, ${color} 0%, rgba(10,10,10,0.85) 100%)`
  const backBg = isGlass ? 'rgba(6, 182, 212, 0.1)' : `linear-gradient(180deg, ${color}bb 0%, rgba(10,10,10,0.9) 100%)`
  const sideBg = isGlass ? 'rgba(6, 182, 212, 0.15)' : `linear-gradient(180deg, ${color}cc 0%, rgba(10,10,10,0.9) 100%)`
  const strokeColor = isGlass ? '#06b6d4' : 'rgba(255,255,255,0.18)'

  return (
    <div style={{
      position: 'absolute',
      width: `${width}px`,
      height: `${depth}px`,
      left: `${x}px`,
      top: `${y}px`,
      transform: `translateZ(${z}px)`,
      transformStyle: 'preserve-3d',
      transition: 'transform 0.5s ease',
    }}>
      {/* Top Face */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0, top: 0,
        background: topBg,
        border: `1.5px solid ${strokeColor}`,
        transform: `translateZ(${height}px)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isGlass ? '#06b6d4' : '#fff',
        fontFamily: 'monospace',
        fontSize: '0.62rem',
        fontWeight: 'bold',
        textShadow: isGlass ? '0 0 8px rgba(6,182,212,0.5)' : 'none',
        boxSizing: 'border-box',
      }}>
        {label}
      </div>

      {/* Front Face */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: `${height}px`,
        left: 0, top: `${depth}px`,
        background: frontBg,
        border: `1.5px solid ${strokeColor}`,
        transformOrigin: 'top center',
        transform: 'rotateX(-90deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {children}
      </div>

      {/* Back Face */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: `${height}px`,
        left: 0, top: `${-height}px`,
        background: backBg,
        border: `1.5px solid ${strokeColor}`,
        transformOrigin: 'bottom center',
        transform: 'rotateX(90deg)',
        boxSizing: 'border-box',
      }} />

      {/* Left Face */}
      <div style={{
        position: 'absolute',
        width: `${depth}px`,
        height: `${height}px`,
        left: `${-depth}px`, top: 0,
        background: sideBg,
        border: `1.5px solid ${strokeColor}`,
        transformOrigin: 'right center',
        transform: 'rotateY(-90deg)',
        boxSizing: 'border-box',
      }} />

      {/* Right Face */}
      <div style={{
        position: 'absolute',
        width: `${depth}px`,
        height: `${height}px`,
        left: `${width}px`, top: 0,
        background: sideBg,
        border: `1.5px solid ${strokeColor}`,
        transformOrigin: 'left center',
        transform: 'rotateY(90deg)',
        boxSizing: 'border-box',
      }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
   VirtualizationTopology – 3D Isometric stack visualising 
   vGPU hardware -> Docker container -> AI Data Center connection topology.
   ──────────────────────────────────────────────────────────────────── */

const KEYFRAMES = `
@keyframes pulseGrid {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.3; }
}
@keyframes pulseConnectionLine {
  0% { stroke-dashoffset: 40; }
  100% { stroke-dashoffset: 0; }
}
@keyframes blockFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
  100% { transform: translateY(0); }
}
@keyframes ledBlink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
@keyframes flowDot {
  0% { left: 0%; opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@keyframes verticalPulse {
  0%, 100% { border-color: var(--border); }
  50% { border-color: var(--accent); }
}
@keyframes sigTravel {
  0% { transform: scale(0.8) translate(0px, 0px); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: scale(1.1) translate(var(--sig-dest-x, 140px), var(--sig-dest-y, 0px)); opacity: 0; }
}
`

function VirtualizationTopology({ theme = 'dark' }) {
  const styleRef = useRef(null)
  const [selectedBlock, setSelectedBlock] = useState('none')
  const [viewModel, setViewModel] = useState('stack') // 'stack' | 'flow' | 'sequence'
  const [rotation, setRotation] = useState({ x: 55, y: 4, z: -40 })
  const [isDragging, setIsDragging] = useState(false)
  const sceneRef = useRef(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const rotStart = useRef({ x: 55, z: -40 })

  const handleMouseDown = (e) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    rotStart.current = { x: rotation.x, z: rotation.z }
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStart.current.x
    const deltaY = e.clientY - dragStart.current.y
    const sensitivity = 0.35
    let newX = rotStart.current.x - (deltaY * sensitivity)
    let newZ = rotStart.current.z + (deltaX * sensitivity)
    newX = Math.max(25, Math.min(85, newX))
    newZ = Math.max(-90, Math.min(10, newZ))
    setRotation({
      x: newX,
      y: 4 + (newZ + 40) * 0.15,
      z: newZ
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setRotation({ x: 55, y: 4, z: -40 })
  }

  // Inject keyframes on load
  useEffect(() => {
    if (!styleRef.current) {
      const s = document.createElement('style')
      s.textContent = KEYFRAMES
      document.head.appendChild(s)
      styleRef.current = s
    }
    return () => { if (styleRef.current) { styleRef.current.remove(); styleRef.current = null } }
  }, [])

  // Live vGPU data
  const { data: vGPUs = [] } = useQuery({
    queryKey: ['vgpus'],
    queryFn: () => fetch('http://localhost:8000/api/vgpu/list').then(r => r.json()),
    refetchInterval: 2000
  })

  // Live jobs stats
  const activeJobsCount = vGPUs.filter(v => v.container_id).length
  const totalVram = vGPUs.reduce((s, v) => s + (v.vram_limit || 0), 0)
  const avgCompute = vGPUs.length ? (vGPUs.reduce((s, v) => s + (v.compute_limit || 0), 0) / vGPUs.length).toFixed(0) : 0

  return (
    <div style={{
      padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem',
      background: 'var(--black)', minHeight: '100%', position: 'relative',
    }}>
      {/* ── Title Header ── */}
      <div style={{
        borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={22} color="var(--accent)" />
            Virtualization Architecture
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Interactive diagnostic views showing pipelines across hardware vGPU profiles, Docker containers, and cluster hosts.
          </p>
        </div>

        {/* ── View Model Selector ── */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--gray)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border)' }}>
          {[
            { id: 'stack', label: '3D Layer Stack' },
            { id: 'flow', label: 'Data Flow' },
            { id: 'sequence', label: 'Sequence Model' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setViewModel(opt.id); setSelectedBlock('none') }}
              style={{
                background: viewModel === opt.id ? 'var(--accent)' : 'transparent',
                color: viewModel === opt.id ? '#000' : 'var(--text-secondary)',
                border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '0.72rem',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONDITIONAL RENDER: 3D LAYER STACK ── */}
      {viewModel === 'stack' && (
        <div 
          ref={sceneRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            perspective: '1400px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '3rem 0',
            minHeight: '460px',
            overflow: 'visible',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <div style={{
            transform: `rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
            position: 'relative',
            width: '620px', height: '400px',
            transition: isDragging ? 'none' : 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}>
            {/* Isometric Base Grid */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(rgba(6, 182, 212, 0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6, 182, 212, 0.12) 1px, transparent 1px)
              `,
              backgroundSize: '25px 25px',
              border: '2px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              boxShadow: '0 0 40px rgba(6, 182, 212, 0.08), inset 0 0 20px rgba(6, 182, 212, 0.08)',
              transform: 'translateZ(-20px)',
              animation: 'pulseGrid 4s ease-in-out infinite',
            }}>
              <div style={{ position: 'absolute', top: '10px', left: '15px', color: 'rgba(6, 182, 212, 0.4)', fontSize: '0.45rem', fontFamily: 'monospace', fontWeight: 700 }}>
                HYPERVISOR HOST LAYER
              </div>
              <div style={{ position: 'absolute', bottom: '10px', right: '15px', color: 'rgba(6, 182, 212, 0.4)', fontSize: '0.45rem', fontFamily: 'monospace', fontWeight: 700 }}>
                vVGPU_COMPULSE_ENG.v2
              </div>
            </div>

            {/* Connection Paths */}
            <svg style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
              transform: 'translateZ(10px)',
              overflow: 'visible',
            }}>
              <path
                d="M 120 180 Q 200 130, 290 190"
                fill="none"
                stroke="url(#neonCyanGrad)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                style={{ animation: 'pulseConnectionLine 2s linear infinite' }}
              />
              <path
                d="M 330 210 Q 420 280, 500 200"
                fill="none"
                stroke="url(#neonGreenGrad)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                style={{ animation: 'pulseConnectionLine 1.8s linear infinite' }}
              />
              <path
                d="M 150 220 Q 300 320, 480 230"
                fill="none"
                stroke="rgba(118, 185, 0, 0.25)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <defs>
                <linearGradient id="neonCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="neonGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#76B900" />
                  <stop offset="100%" stopColor="#8fdc14" />
                </linearGradient>
              </defs>
            </svg>

            {/* vGPU Profiles Block */}
            <div 
              onClick={() => setSelectedBlock(selectedBlock === 'vgpu' ? 'none' : 'vgpu')}
              style={{
                position: 'absolute',
                top: '25%', left: '8%',
                width: '130px', height: '140px',
                transformStyle: 'preserve-3d',
                transform: 'translateZ(10px)',
                cursor: 'pointer',
                animation: 'blockFloat 5s ease-in-out infinite',
                animationDelay: '0.2s',
              }}
            >
              <IsometricBox width={120} depth={100} height={30} x={0} y={0} z={0} color="#1e293b" label="BASE LAYER" />
              <IsometricBox width={120} depth={100} height={25} x={0} y={0} z={35} color="#76b900" label="VGPU PROFILE">
                {vGPUs.length > 0 && (
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[...Array(Math.min(4, vGPUs.length))].map((_, i) => (
                      <div key={i} style={{ width: '12px', height: '4px', background: '#fff', borderRadius: '1px' }} />
                    ))}
                  </div>
                )}
              </IsometricBox>
              <IsometricBox width={120} depth={100} height={20} x={0} y={0} z={65} color="#e2e8f0" label="NVIDIA SXM5" />
            </div>

            {/* Docker Container Layer */}
            <div 
              onClick={() => setSelectedBlock(selectedBlock === 'docker' ? 'none' : 'docker')}
              style={{
                position: 'absolute',
                top: '30%', left: '40%',
                width: '140px', height: '140px',
                transformStyle: 'preserve-3d',
                transform: 'translateZ(30px)',
                cursor: 'pointer',
                animation: 'blockFloat 5.5s ease-in-out infinite',
                animationDelay: '0.8s',
              }}
            >
              <IsometricBox width={130} depth={110} height={85} x={0} y={0} z={0} isGlass={true} label="CONTAINER GRID">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', transform: 'translateZ(10px)' }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={{
                      width: '26px', height: '26px', borderRadius: '4px',
                      background: i < activeJobsCount ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${i < activeJobsCount ? '#06b6d4' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: i < activeJobsCount ? 'ledBlink 1.5s infinite alternate' : 'none',
                      animationDelay: `${i * 0.25}s`,
                    }}>
                      <Box size={12} color={i < activeJobsCount ? '#ffffff' : 'rgba(255,255,255,0.2)'} />
                    </div>
                  ))}
                </div>
              </IsometricBox>
            </div>

            {/* AI Data Center Cluster */}
            <div 
              onClick={() => setSelectedBlock(selectedBlock === 'datacenter' ? 'none' : 'datacenter')}
              style={{
                position: 'absolute',
                top: '25%', right: '10%',
                width: '140px', height: '140px',
                transformStyle: 'preserve-3d',
                transform: 'translateZ(15px)',
                cursor: 'pointer',
                animation: 'blockFloat 5.2s ease-in-out infinite',
                animationDelay: '1.4s',
              }}
            >
              <IsometricBox width={120} depth={120} height={90} x={0} y={0} z={0} color="#0f172a" label="AI DATA CENTER">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '90%', height: '90%', justifyContent: 'center' }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{
                      height: '18px', width: '100%', background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px',
                    }}>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#76b900', boxShadow: '0 0 6px #76b900', animation: 'ledBlink 1s infinite alternate' }} />
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: activeJobsCount > 0 ? '#3b82f6' : 'rgba(255,255,255,0.15)', animation: activeJobsCount > 0 ? 'ledBlink 0.5s infinite alternate' : 'none' }} />
                      </div>
                      <Server size={8} color="rgba(255,255,255,0.3)" />
                    </div>
                  ))}
                </div>
              </IsometricBox>
            </div>
          </div>
        </div>
      )}

      {/* ── CONDITIONAL RENDER: DATA FLOW PIPELINE ── */}
      {viewModel === 'flow' && (
        <div style={{
          minHeight: '400px', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', gap: '2.5rem',
          padding: '2rem 0',
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            System Data Flow Pipeline
          </h3>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', maxWidth: '850px', position: 'relative',
          }}>
            {/* Horizontal Line Connector */}
            <div style={{
              position: 'absolute', left: '8%', right: '8%', height: '3px',
              background: 'linear-gradient(90deg, #76b900, #06b6d4, #2563eb)',
              opacity: 0.25, zIndex: 1,
            }} />

            {/* Stages */}
            {[
              { id: 'client', label: 'Client / GUI', desc: 'Submits provision requests', icon: Monitor, color: '#f59e0b' },
              { id: 'api', label: 'FastAPI Orchestrator', desc: 'Accepts API requests & routes endpoints', icon: Network, color: '#06b6d4' },
              { id: 'slicing', label: 'vGPU Slicing', desc: 'Allocates VRAM & GPU compute', icon: Layers, color: '#76b900' },
              { id: 'docker', label: 'Docker Core', desc: 'Launches isolated sandbox container', icon: Box, color: '#3b82f6' },
              { id: 'gpu', label: 'GPU Cluster', desc: 'Executes parallel workloads', icon: Server, color: '#e11d73' }
            ].map((stage, idx, arr) => {
              const Icon = stage.icon
              const isSelected = selectedBlock === stage.id
              return (
                <div
                  key={stage.id}
                  onClick={() => setSelectedBlock(isSelected ? 'none' : stage.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '0.8rem', zIndex: 2, position: 'relative', width: '135px',
                    cursor: 'pointer',
                  }}
                >
                  {/* Flow pipeline dot animation */}
                  {idx < arr.length - 1 && (
                    <div style={{
                      position: 'absolute', top: '24px', left: '100px', width: '60px', height: '6px',
                      overflow: 'hidden', pointerEvents: 'none',
                    }}>
                      <div style={{
                        position: 'absolute', width: '8px', height: '8px', borderRadius: '50%',
                        background: stage.color, boxShadow: `0 0 8px ${stage.color}`,
                        top: '-1px', animation: 'flowDot 1.6s linear infinite',
                      }} />
                    </div>
                  )}

                  <div style={{
                    width: '54px', height: '54px', borderRadius: '12px',
                    background: isSelected ? stage.color : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${isSelected ? stage.color : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isSelected ? `0 0 20px ${stage.color}44` : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    <Icon size={24} color={isSelected ? '#000' : 'var(--text-secondary)'} />
                  </div>

                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CONDITIONAL RENDER: SEQUENCE PROCESS MODEL ── */}
      {viewModel === 'sequence' && (
        <div style={{
          minHeight: '400px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '1rem 0',
        }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Timing Sequence Process Model
          </h3>

          <div style={{
            position: 'relative', width: '100%', maxWidth: '780px', height: '280px',
            display: 'flex', justifyContent: 'space-between',
          }}>
            {/* Vertically Blinking Lifelines */}
            {[
              { id: 'client', label: 'Client / GUI', color: '#f59e0b' },
              { id: 'router', label: 'vGPU API Router', color: '#06b6d4' },
              { id: 'engine', label: 'vGPU Slicing Engine', color: '#76b900' },
              { id: 'docker', label: 'Docker Daemon', color: '#3b82f6' }
            ].map((line, idx) => (
              <div key={line.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative', width: '120px', height: '100%',
              }}>
                {/* Header card */}
                <div style={{
                  padding: '6px 12px', borderRadius: '4px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${line.color}`,
                  fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)',
                  zIndex: 2,
                }}>
                  {line.label}
                </div>
                {/* Dashed lifeline */}
                <div style={{
                  position: 'absolute', top: '30px', bottom: 0, width: '2px',
                  backgroundImage: 'linear-gradient(to bottom, var(--border) 60%, transparent 40%)',
                  backgroundSize: '1px 10px',
                  zIndex: 1,
                  animation: 'verticalPulse 3s ease infinite alternate',
                  animationDelay: `${idx * 0.4}s`,
                }} />
              </div>
            ))}

            {/* Sliding horizontal signal indicators */}
            {/* Signal 1: Client -> Router (provision_request) */}
            <div style={{
              position: 'absolute', top: '75px', left: '72px', width: '160px', height: '2px',
              borderBottom: '1px dashed #f59e0b', pointerEvents: 'none',
            }}>
              <span style={{ position: 'absolute', top: '-14px', left: '20px', fontSize: '0.55rem', color: '#f59e0b', fontFamily: 'monospace' }}>
                provision_request()
              </span>
              <div style={{
                position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b',
                top: '-3px', '--sig-dest-x': '155px', animation: 'sigTravel 8s linear infinite',
              }} />
            </div>

            {/* Signal 2: Router -> Slicing Engine (allocate_vram) */}
            <div style={{
              position: 'absolute', top: '125px', left: '292px', width: '160px', height: '2px',
              borderBottom: '1px dashed #76b900', pointerEvents: 'none',
            }}>
              <span style={{ position: 'absolute', top: '-14px', left: '30px', fontSize: '0.55rem', color: '#76b900', fontFamily: 'monospace' }}>
                allocate_vram()
              </span>
              <div style={{
                position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#76b900',
                top: '-3px', '--sig-dest-x': '155px', animation: 'sigTravel 8s linear infinite',
                animationDelay: '2s',
              }} />
            </div>

            {/* Signal 3: Router -> Docker (container_start) */}
            <div style={{
              position: 'absolute', top: '175px', left: '292px', width: '375px', height: '2px',
              borderBottom: '1px dashed #3b82f6', pointerEvents: 'none',
            }}>
              <span style={{ position: 'absolute', top: '-14px', left: '100px', fontSize: '0.55rem', color: '#3b82f6', fontFamily: 'monospace' }}>
                docker_run_container()
              </span>
              <div style={{
                position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6',
                top: '-3px', '--sig-dest-x': '370px', animation: 'sigTravel 8s linear infinite',
                animationDelay: '4s',
              }} />
            </div>

            {/* Signal 4: Docker -> Client (callback_success) */}
            <div style={{
              position: 'absolute', top: '225px', left: '72px', width: '595px', height: '2px',
              borderBottom: '1px dashed #22c55e', pointerEvents: 'none',
            }}>
              <span style={{ position: 'absolute', top: '-14px', left: '200px', fontSize: '0.55rem', color: '#22c55e', fontFamily: 'monospace' }}>
                provision_success_callback()
              </span>
              <div style={{
                position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e',
                top: '-3px', '--sig-dest-x': '-590px', animation: 'sigTravel 8s linear infinite',
                animationDelay: '6s',
              }} />
            </div>

          </div>
        </div>
      )}

      {/* ── Diagnostics Telemetry Table ── */}
      <div style={{
        background: 'var(--dark-gray)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '1.5rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={16} color="var(--accent)" />
          Virtualization Stack Diagnostics
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>STACK LAYER</th>
                <th style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>CORE TECHNOLOGY</th>
                <th style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>REAL-TIME TELEMETRY</th>
                <th style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: vGPU Slicing */}
              <tr 
                onClick={() => setSelectedBlock(selectedBlock === 'vgpu' ? 'none' : 'vgpu')}
                style={{ 
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedBlock === 'vgpu' ? 'rgba(118,185,0,0.06)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                onMouseLeave={e => e.currentTarget.style.background = selectedBlock === 'vgpu' ? 'rgba(118,185,0,0.06)' : 'transparent'}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={14} color="var(--accent)" />
                  Layer 1: vGPU Hardware
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>NVIDIA GRID Partitioning</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {vGPUs.length} active slots / {(totalVram / 1024).toFixed(1)} GB VRAM
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px',
                    background: 'rgba(118, 185, 0, 0.15)', color: 'var(--accent)', border: '1px solid rgba(118,185,0,0.3)'
                  }}>
                    ACTIVE
                  </span>
                </td>
              </tr>

              {/* Row 2: Docker Containers */}
              <tr 
                onClick={() => setSelectedBlock(selectedBlock === 'docker' ? 'none' : 'docker')}
                style={{ 
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedBlock === 'docker' ? 'rgba(6,182,212,0.06)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                onMouseLeave={e => e.currentTarget.style.background = selectedBlock === 'docker' ? 'rgba(6,182,212,0.06)' : 'transparent'}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box size={14} color="#06b6d4" />
                  Layer 2: Docker Sandbox
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Linux Core Namespaces</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {activeJobsCount} container workloads running
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px',
                    background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)'
                  }}>
                    ISOLATED
                  </span>
                </td>
              </tr>

              {/* Row 3: AI Data Center */}
              <tr 
                onClick={() => setSelectedBlock(selectedBlock === 'datacenter' ? 'none' : 'datacenter')}
                style={{ 
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedBlock === 'datacenter' ? 'rgba(37,99,235,0.06)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                onMouseLeave={e => e.currentTarget.style.background = selectedBlock === 'datacenter' ? 'rgba(37,99,235,0.06)' : 'transparent'}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={14} color="#2563eb" />
                  Layer 3: Data Center Cluster
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Hypervisor Scheduler</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {avgCompute}% average cluster capacity load
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px',
                    background: 'rgba(37,99,235,0.15)', color: '#3b82f6', border: '1px solid rgba(37,99,235,0.3)'
                  }}>
                    NOMINAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Collapsing Detail Block based on Row Click */}
        {selectedBlock !== 'none' && (
          <div style={{
            marginTop: '1.25rem', padding: '1rem', borderRadius: '6px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
            transition: 'all 0.3s ease'
          }}>
            {selectedBlock === 'vgpu' && (
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800 }}>Layer 1 Diagnostics: vGPU Hardware partition details</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  GRID manager slices the physical hardware to configure distinct SXM5 blocks. VRAM limits are enforced at the hardware driver level, preventing cross-tenant memory leakage.
                </p>
              </div>
            )}
            {selectedBlock === 'docker' && (
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', color: '#06b6d4', fontWeight: 800 }}>Layer 2 Diagnostics: Docker container boundary details</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  Linux kernel namespaces isolate execution logs and network pipelines. Container resources are strictly bound to physical vGPU IDs via GPU-passthrough driver configurations.
                </p>
              </div>
            )}
            {selectedBlock === 'datacenter' && (
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800 }}>Layer 3 Diagnostics: IT Data Center scheduler details</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  Manages overall cluster performance. Job requests are distributed across GPU drawer blades based on current thermal stats and active thread limits.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

export default VirtualizationTopology
