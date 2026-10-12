import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useSharedMetrics } from '../contexts/MetricsContext'
import * as THREE from 'three'
import {
  Brain, Database, Cpu, Zap, Activity, Network, Droplet,
  Server, Layers, Bot, Search, Sparkles, BarChart3, Power, Gauge,
  Eye, RotateCcw, Play, Pause, ChevronRight, Info, CheckCircle2
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   PRECOMPUTED GRID DATA (Matches User's Reference Architecture)
   8 Columns × 18 Rows Matrix
   ═══════════════════════════════════════════════════════════════ */
const GRID_COLS = 8
const GRID_ROWS = 18
const CELL_W = 0.38
const CELL_H = 0.42

// Generate reproducible cell pattern matching the reference image
// Blue cells vs empty/white cells + orange dots
const MATRIX_CELLS = (() => {
  const cells = []
  // Specific pattern mimicking the reference image's dense blue blocks and white blocks
  const bluePattern = [
    [0, 1, 1, 1, 0, 1, 1, 0], // row 0
    [1, 1, 0, 0, 1, 1, 0, 1], // row 1
    [1, 1, 1, 1, 1, 0, 1, 1], // row 2
    [1, 1, 1, 1, 1, 1, 0, 0], // row 3
    [1, 1, 1, 1, 1, 1, 1, 1], // row 4
    [1, 1, 1, 1, 1, 1, 1, 1], // row 5
    [1, 1, 1, 1, 1, 1, 1, 0], // row 6
    [1, 1, 1, 1, 1, 0, 0, 1], // row 7
    [0, 1, 1, 1, 1, 1, 1, 1], // row 8
    [1, 1, 0, 0, 1, 1, 1, 1], // row 9
    [1, 1, 1, 1, 1, 1, 1, 1], // row 10
    [1, 1, 1, 1, 1, 1, 1, 1], // row 11
    [0, 0, 0, 1, 1, 1, 1, 1], // row 12
    [1, 1, 1, 0, 1, 1, 1, 1], // row 13
    [1, 1, 1, 1, 1, 1, 1, 1], // row 14
    [1, 1, 0, 0, 0, 1, 1, 1], // row 15
    [1, 1, 1, 1, 1, 1, 1, 0], // row 16
    [0, 0, 1, 1, 1, 1, 1, 1], // row 17
  ]

  // Orange dots inside cells (exact locations from reference image)
  const dotCoords = [
    [0, 2], [0, 5], [1, 1], [1, 3], [1, 7],
    [2, 0], [2, 4], [2, 7], [3, 2],
    [4, 0], [4, 6], [5, 3], [6, 1], [6, 4],
    [7, 0], [7, 5], [8, 2], [8, 7],
    [9, 4], [10, 1], [10, 6],
    [11, 3], [11, 7], [12, 5],
    [13, 0], [13, 4], [14, 2], [14, 6],
    [15, 1], [15, 7], [16, 3], [17, 0], [17, 6]
  ]

  const dotSet = new Set(dotCoords.map(([r, c]) => `${r},${c}`))

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const isBlue = bluePattern[r]?.[c] === 1
      const hasDot = dotSet.has(`${r},${c}`)
      cells.push({
        row: r,
        col: c,
        isBlue,
        hasDot,
        id: `cell_${r}_${c}`,
      })
    }
  }
  return { cells, dotCoords }
})()

// Middle column: 22 colored circular nodes
const MIDDLE_NODES = (() => {
  const count = 22
  const colors = [
    '#ef4444', '#f87171', '#ef4444', '#10b981', '#ef4444',
    '#06b6d4', '#06b6d4', '#f43f5e', '#ef4444', '#f87171',
    '#ef4444', '#10b981', '#06b6d4', '#06b6d4', '#f43f5e',
    '#10b981', '#10b981', '#06b6d4', '#06b6d4', '#f87171',
    '#ef4444', '#10b981'
  ]
  const nodes = []
  for (let i = 0; i < count; i++) {
    const y = ((count - 1) / 2 - i) * 0.38
    nodes.push({
      id: `mid_${i}`,
      index: i,
      y,
      color: colors[i % colors.length]
    })
  }
  return nodes
})()

