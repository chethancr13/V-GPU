import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Monitor, Video, Cpu, Activity, AlertTriangle } from 'lucide-react'

function GraphicsViewer() {
  const canvasRef = useRef(null)
  const [selectedVGPU, setSelectedVGPU] = useState(null)
  const [stressMode, setStressMode] = useState(false)
  const [fps, setFps] = useState(0)
  const [bitrate, setBitrate] = useState('0.0')
  const [utilization, setUtilization] = useState(0)
  const [latency, setLatency] = useState('1.24')
  const wsRef = useRef(null)

  const { data: vGPUs } = useQuery({
    queryKey: ['vgpus'],
    queryFn: () => fetch('http://localhost:8000/api/vgpu/list').then(res => res.json()),
    refetchInterval: 2000
  })

  const selectedVgpuInfo = vGPUs?.find(v => v.id === selectedVGPU)
  const computePct = selectedVgpuInfo?.compute_limit || 50

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let bytesReceived = 0

    // Randomize utilization and stats dynamically based on compute allocation and stress mode
    const statsInterval = setInterval(() => {
      if (selectedVGPU) {
        if (stressMode) {
          // Under stress: load is extremely high (92-98%)
          setUtilization(Math.floor(Math.random() * 6) + 92)
          
          // Bitrate spikes due to high detail complexity
          setBitrate((Math.random() * 1.2 + 7.4).toFixed(1))
          
          // Latency and performance depend heavily on allocated compute slice!
          if (computePct < 40) {
            setLatency((Math.random() * 4.2 + 32.5).toFixed(2)) // Severe lag under low compute
          } else if (computePct < 70) {
            setLatency((Math.random() * 2.1 + 14.8).toFixed(2)) // Moderate lag
          } else {
            setLatency((Math.random() * 0.4 + 2.1).toFixed(2))  // Seamless throughput under high compute
          }
        } else {
          // Standard idle render mode
          setUtilization(Math.floor(Math.random() * 10) + 40)
          setBitrate((Math.random() * 0.8 + 2.8).toFixed(1))
          setLatency((Math.random() * 0.2 + 1.1).toFixed(2))
        }
      } else {
        setUtilization(0)
        setBitrate('0.0')
        setFps(0)
        setLatency('0.00')
      }
    }, 1000)

    if (selectedVGPU && canvasRef.current) {
      const ws = new WebSocket(`ws://localhost:8000/ws/render/${selectedVGPU}?stress=${stressMode ? 'true' : 'false'}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        const base64Data = event.data
        if (base64Data === "PIL_MISSING") {
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            ctx.fillStyle = '#050505'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.font = '14px monospace'
            ctx.fillStyle = 'var(--red)'
            ctx.fillText('❌ ERROR: PIL (Pillow) library missing on host backend.', 40, 100)
            ctx.fillStyle = 'var(--text-secondary)'
            ctx.fillText('Please run: pip install pillow', 40, 130)
          }
          return
        }

        frameCount++
        bytesReceived += base64Data.length

        // Calculate real FPS based on time delta
        const now = performance.now()
        if (now - lastTime >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - lastTime)))
          frameCount = 0
          lastTime = now
        }

        const img = new Image()
        img.onload = () => {
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            
            // Draw nice glowing target identifier directly on canvas corner
            ctx.fillStyle = 'rgba(0,0,0,0.7)'
            ctx.fillRect(10, 10, 240, 32)
            ctx.strokeStyle = stressMode ? '#ef4444' : 'var(--accent)'
            ctx.lineWidth = 1
            ctx.strokeRect(10, 10, 240, 32)
            
            ctx.font = 'bold 9px JetBrains Mono, monospace'
            ctx.fillStyle = stressMode ? '#f87171' : 'var(--accent)'
            ctx.fillText(
              `TARGET: vGPU-${selectedVGPU.substring(0,8).toUpperCase()} | ${stressMode ? 'STRESS ACTIVE' : 'NOMINAL'}`, 
              18, 
              29
            )
          }
        }
        img.src = `data:image/jpeg;base64,${base64Data}`
      }

      return () => {
        ws.close()
        clearInterval(statsInterval)
      }
    } else {
      clearInterval(statsInterval)
    }
  }, [selectedVGPU, stressMode, computePct])

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--black)', minHeight: '100%' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Graphics Viewer</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Evaluate live 3D hardware-accelerated wireframe rendering benchmarks and video streaming telemetry under simulated stress.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Selector + Live Render Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Target selection & Stress Controls */}
          <div style={{ 
            background: 'var(--gray)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Monitor size={18} color="var(--accent)" />
                Select vGPU Target
              </h3>
              <select
                value={selectedVGPU || ''}
                onChange={(e) => {
                  setSelectedVGPU(e.target.value)
                  setStressMode(false) // Reset stress mode when target changes
                }}
                style={{ 
                  width: '100%', 
                  maxWidth: '320px',
                  padding: '0.6rem 0.75rem', 
                  background: '#000', 
                  border: '1px solid var(--border)', 
                  color: '#fff', 
                  outline: 'none', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">Select vGPU Target</option>
                {vGPUs?.map((vgpu) => (
                  <option key={vgpu.id} value={vgpu.id}>
                    vGPU-Node: vGPU-{vgpu.id.substring(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            {selectedVGPU && (
              <button
                onClick={() => setStressMode(!stressMode)}
                style={{
                  background: stressMode 
                    ? 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' 
                    : 'linear-gradient(135deg, var(--accent) 0%, #5ba000 100%)',
                  border: 'none',
                  color: stressMode ? '#fff' : '#000',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'transform 0.1s, filter 0.2s',
                  boxShadow: stressMode 
                    ? '0 4px 12px rgba(239, 68, 68, 0.2)' 
                    : '0 4px 12px rgba(118, 185, 0, 0.2)'
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                <AlertTriangle size={15} />
                {stressMode ? 'HALT CLUSTER STRESS TEST' : 'RUN MULTI-CORE STRESS TEST'}
              </button>
            )}
          </div>

          {/* Live Render Stream */}
          <div style={{ 
            background: 'var(--gray)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} color={stressMode ? '#ef4444' : 'var(--accent)'} />
              {stressMode ? 'Live Multi-Core Benchmark Matrix (8 Channels)' : 'Live Render Stream'}
            </h3>

            <div style={{ 
              background: '#020202', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              position: 'relative', 
              overflow: 'hidden',
              minHeight: '400px', 
              width: '100%', 
              margin: '0 auto' 
            }}>
              <canvas
                ref={canvasRef}
                width={720}
                height={400}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  opacity: selectedVGPU ? 1 : 0,
                  transition: 'opacity 0.3s'
                }}
              />
              {!selectedVGPU && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <Video size={36} color="var(--border)" />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Active Stream</div>
                  <div style={{ fontSize: '0.75rem' }}>Select an online vGPU container above to begin rendering benchmarks.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Rendering, Video & Node Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Rendering stats card */}
          <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <Activity size={16} color="var(--accent)" />
              3D Rendering Stats
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>API Engine:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Vulkan 1.3.2</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Raster Mode:</span>
                <span style={{ fontWeight: 600, color: stressMode ? '#ef4444' : 'var(--text-primary)' }}>
                  {stressMode ? 'Multi-Mesh Matrix (8 Channels)' : 'Wireframe sphere'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Polygons / sec:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedVGPU ? (stressMode ? '38.4M Triangles' : '4.8M Triangles') : '--'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Draw Latency:</span>
                <span style={{ fontWeight: 600, color: (stressMode && computePct < 40) ? '#ef4444' : 'var(--text-primary)' }}>
                  {selectedVGPU ? `${latency} ms` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Video Stream telemetry card */}
          <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <Video size={16} color="var(--accent)" />
              Video Stream Stats
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Resolution:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>720 x 400</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Frame Rate:</span>
                <span style={{ fontWeight: 600, color: (stressMode && computePct < 40) ? '#ef4444' : 'var(--accent)' }}>
                  {fps ? `${fps} FPS` : '--'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Stream Bitrate:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedVGPU ? `${bitrate} Mbps` : '0.0 Mbps'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Video Codec:</span>
                <span style={{ fontWeight: 600, color: 'var(--blue)' }}>Motion JPEG</span>
              </div>
            </div>
          </div>

          {/* vGPU utilization card */}
          <div style={{ background: 'var(--gray)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <Cpu size={16} color="var(--accent)" />
              vGPU Allocation Stats
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Node ID:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {selectedVGPU ? `vGPU-${selectedVGPU.substring(0,8)}` : '--'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>VRAM Allocated:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedVgpuInfo ? `${selectedVgpuInfo.vram_limit} MB` : '--'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Compute Share:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedVgpuInfo ? `${selectedVgpuInfo.compute_limit}%` : '--'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Render Load:</span>
                <span style={{ fontWeight: 600, color: stressMode ? '#ef4444' : 'var(--accent)' }}>
                  {selectedVGPU ? `${utilization}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default GraphicsViewer