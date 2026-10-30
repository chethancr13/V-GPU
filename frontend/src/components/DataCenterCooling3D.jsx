import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  RotateCcw, Eye, Droplet, Wind, Zap, Gauge,
  Activity, Maximize2, Minimize2, CheckCircle2,
  Layers, Sliders, Info, ShieldAlert, Sparkles
} from 'lucide-react'

// ─── PALETTE MATCHING THE USER'S REFERENCE BLUEPRINT ───
const THEME = {
  floor: '#e5e9f0',
  floorGrid: '#cbd5e1',
  wall: '#f1f5f9',
  wallBorder: '#94a3b8',
  rackBody: '#475569',
  rackPanel: '#334155',
  containmentFrame: '#64748b',
  containmentGlass: '#e0f2fe',
  cduTeal: '#3b9298',
  crahTeal: '#47a1a7',
  crahFins: '#e2e8f0',
  chillerTeal: '#5ab3ba',
  chillerVCoil: '#38787f',
  fanCowl: '#2f6970',
  fanBlade: '#1e3d42',
  pipeSupply: '#38bdf8', // Blue chilled water (18°C)
  pipeReturn: '#f59e0b', // Yellow/Orange warm water (45°C)
  arrowSupply: '#06b6d4', // Cyan arrow
  arrowReturn: '#ef4444', // Red arrow
  highlight: '#22d3ee',
}

// ─── COMPONENT SPECS FOR INTERACTIVE INSPECTION ───
const COMPONENT_DETAILS = {
  'chiller-1': {
    name: 'Modular Air-Cooled Chiller Unit A',
    type: 'Outdoor Chiller Plant',
    temp: '18.2°C Supply / 44.5°C Return',
    flow: '92.4 L/min',
    power: '42.8 kW',
    cop: '4.32 (High Efficiency)',
    desc: 'High-density dry cooler array featuring 12 microchannel V-bank condenser coils with EC axial exhaust fans.'
  },
  'chiller-2': {
    name: 'Modular Air-Cooled Chiller Unit B',
    type: 'Outdoor Chiller Plant',
    temp: '18.4°C Supply / 44.8°C Return',
    flow: '89.6 L/min',
    power: '41.2 kW',
    cop: '4.28 (High Efficiency)',
    desc: 'Redundant N+1 dry cooling module providing evaporative free-cooling when ambient dry-bulb temp is below 22°C.'
  },
  'pod-row1': {
    name: 'Hot-Aisle Containment Pod 1 (Row A)',
    type: 'Server Rack Cluster',
    temp: '44.6°C Exhaust / 23.5°C Inlet',
    flow: '58.0 L/min',
    power: '124 kW IT Load',
    cop: 'WUE: 0.28 L/kWh',
    desc: 'Direct-to-chip liquid cooled GPU racks (8x H100 SXM5 per node) operating within sealed hot-aisle containment.'
  },
  'pod-row2': {
    name: 'Hot-Aisle Containment Pod 2 (Row B)',
    type: 'Server Rack Cluster',
    temp: '43.9°C Exhaust / 23.2°C Inlet',
    flow: '54.5 L/min',
    power: '118 kW IT Load',
    cop: 'WUE: 0.28 L/kWh',
    desc: 'High-density parallel compute cluster with quick-disconnect dripless manifolds and individual CDU loops.'
  },
  'crah-units': {
    name: 'Precision In-Room CRAH & AHU Units',
    type: 'Air Handling & Heat Exchanger',
    temp: '21.0°C Data Hall Air',
    flow: '34.2 L/min Secondary Loop',
    power: '14.5 kW',
    cop: 'PUE: 1.09',
    desc: 'Multi-circuit dual-chilled water cooling coils maintaining laminar airflow across server intake facades.'
  },
  'cdu-row': {
    name: 'Row-End Coolant Distribution Units (CDU)',
    type: 'Pumping & Manifold Station',
    temp: 'Primary 18°C / Secondary 22°C',
    flow: '182.0 L/min Total',
    power: '5.2 kW Pumping Power',
    cop: 'Pressure: 3.2 bar',
    desc: 'Variable-speed dual redundant canned motor pumps isolating facility water from IT liquid loops with plate heat exchangers.'
  },
  'loop-supply': {
    name: 'Chilled Water Supply Header (Blue)',
    type: 'Hydronic Distribution',
    temp: '18.0°C Chilled Water In',
    flow: '182.0 L/min',
    power: 'Loop Pressure: 3.4 bar',
    cop: 'Insulated Carbon Steel',
    desc: 'Main chilled supply header delivering 18°C coolant from outdoor chiller plant to row-level heat exchangers and CDUs.'
  },
  'loop-return': {
    name: 'Warm Water Return Header (Orange)',
    type: 'Hydronic Heat Rejection',
    temp: '44.8°C Hot Return Out',
    flow: '182.0 L/min',
    power: 'Heat Rejection: 242 kW',
    cop: 'Delta T: 26.8°C',
    desc: 'Secondary warm water collection header capturing thermal energy from GPU waterblocks and pumping to roof chillers.'
  }
}