// Right Multi-Layer Dense Network (Layers 0 to 4 tapering rightward)
const DENSE_LAYERS = (() => {
  const layerConfigs = [
    { x: 0.8, count: 24, span: 3.8, isRing: true, label: 'L0: Token Input' },
    { x: 2.4, count: 22, span: 3.4, isRing: false, label: 'L1: Self-Attn' },
    { x: 4.0, count: 20, span: 3.0, isRing: false, label: 'L2: Cross-Attn' },
    { x: 5.6, count: 16, span: 2.5, isRing: false, label: 'L3: Feed-Forward' },
    { x: 7.2, count: 10, span: 1.8, isRing: false, label: 'L4: Output Logits' }
  ]

  const layers = layerConfigs.map((cfg, lIdx) => {
    const nodes = []
    for (let i = 0; i < cfg.count; i++) {
      const y = ((cfg.count - 1) / 2 - i) * (cfg.span * 2 / (cfg.count - 1 || 1)) - (cfg.span)
      nodes.push({
        id: `dense_${lIdx}_${i}`,
        layerIndex: lIdx,
        index: i,
        x: cfg.x,
        y: -y, // top to bottom
        isRing: cfg.isRing
      })
    }
    return { ...cfg, nodes }
  })

  return layers
})()

/* ═══════════════════════════════════════════════════════════════
   1. LEFT FEATURE / RAG MATRIX (2D Grid with Orange Dots)
   ═══════════════════════════════════════════════════════════════ */
