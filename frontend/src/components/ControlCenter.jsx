import React, { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html, Environment, Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import {
  Server, Activity, Cpu, Database, Zap, Thermometer,
  Play, Square, Send, Monitor, Shield, AlertTriangle,
  CheckCircle, Settings, Layers, RefreshCw, Plus, X,
  ChevronRight, Gauge, Power, Fan, HardDrive,
  Battery, Droplet, TriangleAlert, Cable, Fuel, Wifi,
  Cloud, Sunrise, Eye, EyeOff, Flame, ArrowDown, ArrowUp, Sun, Moon
} from 'lucide-react'

/* ═══════════════════ MEMOIZED COLORS ═══════════════════ */
const COLORS = {
  gpuPink: new THREE.Color('#e11d73'),
  netBlue: new THREE.Color('#2563eb'),
  purple: new THREE.Color('#7c3aed'),
  amber: new THREE.Color('#f59e0b'),
  green: new THREE.Color('#22c55e'),
  cyan: new THREE.Color('#06b6d4'),
  coolBlue: new THREE.Color('#3b82f6'),
  red: new THREE.Color('#ef4444'),
  yellow: new THREE.Color('#eab308'),
  orange: new THREE.Color('#f97316'),
  nvGreen: new THREE.Color('#76b900'),
}

/* ─────────────────── ENCLOSED SERVER ROOM SHELL ─────────────────── */
function BuildingShell({ isDarkMode }) {
  const darkWallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: isDarkMode ? '#0a0d14' : '#d8dce2', metalness: isDarkMode ? 0.9 : 0.3, roughness: 0.3, side: THREE.DoubleSide,
  }), [isDarkMode])
  const whiteGlassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff', transparent: true, opacity: isDarkMode ? 0.16 : 0.25, metalness: 0.1, roughness: 0.05, side: THREE.DoubleSide,
  }), [isDarkMode])

  return (
    <group>
      {/* Back wall — solid room wall */}
      <mesh position={[0, 3.8, -12.05]} material={darkWallMat}>
        <planeGeometry args={[36.2, 7.6]} />
      </mesh>
      {/* Left wall — solid room wall */}
      <mesh position={[-18.05, 3.8, 0]} rotation={[0, Math.PI / 2, 0]} material={darkWallMat}>
        <planeGeometry args={[24.2, 7.6]} />
      </mesh>
      {/* Right wall — wall with outdoor pipe penetrations */}
      <mesh position={[18.05, 3.8, 0]} rotation={[0, -Math.PI / 2, 0]} material={darkWallMat}>
        <planeGeometry args={[24.2, 7.6]} />
      </mesh>

      {/* Wall Pipe Penetration Sleeves / Collars where black outdoor pipes pass into server room */}
      {[-1.5, 1.5].map((z, i) => (
        <group key={`pen-${i}`}>
          <mesh position={[18.05, 5.8 + i * 0.6, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.5, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Room Perimeter Top LED Light Channel */}
      <mesh position={[0, 7.4, -11.95]}>
        <boxGeometry args={[36, 0.12, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={isDarkMode ? 0.9 : 0.4} />
      </mesh>
      <mesh position={[-17.95, 7.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[24, 0.12, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={isDarkMode ? 0.9 : 0.4} />
      </mesh>
      <mesh position={[17.95, 7.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[24, 0.12, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={isDarkMode ? 0.9 : 0.4} />
      </mesh>

      {/* Structural Steel Pillars with Embedded LED Strips */}
      {[[-18, -12], [-18, 0], [-18, 12], [18, -12], [18, 0], [18, 12], [-9, -12], [0, -12], [9, -12]].map(([x, z], i) => (
        <group key={`pillar-${i}`}>
          <mesh position={[x, 3.8, z]}>
            <boxGeometry args={[0.3, 7.6, 0.3]} />
            <meshStandardMaterial color={isDarkMode ? '#161a24' : '#94a3b8'} metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Vertical white LED strip on pillars */}
          <mesh position={[x + (x < 0 ? 0.16 : -0.16), 3.8, z + (z < 0 ? 0.16 : 0)]}>
            <boxGeometry args={[0.04, 7.4, 0.04]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={isDarkMode ? 0.7 : 0.3} />
          </mesh>
        </group>
      ))}

      {/* Zone Divider Partitions — Pure White Frosted Glass Walls */}
      <mesh position={[-9, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} material={whiteGlassMat}>
        <planeGeometry args={[24, 5]} />
      </mesh>
      <mesh position={[9, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} material={whiteGlassMat}>
        <planeGeometry args={[24, 5]} />
      </mesh>

      {/* Zone labels on room wall headers */}
      <Html position={[-9, 5.8, 0]} center distanceFactor={25} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '8px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>
          ⚡ POWER ROOM
        </div>
      </Html>
      <Html position={[9, 5.8, 0]} center distanceFactor={25} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '8px', fontWeight: 800, color: isDarkMode ? '#e2e8f0' : '#1e293b', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>
          ❄️ COOLING ROOM
        </div>
      </Html>
      <Html position={[0, 5.8, 4]} center distanceFactor={25} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '8px', fontWeight: 800, color: isDarkMode ? '#ffffff' : '#0f172a', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
          🖥️ MAIN IT HALL
        </div>
      </Html>
      <Html position={[7, 5.8, -11.5]} center distanceFactor={25} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '8px', fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#334155', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
          ⚛️ QUANTUM AI LAB
        </div>
      </Html>
    </group>
  )
}

/* ─────────────────── RAISED FLOOR WITH ZONE STRIPS ─────────────────── */
function DataCenterFloor() {
  const gridRef = useRef()
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 0.3) * 0.03
    }
  })
  return (
    <group>
      {/* Main raised floor — black industrial tiles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[36, 24]} />
        <meshStandardMaterial color="#0e1117" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Floor base / plinth */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[36, 0.5, 24]} />
        <meshStandardMaterial color="#06070a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── Zone color strips ── */}
      {/* IT Zone — green strips along hot/cold aisles */}
      {[-5, -3, 3, 5].map((x, i) => (
        <mesh key={`it-strip-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[0.06, 20]} />
          <meshBasicMaterial color="#76b900" transparent opacity={0.3} />
        </mesh>
      ))}
      {/* IT Zone floor accent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[16, 20]} />
        <meshBasicMaterial color="#76b900" transparent opacity={0.025} />
      </mesh>

      {/* Power Zone — orange strips */}
      {[-15, -11].map((x, i) => (
        <mesh key={`pwr-strip-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[0.06, 20]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-13, 0.015, 0]}>
        <planeGeometry args={[8, 20]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.02} />
      </mesh>

      {/* Cooling Zone — blue strips */}
      {[11, 15].map((x, i) => (
        <mesh key={`cool-strip-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[0.06, 20]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[13, 0.015, 0]}>
        <planeGeometry args={[8, 20]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.02} />
      </mesh>

      {/* Quantum Zone — purple/cyan floor accent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, 0.02, -7]}>
        <ringGeometry args={[1.5, 1.6, 32]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, 0.015, -7]}>
        <circleGeometry args={[3.5, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.03} />
      </mesh>

      {/* Hot aisle / cold aisle markers in IT zone */}
      <Html position={[0, 0.05, -9]} center distanceFactor={30} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '6px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em' }}>COLD AISLE</div>
      </Html>
      <Html position={[-4, 0.05, -9]} center distanceFactor={30} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '6px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.15em', opacity: 0.6 }}>HOT</div>
      </Html>
      <Html position={[4, 0.05, -9]} center distanceFactor={30} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '6px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.15em', opacity: 0.6 }}>HOT</div>
      </Html>
    </group>
  )
}

/* ─────────────────── CEILING I-BEAM STRUCTURE ─────────────────── */
function Ceiling() {
  return (
    <group position={[0, 7, 0]}>
      {/* Main I-beams running X direction */}
      {[-12, -6, 0, 6, 12].map((x, i) => (
        <group key={`beam-x-${i}`}>
          <mesh position={[x, 0, 0]}>
            <boxGeometry args={[0.2, 0.35, 24]} />
            <meshStandardMaterial color="#8a9099" metalness={0.6} roughness={0.25} />
          </mesh>
          {/* Top flange */}
          <mesh position={[x, 0.18, 0]}>
            <boxGeometry args={[0.4, 0.05, 24]} />
            <meshStandardMaterial color="#7a848d" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Bottom flange */}
          <mesh position={[x, -0.18, 0]}>
            <boxGeometry args={[0.4, 0.05, 24]} />
            <meshStandardMaterial color="#7a848d" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Cross beams running Z direction */}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <group key={`beam-z-${i}`}>
          <mesh position={[0, -0.05, z]}>
            <boxGeometry args={[36, 0.18, 0.18]} />
            <meshStandardMaterial color="#8a9099" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─────────────────── INDUSTRIAL OUTDOOR COOLING PLANT & PIPELINES ─────────────────── */
function IndustrialCoolingPipelines() {
  const blackPipeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a2029', metalness: 0.85, roughness: 0.22,
  }), [])
  const flangeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#334155', metalness: 0.9, roughness: 0.15,
  }), [])

  // Outdoor pipe runs: start at outdoor chiller plant (x=24), cross outdoor yard through right wall (x=18.05) into server room to x=-6
  const headerXStart = 24
  const headerXEnd = -6
  const headerY1 = 5.8
  const headerY2 = 6.4

  const serverDropPositions = [
    [-4.5, -4], [-4.5, 4],
    [-1.5, -4], [-1.5, 4],
    [-3.0, 0],
    [2.5, -2], [2.5, 3],
    [7.0, -7]
  ]

  return (
    <group>
      {/* ── 1. MAIN BLACK INDUSTRIAL PIPE HEADERS (OUTDOOR YARD THROUGH WALL TO INSIDE) ── */}
      {/* Supply Header Pipe */}
      <mesh position={[(headerXStart + headerXEnd) / 2, headerY1, -1.5]} rotation={[0, 0, Math.PI / 2]} material={blackPipeMat}>
        <cylinderGeometry args={[0.16, 0.16, headerXStart - headerXEnd, 32]} />
      </mesh>
      {/* Return Header Pipe */}
      <mesh position={[(headerXStart + headerXEnd) / 2, headerY2, 1.5]} rotation={[0, 0, Math.PI / 2]} material={blackPipeMat}>
        <cylinderGeometry args={[0.16, 0.16, headerXStart - headerXEnd, 32]} />
      </mesh>

      {/* Flange Coupling Rings */}
      {[-5, -2, 1, 4, 7, 10, 13, 17, 21].map((x, i) => (
        <group key={`flange-${i}`}>
          <mesh position={[x, headerY1, -1.5]} rotation={[0, 0, Math.PI / 2]} material={flangeMat}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
          </mesh>
          <mesh position={[x, headerY2, 1.5]} rotation={[0, 0, Math.PI / 2]} material={flangeMat}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
          </mesh>
        </group>
      ))}

      {/* Steel Support Trusses (indoor and outdoor yard) */}
      {[-4.5, -1.5, 2.5, 7.0, 11.5, 17.5, 22.5].map((x, i) => (
        <group key={`truss-${i}`}>
          <mesh position={[x, headerY2 + 0.2, 0]}>
            <boxGeometry args={[0.18, 0.18, 5.0]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, (headerY2 + 0.2) / 2, -2.5]}>
            <boxGeometry args={[0.15, headerY2 + 0.2, 0.15]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, (headerY2 + 0.2) / 2, 2.5]}>
            <boxGeometry args={[0.15, headerY2 + 0.2, 0.15]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* ── 2. VERTICAL DROPS TO SERVERS INSIDE THE ROOM ── */}
      {serverDropPositions.map(([x, z], i) => (
        <group key={`drop-${i}`}>
          <mesh position={[x, (headerY1 + 4.8) / 2, -1.5]} material={blackPipeMat}>
            <cylinderGeometry args={[0.09, 0.09, headerY1 - 4.8, 16]} />
          </mesh>
          <mesh position={[x, 4.8, (z + -1.5) / 2]} rotation={[Math.PI / 2, 0, 0]} material={blackPipeMat}>
            <cylinderGeometry args={[0.08, 0.08, Math.abs(z - (-1.5)), 16]} />
          </mesh>

          <mesh position={[x + 0.2, (headerY2 + 4.8) / 2, 1.5]} material={blackPipeMat}>
            <cylinderGeometry args={[0.09, 0.09, headerY2 - 4.8, 16]} />
          </mesh>
          <mesh position={[x + 0.2, 4.9, (z + 1.5) / 2]} rotation={[Math.PI / 2, 0, 0]} material={blackPipeMat}>
            <cylinderGeometry args={[0.08, 0.08, Math.abs(z - 1.5), 16]} />
          </mesh>
        </group>
      ))}

      {/* ── 3. RED INDUSTRIAL PUMP STATION & HEAT EXCHANGER CAGE (LOCATED OUTSIDE AT X=22.5) ── */}
      <group position={[22.5, 0, -8]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[3.6, 0.06, 3.6]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>
        {[[-1.7, -1.7], [-1.7, 1.7], [1.7, -1.7], [1.7, 1.7]].map(([cx, cz], ci) => (
          <mesh key={`cpost-${ci}`} position={[cx, 0.75, cz]}>
            <boxGeometry args={[0.08, 1.5, 0.08]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Red Centrifugal Pumps */}
        {[-0.9, 0.9].map((px, pi) => (
          <group key={`pump-${pi}`} position={[px, 0, -0.4]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.3, 0.35, 0.5, 16]} />
              <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.3, 16]} />
              <meshStandardMaterial color="#991b1b" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.4, 0.4]} rotation={[Math.PI / 2, 0, 0]} material={blackPipeMat}>
              <cylinderGeometry args={[0.1, 0.1, 0.5, 16]} />
            </mesh>
          </group>
        ))}

        {/* Plate Heat Exchangers */}
        <group position={[0, 0, 0.9]}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[2.4, 0.9, 0.6]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.4} />
          </mesh>
          {Array.from({ length: 12 }).map((_, ri) => (
            <mesh key={`rib-${ri}`} position={[-1.0 + ri * 0.18, 0.6, 0.31]}>
              <boxGeometry args={[0.04, 0.8, 0.02]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          ))}
        </group>

        {/* Vertical riser pipes to outdoor header */}
        <mesh position={[-0.9, 3.0, -0.4]} material={blackPipeMat}>
          <cylinderGeometry args={[0.12, 0.12, 4.8, 20]} />
        </mesh>
        <mesh position={[0.9, 3.0, -0.4]} material={blackPipeMat}>
          <cylinderGeometry args={[0.12, 0.12, 4.8, 20]} />
        </mesh>
      </group>

      {/* ── 4. PIPE CONNECTIONS TO OUTSIDE CHILLER PLANT (X=23) ── */}
      <mesh position={[23, 3.0, 0]} material={blackPipeMat}>
        <cylinderGeometry args={[0.14, 0.14, 4.8, 20]} />
      </mesh>
      <mesh position={[23, 5.8, -0.75]} rotation={[Math.PI / 2, 0, 0]} material={blackPipeMat}>
        <cylinderGeometry args={[0.14, 0.14, 1.5, 20]} />
      </mesh>

      {/* 3D Floating Labels */}
      <Html position={[22.5, 7.2, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '7px', fontWeight: 800, color: '#f8fafc',
          background: 'rgba(15, 23, 42, 0.92)', padding: '2px 8px', borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          🏭 OUTSIDE COOLING PLANT & CHILLED WATER PUMPS
        </div>
      </Html>
      <Html position={[18.05, 6.6, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '6px', fontWeight: 700, color: '#00e5ff',
          background: 'rgba(5, 10, 18, 0.88)', padding: '1px 5px', borderRadius: '3px',
          border: '1px solid rgba(0, 229, 255, 0.3)', whiteSpace: 'nowrap',
        }}>
          WALL PIPE PENETRATION SLEEVES
        </div>
      </Html>
    </group>
  )
}

/* ─────────────────── OVERHEAD BUSWAY & MANIFOLDS ─────────────────── */
function OverheadBusway() {
  return (
    <group>
      {/* Main high-capacity busway running down center of IT zone */}
      <mesh position={[0, 6.3, 0]}>
        <boxGeometry args={[0.8, 0.25, 20]} />
        <meshStandardMaterial color="#e0e4e8" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* Busway top cover */}
      <mesh position={[0, 6.45, 0]}>
        <boxGeometry args={[0.85, 0.06, 20]} />
        <meshStandardMaterial color="#d0d4d8" metalness={0.3} roughness={0.35} />
      </mesh>
      {/* Busway label */}
      <Html position={[0, 6.7, -8]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '7px', fontWeight: 800, color: '#6b7280', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: '2px' }}>
          HIGH-CAPACITY BUSWAY
        </div>
      </Html>

      {/* Power drop taps from busway to rack rows */}
      {[-4, -2, 0, 2, 4].map((z, i) => (
        <group key={`drop-${i}`}>
          <mesh position={[-3, 5.5, z]}>
            <boxGeometry args={[0.12, 1.6, 0.12]} />
            <meshStandardMaterial color="#c8ccd0" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[3, 5.5, z]}>
            <boxGeometry args={[0.12, 1.6, 0.12]} />
            <meshStandardMaterial color="#c8ccd0" metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Row liquid manifolds — pipe distribution at end of rack rows */}
      {[-3, 3].map((x, i) => (
        <group key={`manifold-${i}`}>
          {/* Main manifold pipe */}
          <mesh position={[x, 0.4, -8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1.5, 12]} />
            <meshStandardMaterial color="#2563eb" metalness={0.7} roughness={0.25} />
          </mesh>
          {/* Return manifold */}
          <mesh position={[x + 0.4, 0.4, -8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.5, 12]} />
            <meshStandardMaterial color="#fb7185" metalness={0.7} roughness={0.25} />
          </mesh>
          {/* Manifold label */}
          <Html position={[x + 0.2, 0.9, -8.5]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: '6px', fontWeight: 700, color: '#3b82f6', background: 'rgba(255,255,255,0.9)', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
              Row Liquid Manifold
            </div>
          </Html>
        </group>
      ))}

      {/* Coolant supply/return main pipes from cooling zone to IT zone */}
      <mesh position={[5, 0.5, 0]}>
        <boxGeometry args={[10, 0.15, 0.15]} />
        <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[5, 0.3, 0]}>
        <boxGeometry args={[10, 0.12, 0.12]} />
        <meshStandardMaterial color="#fb7185" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Pipe labels */}
      <Html position={[7, 0.8, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '5px', fontWeight: 700, color: '#3b82f6', background: 'rgba(255,255,255,0.85)', padding: '1px 4px', borderRadius: '2px' }}>
          SUPPLY 12°C
        </div>
      </Html>
      <Html position={[7, 0.1, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '5px', fontWeight: 700, color: '#fb7185', background: 'rgba(255,255,255,0.85)', padding: '1px 4px', borderRadius: '2px' }}>
          RETURN 28°C
        </div>
      </Html>
    </group>
  )
}

/* ─────────────────── DETAILED EQUIPMENT MODELS ─────────────────── */
function ServerRack({ position, rackData, isSelected, onClick, gpuTemp, gpuUtil, isStressed }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const ledsRef = useRef()

  const statusColor = useMemo(() => {
    if (rackData.type === 'crac' || rackData.type === 'chiller') return '#3b82f6'
    if (rackData.type === 'storage') return '#f59e0b'
    if (rackData.type === 'scheduler') return '#a855f7'
    if (rackData.type === 'quantum') return '#c084fc'
    if (rackData.type === 'ups') return '#f97316'
    if (rackData.type === 'generator') return '#dc2626'
    if (rackData.type === 'pdu') return '#eab308'
    if (rackData.type === 'battery') return '#06b6d4'
    if (isStressed) return '#ef4444'
    if (gpuTemp > 65) return '#f59e0b'
    return '#76b900'
  }, [rackData.type, isStressed, gpuTemp])

  const emissiveColor = useMemo(() => new THREE.Color(statusColor), [statusColor])

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.15
      glowRef.current.material.emissiveIntensity = isSelected ? 1.2 : pulse
    }
    if (ledsRef.current) {
      ledsRef.current.children.forEach((led, i) => {
        const flicker = Math.sin(state.clock.elapsedTime * (3 + i * 0.7) + i) * 0.5 + 0.5
        led.material.emissiveIntensity = isStressed ? 2.0 : (gpuUtil > 50 ? 1.5 * flicker : 0.5 * flicker)
      })
    }
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.03
    }
  })

  // Type-specific models
  if (rackData.type === 'gpu') return <GPURackModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} gpuTemp={gpuTemp} gpuUtil={gpuUtil} isStressed={isStressed} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} ledsRef={ledsRef} />
  if (rackData.type === 'quantum') return <QuantumComputerModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} />
  if (rackData.type === 'generator') return <GeneratorModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} />
  if (rackData.type === 'ups') return <UPSModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} />
  if (rackData.type === 'battery') return <BatteryModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} />
  if (rackData.type === 'chiller' || rackData.type === 'crac') return <CoolingModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} />
  if (rackData.type === 'pdu') return <PDUModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} />
  if (rackData.type === 'scheduler') return <SchedulerModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} ledsRef={ledsRef} />
  if (rackData.type === 'storage') return <StorageModel ref={meshRef} position={position} rackData={rackData} isSelected={isSelected} onClick={onClick} statusColor={statusColor} emissiveColor={emissiveColor} glowRef={glowRef} ledsRef={ledsRef} />

  return null
}

/* GPU Rack — modernized 42U style with perforated front door, cable arms, radiator fins */
const GPURackModel = React.forwardRef(({ position, rackData, isSelected, onClick, gpuTemp, gpuUtil, isStressed, statusColor, emissiveColor, glowRef, ledsRef }, ref) => {
  const fanRef = useRef()
  useFrame((state) => {
    if (fanRef.current) {
      fanRef.current.rotation.z = state.clock.elapsedTime * 8
    }
  })
  const rackH = 5.2, rackW = 1.0, rackD = 1.8
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      {/* Main chassis — dark gunmetal */}
      <RoundedBox args={[rackW, rackH, rackD]} radius={0.03} smoothness={4} position={[0, rackH / 2, 0]} castShadow>
        <meshStandardMaterial color={isSelected ? '#333840' : '#1e2228'} metalness={0.75} roughness={0.2} />
      </RoundedBox>

      {/* Perforated front door mesh pattern */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`perf-${i}`} position={[0, 0.4 + i * 0.34, rackD / 2 + 0.01]}>
          <planeGeometry args={[rackW - 0.08, 0.02]} />
          <meshStandardMaterial color="#3a4048" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Top section — gray compute units */}
      {[0, 1, 2].map(i => (
        <mesh key={`gray-${i}`} position={[0, 4.5 - i * 0.42, rackD / 2 + 0.015]}>
          <planeGeometry args={[rackW - 0.1, 0.35]} />
          <meshStandardMaterial color="#5a6270" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      {/* Mid section — GPU modules with NVIDIA green accent */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`gpu-${i}`} position={[0, 2.9 - i * 0.42, rackD / 2 + 0.015]}>
          <planeGeometry args={[rackW - 0.1, 0.35]} />
          <meshStandardMaterial color="#76b900" emissive={COLORS.nvGreen} emissiveIntensity={0.12} metalness={0.45} roughness={0.3} />
        </mesh>
      ))}
      {/* High-density 48-port Patch Panel & Electric Blue Patch Cords (Reference Image 2 Style) */}
      <group position={[0, 4.6, rackD / 2 + 0.02]}>
        <mesh>
          <planeGeometry args={[rackW - 0.12, 0.45]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Horizontal cable manager trough */}
        <mesh position={[0, -0.25, 0.03]}>
          <boxGeometry args={[rackW - 0.12, 0.08, 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* RJ45 Port Jacks & Curved Electric Blue Patch Cables */}
        {[-0.38, -0.26, -0.14, -0.02, 0.10, 0.22, 0.34].map((px, pi) => (
          <group key={`port-${pi}`} position={[px, 0.08, 0.01]}>
            <mesh>
              <boxGeometry args={[0.08, 0.06, 0.02]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Curved Electric Blue Patch Cord looping out into cable manager */}
            <mesh position={[0, -0.14, 0.07]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.28, 8]} />
              <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Green link status LED */}
            <mesh position={[0, 0.045, 0.01]}>
              <circleGeometry args={[0.012, 6]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Bottom section — blue networking */}
      {[0, 1].map(i => (
        <mesh key={`blue-${i}`} position={[0, 1.0 - i * 0.42, rackD / 2 + 0.015]}>
          <planeGeometry args={[rackW - 0.1, 0.35]} />
          <meshStandardMaterial color="#2563eb" emissive={COLORS.netBlue} emissiveIntensity={0.08} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}

      {/* Copper heat pipes with radiator fins on top */}
      {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
        <group key={`pipe-${i}`}>
          <mesh position={[x, rackH + 0.3, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.8, 8]} />
            <meshStandardMaterial color="#b87333" metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Radiator fin stack */}
          {[0, 1, 2, 3, 4].map((fi) => (
            <mesh key={`fin-${fi}`} position={[x, rackH + 0.6 + fi * 0.04, 0]}>
              <boxGeometry args={[0.12, 0.015, 0.25]} />
              <meshStandardMaterial color="#cd7f32" metalness={0.85} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Rear cable management arms */}
      {[1, 2, 3, 4].map(i => (
        <mesh key={`cable-arm-${i}`} position={[rackW / 2 + 0.12, i * 1.1, -rackD / 2 + 0.2]}>
          <boxGeometry args={[0.2, 0.06, 0.3]} />
          <meshStandardMaterial color="#333" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}

      {/* Status LED strip */}
      <group ref={ledsRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={`led-${i}`} position={[rackW / 2 - 0.06, 0.4 + i * 0.48, rackD / 2 + 0.02]}>
            <boxGeometry args={[0.03, 0.35, 0.015]} />
            <meshStandardMaterial color={statusColor} emissive={emissiveColor} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>

      {/* Front panel glow */}
      <mesh ref={glowRef} position={[0, rackH / 2, rackD / 2 + 0.018]}>
        <planeGeometry args={[rackW - 0.12, rackH - 0.3]} />
        <meshStandardMaterial color="#0a1520" emissive={emissiveColor} emissiveIntensity={0.15} metalness={0.9} roughness={0.1} transparent opacity={0.25} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.25, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}

      <pointLight position={[0, rackH / 2, rackD / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : (isStressed ? 1.5 : 0.4)} distance={3} decay={2} />

      {isSelected && (
        <Html position={[0, rackH + 1.4, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap',
            fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center',
            boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>
              {rackData.label || rackData.name}
            </div>
            <div style={{ fontSize: '9px', marginTop: '1px' }}>
              {gpuTemp?.toFixed(0) || '--'}°C • {gpuUtil?.toFixed(0) || '0'}%
            </div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>
              🕒 {new Date().toLocaleTimeString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* Quantum Computer — dilution refrigerator chandelier in glass cryo-chamber with laser quantum state animation */
const QuantumComputerModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef }, ref) => {
  const ringRef = useRef()
  const coreRef = useRef()
  const laserRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5
      ringRef.current.rotation.x = Math.sin(t * 0.8) * 0.3
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 2.0
      const pulse = 1 + Math.sin(t * 4) * 0.15
      coreRef.current.scale.set(pulse, pulse, pulse)
    }
    if (laserRef.current) {
      laserRef.current.material.opacity = 0.5 + Math.sin(t * 6) * 0.25
    }
  })

  const h = 4.8, r = 1.1

  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      {/* Heavy base plinth */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.3, 1.4, 0.3, 24]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Pure White Glass Cryo-Chamber Enclosure */}
      <mesh position={[0, h / 2 + 0.3, 0]}>
        <cylinderGeometry args={[r, r, h, 32, 1, true]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.22} metalness={0.1} roughness={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* Top & Bottom Metal Caps */}
      <mesh position={[0, h + 0.3, 0]}>
        <cylinderGeometry args={[r + 0.1, r + 0.1, 0.25, 24]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Dilution Refrigerator Chandelier — Tiered Gold & Copper Plates */}
      {[0.8, 1.6, 2.4, 3.2, 4.0].map((y, i) => (
        <group key={`tier-${i}`} position={[0, y, 0]}>
          {/* Gold stage plate */}
          <mesh>
            <cylinderGeometry args={[0.95 - i * 0.12, 0.95 - i * 0.12, 0.06, 24]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Support rods connecting stages */}
          {[-0.5, 0.5].map((x, ri) => (
            <mesh key={`rod-${ri}`} position={[x, -0.4, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
              <meshStandardMaterial color="#b87333" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
          {/* Coiled golden wiring bundles */}
          {Array.from({ length: 6 }).map((_, wi) => (
            <mesh key={`wire-${wi}`} position={[Math.cos(wi * Math.PI / 3) * (0.6 - i * 0.08), -0.4, Math.sin(wi * Math.PI / 3) * (0.6 - i * 0.08)]}>
              <cylinderGeometry args={[0.015, 0.015, 0.75, 6]} />
              <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Quantum Processing Unit (QPU) Core at base of chandelier */}
      <group position={[0, 0.6, 0]}>
        <mesh ref={coreRef}>
          <boxGeometry args={[0.35, 0.12, 0.35]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00e5ff" emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Rotating Quantum Entanglement Rings */}
        <group ref={ringRef}>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.55, 0.02, 12, 32]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
            <torusGeometry args={[0.7, 0.015, 12, 32]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.9} />
          </mesh>
        </group>
      </group>

      {/* Overhead Laser Optical Control Beam */}
      <mesh ref={laserRef} position={[0, h / 2 + 0.3, 0]}>
        <cylinderGeometry args={[0.04, 0.04, h - 0.6, 8]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Quantum Core Floor Glow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.7, 1.85, 32]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
        </mesh>
      )}

      <pointLight position={[0, 1.2, 0]} color="#a855f7" intensity={isSelected ? 3.5 : 2.0} distance={5} decay={2} />
      <pointLight position={[0, 0.6, 0]} color="#06b6d4" intensity={2.0} distance={4} decay={2} />

      {isSelected && (
        <Html position={[0, h + 1.4, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10, 5, 25, 0.94)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(168,85,247,0.5)', borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap',
            fontSize: '10px', fontFamily: 'monospace',
            color: '#e9d5ff', textAlign: 'center',
            boxShadow: '0 0 12px rgba(168,85,247,0.4)',
          }}>
            <div style={{ fontWeight: 800, color: '#c084fc', fontSize: '9px', letterSpacing: '0.05em' }}>
              ⚛️ {rackData.label}
            </div>
            <div style={{ fontSize: '9px', marginTop: '1px', color: '#22d3ee' }}>
              1,024 Qubits • 15 mK • Q-AI Core
            </div>
            <div style={{ fontSize: '8px', color: '#c084fc', marginTop: '2px' }}>
              🕒 {new Date().toLocaleTimeString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* Generator — orange industrial with fans and exhaust */
const GeneratorModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef }, ref) => {
  const fanRef = useRef()
  useFrame((state) => {
    if (fanRef.current) {
      fanRef.current.rotation.z = state.clock.elapsedTime * (rackData.rpm > 0 ? 6 : 0.5)
    }
  })
  const h = 3.2, w = 2.0, d = 2.2
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      {/* Main body — orange */}
      <RoundedBox args={[w, h * 0.7, d]} radius={0.06} smoothness={4} position={[0, h * 0.35, 0]} castShadow>
        <meshStandardMaterial color="#f97316" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      {/* Base platform */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[w + 0.3, 0.2, d + 0.3]} />
        <meshStandardMaterial color="#4a4e52" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Engine housing on top */}
      <mesh position={[0, h * 0.75, 0]}>
        <boxGeometry args={[w * 0.8, h * 0.2, d * 0.6]} />
        <meshStandardMaterial color="#d97706" metalness={0.4} roughness={0.35} />
      </mesh>
      {/* Exhaust pipe */}
      <mesh position={[w / 2 + 0.15, h * 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.15, 0.6, 12]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Large fan on side */}
      <group position={[0, h * 0.4, d / 2 + 0.05]}>
        <mesh>
          <circleGeometry args={[0.45, 24]} />
          <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
        </mesh>
        <group ref={fanRef}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <mesh key={i} rotation={[0, 0, i * Math.PI / 3]}>
              <planeGeometry args={[0.08, 0.4]} />
              <meshStandardMaterial color="#666" metalness={0.5} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      </group>
      {/* Control panel */}
      <mesh position={[-w / 2 - 0.01, h * 0.5, d / 4]}>
        <planeGeometry args={[0.02, 0.6]} />
        <meshStandardMaterial color="#22c55e" emissive={COLORS.green} emissiveIntensity={0.3} />
      </mesh>

      <mesh ref={glowRef} position={[0, h * 0.35, d / 2 + 0.02]}>
        <planeGeometry args={[w - 0.2, h * 0.6]} />
        <meshStandardMaterial color="#1a0a00" emissive={emissiveColor} emissiveIntensity={0.1} transparent opacity={0.2} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.65, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}

      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.3} distance={3} decay={2} />

      {isSelected && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap',
            fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center',
            boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>
              {rackData.label}
            </div>
            <div style={{ fontSize: '9px', marginTop: '1px', color: '#ef4444' }}>
              {(rackData.fuelLevel || 92)}% • {(rackData.rpm || 1800)} RPM
            </div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>
              🕒 {new Date().toLocaleTimeString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* UPS — large white cabinet */
const UPSModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef }, ref) => {
  const h = 3.5, w = 1.4, d = 1.6
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <RoundedBox args={[w, h, d]} radius={0.05} smoothness={4} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#f0f2f5" metalness={0.15} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, h * 0.7, d / 2 + 0.01]}>
        <planeGeometry args={[w * 0.8, 0.3]} />
        <meshStandardMaterial color="#1e40af" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, h * 0.55, d / 2 + 0.01]}>
        <planeGeometry args={[w * 0.5, 0.25]} />
        <meshStandardMaterial color="#0f172a" emissive={COLORS.green} emissiveIntensity={0.3} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[-0.3 + i * 0.2, h * 0.4, d / 2 + 0.02]}>
          <circleGeometry args={[0.05, 12]} />
          <meshStandardMaterial color={statusColor} emissive={emissiveColor} emissiveIntensity={0.6} />
        </mesh>
      ))}

      <mesh ref={glowRef} position={[0, h / 2, d / 2 + 0.015]}>
        <planeGeometry args={[w - 0.15, h - 0.3]} />
        <meshStandardMaterial color="#0a1520" emissive={emissiveColor} emissiveIntensity={0.08} transparent opacity={0.15} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.25, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}
      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.3} distance={3} decay={2} />
      {isSelected && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center', boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>{rackData.label}</div>
            <div style={{ fontSize: '9px', marginTop: '1px', color: '#f97316' }}>{(rackData.batteryLevel || 85)}% • {(rackData.load || 60)}%</div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>🕒 {new Date().toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* Battery Bank — cyan industrial rack */
const BatteryModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef }, ref) => {
  const h = 2.8, w = 1.6, d = 1.4
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <RoundedBox args={[w, h, d]} radius={0.04} smoothness={4} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#1e3a5f" metalness={0.5} roughness={0.35} />
      </RoundedBox>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[-0.45 + i * 0.3, h / 2, d / 2 + 0.01]}>
          <planeGeometry args={[0.25, h * 0.7]} />
          <meshStandardMaterial color="#06b6d4" emissive={COLORS.cyan} emissiveIntensity={0.15 + (rackData.chargeLevel || 78) / 500} metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.15, 0]}>
        <boxGeometry args={[w + 0.1, 0.1, d * 0.3]} />
        <meshStandardMaterial color="#06b6d4" emissive={COLORS.cyan} emissiveIntensity={0.2} />
      </mesh>

      <mesh ref={glowRef} position={[0, h / 2, d / 2 + 0.015]}>
        <planeGeometry args={[w - 0.15, h - 0.3]} />
        <meshStandardMaterial color="#0a1520" emissive={emissiveColor} emissiveIntensity={0.08} transparent opacity={0.15} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.35, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}
      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.3} distance={3} decay={2} />
      {isSelected && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center', boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>{rackData.label}</div>
            <div style={{ fontSize: '9px', marginTop: '1px', color: '#06b6d4' }}>{(rackData.chargeLevel || 78)}% • {(rackData.temp || 32)}°C</div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>🕒 {new Date().toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* Cooling Units (CRAC/Chiller) — gray with blue pipes */
const CoolingModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef }, ref) => {
  const fanRef = useRef()
  useFrame((state) => {
    if (fanRef.current) {
      fanRef.current.rotation.z = state.clock.elapsedTime * 4
    }
  })
  const h = 3.6, w = 1.5, d = 1.6
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <RoundedBox args={[w, h, d]} radius={0.05} smoothness={4} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.15} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, h * 0.8, d / 2 + 0.01]}>
        <planeGeometry args={[w - 0.1, 0.15]} />
        <meshStandardMaterial color="#3b82f6" emissive={COLORS.coolBlue} emissiveIntensity={0.3} />
      </mesh>
      {[0, 1, 2].map(i => (
        <group key={i} position={[0, 0.8 + i * 0.9, d / 2 + 0.02]}>
          <mesh>
            <circleGeometry args={[0.3, 24]} />
            <meshStandardMaterial color="#c8d0d8" metalness={0.3} roughness={0.4} />
          </mesh>
          <group ref={i === 1 ? fanRef : null}>
            {[0, 1, 2, 3].map(j => (
              <mesh key={j} rotation={[0, 0, j * Math.PI / 2]}>
                <planeGeometry args={[0.06, 0.25]} />
                <meshStandardMaterial color="#94a3b8" side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, h / 2, -d / 2 - 0.15]}>
          <cylinderGeometry args={[0.08, 0.08, h * 0.8, 8]} />
          <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      <mesh ref={glowRef} position={[0, h / 2, d / 2 + 0.015]}>
        <planeGeometry args={[w - 0.15, h - 0.3]} />
        <meshStandardMaterial color="#0a1520" emissive={emissiveColor} emissiveIntensity={0.06} transparent opacity={0.1} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.25, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}
      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.3} distance={3} decay={2} />
      {isSelected && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center', boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>{rackData.label}</div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>🕒 {new Date().toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* PDU — compact power distribution panel */
const PDUModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef }, ref) => {
  const h = 2.2, w = 0.7, d = 0.9
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <RoundedBox args={[w, h, d]} radius={0.03} smoothness={4} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.25} />
      </RoundedBox>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.15 + (i % 3) * 0.15, 0.4 + Math.floor(i / 3) * 0.8, d / 2 + 0.02]}>
          <boxGeometry args={[0.1, 0.06, 0.02]} />
          <meshStandardMaterial color="#eab308" emissive={COLORS.yellow} emissiveIntensity={0.5} />
        </mesh>
      ))}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`led-${i}`} position={[-0.15 + i * 0.15, h * 0.8, d / 2 + 0.02]}>
          <circleGeometry args={[0.04, 8]} />
          <meshStandardMaterial color="#22c55e" emissive={COLORS.green} emissiveIntensity={0.8} />
        </mesh>
      ))}
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={`cable-${i}`} position={[x, -0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}

      <mesh ref={glowRef} position={[0, h / 2, d / 2 + 0.015]}>
        <planeGeometry args={[w - 0.1, h - 0.3]} />
        <meshStandardMaterial color="#0a1520" emissive={emissiveColor} emissiveIntensity={0.08} transparent opacity={0.15} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}
      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.3} distance={3} decay={2} />
      {isSelected && (
        <Html position={[0, h + 0.4, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center', boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>{rackData.label}</div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>🕒 {new Date().toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* Scheduler — purple compute rack */
const SchedulerModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef, ledsRef }, ref) => {
  const h = 4.0, w = 1.2, d = 1.5
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <RoundedBox args={[w, h, d]} radius={0.05} smoothness={4} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#1e1b4b" metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, 0.6 + i * 0.55, d / 2 + 0.01]}>
          <planeGeometry args={[w - 0.1, 0.45]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#6d28d9' : '#4c1d95'} emissive={COLORS.purple} emissiveIntensity={0.1} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}

      <group ref={ledsRef}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[w / 2 - 0.08, 0.6 + i * 0.55, d / 2 + 0.02]}>
            <boxGeometry args={[0.04, 0.3, 0.02]} />
            <meshStandardMaterial color={statusColor} emissive={emissiveColor} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>

      <mesh ref={glowRef} position={[0, h / 2, d / 2 + 0.015]}>
        <planeGeometry args={[w - 0.15, h - 0.3]} />
        <meshStandardMaterial color="#0a0520" emissive={emissiveColor} emissiveIntensity={0.15} transparent opacity={0.2} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.15, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}
      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.4} distance={3} decay={2} />
      {isSelected && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center', boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>{rackData.label}</div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>🕒 {new Date().toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* Storage — amber NVMe array */
const StorageModel = React.forwardRef(({ position, rackData, isSelected, onClick, statusColor, emissiveColor, glowRef, ledsRef }, ref) => {
  const h = 3.5, w = 1.3, d = 1.5
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <RoundedBox args={[w, h, d]} radius={0.05} smoothness={4} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#1c1917" metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-0.35 + (i % 4) * 0.23, 0.5 + Math.floor(i / 4) * 0.9, d / 2 + 0.01]}>
          <planeGeometry args={[0.2, 0.75]} />
          <meshStandardMaterial color="#78350f" emissive={COLORS.amber} emissiveIntensity={0.05} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      <group ref={ledsRef}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[w / 2 - 0.08, 0.4 + i * 0.4, d / 2 + 0.02]}>
            <boxGeometry args={[0.04, 0.2, 0.02]} />
            <meshStandardMaterial color={statusColor} emissive={emissiveColor} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>

      <mesh ref={glowRef} position={[0, h / 2, d / 2 + 0.015]}>
        <planeGeometry args={[w - 0.15, h - 0.3]} />
        <meshStandardMaterial color="#0a0a05" emissive={emissiveColor} emissiveIntensity={0.1} transparent opacity={0.15} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.15, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </mesh>
      )}
      <pointLight position={[0, h / 2, d / 2 + 0.5]} color={statusColor} intensity={isSelected ? 2 : 0.3} distance={3} decay={2} />
      {isSelected && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 10, 15, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}40`, borderRadius: '4px',
            padding: '3px 8px', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace',
            color: '#c9d1d9', textAlign: 'center', boxShadow: `0 0 10px ${statusColor}20`,
          }}>
            <div style={{ fontWeight: 800, color: statusColor, fontSize: '9px', letterSpacing: '0.05em' }}>{rackData.label}</div>
            <div style={{ fontSize: '8px', color: '#38bdf8', marginTop: '2px' }}>🕒 {new Date().toLocaleTimeString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
})

/* ─────────────────── FIRE SUPPRESSION TANKS ─────────────────── */
function FireSuppression() {
  const tanks = [
    [-14, 0, -9], [-14, 0, -7.5], [-12.5, 0, -9], [-12.5, 0, -7.5],
    [-4, 0, -9], [-2.5, 0, -9],
  ]
  return (
    <group>
      {tanks.map((pos, i) => (
        <group key={`tank-${i}`} position={pos}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 2.0, 12]} />
            <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[0, 2.1, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.15, 8]} />
            <meshStandardMaterial color="#991b1b" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.1, 12]} />
            <meshStandardMaterial color="#7f1d1d" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─────────────────── QUANTUM-HYBRID LASER INTERCONNECT ─────────────────── */
function QuantumInterconnect() {
  const laserRef = useRef()
  useFrame((state) => {
    if (laserRef.current && laserRef.current.material) {
      laserRef.current.material.dashOffset = -state.clock.elapsedTime * 1.5
    }
  })

  const points = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(7, 4.5, -7),
      new THREE.Vector3(5, 6.0, -5),
      new THREE.Vector3(2, 6.0, -2),
      new THREE.Vector3(2, 4.0, -2),
    ]).getPoints(30)
  }, [])

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])

  return (
    <group>
      <line ref={laserRef} geometry={geometry}>
        <lineDashedMaterial color="#c084fc" dashSize={0.4} gapSize={0.2} transparent opacity={0.85} linewidth={2} />
      </line>
      <Html position={[4.5, 6.3, -4.5]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '6px', fontWeight: 800, color: '#c084fc',
          background: 'rgba(15,5,30,0.9)', padding: '2px 6px', borderRadius: '3px',
          border: '1px solid rgba(192,132,252,0.4)', whiteSpace: 'nowrap',
          boxShadow: '0 0 8px rgba(192,132,252,0.3)',
        }}>
          ⚛️ QUANTUM-HYBRID AI BUS (10 Gbps Q-Link)
        </div>
      </Html>
    </group>
  )
}

/* ─────────────────── PROFESSIONAL DATACENTER PIPELINES & AIRFLOW (REFERENCE IMAGE STYLE) ─────────────────── */
function ProfessionalDatacenterPipelines() {
  const copperPipeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#b87333', metalness: 0.95, roughness: 0.15,
  }), [])
  const silverPipeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cbd5e1', metalness: 0.9, roughness: 0.2,
  }), [])

  const rackRowPositions = [-4.5, -1.5]

  return (
    <group>
      {/* ── 1. ROOFTOP HEAT REJECTION DRY COOLER (V-BANK FANS ON ROOF) ── */}
      <group position={[12, 7.8, 0]}>
        {/* Support steel frame on roof */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[4.5, 0.2, 5.0]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* V-Shape Condenser Coil Blocks */}
        {[-1.2, 1.2].map((x, i) => (
          <group key={`vbank-${i}`} position={[x, 1.0, 0]}>
            <mesh rotation={[0, 0, (i === 0 ? 1 : -1) * Math.PI / 6]}>
              <boxGeometry args={[0.3, 1.8, 4.2]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Fans on top */}
            {[-1.5, -0.5, 0.5, 1.5].map((z, fi) => (
              <mesh key={`fan-${fi}`} position={[0, 1.0, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.38, 0.38, 0.1, 16]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Rooftop dry cooler floating label */}
        <Html position={[0, 2.5, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: '7px', fontWeight: 800, color: '#f8fafc',
            background: 'rgba(15,23,42,0.92)', padding: '2px 8px', borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap',
          }}>
            ❄️ ROOFTOP HEAT REJECTION V-BANK DRY COOLERS
          </div>
        </Html>
      </group>

      {/* ── 2. ROOF TO CDU COPPER RISER PIPES (COLD BLUE & HOT ORANGE LIQUID LOOPS) ── */}
      {/* Copper Supply Riser (Roof -> CDU) */}
      <mesh position={[10.5, 5.2, -3.5]} material={copperPipeMat}>
        <cylinderGeometry args={[0.08, 0.08, 5.2, 20]} />
      </mesh>
      <mesh position={[10.5, 7.8, -1.8]} rotation={[Math.PI / 2, 0, 0]} material={copperPipeMat}>
        <cylinderGeometry args={[0.08, 0.08, 3.4, 20]} />
      </mesh>
      {/* Copper Return Riser (CDU -> Roof) */}
      <mesh position={[10.8, 5.2, -3.2]} material={copperPipeMat}>
        <cylinderGeometry args={[0.08, 0.08, 5.2, 20]} />
      </mesh>
      <mesh position={[10.8, 7.8, -1.6]} rotation={[Math.PI / 2, 0, 0]} material={copperPipeMat}>
        <cylinderGeometry args={[0.08, 0.08, 3.2, 20]} />
      </mesh>

      {/* ── 3. COOLANT DISTRIBUTION UNIT (CDU) CABINET AT [9, 0, -4] ── */}
      <group position={[9, 0, -4]}>
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[1.4, 2.6, 1.4]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Front access glass panel */}
        <mesh position={[0, 1.3, 0.71]}>
          <planeGeometry args={[1.2, 2.3]} />
          <meshStandardMaterial color="#00e5ff" transparent opacity={0.3} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* CDU Digital Display */}
        <Html position={[0, 2.2, 0.72]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: '5px', fontWeight: 800, color: '#00e5ff',
            background: 'rgba(2,6,12,0.92)', padding: '2px 4px', borderRadius: '2px',
            border: '1px solid rgba(0,229,255,0.4)', whiteSpace: 'nowrap',
          }}>
            CDU CORE • 12°C IN / 28°C OUT
          </div>
        </Html>
      </group>

      {/* ── 4. DIRECT IN-ROW COPPER LIQUID MANIFOLDS ALONG SERVER RACK ROWS ── */}
      {rackRowPositions.map((rx, ri) => (
        <group key={`inrow-${ri}`}>
          {/* Lower Supply Manifold Pipe along base of server row (y=0.8) */}
          <mesh position={[rx, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} material={copperPipeMat}>
            <cylinderGeometry args={[0.06, 0.06, 10.0, 16]} />
          </mesh>
          {/* Upper Return Manifold Pipe along mid-height of server row (y=2.6) */}
          <mesh position={[rx, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={silverPipeMat}>
            <cylinderGeometry args={[0.06, 0.06, 10.0, 16]} />
          </mesh>

          {/* Quick-disconnect flex feeder tubes into each GPU server host */}
          {[-4, 0, 4].map((z, fi) => (
            <group key={`flex-${fi}`} position={[rx, 0, z]}>
              {/* Supply flex line */}
              <mesh position={[0.2, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} material={copperPipeMat}>
                <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
              </mesh>
              {/* Return flex line */}
              <mesh position={[0.2, 2.6, 0]} rotation={[0, 0, Math.PI / 2]} material={silverPipeMat}>
                <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
              </mesh>
            </group>
          ))}

          {/* Connectors from CDU to In-Row Manifolds */}
          <mesh position={[(9 + rx) / 2, 0.8, -4]} rotation={[0, 0, Math.PI / 2]} material={copperPipeMat}>
            <cylinderGeometry args={[0.07, 0.07, Math.abs(9 - rx), 16]} />
          </mesh>
          <mesh position={[(9 + rx) / 2, 2.6, -4]} rotation={[0, 0, Math.PI / 2]} material={silverPipeMat}>
            <cylinderGeometry args={[0.07, 0.07, Math.abs(9 - rx), 16]} />
          </mesh>
        </group>
      ))}

      {/* Floating Label for In-Row Liquid Cooling */}
      <Html position={[-3.0, 3.2, -4.5]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '6px', fontWeight: 800, color: '#f59e0b',
          background: 'rgba(15, 23, 42, 0.92)', padding: '2px 6px', borderRadius: '3px',
          border: '1px solid rgba(245, 158, 11, 0.4)', whiteSpace: 'nowrap',
        }}>
          💧 IN-ROW DIRECT-TO-CHIP LIQUID MANIFOLDS
        </div>
      </Html>
    </group>
  )
}

/* ─────────────────── STRUCTURED OVERHEAD CABLE TRAYS & WIRE BUNDLES (REFERENCE IMAGE 1 STYLE) ─────────────────── */
function OverheadCableTray({ rackPositions }) {
  const blueCableMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2563eb', metalness: 0.6, roughness: 0.25,
  }), [])
  const yellowRacewayMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f59e0b', metalness: 0.2, roughness: 0.3,
  }), [])
  const ladderSteelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#334155', metalness: 0.85, roughness: 0.2,
  }), [])
  const velcroTieMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a', metalness: 0.4, roughness: 0.6,
  }), [])

  const serverRowX = [-4.5, -1.5]

  return (
    <group>
      {/* ── 1. YELLOW FIBER RUNNER OVERHEAD DUCT (MAIN AISLE TRUNK AT Y=6.4) ── */}
      {/* Main longitudinal yellow trough */}
      <mesh position={[0, 6.4, 0]}>
        <boxGeometry args={[0.6, 0.25, 22]} />
        <primitive object={yellowRacewayMat} />
      </mesh>
      {/* Yellow trough inner channel recess */}
      <mesh position={[0, 6.48, 0]}>
        <boxGeometry args={[0.52, 0.12, 22.02]} />
        <meshStandardMaterial color="#b45309" metalness={0.1} roughness={0.4} />
      </mesh>
      {/* Yellow T-junction fittings over server rows */}
      {serverRowX.map((x, i) => (
        <group key={`t-junction-${i}`} position={[x / 2, 6.4, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[Math.abs(x), 0.26, 0.65]} />
            <primitive object={yellowRacewayMat} />
          </mesh>
          {/* Vertical yellow drop chute into rack row */}
          <mesh position={[x / 2, -0.4, 0]}>
            <boxGeometry args={[0.5, 0.6, 0.5]} />
            <primitive object={yellowRacewayMat} />
          </mesh>
        </group>
      ))}
      <Html position={[0, 6.75, -9]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '7px', fontWeight: 800, color: '#fef08a',
          background: 'rgba(180, 83, 9, 0.92)', padding: '2px 8px', borderRadius: '4px',
          border: '1px solid rgba(253, 224, 71, 0.5)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          🟨 OVERHEAD FIBERRUNNER YELLOW DUCT & CABLE TRAYS
        </div>
      </Html>

      {/* ── 2. STEEL WIRE-MESH CABLE LADDER TRAYS OVER SERVER ROWS (Y=5.6) ── */}
      {serverRowX.map((rx, ri) => (
        <group key={`ladder-${ri}`}>
          {/* Side rails of cable ladder */}
          <mesh position={[rx - 0.3, 5.6, 0]}>
            <boxGeometry args={[0.04, 0.12, 20]} />
            <primitive object={ladderSteelMat} />
          </mesh>
          <mesh position={[rx + 0.3, 5.6, 0]}>
            <boxGeometry args={[0.04, 0.12, 20]} />
            <primitive object={ladderSteelMat} />
          </mesh>

          {/* Ladder cross rungs spaced along the tray */}
          {Array.from({ length: 20 }).map((_, rungi) => (
            <mesh key={`rung-${rungi}`} position={[rx, 5.56, -9.5 + rungi * 1.0]}>
              <boxGeometry args={[0.6, 0.03, 0.04]} />
              <primitive object={ladderSteelMat} />
            </mesh>
          ))}

          {/* Steel ceiling suspension threaded rods */}
          {[-8, -2, 4, 9].map((sz, si) => (
            <mesh key={`rod-${si}`} position={[rx, 6.5, sz]}>
              <cylinderGeometry args={[0.015, 0.015, 1.8, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>
          ))}

          {/* ── 3. PARALLEL BUNDLED ELECTRIC BLUE CABLES ON LADDER TRAYS (IMAGE 1 STYLE) ── */}
          {[-0.18, -0.06, 0.06, 0.18].map((cableOffset, ci) => (
            <group key={`bundle-${ci}`}>
              {/* Longitudinal blue cable bundle tube */}
              <mesh position={[rx + cableOffset, 5.64, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.028, 0.028, 19.6, 12]} />
                <primitive object={blueCableMat} />
              </mesh>

              {/* Black velcro tie wraps bundled tightly around cables (Image 1 Style) */}
              {Array.from({ length: 16 }).map((_, tiei) => (
                <mesh key={`tie-${tiei}`} position={[rx + cableOffset, 5.64, -9.0 + tiei * 1.2]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.034, 0.034, 0.04, 10]} />
                  <primitive object={velcroTieMat} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Vertical cable drop loops from ladder tray down into top of each GPU server host */}
          {[-4, 0, 4].map((gz, gi) => (
            <group key={`drop-cable-${gi}`} position={[rx, 5.4, gz]}>
              <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
                <primitive object={blueCableMat} />
              </mesh>
              {/* Black velcro strap on vertical drop */}
              <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.095, 0.095, 0.05, 10]} />
                <primitive object={velcroTieMat} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ─────────────────── ENHANCED THERMAL HEAT MAP ─────────────────── */
function ThermalHeatMap({ rackPositions, gpuTemps, visible }) {
  const meshRef = useRef()
  const textureRef = useRef()
  const timeRef = useRef(0)

  const canvasSize = 512
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = canvasSize
    c.height = canvasSize
    return c
  }, [])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    textureRef.current = tex
    return tex
  }, [canvas])

  useFrame((state) => {
    if (!visible || !textureRef.current) return
    timeRef.current = state.clock.elapsedTime
    const ctx = canvas.getContext('2d')

    // Dark IR background
    ctx.fillStyle = 'rgba(8, 3, 35, 0.88)'
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    const toCanvasX = (x) => ((x + 18) / 36) * canvasSize
    const toCanvasZ = (z) => ((z + 12) / 24) * canvasSize

    const heatSources = []
    const gpus = rackPositions?.filter(r => r.type === 'gpu') || []
    gpus.forEach((gpu, i) => {
      heatSources.push({ pos: gpu.pos, temp: gpuTemps?.[i] || 42, radius: 35, type: 'gpu' })
    })
    const gens = rackPositions?.filter(r => r.type === 'generator') || []
    gens.forEach(g => heatSources.push({ pos: g.pos, temp: 55, radius: 25, type: 'gen' }))
    const upss = rackPositions?.filter(r => r.type === 'ups') || []
    upss.forEach(u => heatSources.push({ pos: u.pos, temp: 45, radius: 20, type: 'ups' }))
    const pdus = rackPositions?.filter(r => r.type === 'pdu') || []
    pdus.forEach(p => heatSources.push({ pos: p.pos, temp: 38, radius: 14, type: 'pdu' }))
    const batts = rackPositions?.filter(r => r.type === 'battery') || []
    batts.forEach(b => heatSources.push({ pos: b.pos, temp: 35, radius: 16, type: 'battery' }))
    const scheds = rackPositions?.filter(r => r.type === 'scheduler') || []
    scheds.forEach(s => heatSources.push({ pos: s.pos, temp: 48, radius: 18, type: 'scheduler' }))
    const stores = rackPositions?.filter(r => r.type === 'storage') || []
    stores.forEach(s => heatSources.push({ pos: s.pos, temp: 40, radius: 16, type: 'storage' }))

    // Draw heat blobs with multi-layer gradients
    heatSources.forEach((src) => {
      const cx = toCanvasX(src.pos[0])
      const cz = toCanvasZ(src.pos[2])
      const pulse = 1 + Math.sin(timeRef.current * 2 + src.pos[0]) * 0.12
      const r = src.radius * pulse

      for (let layer = 0; layer < 3; layer++) {
        const layerR = r * (1 + layer * 0.3)
        const grad = ctx.createRadialGradient(cx, cz, 0, cx, cz, layerR)
        const layerAlpha = 1 - layer * 0.3

        if (src.temp > 70) {
          grad.addColorStop(0, `rgba(255, 255, 240, ${0.75 * layerAlpha})`)
          grad.addColorStop(0.1, `rgba(255, 200, 100, ${0.65 * layerAlpha})`)
          grad.addColorStop(0.25, `rgba(255, 80, 30, ${0.55 * layerAlpha})`)
          grad.addColorStop(0.45, `rgba(200, 30, 0, ${0.35 * layerAlpha})`)
          grad.addColorStop(0.7, `rgba(120, 10, 60, ${0.18 * layerAlpha})`)
          grad.addColorStop(1, 'rgba(8, 3, 35, 0)')
        } else if (src.temp > 55) {
          grad.addColorStop(0, `rgba(255, 200, 0, ${0.65 * layerAlpha})`)
          grad.addColorStop(0.15, `rgba(255, 140, 0, ${0.55 * layerAlpha})`)
          grad.addColorStop(0.35, `rgba(240, 80, 0, ${0.4 * layerAlpha})`)
          grad.addColorStop(0.6, `rgba(160, 30, 40, ${0.2 * layerAlpha})`)
          grad.addColorStop(1, 'rgba(8, 3, 35, 0)')
        } else if (src.temp > 40) {
          grad.addColorStop(0, `rgba(100, 230, 50, ${0.55 * layerAlpha})`)
          grad.addColorStop(0.2, `rgba(60, 200, 80, ${0.4 * layerAlpha})`)
          grad.addColorStop(0.5, `rgba(20, 140, 160, ${0.25 * layerAlpha})`)
          grad.addColorStop(1, 'rgba(8, 3, 35, 0)')
        } else {
          grad.addColorStop(0, `rgba(30, 160, 220, ${0.45 * layerAlpha})`)
          grad.addColorStop(0.3, `rgba(20, 80, 180, ${0.3 * layerAlpha})`)
          grad.addColorStop(1, 'rgba(8, 3, 35, 0)')
        }
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvasSize, canvasSize)
      }

      // Temperature label on heat map
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = src.temp > 60 ? 'rgba(255,255,255,0.8)' : 'rgba(200,220,255,0.6)'
      ctx.fillText(`${src.temp.toFixed(0)}°`, cx, cz + 4)
    })

    // Cooling zones
    const coolers = rackPositions?.filter(r => r.type === 'chiller' || r.type === 'crac') || []
    coolers.forEach(cooler => {
      const cx = toCanvasX(cooler.pos[0])
      const cz = toCanvasZ(cooler.pos[2])
      const pulse = 1 + Math.sin(timeRef.current * 1.5 + cooler.pos[2]) * 0.08
      const r = 28 * pulse

      const grad = ctx.createRadialGradient(cx, cz, 0, cx, cz, r)
      grad.addColorStop(0, 'rgba(0, 100, 255, 0.55)')
      grad.addColorStop(0.25, 'rgba(20, 60, 200, 0.4)')
      grad.addColorStop(0.55, 'rgba(15, 30, 120, 0.22)')
      grad.addColorStop(1, 'rgba(8, 3, 35, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvasSize, canvasSize)
    })

    // Flow direction arrows from coolers to GPU racks
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 6])
    const flowOffset = (timeRef.current * 8) % 10
    ctx.lineDashOffset = -flowOffset
    coolers.forEach(cooler => {
      gpus.forEach(gpu => {
        const x1 = toCanvasX(cooler.pos[0])
        const z1 = toCanvasZ(cooler.pos[2])
        const x2 = toCanvasX(gpu.pos[0])
        const z2 = toCanvasZ(gpu.pos[2])
        ctx.beginPath()
        ctx.moveTo(x1, z1)
        ctx.lineTo(x2, z2)
        ctx.stroke()
      })
    })
    ctx.setLineDash([])

    // Temperature contour lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.lineWidth = 0.5
    heatSources.forEach(src => {
      const cx = toCanvasX(src.pos[0])
      const cz = toCanvasZ(src.pos[2])
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath()
        ctx.arc(cx, cz, src.radius * ring * 0.35, 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    textureRef.current.needsUpdate = true
  })

  if (!visible) return null

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <planeGeometry args={[36, 24]} />
      <meshBasicMaterial map={texture} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

/* ─────────────────── ENHANCED HEAT COLUMNS ─────────────────── */
function HeatColumns({ rackPositions, gpuTemps, visible }) {
  const columnsRef = useRef()

  useFrame((state) => {
    if (!columnsRef.current || !visible) return
    columnsRef.current.children.forEach((col, i) => {
      if (col.material) {
        // Upward-traveling wave
        const wave = Math.sin(state.clock.elapsedTime * 2.5 + i * 1.5 - state.clock.elapsedTime * 1.2) * 0.12
        col.material.opacity = 0.14 + wave
        col.scale.y = 1 + Math.sin(state.clock.elapsedTime * 1.8 + i) * 0.18
      }
    })
  })

  const sources = useMemo(() => {
    if (!rackPositions) return []
    const result = []
    const gpus = rackPositions.filter(r => r.type === 'gpu')
    gpus.forEach((gpu, i) => {
      const temp = gpuTemps?.[i] || 42
      result.push({ pos: gpu.pos, temp, height: 3.5 + (temp - 30) / 12, radius: 0.55 })
    })
    const gens = rackPositions.filter(r => r.type === 'generator')
    gens.forEach(g => result.push({ pos: g.pos, temp: 55, height: 2.8, radius: 0.7 }))
    const scheds = rackPositions.filter(r => r.type === 'scheduler')
    scheds.forEach(s => result.push({ pos: s.pos, temp: 48, height: 2.2, radius: 0.45 }))
    return result
  }, [rackPositions, gpuTemps])

  if (!visible) return null

  return (
    <group ref={columnsRef}>
      {sources.map((src, i) => {
        // Blue at base, gradient to red/orange at top based on temperature
        const color = src.temp > 65 ? '#ff3300' : src.temp > 50 ? '#ff8800' : src.temp > 40 ? '#ffcc00' : '#44cc44'
        return (
          <group key={`hcol-${i}`}>
            {/* Main heat column */}
            <mesh position={[src.pos[0], 5.0 + src.height / 2, src.pos[2]]}>
              <cylinderGeometry args={[src.radius * 0.2, src.radius, src.height, 12, 1, true]} />
              <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Inner bright core */}
            <mesh position={[src.pos[0], 5.0 + src.height * 0.3, src.pos[2]]}>
              <cylinderGeometry args={[src.radius * 0.08, src.radius * 0.35, src.height * 0.5, 8, 1, true]} />
              <meshBasicMaterial color={src.temp > 60 ? '#ffaa00' : '#66dd66'} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ─────────────────── ENHANCED AIRFLOW PARTICLES ─────────────────── */
function AirflowStreams({ rackPositions, gpuTemps, visible }) {
  const hotParticlesRef = useRef()
  const coldParticlesRef = useRef()
  const hotCount = 500
  const coldCount = 300

  const { hotPositions, coldPositions, hotSources, coldSources } = useMemo(() => {
    const gpus = rackPositions?.filter(r => r.type === 'gpu') || []
    const gens = rackPositions?.filter(r => r.type === 'generator') || []
    const coolers = rackPositions?.filter(r => r.type === 'chiller' || r.type === 'crac') || []

    const hotSrcs = [...gpus, ...gens]
    const coldSrcs = coolers

    const hotPos = new Float32Array(hotCount * 3)
    for (let i = 0; i < hotCount; i++) {
      const src = hotSrcs[i % hotSrcs.length]
      if (src) {
        hotPos[i * 3] = src.pos[0] + (Math.random() - 0.5) * 1.5
        hotPos[i * 3 + 1] = 0.5 + Math.random() * 6
        hotPos[i * 3 + 2] = src.pos[2] + (Math.random() - 0.5) * 1.5
      }
    }

    const coldPos = new Float32Array(coldCount * 3)
    for (let i = 0; i < coldCount; i++) {
      const src = coldSrcs[i % coldSrcs.length]
      if (src) {
        coldPos[i * 3] = src.pos[0] + (Math.random() - 0.5) * 3
        coldPos[i * 3 + 1] = 0.3 + Math.random() * 2
        coldPos[i * 3 + 2] = src.pos[2] + (Math.random() - 0.5) * 3
      }
    }

    return { hotPositions: hotPos, coldPositions: coldPos, hotSources: hotSrcs, coldSources: coldSrcs }
  }, [rackPositions])

  useFrame((state) => {
    if (!visible) return
    const t = state.clock.elapsedTime

    if (hotParticlesRef.current) {
      const posArr = hotParticlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < hotCount; i++) {
        posArr[i * 3 + 1] += 0.028 + Math.sin(t * 0.8 + i * 0.2) * 0.01
        posArr[i * 3] += Math.sin(t * 0.4 + i * 0.5) * 0.007
        posArr[i * 3 + 2] += Math.cos(t * 0.3 + i * 0.4) * 0.006
        const height = posArr[i * 3 + 1]
        if (height > 3) {
          posArr[i * 3] += Math.sin(t + i) * 0.004 * (height - 3)
        }
        if (posArr[i * 3 + 1] > 7.5) {
          const src = hotSources[i % hotSources.length]
          if (src) {
            posArr[i * 3] = src.pos[0] + (Math.random() - 0.5) * 1.5
            posArr[i * 3 + 2] = src.pos[2] + (Math.random() - 0.5) * 1.5
          }
          posArr[i * 3 + 1] = 0.5 + Math.random() * 2
        }
      }
      hotParticlesRef.current.geometry.attributes.position.needsUpdate = true
    }

    if (coldParticlesRef.current) {
      const posArr = coldParticlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < coldCount; i++) {
        posArr[i * 3 + 1] -= 0.005 + Math.sin(t * 0.3 + i) * 0.002
        if (hotSources.length > 0) {
          const target = hotSources[i % hotSources.length]
          if (target) {
            const dx = target.pos[0] - posArr[i * 3]
            const dz = target.pos[2] - posArr[i * 3 + 2]
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist > 0.5) {
              posArr[i * 3] += (dx / dist) * 0.014
              posArr[i * 3 + 2] += (dz / dist) * 0.014
            }
          }
        }
        posArr[i * 3] += Math.sin(t * 0.2 + i * 0.7) * 0.004
        if (posArr[i * 3 + 1] < 0.1 || Math.random() < 0.002) {
          const src = coldSources[i % coldSources.length]
          if (src) {
            posArr[i * 3] = src.pos[0] + (Math.random() - 0.5) * 3
            posArr[i * 3 + 2] = src.pos[2] + (Math.random() - 0.5) * 3
          }
          posArr[i * 3 + 1] = 0.3 + Math.random() * 2
        }
      }
      coldParticlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (!visible) return null

  return (
    <group>
      <points ref={hotParticlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={hotCount} array={hotPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.09} color="#ff4400" transparent opacity={0.4} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <points ref={coldParticlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={coldCount} array={coldPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.1} color="#00bbff" transparent opacity={0.3} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  )
}

/* ─────────────────── EQUIPMENT HEAT GLOW HALOS ─────────────────── */
function HeatGlowHalos({ rackPositions, gpuTemps, visible }) {
  const halosRef = useRef()

  useFrame((state) => {
    if (!halosRef.current || !visible) return
    halosRef.current.children.forEach((halo, i) => {
      if (halo.material) {
        const pulse = 0.15 + Math.sin(state.clock.elapsedTime * 1.8 + i * 2) * 0.08
        halo.material.opacity = pulse
      }
    })
  })

  const sources = useMemo(() => {
    if (!rackPositions) return []
    const result = []
    rackPositions.forEach((rack) => {
      if (rack.type === 'gpu') {
        const temp = gpuTemps?.[result.filter(r => r.type === 'gpu').length] || 42
        result.push({ ...rack, temp })
      } else if (rack.type === 'generator') result.push({ ...rack, temp: 55 })
      else if (rack.type === 'ups') result.push({ ...rack, temp: 42 })
      else if (rack.type === 'scheduler') result.push({ ...rack, temp: 48 })
      else if (rack.type === 'chiller' || rack.type === 'crac') result.push({ ...rack, temp: 15 })
    })
    return result
  }, [rackPositions, gpuTemps])

  if (!visible) return null

  return (
    <group ref={halosRef}>
      {sources.map((src, i) => {
        const isCold = src.type === 'chiller' || src.type === 'crac'
        const color = isCold ? '#0088ff'
          : src.temp > 65 ? '#ff2200'
          : src.temp > 50 ? '#ff8800'
          : src.temp > 40 ? '#ffaa00'
          : '#44bb44'
        const size = isCold ? 3.5 : 2 + (src.temp - 30) / 20
        return (
          <mesh key={`halo-${i}`} position={[src.pos[0], 0.08, src.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[size, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
    </group>
  )
}



/* ─────────────────── AMBIENT PARTICLES ─────────────────── */
function AmbientParticles() {
  const particlesRef = useRef()
  const count = 80
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34
      pos[i * 3 + 1] = Math.random() * 7
      pos[i * 3 + 2] = (Math.random() - 0.5) * 22
    }
    return pos
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      const posArr = particlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < count; i++) {
        posArr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.15 + i) * 0.001
        if (posArr[i * 3 + 1] > 7) posArr[i * 3 + 1] = 0
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#94a3b8" transparent opacity={0.2} sizeAttenuation />
    </points>
  )
}

/* ─────────────────── PROFESSIONAL LIGHTING ─────────────────── */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.65} color="#f0f4f8" />
      <directionalLight position={[15, 14, 10]} intensity={1.0} color="#ffffff" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-far={50} shadow-camera-left={-22} shadow-camera-right={22}
        shadow-camera-top={16} shadow-camera-bottom={-16}
      />
      <directionalLight position={[-12, 10, -6]} intensity={0.4} color="#dbeaff" />
      <pointLight position={[0, 6.5, 0]} intensity={0.4} color="#f0f4ff" distance={22} />
      {/* Zone accent spotlights */}
      <spotLight position={[-13, 6, 0]} angle={0.5} penumbra={0.8} intensity={0.4} color="#ff8c00" distance={16} />
      <spotLight position={[13, 6, 0]} angle={0.5} penumbra={0.8} intensity={0.4} color="#3b82f6" distance={16} />
      <spotLight position={[7, 6, -7]} angle={0.45} penumbra={0.7} intensity={0.6} color="#c084fc" distance={14} />
      <spotLight position={[0, 6, -3]} angle={0.4} penumbra={0.8} intensity={0.45} color="#76b900" distance={14} />
      <fog attach="fog" args={['#060912', 38, 75]} />
    </>
  )
}

/* ─────────────────── CAMERA CONTROLLER ─────────────────── */
function CameraController({ selectedRack, rackPositions, resetTrigger }) {
  const { camera, controls } = useThree()
  const isAnimating = useRef(false)
  const initialized = useRef(false)
  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())

  const overviewPos = useMemo(() => new THREE.Vector3(0, 12, 24), [])
  const overviewLook = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useEffect(() => {
    if (!controls) return
    const handleStart = () => { isAnimating.current = false }
    controls.addEventListener('start', handleStart)
    return () => { controls.removeEventListener('start', handleStart) }
  }, [controls])

  useEffect(() => {
    if (!initialized.current) {
      camera.position.copy(overviewPos)
      if (controls) {
        controls.target.copy(overviewLook)
        controls.update()
      }
      initialized.current = true
    }
  }, [camera, controls, overviewPos, overviewLook])

  const prevRack = useRef(selectedRack)
  const prevReset = useRef(resetTrigger)

  useEffect(() => {
    if (!initialized.current) return

    if (resetTrigger !== prevReset.current) {
      prevReset.current = resetTrigger
      targetPos.current.copy(overviewPos)
      targetLook.current.copy(overviewLook)
      isAnimating.current = true
      return
    }

    if (prevRack.current !== selectedRack) {
      prevRack.current = selectedRack
      const pos = rackPositions?.[selectedRack]
      if (pos) {
        targetPos.current.set(pos[0] + 4, 5, pos[2] + 8)
        targetLook.current.set(pos[0], 1.5, pos[2])
      } else {
        targetPos.current.copy(overviewPos)
        targetLook.current.copy(overviewLook)
      }
      isAnimating.current = true
    }
  }, [selectedRack, resetTrigger, rackPositions, overviewPos, overviewLook])

  useFrame((_, delta) => {
    if (!isAnimating.current) return
    const lerpFactor = Math.min(1, delta * 3.5)
    camera.position.lerp(targetPos.current, lerpFactor)
    if (controls) {
      controls.target.lerp(targetLook.current, lerpFactor)
      controls.update()
    }
    if (
      camera.position.distanceTo(targetPos.current) < 0.1 &&
      (controls ? controls.target.distanceTo(targetLook.current) < 0.1 : true)
    ) {
      camera.position.copy(targetPos.current)
      if (controls) {
        controls.target.copy(targetLook.current)
        controls.update()
      }
      isAnimating.current = false
    }
  })

  return null
}

/* ═══════════════════════════════════════════════════════════════════
   THERMAL LEGEND GAUGE (HUD)
   ═══════════════════════════════════════════════════════════════════ */
function ThermalLegendGauge({ avgTemp, maxTemp, minTemp, visible }) {
  if (!visible) return null

  const tempStops = [
    { temp: 80, color: '#ff1100', label: '80°C' },
    { temp: 70, color: '#ff5500', label: '70°C' },
    { temp: 60, color: '#ff9900', label: '60°C' },
    { temp: 50, color: '#ffcc00', label: '50°C' },
    { temp: 40, color: '#88dd22', label: '40°C' },
    { temp: 30, color: '#22ccaa', label: '30°C' },
    { temp: 20, color: '#0088ff', label: '20°C' },
    { temp: 10, color: '#0044cc', label: '10°C' },
  ]

  // Clamp indicator position
  const indicatorPercent = Math.max(0, Math.min(100, ((avgTemp - 10) / 70) * 100))

  return (
    <div style={{
      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
      zIndex: 15, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    }}>
      {/* Title */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: '0.5rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.1em',
        background: 'rgba(2,4,8,0.85)', padding: '3px 8px', borderRadius: '3px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Thermometer size={10} color="#ef4444" />
        HEAT SIGNATURE
      </div>

      {/* Gauge body */}
      <div style={{
        position: 'relative', width: '32px', height: '220px',
        background: 'rgba(2,4,8,0.9)', borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '6px 4px',
        boxShadow: `0 0 ${maxTemp > 60 ? '15' : '8'}px rgba(${maxTemp > 60 ? '239,68,68' : '59,130,246'},0.15)`,
      }}>
        {/* Gradient bar */}
        <div style={{
          width: '14px', height: '100%', margin: '0 auto',
          borderRadius: '3px', position: 'relative',
          background: 'linear-gradient(to bottom, #ff1100 0%, #ff5500 12%, #ff9900 25%, #ffcc00 38%, #88dd22 50%, #22ccaa 62%, #0088ff 75%, #0044cc 100%)',
          boxShadow: '0 0 6px rgba(255,100,50,0.2)',
        }}>
          {/* Current avg temp indicator arrow */}
          <div style={{
            position: 'absolute',
            top: `${100 - indicatorPercent}%`,
            right: '-20px',
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: '2px',
          }}>
            <div style={{
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '6px solid #fff',
            }} />
            <span style={{
              fontSize: '0.6rem', fontWeight: 800, color: '#fff',
              textShadow: '0 0 4px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
            }}>
              {avgTemp.toFixed(1)}°
            </span>
          </div>
        </div>

        {/* Tick marks */}
        {tempStops.map((stop, i) => {
          const percent = ((80 - stop.temp) / 70) * 100
          return (
            <div key={i} style={{
              position: 'absolute',
              top: `${6 + (percent / 100) * (220 - 12)}px`,
              left: '-2px',
              display: 'flex', alignItems: 'center', gap: '2px',
            }}>
              <div style={{ width: '4px', height: '1px', background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: '0.4rem', color: '#8b949e', whiteSpace: 'nowrap' }}>
                {stop.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Max / Min readings */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center',
        background: 'rgba(2,4,8,0.85)', padding: '3px 8px', borderRadius: '3px',
        border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.45rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <ArrowUp size={8} color="#ef4444" />
          <span style={{ color: '#ef4444', fontWeight: 700 }}>MAX {maxTemp.toFixed(0)}°C</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <ArrowDown size={8} color="#3b82f6" />
          <span style={{ color: '#3b82f6', fontWeight: 700 }}>MIN {minTemp.toFixed(0)}°C</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   COOLANT FLOW DIAGRAM (HUD)
   ═══════════════════════════════════════════════════════════════════ */
function CoolantFlowDiagram({ powerTelemetry, visible }) {
  if (!visible) return null

  const deltaT = (powerTelemetry.chillerTempReturn - powerTelemetry.chillerTempSupply).toFixed(1)

  return (
    <div style={{
      position: 'absolute', left: '12px', bottom: '68px',
      zIndex: 15, pointerEvents: 'none',
      background: 'rgba(2,4,8,0.92)', backdropFilter: 'blur(8px)',
      borderRadius: '8px', padding: '10px 14px',
      border: '1px solid rgba(34,211,238,0.15)',
      width: '200px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Title */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px',
        fontSize: '0.55rem', fontWeight: 800, color: '#22d3ee', letterSpacing: '0.08em',
      }}>
        <Droplet size={11} color="#22d3ee" />
        COOLANT FLOW
      </div>

      {/* Flow schematic */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        {/* Supply */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.45rem', color: '#8b949e', fontWeight: 700, marginBottom: '2px' }}>SUPPLY</div>
          <div style={{
            fontSize: '0.85rem', fontWeight: 800, color: '#3b82f6',
            textShadow: '0 0 8px rgba(59,130,246,0.3)',
          }}>
            {powerTelemetry.chillerTempSupply.toFixed(1)}°C
          </div>
        </div>

        {/* Flow arrows */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, padding: '0 6px' }}>
          {/* Supply pipe */}
          <div style={{
            height: '3px', width: '100%', borderRadius: '2px',
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '30%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'coolant-flow 1.5s linear infinite',
            }} />
          </div>
          <div style={{ fontSize: '0.5rem', color: '#8b949e', fontWeight: 700 }}>
            {powerTelemetry.chillerFlowRate.toFixed(0)} L/min
          </div>
          {/* Return pipe */}
          <div style={{
            height: '3px', width: '100%', borderRadius: '2px',
            background: 'linear-gradient(270deg, #fb7185, #f43f5e)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, width: '30%', height: '100%',
              background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'coolant-flow 1.5s linear infinite',
            }} />
          </div>
        </div>

        {/* Return */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.45rem', color: '#8b949e', fontWeight: 700, marginBottom: '2px' }}>RETURN</div>
          <div style={{
            fontSize: '0.85rem', fontWeight: 800, color: '#fb7185',
            textShadow: '0 0 8px rgba(251,113,133,0.3)',
          }}>
            {powerTelemetry.chillerTempReturn.toFixed(1)}°C
          </div>
        </div>
      </div>

      {/* Delta T */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
        background: 'rgba(118,185,0,0.08)', border: '1px solid rgba(118,185,0,0.15)',
        borderRadius: '4px', padding: '4px 8px',
      }}>
        <span style={{ fontSize: '0.5rem', color: '#8b949e', fontWeight: 700 }}>ΔT</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#76b900' }}>{deltaT}°C</span>
        <span style={{ fontSize: '0.45rem', color: '#8b949e' }}>|</span>
        <span style={{ fontSize: '0.5rem', color: '#8b949e', fontWeight: 700 }}>WUE</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#22d3ee' }}>{powerTelemetry.wue.toFixed(2)}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
function ControlCenter({ theme = 'light' }) {
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [scripts, setScripts] = useState([])
  const [selectedRack, setSelectedRack] = useState(null)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [gpuStressStates, setGpuStressStates] = useState({ 0: false, 1: false })
  const [selectedScript, setSelectedScript] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [selectedVgpu, setSelectedVgpu] = useState('ALL_FLEET')
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchMessage, setDispatchMessage] = useState('')
  const [cracPumpHigh, setCracPumpHigh] = useState(false)
  const [ventReplaced, setVentReplaced] = useState(false)
  const [allocationDefragged, setAllocationDefragged] = useState(false)
  const [genActive, setGenActive] = useState(false)
  const [batteryCharging, setBatteryCharging] = useState(true)
  const [showThermal, setShowThermal] = useState(false)
  const isDarkMode = false

  const [logEntries, setLogEntries] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'Control Center initialized. All systems nominal.', level: 'info' },
  ])

  const [powerTelemetry, setPowerTelemetry] = useState({
    upsLoad: 45, upsBattery: 87, upsInput: 480, upsOutput: 480,
    genFuel: 92, genRpm: 1800, genOutput: 0,
    batteryCharge: 78, batteryTemp: 32, batteryCycles: 1240,
    pdu1Load: 62, pdu2Load: 55,
    chillerFlowRate: 240, chillerTempSupply: 12, chillerTempReturn: 28,
    waterConsumption: 180, wue: 0.31,
    mainPower: 480, backupStatus: 'STANDBY',
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setPowerTelemetry(prev => ({
        ...prev,
        upsLoad: Math.max(20, Math.min(95, prev.upsLoad + (Math.random() - 0.5) * 4)),
        upsBattery: Math.max(10, Math.min(100, prev.upsBattery + (Math.random() - 0.5) * 0.5)),
        genRpm: genActive ? 1800 + Math.random() * 20 : 0,
        genOutput: genActive ? 350 + Math.random() * 20 : 0,
        genFuel: genActive ? Math.max(5, prev.genFuel - 0.05) : prev.genFuel,
        batteryCharge: batteryCharging ? Math.min(100, prev.batteryCharge + 0.1) : Math.max(20, prev.batteryCharge - 0.15),
        batteryTemp: prev.batteryTemp + (Math.random() - 0.5) * 0.3,
        pdu1Load: Math.max(30, Math.min(90, prev.pdu1Load + (Math.random() - 0.5) * 3)),
        pdu2Load: Math.max(30, Math.min(90, prev.pdu2Load + (Math.random() - 0.5) * 3)),
        chillerFlowRate: Math.max(180, Math.min(350, prev.chillerFlowRate + (Math.random() - 0.5) * 5)),
        chillerTempSupply: 12 + (Math.random() - 0.5) * 0.5,
        chillerTempReturn: 28 + (Math.random() - 0.5) * 0.5,
        waterConsumption: Math.max(150, Math.min(250, prev.waterConsumption + (Math.random() - 0.5) * 3)),
      }))
    }, 1500)
    return () => clearInterval(interval)
  }, [genActive, batteryCharging])

  const serversList = useMemo(() => [
    { id: 'rack-gpu-0', name: 'GPU-HOST-01', type: 'gpu', gpuId: 0, label: 'ALPHA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350 },
    { id: 'rack-gpu-1', name: 'GPU-HOST-02', type: 'gpu', gpuId: 1, label: 'BETA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350 },
    { id: 'rack-gpu-2', name: 'GPU-HOST-03', type: 'gpu', gpuId: 0, label: 'GAMMA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350 },
    { id: 'rack-gpu-3', name: 'GPU-HOST-04', type: 'gpu', gpuId: 1, label: 'DELTA HOST', model: 'NVIDIA H100 v3 (32GB)', powerLimit: 350 },
    { id: 'rack-gpu-4', name: 'GPU-HOST-05', type: 'gpu', gpuId: 0, label: 'EPSILON HOST', model: 'NVIDIA GH200 (64GB)', powerLimit: 450 },
    { id: 'rack-scheduler', name: 'TASK SCHEDULER', type: 'scheduler', label: 'CONTROL CORE' },
    { id: 'rack-storage', name: 'NVMe ARRAY', type: 'storage', label: 'BLOCK STORAGE' },
    { id: 'rack-pdu-1', name: 'PDU-A', type: 'pdu', label: 'POWER DIST A', phase: 'A', capacity: 60 },
    { id: 'rack-pdu-2', name: 'PDU-B', type: 'pdu', label: 'POWER DIST B', phase: 'B', capacity: 60 },
    { id: 'rack-ups', name: 'MAIN UPS', type: 'ups', label: 'UPS SYSTEM', rating: 500, batteryLevel: powerTelemetry.upsBattery, load: powerTelemetry.upsLoad },
    { id: 'rack-generator', name: 'DIESEL GEN', type: 'generator', label: 'BACKUP GEN', rating: 600, fuelLevel: powerTelemetry.genFuel, rpm: powerTelemetry.genRpm },
    { id: 'rack-battery', name: 'BATTERY BANK', type: 'battery', label: 'LI-ION BANK', chargeLevel: powerTelemetry.batteryCharge, temp: powerTelemetry.batteryTemp },
    { id: 'rack-chiller', name: 'COOLANT CHILLER', type: 'chiller', label: 'WATER CHILLER' },
    { id: 'rack-quantum', name: 'QPU-CORE-01', type: 'quantum', label: 'QUANTUM AI CORE', model: '1,024-Qubit Dilution Cryo QPU' },
    { id: 'crac-01', name: 'CRAC Unit A', type: 'crac', label: 'COOLING A' },
    { id: 'crac-02', name: 'CRAC Unit B', type: 'crac', label: 'COOLING B' },
  ], [powerTelemetry])

  // Zone-based rack positions matching reference layout
  const rackPositions = useMemo(() => ({
    // IT Zone (center) — GPU racks in parallel rows with hot/cold aisle
    'rack-gpu-0': [-4.5, 0, -4],
    'rack-gpu-1': [-4.5, 0, 4],
    'rack-gpu-2': [-1.5, 0, -4],
    'rack-gpu-3': [-1.5, 0, 4],
    'rack-gpu-4': [-3.0, 0, 0],
    'rack-scheduler': [2.5, 0, -2],
    'rack-storage': [2.5, 0, 3],
    // Quantum AI Zone (right annex)
    'rack-quantum': [7, 0, -7],
    // Power Zone (left)
    'rack-pdu-1': [-12, 0, -5],
    'rack-pdu-2': [-12, 0, 5],
    'rack-ups': [-14, 0, 0],
    'rack-generator': [-16, 0, 4],
    'rack-battery': [-14, 0, -5],
    // Cooling Zone (inside server room right side)
    'rack-chiller': [14, 0, 0],
    'crac-01': [12, 0, -5],
    'crac-02': [12, 0, 5],
  }), [])

  const rackPosArray = useMemo(() => serversList.map(s => ({
    ...s,
    pos: rackPositions[s.id]
  })), [serversList, rackPositions])

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/metrics')
    ws.onopen = () => { setIsConnected(true); addLog('Telemetry stream connected.', 'success') }
    ws.onclose = () => { setIsConnected(false); addLog('Telemetry connection lost.', 'error') }
    ws.onmessage = (event) => {
      try { setData(JSON.parse(event.data)) } catch (e) {}
    }
    fetch('http://localhost:8000/api/datasets').then(r => r.json()).then(res => {
      setDatasets(res.datasets || [])
      if (res.datasets?.length > 0) setSelectedDataset(res.datasets[0])
    }).catch(() => {})
    fetch('http://localhost:8000/api/scripts').then(r => r.json()).then(res => {
      setScripts(res.scripts || [])
      if (res.scripts?.length > 0) setSelectedScript(res.scripts[0])
    }).catch(() => {})
    return () => ws.close()
  }, [])

  const addLog = useCallback((msg, level = 'info') => {
    setLogEntries(prev => [...prev.slice(-19), {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      msg, level
    }])
  }, [])

  const coolingOffset = (ventReplaced ? 4.5 : 0) + (cracPumpHigh ? 6.0 : 0) + (allocationDefragged ? 2.0 : 0)

  const getGpuTemperature = useCallback((gpuId) => {
    if (gpuId === null || gpuId === undefined) return 38
    const gpuBack = data?.physical_gpus?.[gpuId]
    const baseTemp = gpuBack ? gpuBack.temperature : 40
    return Math.max(30, baseTemp - coolingOffset)
  }, [data, coolingOffset])

  const getGpuUtil = useCallback((gpuId) => {
    if (gpuId === null || gpuId === undefined) return 0
    return data?.physical_gpus?.[gpuId]?.gpu_utilization || 0
  }, [data])

  const getGpuMetrics = useCallback((gpuId) => {
    if (gpuId === null || gpuId === undefined) return { gpu_utilization: 0, memory_used: 0, memory_total: 32768, temperature: 40, power_draw: 50 }
    const gpuBack = data?.physical_gpus?.[gpuId] || { gpu_utilization: 0, memory_used: 0, memory_total: 32768, temperature: 40, power_draw: 50 }
    return { ...gpuBack, temperature: getGpuTemperature(gpuId) }
  }, [data, getGpuTemperature])

  const gpuTemps = useMemo(() => [
    getGpuTemperature(0),
    getGpuTemperature(1),
    getGpuTemperature(0) + 2,
    getGpuTemperature(1) + 1,
    getGpuTemperature(0) + 4
  ], [getGpuTemperature])

  const handleToggleStress = async (gpuId) => {
    const nextState = !gpuStressStates[gpuId]
    try {
      const res = await fetch(`http://localhost:8000/api/gpu/${gpuId}/stress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stress: nextState })
      })
      const result = await res.json()
      if (result.status === 'success') {
        setGpuStressStates(prev => ({ ...prev, [gpuId]: nextState }))
        addLog(`GPU ${gpuId} stress ${nextState ? 'ACTIVATED' : 'DEACTIVATED'}.`, nextState ? 'warning' : 'success')
      }
    } catch (err) {
      addLog(`Failed to toggle stress on GPU ${gpuId}.`, 'error')
    }
  }

  const handleDispatchJob = async () => {
    setIsDispatching(true); setDispatchMessage('Initializing container sandbox...')
    addLog(`Dispatching job: ${selectedScript} => ${selectedVgpu}`, 'info')
    try {
      const res = await fetch('http://localhost:8000/api/jobs/ml', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vgpu_id: selectedVgpu, script_name: selectedScript, dataset_name: selectedDataset || null })
      })
      const result = await res.json()
      if (result.status === 'completed') {
        setDispatchMessage(`Success! Accuracy: ${result.accuracy?.toFixed(2)}%, Speed: ${result.speed?.toFixed(0)} samples/sec.`)
        addLog(`Job completed: ${result.accuracy?.toFixed(2)}% accuracy`, 'success')
      } else {
        setDispatchMessage('Execution terminated with system exception.')
        addLog('Job execution terminated.', 'error')
      }
    } catch (err) {
      setDispatchMessage('Connection error to scheduler.')
      addLog('Job dispatch connection error.', 'error')
    } finally { setIsDispatching(false) }
  }

  const handleToggleGenerator = () => {
    const next = !genActive
    setGenActive(next)
    addLog(`Backup generator ${next ? 'ACTIVATED (emergency power online)' : 'DEACTIVATED (returned to standby)'}.`, next ? 'warning' : 'success')
  }

  const handleToggleBattery = () => {
    const next = !batteryCharging
    setBatteryCharging(next)
    addLog(`Battery bank ${next ? 'CHARGING' : 'DISCHARGING (providing backup power)'}.`, next ? 'success' : 'warning')
  }

  const activeJobs = data?.scheduler?.active_jobs || 0
  const queueLength = data?.scheduler?.queue_length || 0
  const totalPowerDraw = (data?.physical_gpus?.reduce((acc, g) => acc + g.power_draw, 0) || 100) + powerTelemetry.pdu1Load * 2 + powerTelemetry.pdu2Load * 2
  const avgTemp = data?.physical_gpus?.length
    ? data.physical_gpus.reduce((acc, g) => acc + Math.max(30, g.temperature - coolingOffset), 0) / data.physical_gpus.length
    : Math.max(30, 40 - coolingOffset)
  const maxTemp = Math.max(...gpuTemps, 55) // Include generator at 55
  const minTemp = Math.min(...gpuTemps, 15) // Include chiller at 15
  const totalVgpus = data?.vgpu_instances?.length || 0
  const totalSitePower = totalPowerDraw + 180 + powerTelemetry.chillerFlowRate * 0.3

  const selectedRackData = selectedRack ? serversList.find(s => s.id === selectedRack) : null
  const childVgpus = selectedRackData?.type === 'gpu' && data?.vgpu_instances
    ? data.vgpu_instances.filter(v => v.physical_gpu_id === selectedRackData.gpuId) : []

  const panelBg = isDarkMode ? 'rgba(8, 12, 18, 0.94)' : 'rgba(255, 255, 255, 0.96)'
  const panelBorder = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.12)'
  const inputStyle = {
    width: '100%', padding: '6px 8px', fontSize: '0.7rem',
    background: isDarkMode ? '#050a0f' : '#f8fafc',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.15)'}`,
    color: isDarkMode ? '#c9d1d9' : '#0f172a',
    borderRadius: '4px', outline: 'none'
  }

  return (
    <div style={{ height: '100%', position: 'relative', background: isDarkMode ? '#060912' : '#e2e8f0', transition: 'background 0.5s ease', overflow: 'hidden' }}>
      <style>{`
        @keyframes cc-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes cc-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes cc-glow { 0%,100% { box-shadow: 0 0 5px rgba(118,185,0,0.2); } 50% { box-shadow: 0 0 15px rgba(118,185,0,0.4); } }
        @keyframes cc-bar-fill { from { width: 0%; } }
        @keyframes coolant-flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        .cc-panel-hover:hover { background: rgba(118,185,0,0.08) !important; border-color: rgba(118,185,0,0.3) !important; }
      `}</style>

      <Canvas
        shadows dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: isDarkMode ? 1.35 : 1.1 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        onPointerMissed={() => setSelectedRack(null)}
      >
        <CameraController selectedRack={selectedRack} rackPositions={rackPositions} resetTrigger={resetTrigger} />
        <SceneLighting isDarkMode={isDarkMode} />
        <Suspense fallback={null}>
          <DataCenterFloor isDarkMode={isDarkMode} />
          <ProfessionalDatacenterPipelines />
          <BuildingShell isDarkMode={isDarkMode} />
          <Ceiling />
          <OverheadBusway />
          <AmbientParticles />
          <OverheadCableTray rackPositions={rackPosArray} />
          <ThermalHeatMap rackPositions={rackPosArray} gpuTemps={gpuTemps} visible={showThermal} />
          <HeatColumns rackPositions={rackPosArray} gpuTemps={gpuTemps} visible={showThermal} />
          <AirflowStreams rackPositions={rackPosArray} gpuTemps={gpuTemps} visible={showThermal} />
          <HeatGlowHalos rackPositions={rackPosArray} gpuTemps={gpuTemps} visible={showThermal} />
          <FireSuppression />
          <QuantumInterconnect />
          {serversList.map(rack => (
            <ServerRack
              key={rack.id}
              position={rackPositions[rack.id]}
              rackData={rack}
              isSelected={selectedRack === rack.id}
              onClick={() => setSelectedRack(rack.id === selectedRack ? null : rack.id)}
              gpuTemp={rack.type === 'gpu' ? getGpuTemperature(rack.gpuId) : null}
              gpuUtil={rack.type === 'gpu' ? getGpuUtil(rack.gpuId) : 0}
              isStressed={rack.type === 'gpu' ? gpuStressStates[rack.gpuId] : false}
            />
          ))}
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping={true}
          dampingFactor={0.05}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          rotateSpeed={0.7}
          zoomSpeed={0.9}
          panSpeed={0.8}
          minDistance={3}
          maxDistance={55}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={0.05}
        />
      </Canvas>

      {/* Thermal Legend Gauge */}
      <ThermalLegendGauge avgTemp={avgTemp} maxTemp={maxTemp} minTemp={minTemp} visible={showThermal} />

      {/* Coolant Flow Diagram */}
      <CoolantFlowDiagram powerTelemetry={powerTelemetry} visible={showThermal} />

      {/* HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: 'none',
        background: isDarkMode
          ? 'linear-gradient(180deg, rgba(2,4,8,0.98) 0%, rgba(5,10,16,0.96) 70%, rgba(5,10,16,0.85) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.96) 70%, rgba(241,245,249,0.90) 100%)',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(118,185,0,0.15)' : 'rgba(15,23,42,0.15)'}`,
        padding: '0.75rem 1.25rem',
        boxShadow: isDarkMode ? 'none' : '0 2px 10px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Monitor size={16} color={isDarkMode ? '#76b900' : '#15803d'} />
              <span style={{ fontSize: '0.6rem', color: isDarkMode ? '#76b900' : '#15803d', fontWeight: 800, letterSpacing: '0.08em' }}>
                AI DATA CENTER CONTROL CENTER
              </span>
              <span style={{
                fontSize: '0.55rem', padding: '1px 6px', borderRadius: '3px',
                background: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: isConnected ? (isDarkMode ? '#22c55e' : '#15803d') : '#ef4444', fontWeight: 700,
                animation: 'cc-pulse 2s ease-in-out infinite',
              }}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
              <button
                onClick={() => {
                  setSelectedRack(null)
                  setResetTrigger(prev => prev + 1)
                }}
                className="cc-panel-hover"
                style={{
                  background: isDarkMode ? 'rgba(118,185,0,0.12)' : 'rgba(21,128,61,0.1)',
                  border: `1px solid ${isDarkMode ? 'rgba(118,185,0,0.3)' : 'rgba(21,128,61,0.3)'}`,
                  color: isDarkMode ? '#76b900' : '#15803d',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={10} /> RESET CAMERA
              </button>
              {/* Thermal toggle */}
              <button
                onClick={() => setShowThermal(!showThermal)}
                className="cc-panel-hover"
                style={{
                  background: showThermal ? 'rgba(239,68,68,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'),
                  border: `1px solid ${showThermal ? 'rgba(239,68,68,0.3)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.15)')}`,
                  color: showThermal ? '#ef4444' : (isDarkMode ? '#8b949e' : '#475569'),
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {showThermal ? <Eye size={10} /> : <EyeOff size={10} />}
                THERMAL {showThermal ? 'ON' : 'OFF'}
              </button>

              {genActive && (
                <span style={{
                  fontSize: '0.55rem', padding: '1px 6px', borderRadius: '3px',
                  background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700,
                  animation: 'cc-pulse 1s ease-in-out infinite',
                }}>
                  GENERATOR ACTIVE
                </span>
              )}
            </div>
            <div style={{
              fontSize: '0.95rem', fontWeight: 800,
              color: isDarkMode ? '#e2e8f0' : '#0f172a',
              marginTop: '2px',
              textShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
            }}>
              Server Racks • Power Systems • Backup • Water Cooling • Monitoring
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', pointerEvents: 'auto' }}>
            {[
              { icon: Thermometer, label: 'TEMP', value: `${avgTemp.toFixed(1)}°C`, color: avgTemp > 65 ? '#ef4444' : (isDarkMode ? '#76b900' : '#15803d') },
              { icon: Zap, label: 'POWER', value: `${totalPowerDraw.toFixed(0)}W`, color: '#d97706' },
              { icon: Droplet, label: 'WATER', value: `${powerTelemetry.waterConsumption.toFixed(0)} L/h`, color: '#0891b2' },
              { icon: Battery, label: 'UPS', value: `${powerTelemetry.upsBattery.toFixed(0)}%`, color: powerTelemetry.upsBattery < 30 ? '#ef4444' : '#ea580c' },
              { icon: Activity, label: 'JOBS', value: `${activeJobs} / ${queueLength}Q`, color: '#9333ea' },
              { icon: Layers, label: 'vGPU', value: `${totalVgpus}`, color: '#2563eb' },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  background: isDarkMode ? 'rgba(6,10,18,0.95)' : 'rgba(255,255,255,0.98)',
                  padding: '5px 10px', borderRadius: '6px',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.15)'}`,
                  boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Icon size={10} color={stat.color} />
                    <span style={{ fontSize: '0.5rem', color: isDarkMode ? '#8b949e' : '#475569', fontWeight: 700 }}>{stat.label}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: stat.color }}>{stat.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* System status bar */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '6px', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.55rem', color: isDarkMode ? '#b0b8c4' : '#334155', fontWeight: 600 }}>
            <Fuel size={10} color={powerTelemetry.genFuel > 30 ? '#16a34a' : '#ef4444'} />
            Gen Fuel: {powerTelemetry.genFuel.toFixed(0)}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.55rem', color: isDarkMode ? '#b0b8c4' : '#334155', fontWeight: 600 }}>
            <Battery size={10} color={batteryCharging ? '#16a34a' : '#ea580c'} />
            Battery: {batteryCharging ? 'CHARGING' : 'DISCHARGING'} ({powerTelemetry.batteryCharge.toFixed(0)}%)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.55rem', color: isDarkMode ? '#b0b8c4' : '#334155', fontWeight: 600 }}>
            <Droplet size={10} color="#0891b2" />
            Coolant: {powerTelemetry.chillerFlowRate.toFixed(0)} L/min | {powerTelemetry.chillerTempSupply.toFixed(1)}°C → {powerTelemetry.chillerTempReturn.toFixed(1)}°C
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.55rem', color: isDarkMode ? '#b0b8c4' : '#334155', fontWeight: 600 }}>
            <Cpu size={10} color={isDarkMode ? '#76b900' : '#15803d'} />
            pPUE: {((totalSitePower / (totalPowerDraw + 1)) * 0.92).toFixed(3)}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedRackData && (
        <div style={{
          position: 'absolute', top: '100px', right: '0', bottom: '56px', width: '340px',
          background: panelBg, backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${panelBorder}`, zIndex: 20,
          animation: 'cc-slide-in 0.3s ease-out', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '0.75rem 1rem', borderBottom: `1px solid ${panelBorder}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            background: isDarkMode ? 'rgba(15,20,28,0.5)' : 'rgba(241,245,249,0.6)',
          }}>
            <div>
              <div style={{
                fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.05em',
                color: selectedRackData.type === 'gpu' ? (gpuStressStates[selectedRackData.gpuId] ? '#ef4444' : (isDarkMode ? '#76b900' : '#15803d'))
                  : selectedRackData.type === 'scheduler' ? '#9333ea'
                  : selectedRackData.type === 'storage' ? '#d97706'
                  : selectedRackData.type === 'ups' ? '#ea580c'
                  : selectedRackData.type === 'generator' ? '#ef4444'
                  : selectedRackData.type === 'battery' ? '#0891b2'
                  : selectedRackData.type === 'pdu' ? '#d97706'
                  : selectedRackData.type === 'chiller' ? '#0891b2'
                  : '#2563eb',
              }}>
                {selectedRackData.label}
              </div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: isDarkMode ? '#fff' : '#0f172a' }}>{selectedRackData.name}</h4>
              {selectedRackData.model && <div style={{ fontSize: '0.6rem', color: isDarkMode ? '#8b949e' : '#475569', marginTop: '2px' }}>{selectedRackData.model}</div>}
            </div>
            <button onClick={() => setSelectedRack(null)}
              style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.15)'}`, borderRadius: '4px', color: isDarkMode ? '#8b949e' : '#475569', cursor: 'pointer', padding: '2px 6px', fontSize: '0.85rem' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>

            {selectedRackData.type === 'gpu' && (() => {
              const metrics = getGpuMetrics(selectedRackData.gpuId)
              const isStressed = gpuStressStates[selectedRackData.gpuId]
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { label: 'TEMP', value: `${metrics.temperature.toFixed(1)}°C`, color: metrics.temperature > 75 ? '#ef4444' : metrics.temperature > 60 ? '#f59e0b' : '#76b900', icon: Thermometer },
                      { label: 'POWER', value: `${metrics.power_draw.toFixed(0)}W`, color: '#f59e0b', icon: Zap },
                      { label: 'GPU UTIL', value: `${metrics.gpu_utilization.toFixed(1)}%`, color: '#76b900', icon: Activity },
                      { label: 'VRAM', value: `${(metrics.memory_used / 1024).toFixed(1)}G`, color: '#3b82f6', icon: Database },
                    ].map((m, i) => {
                      const MIcon = m.icon
                      return (
                        <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                            <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                      <span style={{ color: '#8b949e' }}>Compute Load</span>
                      <span style={{ fontWeight: 700 }}>{metrics.gpu_utilization.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.gpu_utilization}%`, background: `linear-gradient(90deg, #76b900, ${metrics.gpu_utilization > 80 ? '#ef4444' : '#76b900'})`, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                      <span style={{ color: '#8b949e' }}>Memory Usage</span>
                      <span style={{ fontWeight: 700 }}>{(metrics.memory_used / 1024).toFixed(1)}G / {(metrics.memory_total / 1024).toFixed(0)}G</span>
                    </div>
                    <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(metrics.memory_used / metrics.memory_total) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <button onClick={() => handleToggleStress(selectedRackData.gpuId)} className="cc-panel-hover"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: isStressed ? 'rgba(239,68,68,0.12)' : 'rgba(118,185,0,0.08)', border: `1px solid ${isStressed ? 'rgba(239,68,68,0.3)' : 'rgba(118,185,0,0.2)'}`, color: isStressed ? '#ef4444' : '#76b900', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isStressed ? <Square size={13} /> : <Play size={13} />}
                    {isStressed ? 'STOP STRESS TEST' : 'TRIGGER STRESS TEST'}
                  </button>
                  <div style={{ borderTop: `1px solid ${panelBorder}`, paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={12} color="#3b82f6" /> Virtual Nodes ({childVgpus.length})
                    </div>
                    {childVgpus.length === 0 ? (
                      <div style={{ fontSize: '0.6rem', color: '#8b949e', padding: '0.5rem', background: '#070b10', borderRadius: '4px', textAlign: 'center' }}>No vGPU slices provisioned.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                        {childVgpus.map(v => (
                          <div key={v.id} style={{ background: '#070b10', padding: '4px 8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', border: `1px solid ${panelBorder}` }}>
                            <span style={{ color: '#76b900', fontFamily: 'monospace' }}>node-{v.id.substring(0, 6)}</span>
                            <span style={{ color: '#8b949e' }}>{(v.vram_limit / 1024).toFixed(0)}G VRAM</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}

            {selectedRackData.type === 'quantum' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'QUBITS', value: '1,024', color: '#c084fc', icon: Cpu },
                    { label: 'CRYO TEMP', value: '15 mK', color: '#22d3ee', icon: Thermometer },
                    { label: 'FIDELITY', value: '99.94%', color: '#76b900', icon: Shield },
                    { label: 'T2 COHERENCE', value: '120 µs', color: '#f59e0b', icon: Activity },
                  ].map((m, i) => {
                    const MIcon = m.icon
                    return (
                      <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                          <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Architecture:</span> Superconducting Transmon Qubits<br />
                  <span style={{ color: '#8b949e' }}>Cooling:</span> He3/He4 Dilution Refrigerator (15mK)<br />
                  <span style={{ color: '#8b949e' }}>Interconnect:</span> Optical Quantum Bus (10 Gbps Q-Link)<br />
                  <span style={{ color: '#8b949e' }}>Mode:</span> Hybrid Quantum-Classical AI Acceleration
                </div>
                <div style={{ borderTop: `1px solid ${panelBorder}`, paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={12} color="#c084fc" /> Active Quantum-AI Pipelines
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ background: '#070b10', padding: '6px 8px', borderRadius: '4px', border: `1px solid ${panelBorder}`, fontSize: '0.6rem' }}>
                      <div style={{ color: '#c084fc', fontWeight: 700 }}>VQE-ResNet-101 Hybrid Optimizer</div>
                      <div style={{ color: '#8b949e', fontSize: '0.55rem', marginTop: '2px' }}>Ansatz Depth: 48 • 1,024 Qubits Active</div>
                    </div>
                    <div style={{ background: '#070b10', padding: '6px 8px', borderRadius: '4px', border: `1px solid ${panelBorder}`, fontSize: '0.6rem' }}>
                      <div style={{ color: '#22d3ee', fontWeight: 700 }}>Quantum Transformer Attention Matrix</div>
                      <div style={{ color: '#8b949e', fontSize: '0.55rem', marginTop: '2px' }}>Gate Fidelity: 99.94% • Executing on Cluster</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedRackData.type === 'scheduler' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700, marginBottom: '2px' }}>RUNNING</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a855f7' }}>{activeJobs}</div>
                  </div>
                  <div style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700, marginBottom: '2px' }}>QUEUED</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{queueLength}</div>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${panelBorder}`, paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={12} color="#a855f7" /> Dispatch ML Pipeline
                  </div>
                  <select value={selectedScript} onChange={e => setSelectedScript(e.target.value)} style={inputStyle}>
                    {scripts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)} style={inputStyle}>
                    <option value="">Synthetic Data</option>
                    {datasets.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={selectedVgpu} onChange={e => setSelectedVgpu(e.target.value)} style={inputStyle}>
                    <option value="ALL_FLEET">Distributed Fleet Cluster</option>
                    {data?.vgpu_instances?.map(v => (
                      <option key={v.id} value={v.id}>vGPU-{v.id.substring(0, 8)} (Host 0{v.physical_gpu_id + 1})</option>
                    ))}
                  </select>
                  <button onClick={handleDispatchJob} disabled={isDispatching} className="cc-panel-hover"
                    style={{ padding: '0.5rem', borderRadius: '6px', background: isDispatching ? 'rgba(168,85,247,0.1)' : 'rgba(118,185,0,0.1)', border: `1px solid ${isDispatching ? 'rgba(168,85,247,0.3)' : 'rgba(118,185,0,0.3)'}`, color: isDispatching ? '#a855f7' : '#76b900', fontSize: '0.7rem', fontWeight: 700, cursor: isDispatching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isDispatching ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />}
                    {isDispatching ? 'EXECUTING...' : 'DISPATCH PIPELINE'}
                  </button>
                  {dispatchMessage && (
                    <div style={{ padding: '6px 8px', fontSize: '0.6rem', borderRadius: '4px', background: dispatchMessage.includes('✓') ? 'rgba(34,197,94,0.08)' : dispatchMessage.includes('✗') ? 'rgba(239,68,68,0.08)' : '#070b10', border: `1px solid ${panelBorder}`, color: '#c9d1d9', fontFamily: 'monospace' }}>
                      {dispatchMessage}
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedRackData.type === 'storage' && (
              <>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>RAID:</span> RAID-6 Distributed NVMe<br />
                  <span style={{ color: '#8b949e' }}>Size:</span> 48.0 TB | Used: 14.2 TB<br />
                  <span style={{ color: '#8b949e' }}>Gateway:</span> Ceph LIO Multipath
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#8b949e', marginBottom: '4px' }}>STORAGE CAPACITY</div>
                  <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '29.6%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '3px' }} />
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8b949e', marginTop: '3px' }}>14.2 / 48.0 TB (29.6%)</div>
                </div>
                <div style={{ borderTop: `1px solid ${panelBorder}`, paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={12} color="#f59e0b" /> Datasets ({datasets.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '150px', overflowY: 'auto' }}>
                    {datasets.map(d => (
                      <div key={d} style={{ background: '#070b10', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6rem', border: `1px solid ${panelBorder}` }}>
                        <Database size={10} color="#f59e0b" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedRackData.type === 'ups' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'LOAD', value: `${powerTelemetry.upsLoad.toFixed(0)}%`, color: powerTelemetry.upsLoad > 80 ? '#ef4444' : '#f97316', icon: Zap },
                    { label: 'BATTERY', value: `${powerTelemetry.upsBattery.toFixed(0)}%`, color: powerTelemetry.upsBattery < 30 ? '#ef4444' : '#f97316', icon: Battery },
                    { label: 'INPUT', value: `${powerTelemetry.upsInput}V`, color: '#76b900', icon: Activity },
                    { label: 'OUTPUT', value: `${powerTelemetry.upsOutput}V`, color: '#76b900', icon: Monitor },
                  ].map((m, i) => {
                    const MIcon = m.icon
                    return (
                      <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                          <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: '#8b949e' }}>UPS Load Capacity</span>
                    <span style={{ fontWeight: 700, color: powerTelemetry.upsLoad > 80 ? '#ef4444' : '#f97316' }}>{powerTelemetry.upsLoad.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${powerTelemetry.upsLoad}%`, background: `linear-gradient(90deg, #f97316, ${powerTelemetry.upsLoad > 80 ? '#ef4444' : '#f97316'})`, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Rating:</span> {selectedRackData.rating || 500} kVA<br />
                  <span style={{ color: '#8b949e' }}>Efficiency:</span> 96.2%<br />
                  <span style={{ color: '#8b949e' }}>Runtime:</span> {((powerTelemetry.upsBattery / 100) * 18).toFixed(1)} min @ full load<br />
                  <span style={{ color: '#8b949e' }}>Backup:</span> {powerTelemetry.backupStatus}
                </div>
              </>
            )}

            {selectedRackData.type === 'generator' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'STATUS', value: genActive ? 'ACTIVE' : 'STANDBY', color: genActive ? '#ef4444' : '#22c55e', icon: Power },
                    { label: 'FUEL', value: `${powerTelemetry.genFuel.toFixed(0)}%`, color: powerTelemetry.genFuel < 20 ? '#ef4444' : '#f59e0b', icon: Fuel },
                    { label: 'RPM', value: `${powerTelemetry.genRpm}`, color: genActive ? '#76b900' : '#8b949e', icon: Activity },
                    { label: 'OUTPUT', value: `${powerTelemetry.genOutput.toFixed(0)} kW`, color: genActive ? '#ef4444' : '#8b949e', icon: Zap },
                  ].map((m, i) => {
                    const MIcon = m.icon
                    return (
                      <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                          <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: '#8b949e' }}>Fuel Level</span>
                    <span style={{ fontWeight: 700, color: powerTelemetry.genFuel < 20 ? '#ef4444' : '#f59e0b' }}>{powerTelemetry.genFuel.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${powerTelemetry.genFuel}%`, background: `linear-gradient(90deg, #f59e0b, ${powerTelemetry.genFuel < 20 ? '#ef4444' : '#f59e0b'})`, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <button onClick={handleToggleGenerator} className="cc-panel-hover"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: genActive ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)', border: `1px solid ${genActive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`, color: genActive ? '#ef4444' : '#22c55e', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {genActive ? <Square size={13} /> : <Play size={13} />}
                  {genActive ? 'SHUT DOWN GENERATOR' : 'ACTIVATE GENERATOR'}
                </button>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Rating:</span> {selectedRackData.rating || 600} kVA<br />
                  <span style={{ color: '#8b949e' }}>Type:</span> Diesel Generator Set<br />
                  <span style={{ color: '#8b949e' }}>Fuel Tank:</span> 1,200 Liters<br />
                  <span style={{ color: '#8b949e' }}>Runtime:</span> {genActive ? `${(powerTelemetry.genFuel / 100 * 48).toFixed(1)}h remaining` : 'Standby'}
                </div>
              </>
            )}

            {selectedRackData.type === 'battery' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'CHARGE', value: `${powerTelemetry.batteryCharge.toFixed(0)}%`, color: powerTelemetry.batteryCharge < 30 ? '#ef4444' : '#06b6d4', icon: Battery },
                    { label: 'TEMP', value: `${powerTelemetry.batteryTemp.toFixed(1)}°C`, color: powerTelemetry.batteryTemp > 40 ? '#ef4444' : '#06b6d4', icon: Thermometer },
                    { label: 'CYCLES', value: `${powerTelemetry.batteryCycles}`, color: '#8b949e', icon: RefreshCw },
                    { label: 'MODE', value: batteryCharging ? 'CHARGE' : 'DISCHARGE', color: batteryCharging ? '#22c55e' : '#f97316', icon: Activity },
                  ].map((m, i) => {
                    const MIcon = m.icon
                    return (
                      <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                          <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: '#8b949e' }}>State of Charge</span>
                    <span style={{ fontWeight: 700, color: powerTelemetry.batteryCharge < 30 ? '#ef4444' : '#06b6d4' }}>{powerTelemetry.batteryCharge.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${powerTelemetry.batteryCharge}%`, background: `linear-gradient(90deg, #06b6d4, ${powerTelemetry.batteryCharge < 30 ? '#ef4444' : '#06b6d4'})`, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <button onClick={handleToggleBattery} className="cc-panel-hover"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: batteryCharging ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.12)', border: `1px solid ${batteryCharging ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.3)'}`, color: batteryCharging ? '#22c55e' : '#f97316', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {batteryCharging ? <Square size={13} /> : <Play size={13} />}
                  {batteryCharging ? 'STOP CHARGING (DISCHARGE)' : 'START CHARGING'}
                </button>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Capacity:</span> 2.4 MWh Lithium-Ion<br />
                  <span style={{ color: '#8b949e' }}>Chemistry:</span> LFP (LiFePO4)<br />
                  <span style={{ color: '#8b949e' }}>SOH:</span> 94.2%<br />
                  <span style={{ color: '#8b949e' }}>Backup Duration:</span> ~24 min @ full load
                </div>
              </>
            )}

            {selectedRackData.type === 'pdu' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'PHASE', value: selectedRackData.phase || 'A', color: '#eab308', icon: Zap },
                    { label: 'LOAD', value: `${(selectedRackData.id === 'rack-pdu-1' ? powerTelemetry.pdu1Load : powerTelemetry.pdu2Load).toFixed(0)}%`, color: '#f59e0b', icon: Activity },
                    { label: 'CAPACITY', value: `${selectedRackData.capacity || 60}A`, color: '#76b900', icon: Power },
                    { label: 'RATING', value: '208V', color: '#3b82f6', icon: Monitor },
                  ].map((m, i) => {
                    const MIcon = m.icon
                    return (
                      <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                          <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: '#8b949e' }}>Power Load</span>
                    <span style={{ fontWeight: 700 }}>{(selectedRackData.id === 'rack-pdu-1' ? powerTelemetry.pdu1Load : powerTelemetry.pdu2Load).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(selectedRackData.id === 'rack-pdu-1' ? powerTelemetry.pdu1Load : powerTelemetry.pdu2Load)}%`, background: 'linear-gradient(90deg, #eab308, #f59e0b)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Input:</span> 480V 3-Phase<br />
                  <span style={{ color: '#8b949e' }}>Output:</span> 208V / {selectedRackData.capacity || 60}A<br />
                  <span style={{ color: '#8b949e' }}>Outlets:</span> 42 C13 + 6 C19<br />
                  <span style={{ color: '#8b949e' }}>Serving:</span> {selectedRackData.id === 'rack-pdu-1' ? 'GPU-HOST-01, Scheduler' : 'GPU-HOST-02, Storage'}
                </div>
              </>
            )}

            {selectedRackData.type === 'chiller' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'FLOW', value: `${powerTelemetry.chillerFlowRate.toFixed(0)} L/min`, color: '#22d3ee', icon: Droplet },
                    { label: 'SUPPLY', value: `${powerTelemetry.chillerTempSupply.toFixed(1)}°C`, color: '#22d3ee', icon: Thermometer },
                    { label: 'RETURN', value: `${powerTelemetry.chillerTempReturn.toFixed(1)}°C`, color: '#fb7185', icon: Thermometer },
                    { label: 'DELTA T', value: `${(powerTelemetry.chillerTempReturn - powerTelemetry.chillerTempSupply).toFixed(1)}°C`, color: '#76b900', icon: Activity },
                  ].map((m, i) => {
                    const MIcon = m.icon
                    return (
                      <div key={i} style={{ background: '#070b10', border: `1px solid ${panelBorder}`, borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '3px' }}>
                          <MIcon size={10} color="#8b949e" /><span style={{ fontSize: '0.55rem', color: '#8b949e', fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: '#8b949e' }}>Cooling Capacity</span>
                    <span style={{ fontWeight: 700, color: '#22d3ee' }}>{(powerTelemetry.chillerFlowRate / 350 * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#0a0f14', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${powerTelemetry.chillerFlowRate / 350 * 100}%`, background: 'linear-gradient(90deg, #22d3ee, #3b82f6)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Cooling Capacity:</span> 350 kW<br />
                  <span style={{ color: '#8b949e' }}>Water Consumption:</span> {powerTelemetry.waterConsumption.toFixed(0)} L/hr<br />
                  <span style={{ color: '#8b949e' }}>WUE:</span> {powerTelemetry.wue.toFixed(2)} L/kWh<br />
                  <span style={{ color: '#8b949e' }}>Serving:</span> GPU-HOST-01, GPU-HOST-02
                </div>
              </>
            )}

            {selectedRackData.type === 'crac' && (
              <>
                <div style={{ background: '#070b10', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${panelBorder}`, fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  <span style={{ color: '#8b949e' }}>Unit:</span> CRAC HVAC Air Handler<br />
                  <span style={{ color: '#8b949e' }}>Status:</span> {cracPumpHigh ? 'HIGH FLOW' : 'Normal Flow'}<br />
                  <span style={{ color: '#8b949e' }}>Coolant:</span> Liquid loop active<br />
                  <span style={{ color: '#8b949e' }}>Offset:</span> {coolingOffset.toFixed(1)}°C reduction
                </div>
                <div style={{ background: '#050a0f', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${panelBorder}`, fontSize: '0.6rem', color: '#22c55e', fontFamily: 'monospace', minHeight: '60px' }}>
                  [diag] CRAC loop flow: {cracPumpHigh ? 'HIGH' : 'nominal'}.<br />
                  [diag] Fan speed check: OK.<br />
                  [diag] Coolant margins: within {cracPumpHigh ? '85' : '100'}% boundary.<br />
                  [diag] Pump RPM: {cracPumpHigh ? '2800' : '1400'}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Bottom Command Bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '56px', zIndex: 15,
        background: 'linear-gradient(0deg, rgba(2,4,8,0.97) 60%, rgba(5,10,16,0.85) 100%)',
        borderTop: `1px solid ${panelBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => { setCracPumpHigh(!cracPumpHigh); addLog(`CRAC pump ${!cracPumpHigh ? 'HIGH' : 'NORMAL'}.`, cracPumpHigh ? 'info' : 'success') }}
            className="cc-panel-hover"
            style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: cracPumpHigh ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${cracPumpHigh ? 'rgba(59,130,246,0.3)' : panelBorder}`, color: cracPumpHigh ? '#60a5fa' : '#8b949e', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Fan size={12} /> COOLING: {cracPumpHigh ? 'HIGH' : 'NORMAL'}
          </button>
          <button onClick={() => { setVentReplaced(!ventReplaced); addLog(`Vent ${!ventReplaced ? 'optimized' : 'reverted'}.`, ventReplaced ? 'info' : 'success') }}
            className="cc-panel-hover"
            style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: ventReplaced ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${ventReplaced ? 'rgba(34,197,94,0.3)' : panelBorder}`, color: ventReplaced ? '#22c55e' : '#8b949e', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle size={12} /> VENT OPTIMIZE
          </button>
          <button onClick={() => { setAllocationDefragged(!allocationDefragged); addLog(`vGPU ${!allocationDefragged ? 'defragmented' : 'reverted'}.`, allocationDefragged ? 'info' : 'success') }}
            className="cc-panel-hover"
            style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: allocationDefragged ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${allocationDefragged ? 'rgba(168,85,247,0.3)' : panelBorder}`, color: allocationDefragged ? '#c084fc' : '#8b949e', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RefreshCw size={12} /> DEFRAG vGPU
          </button>
          <button onClick={handleToggleGenerator}
            className="cc-panel-hover"
            style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: genActive ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${genActive ? 'rgba(239,68,68,0.3)' : panelBorder}`, color: genActive ? '#ef4444' : '#8b949e', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Fuel size={12} /> GEN: {genActive ? 'ACTIVE' : 'STANDBY'}
          </button>
          <button onClick={handleToggleBattery}
            className="cc-panel-hover"
            style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: batteryCharging ? 'rgba(6,182,212,0.1)' : 'rgba(249,115,22,0.1)', border: `1px solid ${batteryCharging ? 'rgba(6,182,212,0.3)' : 'rgba(249,115,22,0.3)'}`, color: batteryCharging ? '#22d3ee' : '#f97316', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Battery size={12} /> BATTERY: {batteryCharging ? 'CHARGE' : 'DISCHARGE'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(10,15,22,0.7)', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${panelBorder}`, maxWidth: '450px', overflow: 'hidden' }}>
          <Activity size={11} color="#76b900" style={{ flexShrink: 0 }} />
          <div style={{
            fontSize: '0.6rem', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: logEntries[logEntries.length - 1]?.level === 'error' ? '#ef4444'
              : logEntries[logEntries.length - 1]?.level === 'warning' ? '#f59e0b'
              : logEntries[logEntries.length - 1]?.level === 'success' ? '#22c55e' : '#8b949e',
          }}>
            <span style={{ color: '#555', marginRight: '6px' }}>[{logEntries[logEntries.length - 1]?.time}]</span>
            {logEntries[logEntries.length - 1]?.msg}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: '68px', right: '1rem',
        background: 'rgba(5,10,16,0.8)', backdropFilter: 'blur(8px)',
        padding: '4px 10px', borderRadius: '4px',
        border: `1px solid ${panelBorder}`, fontSize: '0.55rem', color: '#555',
        zIndex: 10, pointerEvents: 'none',
      }}>
        Left-drag: Rotate • Right-drag: Pan • Scroll: Zoom • Click rack: Inspect
      </div>
    </div>
  )
}

export default ControlCenter