// ─── 3D ARROW / CHEVRON FOR ANIMATED FLOW ───
function FlowArrow({ position, rotation, color = '#ef4444', size = 0.24 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <coneGeometry args={[size * 0.7, size * 1.6, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </group>
  )
}

// ─── PIPE SEGMENT WITH ANIMATED FLOW ARROWS ───
function PipeSegment({
  start,
  end,
  radius = 0.1,
  color = THEME.pipeReturn,
  arrowColor = THEME.arrowReturn,
  arrowDirection = 1, // 1 for start->end, -1 for end->start
  numArrows = 3,
  speed = 1.8,
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false,
  visible = true
}) {
  const arrowsRef = useRef([])
  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])
  const length = useMemo(() => startVec.distanceTo(endVec), [startVec, endVec])
  const midpoint = useMemo(() => startVec.clone().add(endVec).multiplyScalar(0.5), [startVec, endVec])
  const orientation = useMemo(() => {
    const dir = endVec.clone().sub(startVec).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion()
    if (Math.abs(dir.y) > 0.999) {
      quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir.y > 0 ? 0 : Math.PI)
    } else {
      quat.setFromUnitVectors(up, dir)
    }
    return quat
  }, [startVec, endVec])

  const dirVector = useMemo(() => endVec.clone().sub(startVec).normalize(), [startVec, endVec])

  // Arrow rotation so cone points along dirVector (or opposite if arrowDirection = -1)
  const arrowEuler = useMemo(() => {
    const targetDir = arrowDirection >= 0 ? dirVector : dirVector.clone().negate()
    const quat = new THREE.Quaternion()
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetDir)
    const euler = new THREE.Euler()
    euler.setFromQuaternion(quat)
    return euler
  }, [dirVector, arrowDirection])

  // Animate arrow positions smoothly along the pipe
  useFrame((state) => {
    if (!visible) return
    const t = state.clock.getElapsedTime() * speed
    arrowsRef.current.forEach((arrow, i) => {
      if (!arrow) return
      const offset = (i / numArrows + (arrowDirection >= 0 ? t : -t) * (1 / (length + 0.1))) % 1
      const normalizedOffset = offset < 0 ? offset + 1 : offset
      const pos = startVec.clone().lerp(endVec, normalizedOffset)
      arrow.position.copy(pos)
    })
  })

  if (!visible) return null

  return (
    <group>
      {/* The main pipe cylinder */}
      <mesh
        position={midpoint}
        quaternion={orientation}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial
          color={isHovered ? THEME.highlight : color}
          roughness={0.25}
          metalness={0.7}
          emissive={isHovered ? THEME.highlight : color}
          emissiveIntensity={isHovered ? 0.4 : 0.08}
        />
      </mesh>

      {/* Joint cap spheres at start and end */}
      <mesh position={startVec}>
        <sphereGeometry args={[radius * 1.15, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={endVec}>
        <sphereGeometry args={[radius * 1.15, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Animated 3D Flow Arrows */}
      {Array.from({ length: numArrows }).map((_, i) => (
        <group
          key={i}
          ref={(el) => (arrowsRef.current[i] = el)}
          rotation={arrowEuler}
        >
          <mesh>
            <coneGeometry args={[radius * 1.45, radius * 3.2, 8]} />
            <meshStandardMaterial
              color={arrowColor}
              emissive={arrowColor}
              emissiveIntensity={1.0}
              roughness={0.2}
              metalness={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── ROTATING EXHAUST FAN FOR OUTDOOR CHILLERS ───
function ChillerFan({ position, radius = 0.48, fanSpeed = 1.0 }) {
  const bladesRef = useRef()

  useFrame((_, delta) => {
    if (bladesRef.current) {
      bladesRef.current.rotation.y += delta * 7.5 * fanSpeed
    }
  })

  return (
    <group position={position}>
      {/* Cylindrical Fan Cowl / Housing */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[radius, radius * 1.05, 0.16, 20]} />
        <meshStandardMaterial color={THEME.fanCowl} metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Fan Cowl Top Rim */}
      <mesh position={[0, 0.16, 0]}>
        <torusGeometry args={[radius, 0.025, 8, 20]} />
        <meshStandardMaterial color="#21484e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Rotating Fan Assembly */}
      <group ref={bladesRef} position={[0, 0.09, 0]}>
        {/* Center hub */}
        <mesh>
          <cylinderGeometry args={[radius * 0.28, radius * 0.28, 0.08, 12]} />
          <meshStandardMaterial color="#112428" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* 4 Fan Blades */}
        {[0, 1, 2, 3].map((b) => (
          <group key={b} rotation={[0, (b * Math.PI) / 2, 0.15]}>
            <mesh position={[radius * 0.52, 0, 0]}>
              <boxGeometry args={[radius * 0.65, 0.015, radius * 0.22]} />
              <meshStandardMaterial color={THEME.fanBlade} metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// ─── MODULAR CHILLER UNIT (MULTI-FAN DRY COOLER / V-BANK) ───
function ModularChiller({
  position,
  id,
  fanSpeed = 1.0,
  isSelected,
  onSelect,
  hoveredId,
  setHoveredId
}) {
  const isHovered = hoveredId === id || isSelected
  const width = 3.6
  const length = 7.2
  const height = 1.9

  // 2 rows of 6 fans = 12 fans per chiller unit
  const fanPositions = useMemo(() => {
    const list = []
    const rows = 2
    const cols = 6
    const xStep = width / (rows + 1)
    const zStep = (length - 0.8) / (cols - 1)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fx = -width / 2 + xStep * (r + 1)
        const fz = -length / 2 + 0.4 + c * zStep
        list.push([fx, height / 2 + 0.02, fz])
      }
    }
    return list
  }, [width, length, height])

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredId(id)
      }}
      onPointerOut={() => setHoveredId(null)}
    >
      {/* Structural Framework / Chiller Base */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={isHovered ? '#6dd5dc' : THEME.chillerTeal}
          metalness={0.65}
          roughness={0.3}
          emissive={isHovered ? THEME.highlight : '#000000'}
          emissiveIntensity={isHovered ? 0.35 : 0}
        />
      </mesh>

      {/* V-Shape Condenser Coil Accents (Characteristic of high efficiency dry coolers) */}
      <mesh position={[0, height * 0.28, 0]}>
        <boxGeometry args={[width * 0.94, height * 0.52, length * 0.96]} />
        <meshStandardMaterial color={THEME.chillerVCoil} metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Structural Support Legs & Base Plinths */}
      {[-width * 0.46, width * 0.46].map((lx, idx) =>
        [-length * 0.45, -length * 0.15, length * 0.15, length * 0.45].map((lz, jdx) => (
          <mesh key={`${idx}-${jdx}`} position={[lx, -0.25, lz]}>
            <boxGeometry args={[0.2, 0.5, 0.2]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* Cross-bracing / Framework Lines */}
      {[-width / 2 - 0.02, width / 2 + 0.02].map((gx, gIdx) => (
        <group key={gIdx} position={[gx, height / 2, 0]}>
          {Array.from({ length: 7 }).map((_, fIdx) => (
            <mesh key={fIdx} position={[0, 0, -length / 2 + 0.6 + fIdx * (length - 1.2) / 6]}>
              <boxGeometry args={[0.04, height * 0.9, 0.08]} />
              <meshStandardMaterial color="#214d54" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Top Deck Fan Array (12 active spinning fans) */}
      {fanPositions.map((fPos, idx) => (
        <ChillerFan
          key={idx}
          position={fPos}
          radius={0.44}
          fanSpeed={fanSpeed}
        />
      ))}

      {/* Chiller Identification Label Tag */}
      <mesh position={[0, height + 0.35, 0]}>
        <boxGeometry args={[1.6, 0.28, 0.05]} />
        <meshStandardMaterial color={isHovered ? THEME.highlight : '#1e293b'} />
      </mesh>
    </group>
  )
}

// ─── SERVER RACK CONTAINMENT POD (CONTAINED AISLE POD) ───
function ContainmentPod({
  position,
  id,
  numRacks = 6,
  isSelected,
  onSelect,
  hoveredId,
  setHoveredId
}) {
  const isHovered = hoveredId === id || isSelected
  const podWidth = 1.6
  const rackDepth = 1.0
  const podHeight = 2.4
  const podLength = numRacks * 0.95

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredId(id)
      }}
      onPointerOut={() => setHoveredId(null)}
    >
      {/* Individual Server Cabinets / Racks inside pod */}
      {Array.from({ length: numRacks }).map((_, rIdx) => {
        const rz = -podLength / 2 + 0.48 + rIdx * 0.95
        return (
          <group key={rIdx} position={[0, podHeight / 2, rz]}>
            {/* Server Chassis Box */}
            <mesh>
              <boxGeometry args={[podWidth, podHeight, 0.88]} />
              <meshStandardMaterial
                color={isHovered ? '#64748b' : THEME.rackBody}
                metalness={0.65}
                roughness={0.35}
                emissive={isHovered ? THEME.highlight : '#000000'}
                emissiveIntensity={isHovered ? 0.3 : 0}
              />
            </mesh>

            {/* Front Perforated Vent Face */}
            <mesh position={[-podWidth / 2 - 0.01, 0, 0]}>
              <boxGeometry args={[0.02, podHeight * 0.92, 0.82]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Rear Exhaust / Manifold Panel */}
            <mesh position={[podWidth / 2 + 0.01, 0, 0]}>
              <boxGeometry args={[0.02, podHeight * 0.92, 0.82]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
            </mesh>

            {/* Server Status Blinkers / Liquid Loop Indicators */}
            {Array.from({ length: 4 }).map((_, bIdx) => (
              <mesh
                key={bIdx}
                position={[-podWidth / 2 - 0.02, -0.6 + bIdx * 0.4, 0.25]}
              >
                <boxGeometry args={[0.02, 0.08, 0.2]} />
                <meshStandardMaterial
                  color="#22d3ee"
                  emissive="#22d3ee"
                  emissiveIntensity={0.85}
                />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* Overhead Hot/Cold Aisle Containment Roof Canopy */}
      {/* Clear acrylic/glass containment ceiling */}
      <mesh position={[0, podHeight + 0.45, 0]}>
        <boxGeometry args={[podWidth * 1.15, 0.08, podLength]} />
        <meshStandardMaterial
          color={THEME.containmentGlass}
          transparent
          opacity={0.45}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Containment Structural Truss Frame (posts and roof beams) */}
      {/* Roof perimeter beams */}
      <mesh position={[0, podHeight + 0.5, 0]}>
        <boxGeometry args={[podWidth * 1.2, 0.06, podLength * 1.02]} />
        <meshStandardMaterial color={THEME.containmentFrame} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical corner posts */}
      {[-podWidth * 0.58, podWidth * 0.58].map((px, pIdx) =>
        [-podLength * 0.51, 0, podLength * 0.51].map((pz, zIdx) => (
          <mesh key={`${pIdx}-${zIdx}`} position={[px, (podHeight + 0.5) / 2, pz]}>
            <boxGeometry args={[0.08, podHeight + 0.5, 0.08]} />
            <meshStandardMaterial color={THEME.containmentFrame} metalness={0.8} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* Transverse Cross-Ribs across containment roof */}
      {Array.from({ length: 4 }).map((_, rbIdx) => (
        <mesh
          key={rbIdx}
          position={[0, podHeight + 0.52, -podLength / 2 + (rbIdx + 0.5) * (podLength / 4)]}
        >
          <boxGeometry args={[podWidth * 1.2, 0.08, 0.06]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

// ─── CRAH / AIR HANDLING UNIT WITH FRONT COOLING LOUVERS ───
function CRAHUnit({
  position,
  id = 'crah-units',
  isSelected,
  onSelect,
  hoveredId,
  setHoveredId
}) {
  const isHovered = hoveredId === id || isSelected
  const width = 2.2
  const height = 2.8
  const length = 3.6

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredId(id)
      }}
      onPointerOut={() => setHoveredId(null)}
    >
      {/* Main Teal AHU Enclosure */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={isHovered ? '#6dd5dc' : THEME.crahTeal}
          metalness={0.6}
          roughness={0.3}
          emissive={isHovered ? THEME.highlight : '#000000'}
          emissiveIntensity={isHovered ? 0.35 : 0}
        />
      </mesh>

      {/* Front Face Cooling Coil / Louver Fins (Facing Data Hall) */}
      <group position={[-width / 2 - 0.02, height / 2, 0]}>
        {/* Recessed Coil Frame */}
        <mesh>
          <boxGeometry args={[0.04, height * 0.88, length * 0.88]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Horizontal cooling fins */}
        {Array.from({ length: 14 }).map((_, idx) => (
          <mesh
            key={idx}
            position={[0.03, -height * 0.4 + idx * (height * 0.8 / 13), 0]}
          >
            <boxGeometry args={[0.04, 0.04, length * 0.84]} />
            <meshStandardMaterial color={THEME.crahFins} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {/* Vertical divider columns on fins */}
        {[-length * 0.28, 0, length * 0.28].map((cx, idx) => (
          <mesh key={idx} position={[0.04, 0, cx]}>
            <boxGeometry args={[0.03, height * 0.86, 0.04]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Top Header Return Connection Collar */}
      <mesh position={[0, height + 0.1, 0]}>
        <cylinderGeometry args={[0.32, 0.35, 0.2, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// ─── IN-ROW CDU / PUMP STATION AT END OF RACK ROWS ───
function EndOfRowCDU({
  position,
  id = 'cdu-row',
  isSelected,
  onSelect,
  hoveredId,
  setHoveredId
}) {
  const isHovered = hoveredId === id || isSelected
  const width = 1.4
  const height = 2.4
  const length = 1.3

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredId(id)
      }}
      onPointerOut={() => setHoveredId(null)}
    >
      {/* Cabinet Body */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={isHovered ? '#6dd5dc' : THEME.cduTeal}
          metalness={0.7}
          roughness={0.3}
          emissive={isHovered ? THEME.highlight : '#000000'}
          emissiveIntensity={isHovered ? 0.35 : 0}
        />
      </mesh>

      {/* Front Touch Controller Display Screen */}
      <mesh position={[-width / 2 - 0.01, height * 0.65, 0]}>
        <boxGeometry args={[0.02, 0.45, 0.6]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Internal Heat Exchanger / Pump Ports */}
      <mesh position={[0, height + 0.12, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.24, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// ─── ARCHITECTURAL DATA CENTER BUILDING SHELL & PLATFORMS ───
function DataCenterArchitecture() {
  return (
    <group>
      {/* Main Data Hall Floor (Light grey polished finish) */}
      <mesh position={[-1, -0.05, 0]} receiveShadow>
        <boxGeometry args={[32, 0.1, 24]} />
        <meshStandardMaterial color={THEME.floor} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Elevated Outdoor Chiller Equipment Terrace Deck (Matches right side platform) */}
      <mesh position={[10.5, 0.5, -2]} receiveShadow>
        <boxGeometry args={[11, 1.0, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Terrace Retaining Wall / Edge Trim */}
      <mesh position={[5.0, 0.5, -2]}>
        <boxGeometry args={[0.2, 1.05, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Building Cutaway Bounding Walls (White Clean-room style like the image) */}
      {/* Left Wall of Server Hall */}
      <mesh position={[-16, 3.5, 0]}>
        <boxGeometry args={[0.2, 7.0, 24]} />
        <meshStandardMaterial
          color={THEME.wall}
          transparent
          opacity={0.4}
          roughness={0.5}
        />
      </mesh>

      {/* Rear Wall of Data Hall and Terrace */}
      <mesh position={[-1, 3.5, -12]}>
        <boxGeometry args={[30, 7.0, 0.2]} />
        <meshStandardMaterial
          color={THEME.wall}
          transparent
          opacity={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Right Wall behind Outdoor Chillers */}
      <mesh position={[16, 3.5, -2]}>
        <boxGeometry args={[0.2, 7.0, 20]} />
        <meshStandardMaterial
          color={THEME.wall}
          transparent
          opacity={0.65}
          roughness={0.5}
        />
      </mesh>

      {/* Floor Tile Grid Lines (Cleanroom Raised Floor grid) */}
      <gridHelper
        args={[30, 30, '#cbd5e1', '#e2e8f0']}
        position={[-1, 0.01, 0]}
      />
    </group>
  )
}

// ─── COMPLETE HYDRONIC PIPING SYSTEM WITH RED & CYAN FLOW ARROWS ───
function HydronicPipingSystem({
  activeFilter = 'ALL',
  selectedComponent,
  setSelectedComponent,
  hoveredId,
  setHoveredId
}) {
  const showReturn = activeFilter === 'ALL' || activeFilter === 'HOT'
  const showSupply = activeFilter === 'ALL' || activeFilter === 'COLD'

  // Geometry alignment based on server rows and chiller deck
  // Server Row 1: Z = 3.5, X spans [-13, -3]
  // Server Row 2: Z = -1.5, X spans [-13, -3]
  // Chiller Deck: X = 10.5, Z = -2.0, Chillers at X = 8.8 and X = 12.4
  // CRAH units: X = 2.4, Z = 1.8 and Z = -2.2

  return (
    <group>
      {/* ════════════════════════════════════════════════════════════════════
          1. WARM WATER RETURN SYSTEM (ORANGE PIPES + RED DIRECTIONAL ARROWS)
          Direction: Servers/CRAH -> CDU -> Outdoor Chiller V-Banks
         ════════════════════════════════════════════════════════════════════ */}
      {showReturn && (
        <group>
          {/* Row 1 Overhead Return Header (Above Containment Canopy) */}
          <PipeSegment
            start={[-13.2, 3.3, 3.5]}
            end={[-2.4, 3.3, 3.5]}
            radius={0.09}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1} // Flowing towards right CDU
            numArrows={5}
            speed={2.2}
            onClick={() => setSelectedComponent('loop-return')}
            onPointerOver={() => setHoveredId('loop-return')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-return'}
          />

          {/* Row 2 Overhead Return Header (Above Containment Canopy) */}
          <PipeSegment
            start={[-13.2, 3.3, -1.5]}
            end={[-2.4, 3.3, -1.5]}
            radius={0.09}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1} // Flowing towards right CDU
            numArrows={5}
            speed={2.2}
            onClick={() => setSelectedComponent('loop-return')}
            onPointerOver={() => setHoveredId('loop-return')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-return'}
          />

          {/* Vertical Droppers connecting server pods to Return Header */}
          {[-11.5, -8.0, -4.5].map((dx, idx) => (
            <React.Fragment key={`drop-ret-${idx}`}>
              <PipeSegment
                start={[dx, 2.7, 3.5]}
                end={[dx, 3.3, 3.5]}
                radius={0.05}
                color={THEME.pipeReturn}
                arrowColor={THEME.arrowReturn}
                arrowDirection={1}
                numArrows={1}
                speed={2.0}
              />
              <PipeSegment
                start={[dx, 2.7, -1.5]}
                end={[dx, 3.3, -1.5]}
                radius={0.05}
                color={THEME.pipeReturn}
                arrowColor={THEME.arrowReturn}
                arrowDirection={1}
                numArrows={1}
                speed={2.0}
              />
            </React.Fragment>
          ))}

          {/* Cross Connector linking Row 1 and Row 2 at CDU end */}
          <PipeSegment
            start={[-2.4, 3.3, 3.5]}
            end={[-2.4, 3.3, -1.5]}
            radius={0.09}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={2}
            speed={2.0}
          />

          {/* Main Return Header from Data Hall out to Terrace */}
          <PipeSegment
            start={[-2.4, 3.3, -1.5]}
            end={[1.8, 3.3, -1.5]}
            radius={0.11}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={3}
            speed={2.4}
            onClick={() => setSelectedComponent('loop-return')}
            onPointerOver={() => setHoveredId('loop-return')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-return'}
          />

          {/* Riser & Overhead Crossing to Outdoor Chillers */}
          <PipeSegment
            start={[1.8, 3.3, -1.5]}
            end={[1.8, 4.4, -1.5]}
            radius={0.11}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={1}
            speed={2.4}
          />
          <PipeSegment
            start={[1.8, 4.4, -1.5]}
            end={[8.6, 4.4, -1.5]}
            radius={0.12}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={4}
            speed={2.5}
            onClick={() => setSelectedComponent('loop-return')}
            onPointerOver={() => setHoveredId('loop-return')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-return'}
          />

          {/* Chiller Manifold Distribution to Chiller A & B (Orange with Red Arrows) */}
          <PipeSegment
            start={[8.6, 4.4, -1.5]}
            end={[8.6, 4.4, -4.5]}
            radius={0.11}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={2}
            speed={2.2}
          />
          <PipeSegment
            start={[8.6, 4.4, -1.5]}
            end={[12.2, 4.4, -1.5]}
            radius={0.11}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={2}
            speed={2.2}
          />
          <PipeSegment
            start={[12.2, 4.4, -1.5]}
            end={[12.2, 4.4, -4.5]}
            radius={0.11}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={2}
            speed={2.2}
          />

          {/* Vertical Drops entering the Chiller condenser manifolds */}
          <PipeSegment
            start={[8.6, 4.4, -4.5]}
            end={[8.6, 2.6, -4.5]}
            radius={0.09}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={1}
            speed={2.0}
          />
          <PipeSegment
            start={[12.2, 4.4, -4.5]}
            end={[12.2, 2.6, -4.5]}
            radius={0.09}
            color={THEME.pipeReturn}
            arrowColor={THEME.arrowReturn}
            arrowDirection={1}
            numArrows={1}
            speed={2.0}
          />
        </group>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          2. CHILLED WATER SUPPLY SYSTEM (BLUE PIPES + CYAN DIRECTIONAL ARROWS)
          Direction: Outdoor Chiller -> Data Hall -> CDUs -> Servers
         ════════════════════════════════════════════════════════════════════ */}
      {showSupply && (
        <group>
          {/* Chiller Outlets connecting to Chilled Supply Header */}
          <PipeSegment
            start={[8.6, 2.2, 1.2]}
            end={[8.6, 3.8, 1.2]}
            radius={0.09}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={1}
            speed={2.2}
          />
          <PipeSegment
            start={[12.2, 2.2, 1.2]}
            end={[12.2, 3.8, 1.2]}
            radius={0.09}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={1}
            speed={2.2}
          />

          {/* Terrace Chilled Collection Header */}
          <PipeSegment
            start={[12.2, 3.8, 1.2]}
            end={[8.6, 3.8, 1.2]}
            radius={0.11}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={2}
            speed={2.2}
          />
          <PipeSegment
            start={[8.6, 3.8, 1.2]}
            end={[2.2, 3.8, 1.2]}
            radius={0.12}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={4}
            speed={2.5}
            onClick={() => setSelectedComponent('loop-supply')}
            onPointerOver={() => setHoveredId('loop-supply')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-supply'}
          />

          {/* Downcomer into CRAH area */}
          <PipeSegment
            start={[2.2, 3.8, 1.2]}
            end={[2.2, 2.8, 1.2]}
            radius={0.11}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={1}
            speed={2.2}
          />

          {/* CRAH Feed Drops */}
          <PipeSegment
            start={[2.2, 2.8, 1.2]}
            end={[2.2, 2.8, 2.2]}
            radius={0.08}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={1}
            speed={1.8}
          />
          <PipeSegment
            start={[2.2, 2.8, 1.2]}
            end={[-2.4, 2.8, 1.2]}
            radius={0.11}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={3}
            speed={2.4}
            onClick={() => setSelectedComponent('loop-supply')}
            onPointerOver={() => setHoveredId('loop-supply')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-supply'}
          />

          {/* Supply Header branching into Row 1 & Row 2 */}
          <PipeSegment
            start={[-2.4, 2.8, 1.2]}
            end={[-2.4, 2.8, 3.5]}
            radius={0.09}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={1}
            speed={2.0}
          />
          <PipeSegment
            start={[-2.4, 2.8, 1.2]}
            end={[-2.4, 2.8, -1.5]}
            radius={0.09}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1}
            numArrows={1}
            speed={2.0}
          />

          {/* Row 1 Lower Chilled Supply Header (Runs below return pipe) */}
          <PipeSegment
            start={[-2.4, 2.8, 3.5]}
            end={[-13.2, 2.8, 3.5]}
            radius={0.08}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1} // Flowing leftward into server racks
            numArrows={5}
            speed={2.2}
            onClick={() => setSelectedComponent('loop-supply')}
            onPointerOver={() => setHoveredId('loop-supply')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-supply'}
          />

          {/* Row 2 Lower Chilled Supply Header */}
          <PipeSegment
            start={[-2.4, 2.8, -1.5]}
            end={[-13.2, 2.8, -1.5]}
            radius={0.08}
            color={THEME.pipeSupply}
            arrowColor={THEME.arrowSupply}
            arrowDirection={1} // Flowing leftward into server racks
            numArrows={5}
            speed={2.2}
            onClick={() => setSelectedComponent('loop-supply')}
            onPointerOver={() => setHoveredId('loop-supply')}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'loop-supply'}
          />

          {/* Vertical Supply Droppers into Server Racks */}
          {[-11.5, -8.0, -4.5].map((dx, idx) => (
            <React.Fragment key={`drop-sup-${idx}`}>
              <PipeSegment
                start={[dx, 2.8, 3.5]}
                end={[dx, 2.3, 3.5]}
                radius={0.045}
                color={THEME.pipeSupply}
                arrowColor={THEME.arrowSupply}
                arrowDirection={1}
                numArrows={1}
                speed={1.8}
              />
              <PipeSegment
                start={[dx, 2.8, -1.5]}
                end={[dx, 2.3, -1.5]}
                radius={0.045}
                color={THEME.pipeSupply}
                arrowColor={THEME.arrowSupply}
                arrowDirection={1}
                numArrows={1}
                speed={1.8}
              />
            </React.Fragment>
          ))}
        </group>
      )}
    </group>
  )
}

// ─── CAMERA CONTROLLER WITH SMOOTH PRESETS ───
function CameraController({ viewMode = 'isometric', resetTrigger = 0 }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (viewMode === 'isometric') {
      camera.position.set(15, 14, 18)
      camera.lookAt(0, 2, 0)
    } else if (viewMode === 'servers') {
      camera.position.set(-8, 5, 12)
      camera.lookAt(-8, 2, 1)
    } else if (viewMode === 'chillers') {
      camera.position.set(16, 7, 7)
      camera.lookAt(10.5, 2.5, -2)
    } else if (viewMode === 'top') {
      camera.position.set(0, 24, 0.1)
      camera.lookAt(0, 0, 0)
    }
  }, [viewMode, resetTrigger, camera])

  return null
}

// ─── MAIN EXPORTED COMPONENT ───
export default function DataCenterCooling3D({
  waterConsumption = 164,
  wue = 0.28,
  totalPowerKW = 145,
  isActive = true,
  theme = 'light'
}) {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL', 'COLD', 'HOT'
  const [fanSpeedMode, setFanSpeedMode] = useState('normal') // 'normal', 'boost'
  const [viewPreset, setViewPreset] = useState('isometric') // 'isometric', 'servers', 'chillers', 'top'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)

  // Reactive theme detection that stays perfectly synced with App theme toggle
  const [isLight, setIsLight] = useState(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme')
      return docTheme === 'light' || (!docTheme && theme === 'light')
    }
    return theme === 'light'
  })

  useEffect(() => {
    const updateTheme = () => {
      const docTheme = document.documentElement.getAttribute('data-theme')
      setIsLight(docTheme === 'light' || (!docTheme && theme === 'light'))
    }
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [theme])

  const selectedData = selectedComponent ? COMPONENT_DETAILS[selectedComponent] : null

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '650px' : '420px',
        background: isLight ? '#ffffff' : '#0a0f14',
        border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'height 0.3s ease, background 0.2s ease, border-color 0.2s ease',
        boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
      }}
    >
      {/* ─── TOP LEFT: SUSTAINABILITY BADGE & TELEMETRY ─── */}
      <div
        style={{
          position: 'absolute',
          top: '0.85rem',
          left: '1rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              background: isLight ? '#0f172a' : '#fff',
              color: isLight ? '#ffffff' : '#07121b',
              padding: '0.2rem 0.65rem',
              borderRadius: '12px',
              fontSize: '0.55rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            SUSTAINABILITY 3D TWIN
          </div>
          <div
            style={{
              background: isLight ? '#ecfeff' : 'rgba(6, 182, 212, 0.15)',
              border: isLight ? '1px solid #a5f3fc' : '1px solid rgba(6, 182, 212, 0.4)',
              color: isLight ? '#0891b2' : '#22d3ee',
              padding: '0.2rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.55rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Droplet size={10} color={isLight ? '#0891b2' : '#22d3ee'} />
            CLOSED-LOOP LIQUID (WUE: {wue.toFixed(2)})
          </div>
        </div>
        <div style={{ fontSize: '0.65rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
          Interactive Physical Cooling Plant • Drag to Orbit • Scroll to Zoom
        </div>
      </div>

      {/* ─── TOP RIGHT: VIEW & FLOW CONTROLS ─── */}
      <div
        style={{
          position: 'absolute',
          top: '0.85rem',
          right: '1rem',
          zIndex: 10,
          display: 'flex',
          gap: '0.4rem',
          alignItems: 'center'
        }}
      >
        {/* Pipe Filter Toggles */}
        {['ALL', 'COLD', 'HOT'].map((filter) => {
          const isFilterActive = activeFilter === filter
          let btnBg = isLight ? '#ffffff' : '#111820'
          let btnBorder = isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'
          let btnColor = isLight ? '#475569' : '#8b949e'

          if (isFilterActive) {
            if (filter === 'HOT') {
              btnBg = isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.25)'
              btnBorder = '1px solid #ef4444'
              btnColor = isLight ? '#dc2626' : '#f87171'
            } else if (filter === 'COLD') {
              btnBg = isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.25)'
              btnBorder = '1px solid #38bdf8'
              btnColor = isLight ? '#0284c7' : '#38bdf8'
            } else {
              btnBg = isLight ? '#cffafe' : 'rgba(6, 182, 212, 0.25)'
              btnBorder = '1px solid #06b6d4'
              btnColor = isLight ? '#0891b2' : '#00f2fe'
            }
          }

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.55rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: btnBg,
                border: btnBorder,
                color: btnColor,
                boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {filter === 'ALL' ? 'ALL FLOWS' : filter === 'COLD' ? 'CHILLED 18°C' : 'RETURN 45°C'}
            </button>
          )
        })}

        {/* Fan Speed Mode Toggle */}
        <button
          onClick={() => setFanSpeedMode(fanSpeedMode === 'normal' ? 'boost' : 'normal')}
          style={{
            padding: '0.25rem 0.55rem',
            borderRadius: '4px',
            fontSize: '0.55rem',
            fontWeight: 800,
            cursor: 'pointer',
            background: fanSpeedMode === 'boost'
              ? (isLight ? '#fef9c3' : 'rgba(234, 179, 8, 0.25)')
              : (isLight ? '#ffffff' : '#111820'),
            border: fanSpeedMode === 'boost'
              ? '1px solid #eab308'
              : (isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'),
            color: fanSpeedMode === 'boost'
              ? (isLight ? '#854d0e' : '#fde047')
              : (isLight ? '#475569' : '#8b949e'),
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title="Toggle dry cooler fan exhaust speed"
        >
          <Wind size={10} />
          {fanSpeedMode === 'boost' ? 'FAN BOOST (1200 RPM)' : 'FAN NORMAL'}
        </button>

        {/* Reset View Button */}
        <button
          onClick={() => {
            setViewPreset('isometric')
            setResetTrigger((prev) => prev + 1)
          }}
          style={{
            padding: '0.25rem 0.45rem',
            borderRadius: '4px',
            background: isLight ? '#ffffff' : '#111820',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)',
            color: isLight ? '#475569' : '#8b949e',
            cursor: 'pointer',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
          title="Reset Camera Angle"
        >
          <RotateCcw size={12} />
        </button>

        {/* Expand / Minimize Button */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            padding: '0.25rem 0.45rem',
            borderRadius: '4px',
            background: isLight ? '#ffffff' : '#111820',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)',
            color: isLight ? '#475569' : '#8b949e',
            cursor: 'pointer',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
          title={isFullscreen ? 'Collapse 3D View' : 'Expand 3D View'}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* ─── BOTTOM LEFT: CAMERA VIEW PRESETS ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.75rem',
          left: '1rem',
          zIndex: 10,
          display: 'flex',
          gap: '0.35rem',
          background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 15, 20, 0.85)',
          padding: '0.25rem 0.4rem',
          borderRadius: '6px',
          border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          backdropFilter: 'blur(6px)'
        }}
      >
        <span
          style={{
            fontSize: '0.55rem',
            color: isLight ? '#475569' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            paddingRight: '0.25rem',
            fontWeight: 700
          }}
        >
          PRESETS:
        </span>
        {[
          { id: 'isometric', label: 'Isometric' },
          { id: 'servers', label: 'Server Racks' },
          { id: 'chillers', label: 'Chiller Plant' },
          { id: 'top', label: 'Top-Down' }
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setViewPreset(btn.id)}
            style={{
              padding: '0.2rem 0.45rem',
              borderRadius: '3px',
              fontSize: '0.55rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: viewPreset === btn.id
                ? (isLight ? '#e0f2fe' : 'rgba(6, 182, 212, 0.25)')
                : 'transparent',
              border: viewPreset === btn.id
                ? (isLight ? '1px solid #38bdf8' : '1px solid #06b6d4')
                : '1px solid transparent',
              color: viewPreset === btn.id
                ? (isLight ? '#0284c7' : '#00f2fe')
                : (isLight ? '#64748b' : '#94a3b8')
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ─── BOTTOM RIGHT: LIVE TELEMETRY CHIPS ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.75rem',
          right: '1rem',
          zIndex: 10,
          display: 'flex',
          gap: '0.5rem',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.6rem',
            color: isLight ? '#0f172a' : '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            backdropFilter: 'blur(4px)'
          }}
        >
          <span style={{ color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 800 }}>CHILLED IN:</span>
          <strong>18.0°C</strong>
        </div>
        <div
          style={{
            background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.6rem',
            color: isLight ? '#0f172a' : '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            backdropFilter: 'blur(4px)'
          }}
        >
          <span style={{ color: isLight ? '#d97706' : '#f59e0b', fontWeight: 800 }}>HOT RETURN:</span>
          <strong>44.8°C</strong>
        </div>
        <div
          style={{
            background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.6rem',
            color: isLight ? '#0f172a' : '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            backdropFilter: 'blur(4px)'
          }}
        >
          <span style={{ color: isLight ? '#16a34a' : '#22c55e', fontWeight: 800 }}>ΔT:</span>
          <strong>26.8°C</strong>
        </div>
      </div>

      {/* ─── INTERACTIVE INSPECTOR CARD (CLICKED COMPONENT MODAL) ─── */}
      {selectedData && (
        <div
          style={{
            position: 'absolute',
            top: '3.2rem',
            left: '1rem',
            zIndex: 20,
            width: '280px',
            background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.95)',
            border: isLight ? '1px solid #38bdf8' : '1px solid rgba(6, 182, 212, 0.4)',
            borderRadius: '6px',
            padding: '0.75rem',
            boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span
                style={{
                  fontSize: '0.55rem',
                  color: isLight ? '#0284c7' : '#06b6d4',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}
              >
                {selectedData.type}
              </span>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isLight ? '#0f172a' : '#fff', marginTop: '1px' }}>
                {selectedData.name}
              </div>
            </div>
            <button
              onClick={() => setSelectedComponent(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.9rem',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem',
              marginTop: '0.6rem',
              fontSize: '0.6rem',
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)',
              padding: '0.4rem',
              borderRadius: '4px'
            }}
          >
            <div>
              <span style={{ color: isLight ? '#64748b' : '#64748b', display: 'block' }}>OPERATING TEMP</span>
              <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{selectedData.temp}</strong>
            </div>
            <div>
              <span style={{ color: isLight ? '#64748b' : '#64748b', display: 'block' }}>FLOW / POWER</span>
              <strong style={{ color: isLight ? '#0284c7' : '#22d3ee' }}>{selectedData.flow}</strong>
            </div>
            <div>
              <span style={{ color: isLight ? '#64748b' : '#64748b', display: 'block' }}>HEAT REJECTION</span>
              <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{selectedData.power}</strong>
            </div>
            <div>
              <span style={{ color: isLight ? '#64748b' : '#64748b', display: 'block' }}>METRIC / COP</span>
              <strong style={{ color: isLight ? '#16a34a' : '#10b981' }}>{selectedData.cop}</strong>
            </div>
          </div>

          <p style={{ fontSize: '0.58rem', color: isLight ? '#475569' : '#94a3b8', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
            {selectedData.desc}
          </p>
        </div>
      )}

      {/* ─── 3D THREE.JS WEBGL CANVAS ─── */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        camera={{ position: [15, 14, 18], fov: 38, near: 0.1, far: 100 }}
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={() => setSelectedComponent(null)}
      >
        <CameraController viewMode={viewPreset} resetTrigger={resetTrigger} />

        {/* Ambient & Directional Architectural Studio Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[12, 22, 14]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-14, 12, -10]} intensity={0.4} />
        <directionalLight position={[0, -10, 0]} intensity={0.15} />

        <Suspense fallback={null}>
          {/* Architectural Building Structure, Floor & Walls */}
          <DataCenterArchitecture />

          {/* ═════ SERVER HALL: ROW 1 (FOREGROUND AISLE) ═════ */}
          {/* Pod 1A */}
          <ContainmentPod
            position={[-11.2, 0, 3.5]}
            id="pod-row1"
            numRacks={3}
            isSelected={selectedComponent === 'pod-row1'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Pod 1B */}
          <ContainmentPod
            position={[-7.8, 0, 3.5]}
            id="pod-row1"
            numRacks={3}
            isSelected={selectedComponent === 'pod-row1'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Pod 1C */}
          <ContainmentPod
            position={[-4.4, 0, 3.5]}
            id="pod-row1"
            numRacks={3}
            isSelected={selectedComponent === 'pod-row1'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Row 1 CDU Unit at head of aisle */}
          <EndOfRowCDU
            position={[-2.4, 0, 3.5]}
            id="cdu-row"
            isSelected={selectedComponent === 'cdu-row'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />

          {/* ═════ SERVER HALL: ROW 2 (BACKGROUND AISLE) ═════ */}
          {/* Pod 2A */}
          <ContainmentPod
            position={[-11.2, 0, -1.5]}
            id="pod-row2"
            numRacks={3}
            isSelected={selectedComponent === 'pod-row2'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Pod 2B */}
          <ContainmentPod
            position={[-7.8, 0, -1.5]}
            id="pod-row2"
            numRacks={3}
            isSelected={selectedComponent === 'pod-row2'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Pod 2C */}
          <ContainmentPod
            position={[-4.4, 0, -1.5]}
            id="pod-row2"
            numRacks={3}
            isSelected={selectedComponent === 'pod-row2'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Row 2 CDU Unit at head of aisle */}
          <EndOfRowCDU
            position={[-2.4, 0, -1.5]}
            id="cdu-row"
            isSelected={selectedComponent === 'cdu-row'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />

          {/* ═════ INTERMEDIATE: DUAL CRAH AIR HANDLING UNITS ═════ */}
          {/* CRAH Unit 1 */}
          <CRAHUnit
            position={[2.4, 0, 1.8]}
            id="crah-units"
            isSelected={selectedComponent === 'crah-units'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* CRAH Unit 2 */}
          <CRAHUnit
            position={[2.4, 0, -2.2]}
            id="crah-units"
            isSelected={selectedComponent === 'crah-units'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />

          {/* ═════ OUTDOOR ROOFTOP: DUAL MODULAR CHILLER UNITS ═════ */}
          {/* Chiller Unit A */}
          <ModularChiller
            position={[8.6, 1.0, -2.0]}
            id="chiller-1"
            fanSpeed={fanSpeedMode === 'boost' ? 2.2 : 1.0}
            isSelected={selectedComponent === 'chiller-1'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
          {/* Chiller Unit B */}
          <ModularChiller
            position={[12.6, 1.0, -2.0]}
            id="chiller-2"
            fanSpeed={fanSpeedMode === 'boost' ? 2.2 : 1.0}
            isSelected={selectedComponent === 'chiller-2'}
            onSelect={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />

          {/* ═════ COMPLETE HYDRONIC LOOP PIPING WITH FLOW ARROWS ═════ */}
          <HydronicPipingSystem
            activeFilter={activeFilter}
            selectedComponent={selectedComponent}
            setSelectedComponent={setSelectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
        </Suspense>

        {/* Orbit Controls with Natural Architectural Limits */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={6}
          maxDistance={38}
          maxPolarAngle={Math.PI / 2.05} // Prevent going below ground
          minPolarAngle={0.1}
          target={[0, 1.8, 0]}
        />
      </Canvas>
    </div>
  )
}