function FeatureMatrixGrid({ onHoverNode }) {
  const matrixCenterX = -5.4
  const matrixCenterY = 0

  // Wireframe lines for the grid
  const gridLinesGeo = useMemo(() => {
    const points = []
    const totalW = GRID_COLS * CELL_W
    const totalH = GRID_ROWS * CELL_H
    const startX = matrixCenterX - totalW / 2
    const startY = matrixCenterY + totalH / 2

    // Horizontal lines
    for (let r = 0; r <= GRID_ROWS; r++) {
      const y = startY - r * CELL_H
      points.push(new THREE.Vector3(startX, y, 0))
      points.push(new THREE.Vector3(startX + totalW, y, 0))
    }
    // Vertical lines
    for (let c = 0; c <= GRID_COLS; c++) {
      const x = startX + c * CELL_W
      points.push(new THREE.Vector3(x, startY, 0))
      points.push(new THREE.Vector3(x, startY - totalH, 0))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [matrixCenterX, matrixCenterY])

  // Intra-grid lines connecting orange dots together
  const intraGridLinesGeo = useMemo(() => {
    const points = []
    const totalW = GRID_COLS * CELL_W
    const totalH = GRID_ROWS * CELL_H
    const startX = matrixCenterX - totalW / 2
    const startY = matrixCenterY + totalH / 2

    const coords = MATRIX_CELLS.dotCoords
    for (let i = 0; i < coords.length - 1; i += 2) {
      const [r1, c1] = coords[i]
      const [r2, c2] = coords[i + 1]
      const x1 = startX + c1 * CELL_W + CELL_W / 2
      const y1 = startY - r1 * CELL_H - CELL_H / 2
      const x2 = startX + c2 * CELL_W + CELL_W / 2
      const y2 = startY - r2 * CELL_H - CELL_H / 2
      points.push(new THREE.Vector3(x1, y1, 0.02))
      points.push(new THREE.Vector3(x2, y2, 0.02))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [matrixCenterX, matrixCenterY])

  const totalW = GRID_COLS * CELL_W
  const totalH = GRID_ROWS * CELL_H
  const startX = matrixCenterX - totalW / 2
  const startY = matrixCenterY + totalH / 2

  return (
    <group>
      {/* Cells Background */}
      {MATRIX_CELLS.cells.map((cell) => {
        const x = startX + cell.col * CELL_W + CELL_W / 2
        const y = startY - cell.row * CELL_H - CELL_H / 2
        const color = cell.isBlue ? '#2b5c8f' : '#ffffff'
        const opacity = cell.isBlue ? 0.92 : 0.85

        return (
          <group key={cell.id} position={[x, y, 0]}>
            <mesh>
              <planeGeometry args={[CELL_W - 0.015, CELL_H - 0.015]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>

            {/* Orange Dot inside cell */}
            {cell.hasDot && (
              <mesh
                position={[0, 0, 0.04]}
                onPointerOver={() => onHoverNode({
                  type: 'matrix_dot',
                  title: `RAG Chunk [${cell.row}, ${cell.col}]`,
                  subtitle: cell.row < 6 ? 'core/chatbot/indexer.py' : cell.row < 12 ? 'core/chatbot/rag_engine.py' : 'core/vgpu_driver.py',
                  desc: 'Active token vector extracted from codebase AST. Cosine relevance: 0.94'
                })}
                onPointerOut={() => onHoverNode(null)}
              >
                <circleGeometry args={[0.075, 16]} />
                <meshBasicMaterial color="#ea580c" />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Grid Border Lines */}
      <lineSegments geometry={gridLinesGeo}>
        <lineBasicMaterial color="#cbd5e1" transparent opacity={0.8} />
      </lineSegments>

      {/* Intra-Grid Connecting Lines */}
      <lineSegments geometry={intraGridLinesGeo}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.65} />
      </lineSegments>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════
   2. PROJECTION LINES (From Orange Dots to Middle Column)
   ═══════════════════════════════════════════════════════════════ */
function GridToMiddleProjections() {
  const matrixCenterX = -5.4
  const matrixCenterY = 0
  const totalW = GRID_COLS * CELL_W
  const totalH = GRID_ROWS * CELL_H
  const startX = matrixCenterX - totalW / 2
  const startY = matrixCenterY + totalH / 2
  const midColX = -1.2

  const { projectionGeo, linePairs } = useMemo(() => {
    const points = []
    const pairs = []
    const coords = MATRIX_CELLS.dotCoords

    coords.forEach(([r, c], idx) => {
      const x1 = startX + c * CELL_W + CELL_W / 2
      const y1 = startY - r * CELL_H - CELL_H / 2
      // Connect to one or two nodes in middle column
      const targetMidIdx = (idx * 2) % MIDDLE_NODES.length
      const targetNode = MIDDLE_NODES[targetMidIdx]
      const y2 = targetNode.y

      points.push(new THREE.Vector3(x1, y1, 0.02))
      points.push(new THREE.Vector3(midColX, y2, 0.02))
      pairs.push({
        start: [x1, y1, 0.02],
        end: [midColX, y2, 0.02],
        color: '#38bdf8'
      })

      // Sparse secondary line like in reference image
      if (idx % 3 === 0) {
        const secMidIdx = (targetMidIdx + 5) % MIDDLE_NODES.length
        const secNode = MIDDLE_NODES[secMidIdx]
        points.push(new THREE.Vector3(x1, y1, 0.02))
        points.push(new THREE.Vector3(midColX, secNode.y, 0.02))
        pairs.push({
          start: [x1, y1, 0.02],
          end: [midColX, secNode.y, 0.02],
          color: '#60a5fa'
        })
      }
    })

    return {
      projectionGeo: new THREE.BufferGeometry().setFromPoints(points),
      linePairs: pairs
    }
  }, [startX, startY, midColX])

  return (
    <group>
      <lineSegments geometry={projectionGeo}>
        <lineBasicMaterial color="#5b8fb9" transparent opacity={0.65} />
      </lineSegments>
      {/* Animated Pulses on projection lines */}
      <AnimatedParticles lines={linePairs} sampleRate={2} speed={1.2} size={0.035} color="#38bdf8" />
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════
   3. MIDDLE COLUMN OF COLORED NODES
   ═══════════════════════════════════════════════════════════════ */
function MiddleColumnNodes({ onHoverNode }) {
  const midColX = -1.2

  return (
    <group>
      {MIDDLE_NODES.map((node) => (
        <group key={node.id} position={[midColX, node.y, 0.05]}>
          {/* Subtle outer glow */}
          <mesh>
            <circleGeometry args={[0.09, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.25} />
          </mesh>
          {/* Solid core dot */}
          <mesh
            onPointerOver={() => onHoverNode({
              type: 'router_node',
              title: `Attention Bottleneck Head #${node.index + 1}`,
              subtitle: 'Multi-Head Query Projection',
              desc: `Filters context vectors into latent tokens. Color channel: ${node.color}. Active weight: ${(0.75 + (node.index % 5) * 0.05).toFixed(2)}`
            })}
            onPointerOut={() => onHoverNode(null)}
          >
            <circleGeometry args={[0.065, 16]} />
            <meshBasicMaterial color={node.color} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════
   4. RIGHT DENSE MULTI-LAYER NEURAL NETWORK
   Dense Pink & Light-Blue Synapses Between Layers
   ═══════════════════════════════════════════════════════════════ */
function DenseNeuralNetwork({ onHoverNode }) {
  // Precompute dense mesh lines connecting layer 0 -> 1 -> 2 -> 3 -> 4
  const { pinkGeo, cyanGeo, densePairs } = useMemo(() => {
    const pinkPoints = []
    const cyanPoints = []
    const pairs = []

    for (let l = 0; l < DENSE_LAYERS.length - 1; l++) {
      const srcLayer = DENSE_LAYERS[l]
      const dstLayer = DENSE_LAYERS[l + 1]

      // Dense fan-out between all or subset of neurons
      srcLayer.nodes.forEach((srcNode, sIdx) => {
        dstLayer.nodes.forEach((dstNode, dIdx) => {
          // Keep density high while optimizing draw calls
          const isPink = (sIdx + dIdx) % 2 === 0
          const p1 = new THREE.Vector3(srcNode.x, srcNode.y, 0.02)
          const p2 = new THREE.Vector3(dstNode.x, dstNode.y, 0.02)

          if (isPink) {
            pinkPoints.push(p1, p2)
          } else {
            cyanPoints.push(p1, p2)
          }

          if ((sIdx * dstLayer.nodes.length + dIdx) % 12 === 0) {
            pairs.push({
              start: [srcNode.x, srcNode.y, 0.02],
              end: [dstNode.x, dstNode.y, 0.02],
              color: isPink ? '#f43f5e' : '#38bdf8'
            })
          }
        })
      })
    }

    return {
      pinkGeo: new THREE.BufferGeometry().setFromPoints(pinkPoints),
      cyanGeo: new THREE.BufferGeometry().setFromPoints(cyanPoints),
      densePairs: pairs
    }
  }, [])

  return (
    <group>
      {/* Dense Pink Lines */}
      <lineSegments geometry={pinkGeo}>
        <lineBasicMaterial color="#ec4899" transparent opacity={0.28} />
      </lineSegments>

      {/* Dense Cyan / Blue Lines */}
      <lineSegments geometry={cyanGeo}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.25} />
      </lineSegments>

      {/* Animated Synapse Signals */}
      <AnimatedParticles lines={densePairs} sampleRate={1} speed={1.4} size={0.03} color="#f472b6" />

      {/* Neuron Nodes for each layer */}
      {DENSE_LAYERS.map((layer) => (
        <group key={layer.label}>
          {layer.nodes.map((node) => {
            if (node.isRing) {
              // L0 has ring-style circles (white rim, blue core) matching reference image
              return (
                <group key={node.id} position={[node.x, node.y, 0.04]}>
                  {/* Outer circle */}
                  <mesh>
                    <ringGeometry args={[0.048, 0.068, 16]} />
                    <meshBasicMaterial color="#475569" />
                  </mesh>
                  {/* Inner fill */}
                  <mesh
                    onPointerOver={() => onHoverNode({
                      type: 'dense_node',
                      title: `${layer.label} [Node ${node.index + 1}]`,
                      subtitle: 'Input Encoder Projection',
                      desc: 'Latent feature embedding passed into deep Transformer layers.'
                    })}
                    onPointerOut={() => onHoverNode(null)}
                  >
                    <circleGeometry args={[0.045, 16]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              )
            } else {
              // Layers 1 to 4 have solid / shaded neuron points
              const isOutput = node.layerIndex === DENSE_LAYERS.length - 1
              const color = isOutput ? '#60a5fa' : '#94a3b8'
              return (
                <mesh
                  key={node.id}
                  position={[node.x, node.y, 0.04]}
                  onPointerOver={() => onHoverNode({
                    type: 'dense_node',
                    title: `${layer.label} [Node ${node.index + 1}]`,
                    subtitle: isOutput ? 'Final Logit Probability' : 'Hidden Feed-Forward State',
                    desc: isOutput
                      ? 'Softmax probability token distribution ready for sampling.'
                      : 'Non-linear GELU activation mapping across MLP tensor dimensions.'
                  })}
                  onPointerOut={() => onHoverNode(null)}
                >
                  <circleGeometry args={[0.045, 16]} />
                  <meshBasicMaterial color={color} />
                </mesh>
              )
            }
          })}
        </group>
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════
   5. ANIMATED DATA PARTICLES (Flowing from Left to Right)
   ═══════════════════════════════════════════════════════════════ */
function AnimatedParticles({ lines, sampleRate = 1, speed = 1.0, size = 0.03, color = '#38bdf8' }) {
  const count = Math.min(lines.length, 120)
  const sampledLines = useMemo(() => {
    return lines.filter((_, i) => i % sampleRate === 0).slice(0, count)
  }, [lines, sampleRate, count])

  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const progresses = useRef(sampledLines.map((_, i) => (i * 0.37) % 1))

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const inst = meshRef.current

    sampledLines.forEach((line, i) => {
      progresses.current[i] = (progresses.current[i] + delta * speed * 0.45) % 1
      const t = progresses.current[i]
      const x = line.start[0] + (line.end[0] - line.start[0]) * t
      const y = line.start[1] + (line.end[1] - line.start[1]) * t
      const z = line.start[2] + (line.end[2] - line.start[2]) * t + 0.02

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(1.0 + 0.3 * Math.sin(t * Math.PI))
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    })
    inst.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, sampledLines.length]}>
      <circleGeometry args={[size, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </instancedMesh>
  )
}

/* ═══════════════════════════════════════════════════════════════
   6. CAMERA CONTROLLER (Schematic vs 3D Perspective)
   ═══════════════════════════════════════════════════════════════ */
function CameraRig({ viewMode, autoRotate }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (viewMode === '2d') {
      // Direct front-on view matching reference image exactly
      camera.position.set(0.6, 0, 11)
      camera.lookAt(0.6, 0, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0.6, 0, 0)
        controlsRef.current.reset()
      }
    } else {
      // 3D perspective angle
      camera.position.set(1.5, 1.2, 11.5)
      camera.lookAt(0.6, 0, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0.6, 0, 0)
      }
    }
  }, [viewMode, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={3}
      maxDistance={22}
      autoRotate={autoRotate}
      autoRotateSpeed={0.4}
      target={[0.6, 0, 0]}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   7. FORMULAS PANEL (Power & Water Calculations from Project)
   ═══════════════════════════════════════════════════════════════ */
function FormulasPanel({ metrics, isOpen, onClose }) {
  const data = metrics

  // Live Metrics Calculations
  const totalPowerKW = ((data?.physical_gpus?.reduce((acc, g) => acc + g.power_draw, 0) || 120) + 180) / 1000.0
  const baseWue = 0.28
  const currentWUE = baseWue + (data?.physical_gpus?.[0]?.temperature > 70 ? 0.05 : 0)
  const waterConsumptionLPerHour = totalPowerKW * currentWUE
  const chillerFlowRateLPerMin = totalPowerKW * 1.5 * 1.2
  const evaporativeLossLPerHour = waterConsumptionLPerHour * 0.95
  const waterRecirculatedLPerHour = chillerFlowRateLPerMin * 60 - evaporativeLossLPerHour

  // Chinchilla Scaling
  const modelSizeB = 70, datasetSizeB = 300, targetDays = 14
  const gpuTflops = 350, gpuPowerW = 700, mfuEfficiency = 0.30
  const totalFlopsRequired = 6 * modelSizeB * 1e9 * datasetSizeB * 1e9
  const secondsInTargetDays = targetDays * 24 * 3600
  const targetTflopsNeeded = totalFlopsRequired / (secondsInTargetDays * 1e12)
  const totalGpusNeeded = Math.ceil(targetTflopsNeeded / (gpuTflops * mfuEfficiency))
  const totalServersNeeded = Math.ceil(totalGpusNeeded / 8)
  const actualGpusAllocated = totalServersNeeded * 8
  const estimatedClusterPowerKW = (actualGpusAllocated * gpuPowerW + totalServersNeeded * 450) / 1000.0
  const estimatedTotalMWh = (estimatedClusterPowerKW * targetDays * 24) / 1000.0
  const estimatedTotalWaterLiters = (estimatedTotalMWh * 1000) * baseWue

  // Amdahl's Law
  const parallelFraction = 0.988
  const getSpeedup = (n) => {
    const cp = 0.0012 * Math.pow(n, 1.25)
    const s = 1 / ((1 - parallelFraction) + (parallelFraction / n) + cp)
    return { nodes: n, speedup: Math.min(n, s), eff: Math.max(0.1, Math.min(1.0, s / n)) }
  }

  if (!isOpen) return null

  const fBox = {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: '10px',
    padding: '10px 12px',
    marginBottom: '10px'
  }
  const fTitle = {
    fontSize: '0.64rem',
    fontWeight: 800,
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  }
  const codeStyle = {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '0.58rem',
    color: '#e2e8f0',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-wrap'
  }

  return (
    <div style={{
      position: 'absolute',
      right: '16px',
      top: '70px',
      bottom: '16px',
      width: '340px',
      overflowY: 'auto',
      background: 'linear-gradient(135deg, rgba(10, 15, 30, 0.95), rgba(15, 23, 42, 0.92))',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '14px',
      padding: '16px',
      zIndex: 20,
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      scrollbarWidth: 'thin',
      scrollbarColor: '#0284c7 transparent'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={14} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff' }}>Power & Water Formulas</div>
            <div style={{ fontSize: '0.52rem', color: '#94a3b8' }}>Live Data Center Thermodynamic Metrics</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
        >
          ✕
        </button>
      </div>

      {/* 1. Facility Power */}
      <div style={fBox}>
        <div style={fTitle}><Zap size={11} color="#f59e0b" /> 1. Total Facility Power</div>
        <pre style={codeStyle}>{`P_total = (Σ GPU_power + P_infra) / 1000\nP_total = (${data?.physical_gpus?.reduce((a, g) => a + g.power_draw, 0)?.toFixed(0) || '120'}W + 180W) / 1000`}</pre>
        <div style={{ ...codeStyle, color: '#76b900', fontWeight: 800, marginTop: '4px' }}>
          = {totalPowerKW.toFixed(3)} kW
        </div>
      </div>

      {/* 2. Water Usage Effectiveness & Consumption */}
      <div style={{ ...fBox, borderColor: 'rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.05)' }}>
        <div style={{ ...fTitle, color: '#22d3ee' }}><Droplet size={11} color="#22d3ee" /> 2. Water Consumption (WUE)</div>
        <pre style={codeStyle}>{`WUE = Water_Liters / IT_Energy_kWh\nOptimized Closed-Loop WUE = ${baseWue} L/kWh`}</pre>
        <pre style={codeStyle}>{`W = P_total × WUE = ${totalPowerKW.toFixed(3)} × ${currentWUE.toFixed(3)}`}</pre>
        <div style={{ ...codeStyle, color: '#22d3ee', fontWeight: 800, marginTop: '4px' }}>
          = {waterConsumptionLPerHour.toFixed(3)} L/hr
        </div>
        <div style={{ fontSize: '0.52rem', color: '#64748b', marginTop: '4px' }}>
          Evaporative: {evaporativeLossLPerHour.toFixed(3)} L/hr | Recirculated: {waterRecirculatedLPerHour.toFixed(1)} L/hr
        </div>
      </div>

      {/* 3. Chiller Flow Rate */}
      <div style={{ ...fBox, borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
        <div style={{ ...fTitle, color: '#34d399' }}><Gauge size={11} color="#34d399" /> 3. Chiller Coolant Flow</div>
        <pre style={codeStyle}>{`Q = P_total × 1.5 × 1.2 (L/min)`}</pre>
        <div style={{ ...codeStyle, color: '#34d399', fontWeight: 800, marginTop: '4px' }}>
          = {chillerFlowRateLPerMin.toFixed(2)} L/min ({ (chillerFlowRateLPerMin * 60).toFixed(0) } L/hr)
        </div>
      </div>

      {/* 4. Training Compute (Chinchilla) */}
      <div style={fBox}>
        <div style={fTitle}><Cpu size={11} color="#a855f7" /> 4. Chinchilla Scaling Law</div>
        <pre style={codeStyle}>{`C = 6 × N × D\nC = 6 × ${modelSizeB}B × ${datasetSizeB}B = ${(totalFlopsRequired / 1e21).toFixed(1)} ZFLOPs`}</pre>
        <pre style={codeStyle}>{`GPUs = C / (T × TFLOPS × MFU)\n     = ${totalGpusNeeded} GPUs (${totalServersNeeded} srv × 8)`}</pre>
        <div style={{ ...codeStyle, color: '#a855f7', fontWeight: 800, marginTop: '4px' }}>
          Cluster Power = {estimatedClusterPowerKW.toFixed(1)} kW ({estimatedTotalMWh.toFixed(1)} MWh)
        </div>
        <div style={{ fontSize: '0.52rem', color: '#94a3b8', marginTop: '2px' }}>
          Training Water: {estimatedTotalWaterLiters.toFixed(0)} L ({(estimatedTotalWaterLiters / 3785.41).toFixed(0)} gal)
        </div>
      </div>

      {/* 5. Amdahl's Law */}
      <div style={{ ...fBox, borderColor: 'rgba(249, 115, 22, 0.3)', background: 'rgba(249, 115, 22, 0.05)' }}>
        <div style={{ ...fTitle, color: '#fb923c' }}><Activity size={11} color="#fb923c" /> 5. Amdahl's Law Speedup</div>
        <pre style={codeStyle}>{`S(n) = 1 / ((1-p) + p/n + 0.0012×n^1.25)\nParallel Fraction p = ${parallelFraction}`}</pre>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
          {[1, 2, 4, 8, 16, 32, 64].map(n => {
            const r = getSpeedup(n)
            return (
              <div key={n} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '2px 5px', fontSize: '0.5rem', color: '#fb923c', fontFamily: 'monospace' }}>
                {n}N→{r.speedup.toFixed(1)}×
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT EXPORT
   ═══════════════════════════════════════════════════════════════ */
export default function VirtualizationTopology() {
  const { metrics: wsMetrics } = useSharedMetrics()
  const data = wsMetrics
  const [hoveredNode, setHoveredNode] = useState(null)
  const [viewMode, setViewMode] = useState('2d') // '2d' (Schematic Blueprint) vs '3d'
  const [autoRotate, setAutoRotate] = useState(false)
  const [showFormulas, setShowFormulas] = useState(true)

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#ffffff', // Clean crisp background matching reference diagram
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* ─── TOP BAR HUD ─── */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 15,
        pointerEvents: 'none'
      }}>
        {/* Title and Pipeline Status */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            padding: '8px 16px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Brain size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                AI NEURAL ARCHITECTURE
              </div>
              <div style={{ fontSize: '0.55rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                RAG Embeddings ⇄ Attention Router ⇄ Dense Transformer MLP
              </div>
            </div>
          </div>

          {/* Live Telemetry Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.55rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Live Inference: Active (1,840 tok/s)
            </div>
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.55rem', color: '#0369a1', fontWeight: 700 }}>
              RAG Cosine Sim: 0.942
            </div>
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '0.55rem', color: '#b45309', fontWeight: 700 }}>
              P_total: {(((data?.physical_gpus?.reduce((a, g) => a + g.power_draw, 0) || 120) + 180) / 1000).toFixed(3)} kW
            </div>
          </div>
        </div>

        {/* View Controls & Toggles */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 2D vs 3D Mode */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '3px',
            display: 'flex',
            gap: '3px'
          }}>
            <button
              onClick={() => { setViewMode('2d'); setAutoRotate(false) }}
              style={{
                background: viewMode === '2d' ? '#0284c7' : 'transparent',
                color: viewMode === '2d' ? '#fff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.58rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eye size={11} /> Schematic View
            </button>
            <button
              onClick={() => setViewMode('3d')}
              style={{
                background: viewMode === '3d' ? '#0284c7' : 'transparent',
                color: viewMode === '3d' ? '#fff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.58rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={11} /> 3D Spatial
            </button>
          </div>

          {/* Auto Rotate (for 3D mode) */}
          {viewMode === '3d' && (
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                background: autoRotate ? '#10b981' : '#f8fafc',
                color: autoRotate ? '#fff' : '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.58rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {autoRotate ? <Pause size={11} /> : <Play size={11} />} Orbit
            </button>
          )}

          {/* Formulas Panel Toggle */}
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            style={{
              background: showFormulas ? '#0f172a' : '#f8fafc',
              color: showFormulas ? '#38bdf8' : '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '5px 12px',
              fontSize: '0.58rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            <BarChart3 size={12} />
            {showFormulas ? 'Hide Formulas' : 'Show Formulas'}
          </button>
        </div>
      </div>

      {/* ─── 3D / 2.5D THREE.JS CANVAS ─── */}
      <Canvas
        camera={{ position: [0.6, 0, 11], fov: 48, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#ffffff', 1)
        }}
      >
        <Suspense fallback={null}>
          <CameraRig viewMode={viewMode} autoRotate={autoRotate} />

          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 7]} intensity={0.6} />

          {/* 1. Left Feature Matrix */}
          <FeatureMatrixGrid onHoverNode={setHoveredNode} />

          {/* 2. Projection Lines (Grid to Middle) */}
          <GridToMiddleProjections />

          {/* 3. Middle Column of Colored Nodes */}
          <MiddleColumnNodes onHoverNode={setHoveredNode} />

          {/* 4. Right Dense Neural Network with Pink & Blue Synapses */}
          <DenseNeuralNetwork onHoverNode={setHoveredNode} />
        </Suspense>
      </Canvas>

      {/* ─── BOTTOM STAGE LABELS (Directly Beneath Architecture Stages) ─── */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {/* Architecture Stage Explainer */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '10px 16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          pointerEvents: 'auto'
        }}>
          <div>
            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage 1: Input Matrix</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a' }}>RAG Codebase Feature Grid</div>
            <div style={{ fontSize: '0.5rem', color: '#64748b' }}>indexer.py · chunker.py (AST vectors)</div>
          </div>
          <ChevronRight size={14} color="#94a3b8" />
          <div>
            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage 2: Router</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a' }}>Attention Bottleneck</div>
            <div style={{ fontSize: '0.5rem', color: '#64748b' }}>Multi-head query alignment & latents</div>
          </div>
          <ChevronRight size={14} color="#94a3b8" />
          <div>
            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage 3: Deep Model</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a' }}>Transformer MLP Layers</div>
            <div style={{ fontSize: '0.5rem', color: '#64748b' }}>Dense Pink & Cyan Synapse Inference</div>
          </div>
          <ChevronRight size={14} color="#94a3b8" />
          <div>
            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage 4: Output</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a' }}>Softmax Token Logits</div>
            <div style={{ fontSize: '0.5rem', color: '#64748b' }}>Generated streaming response</div>
          </div>
        </div>

        {/* Live Node Hover Tooltip Card */}
        {hoveredNode && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            maxWidth: '320px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            color: '#fff',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {hoveredNode.subtitle}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc', margin: '2px 0 4px 0' }}>
              {hoveredNode.title}
            </div>
            <div style={{ fontSize: '0.58rem', color: '#94a3b8', lineHeight: '1.4' }}>
              {hoveredNode.desc}
            </div>
          </div>
        )}
      </div>

      {/* ─── DOCKABLE FORMULAS PANEL ─── */}
      <FormulasPanel
        metrics={data}
        isOpen={showFormulas}
        onClose={() => setShowFormulas(false)}
      />
    </div>
  )
}
