import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Shield, Server, Zap, Wind, Droplet, Activity, Gauge, Eye,
  RotateCcw, Sliders, Layers, Sparkles,
  Flame, Radio, CheckCircle2, AlertTriangle, ChevronRight,
  Maximize2, Minimize2, Thermometer, Box, Cpu, Lock, Power,
  ArrowUp, ArrowDown, Play, Pause, RefreshCw
} from 'lucide-react'

// ─── MILITARY HARDWARE & SUB-SYSTEM SPECIFICATIONS ───
const TACTICAL_COMPONENTS = {
  'container_hull': {
    id: 'container_hull',
    name: '20ft Ruggedized ISO Tactical Edge Container',
    category: 'Armor & Environmental Shelter',
    specs: {
      'Standard Footprint': '20ft ISO Intermodal Cargo Shell (6.06m x 2.44m x 2.59m)',
      'Structural Armor': 'Corten Weathering Steel with Stiffened Corrugations',
      'Ballistic / Frag Protection': 'STANAG 4569 Level 1 / Composite Kevlar Over-Armor Option',
      'EMI / EMP Shielding': 'MIL-STD-461G HEMP Shielding (>85 dB Attenuation @ 1 GHz)',
      'Environmental Rating': 'MIL-STD-810H Extreme Desert / Arctic (-40°C to +55°C)',
      'Total Staged Weight': '12,400 kg (Fully Outfitted with Compute & ECU)',
      'Deployability': 'RAH-66 Stealth Tactical Sling, C-130 / C-17 Airlift, M1078 LMTV'
    },
    desc: 'Heavy-gauge all-welded military container featuring corrugated sidewalls, reinforced ISO corner castings, high-strength lifting rings, and tactical olive-drab CARC (Chemical Agent Resistant Coating).'
  },
  'cargo_doors': {
    id: 'cargo_doors',
    name: 'Heavy Dual Clamshell Cargo Doors & Seal System',
    category: 'Access & Environmental Barrier',
    specs: {
      'Door Mechanism': 'Triple-Hinged Heavy Forged Steel Swing Doors (110° Open Sweep)',
      'Locking System': 'Dual Anti-Rack Cam Lock Bars with Padlockable Hasps',
      'Weather Seals': 'Dual EPDM Neoprene Gaskets with Inflatable Overpressure Seal',
      'Inspection Portals': 'Upper Louvered Vent Hatch with Removable Ballistic Louvers',
      'Blast Rating': 'Up to 50 kPa Overpressure Reflection Resistance',
      'Door Interlocks': 'Tamper Microswitches with Instant Zeroize / Zero-Trust Triggers'
    },
    desc: 'Dual heavy-duty clamshell doors with military cam keeps, interior structural stiffener ribs, and airtight CBRN silicone seals to isolate interior electronics from desert sand, dust, and rain.'
  },
  'compute_racks': {
    id: 'compute_racks',
    name: 'MIL-SPEC 42U Shock-Isolated vGPU Compute Array',
    category: 'Mission-Critical Processing Node',
    specs: {
      'Compute Density': '8x Rugged 2U vGPU Compute Blades (64 Total vGPU Slices)',
      'Accelerators': '32x Enterprise High-TDP Tensor GPUs (Liquid-Assisted Air Cooled)',
      'Peak AI Inference': '16,840 Tokens/Sec (Multi-Stream Drone Video & SAR Analytics)',
      'Total System RAM': '1,024 GB ECC DDR5 Low-Voltage Server Memory',
      'High-Speed Interconnect': '3.2 TB/s Ultra-Low Latency Optical NVLink-Edge Bus',
      'Shock Isolation': 'MIL-STD-901D Heavyweight Grade A Wire-Rope Elastomer Dampers',
      'Security Module': 'Hardware Root of Trust with FIPS 140-3 Cryptographic Zeroize'
    },
    desc: 'Dual shock-mounted 19-inch equipment racks suspended on heavy-duty wire-rope dampers, protecting high-density GPU accelerators from transport shock, drop impacts, and rough terrain vibrations.'
  },
  'ecu_chiller': {
    id: 'ecu_chiller',
    name: 'Dual Military Environmental Control Unit (ECU)',
    category: 'Tactical HVAC & Heat Dissipation',
    specs: {
      'Cooling Capacity': '45.0 kW (153,500 BTU/hr) Sensible Heat Rejection',
      'Compressor Type': 'Dual Inverter Scroll Compressors (N+1 Redundant Circuits)',
      'Airflow Rate': '4,800 CFM High-Static Centrifugal Blowers',
      'Delta Temperature': '21.7°C Heat Exchange (Ambient 41.5°C -> Internal 19.8°C)',
      'CBRN Filtration': 'Positive Pressure Overpressure (+265 Pa) with Dual HEPA / Carbon',
      'Refrigerant': 'Eco-Friendly Low-GWP High-Pressure Closed Loop',
      'Acoustic Signature': '< 68 dBA @ 7m for Tactical Stealth Operations'
    },
    desc: 'High-capacity military-spec air handling and refrigeration unit with heavy external intake grilles, dual blowers, and positive pressure CBRN overpressure filters to prevent desert sand and airborne agents from entering.'
  },
  'power_umbilical': {
    id: 'power_umbilical',
    name: 'Tactical Hybrid Power Distribution & Skid Interface',
    category: 'Energy Microgrid & Electrical Distribution',
    specs: {
      'Input Voltage': '480V 3-Phase AC / 208V Tactical Cam-Lock Quick-Disconnect',
      'Current Draw': '52.8 kW Active Draw (75 kW Peak Tactical Rating)',
      'Auxiliary Power': 'Integrated 96 kWh Lithium Iron Phosphate (LiFePO4) Buffer',
      'UPS Ride-Through': 'Zero-Interruption Microsecond Static Transfer Switch',
      'Fuel Compatibility': 'JP-8 / F-34, Diesel, Jet-A via Tactical Mobile Generator',
      'Grounding Bus': 'Solid Copper Busbar with Ground Spike Earth Clamp',
      'Autonomy': '41.7 Hours Continuous Runtime on 142 Gal JP-8 Fuel Reserve'
    },
    desc: 'Lower skid-level mechanical bay with rapid-deployment cam-lock power receptacles, MIL-DTL multi-pin command umbilicals, fuel lines, and high-amp transient surge suppression.'
  },
  'satcom_c4isr': {
    id: 'satcom_c4isr',
    name: 'C4ISR Tactical Comms & Mesh Antenna Radome',
    category: 'Secure Communications & Edge Mesh',
    specs: {
      'Mil-Satcom Link': 'Ka/Ku-Band Direct Satellite Uplink (320 Mbps / 22ms Latency)',
      'Tactical Ad-Hoc Mesh': 'Silvus MANET MIMO Radio Array (14 Squad Nodes Connected)',
      'Encryption': 'Type-1 NSA Certified Multi-Domain Enclave Isolation',
      'Anti-Jamming': 'Frequency-Hopping Spread Spectrum (FHSS) & LPI/LPD Mode',
      'Telemetry Broadcast': 'Real-Time Defense Health Monitoring to Tactical Operations Center'
    },
    desc: 'Rooftop mounted low-profile conformal antenna array providing continuous satellite and line-of-sight command links for real-time edge AI inference and telemetry dispatch.'
  }
}

// ─── 3D CORRUGATED CONTAINER WALL HELPER ───
function CorrugatedWall({ width, height, ribs = 12, depth = 0.08, color = '#445335', roughness = 0.72, metalness = 0.35 }) {
  const ribSpacing = width / ribs
  return (
    <group>
      {/* Flat base sheet */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, height, 0.04]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
      {/* Vertical corrugated ribs */}
      {Array.from({ length: ribs }).map((_, i) => {
        const x = -width / 2 + ribSpacing * (i + 0.5)
        return (
          <mesh key={i} position={[x, 0, depth / 2]} castShadow>
            <boxGeometry args={[ribSpacing * 0.45, height - 0.1, depth]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── 3D RUGGED SERVER RACK (COMPUTE MODULE) ───
function ComputeRack3D({ position, rotation, isSelected, onClick, onPointerOver, onPointerOut, thermalMode }) {
  const [ledBlink, setLedBlink] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setLedBlink(prev => !prev), 600)
    return () => clearInterval(timer)
  }, [])

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Outer Shock-Mounted Rack Frame */}
      <mesh castShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[1.05, 2.7, 1.15]} />
        <meshStandardMaterial
          color={thermalMode ? '#f97316' : (isSelected ? '#65a30d' : '#273121')}
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      {/* Rack Inner Recess / Cavity */}
      <mesh position={[0, 1.4, 0.05]}>
        <boxGeometry args={[0.92, 2.55, 1.05]} />
        <meshStandardMaterial color="#11160e" roughness={0.9} />
      </mesh>

      {/* 8x 2U Rugged Server Blades */}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 0.35 + i * 0.3
        const bladeHot = thermalMode && (i >= 2 && i <= 6)
        return (
          <group key={i} position={[0, y, 0.42]}>
            {/* Server Blade Faceplate */}
            <mesh castShadow>
              <boxGeometry args={[0.88, 0.24, 0.24]} />
              <meshStandardMaterial
                color={thermalMode ? (bladeHot ? '#ef4444' : '#eab308') : '#1e2619'}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>

            {/* Front Perforated Vent Screen */}
            <mesh position={[0, 0, 0.125]}>
              <planeGeometry args={[0.76, 0.18]} />
              <meshStandardMaterial
                color={thermalMode ? '#dc2626' : '#2b3623'}
                roughness={0.4}
              />
            </mesh>

            {/* Status Indicator LEDs */}
            <mesh position={[-0.32, 0.05, 0.13]}>
              <sphereGeometry args={[0.018, 12, 12]} />
              <meshBasicMaterial color={ledBlink ? '#22c55e' : '#15803d'} />
            </mesh>
            <mesh position={[-0.26, 0.05, 0.13]}>
              <sphereGeometry args={[0.018, 12, 12]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>

            {/* Drive / Blade Pull Handles */}
            <mesh position={[-0.38, 0, 0.14]}>
              <boxGeometry args={[0.02, 0.14, 0.04]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} />
            </mesh>
            <mesh position={[0.38, 0, 0.14]}>
              <boxGeometry args={[0.02, 0.14, 0.04]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} />
            </mesh>
          </group>
        )
      })}

      {/* Wire-Rope Shock Isolators at Base & Top */}
      {[-0.4, 0.4].map((x, idx) => (
        <group key={idx}>
          <mesh position={[x, 0.08, 0.35]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[x, 0.08, -0.35]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Selection Glow Box */}
      {isSelected && (
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[1.12, 2.76, 1.22]} />
          <meshBasicMaterial color="#84cc16" wireframe />
        </mesh>
      )}
    </group>
  )
}

// ─── 3D ENVIRONMENTAL CONTROL UNIT (ECU CHILLER) ───
function ECUChiller3D({ position, rotation, isSelected, onClick, onPointerOver, onPointerOut, thermalMode }) {
  return (
    <group
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Heavy Steel ECU Housing */}
      <mesh castShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[1.1, 2.7, 1.15]} />
        <meshStandardMaterial
          color={thermalMode ? '#38bdf8' : (isSelected ? '#84cc16' : '#3c4b2f')}
          metalness={0.4}
          roughness={0.65}
        />
      </mesh>

      {/* Top Intake Louver Box */}
      <group position={[0, 1.9, 0.58]}>
        <mesh castShadow>
          <boxGeometry args={[0.82, 0.72, 0.12]} />
          <meshStandardMaterial color="#2d3822" roughness={0.6} />
        </mesh>
        {/* Recessed Honeycomb Intake Screen */}
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[0.74, 0.64]} />
          <meshStandardMaterial
            color={thermalMode ? '#0ea5e9' : '#1a2215'}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
        {/* Horizontal Stiffening Bars & Handle */}
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[0.86, 0.03, 0.05]} />
          <meshStandardMaterial color="#1e2618" metalness={0.7} />
        </mesh>
        <mesh position={[0.25, 0.12, 0.1]}>
          <boxGeometry args={[0.08, 0.12, 0.04]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
      </group>

      {/* Middle Intake Air Grille */}
      <group position={[0, 1.0, 0.58]}>
        <mesh castShadow>
          <boxGeometry args={[0.82, 0.65, 0.12]} />
          <meshStandardMaterial color="#2d3822" roughness={0.6} />
        </mesh>
        {/* Condenser / Evaporator Core Mesh */}
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[0.74, 0.57]} />
          <meshStandardMaterial
            color={thermalMode ? '#0284c7' : '#1e2617'}
            roughness={0.5}
            metalness={0.7}
          />
        </mesh>
        {/* Protective Outer Grille Bars */}
        {[-0.18, 0, 0.18].map((yOffset, i) => (
          <mesh key={i} position={[0, yOffset, 0.09]}>
            <boxGeometry args={[0.74, 0.015, 0.02]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Industrial Access Latches and Electrical Box on Side */}
      <mesh position={[0.56, 1.3, 0.2]}>
        <boxGeometry args={[0.06, 0.4, 0.3]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
      {/* High-Voltage Warning Placard */}
      <mesh position={[0.595, 1.35, 0.2]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>

      {/* Selection Highlight */}
      {isSelected && (
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[1.18, 2.78, 1.22]} />
          <meshBasicMaterial color="#84cc16" wireframe />
        </mesh>
      )}
    </group>
  )
}

// ─── 3D SLING CABLE WIRE ROPE SEGMENT ───
function SlingCable({ start, end, color = '#cbd5e1' }) {
  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])
  const dist = useMemo(() => startVec.distanceTo(endVec), [startVec, endVec])
  const mid = useMemo(() => startVec.clone().add(endVec).multiplyScalar(0.5), [startVec, endVec])

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

  return (
    <group position={mid} quaternion={orientation}>
      {/* High-tensile steel wire rope */}
      <mesh castShadow>
        <cylinderGeometry args={[0.016, 0.016, dist, 8]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* High-visibility yellow safety tag */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.15, 8]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
    </group>
  )
}

// ─── 3D STEALTH COMBAT HELICOPTER (RAH-66 COMANCHE / ADVANCED STEALTH AIRLIFT) ───
function StealthHelicopterRAH66({ position = [0, 8.2, 0], nightVision = false, isAirborne = false }) {
  const mainRotorRef = useRef()
  const fantailRotorRef = useRef()
  const heliGroupRef = useRef()

  // High-speed main rotor and ducted fantail anti-torque rotation
  useFrame((state, delta) => {
    const mainSpeed = 30
    const fantailSpeed = 55
    if (mainRotorRef.current) {
      mainRotorRef.current.rotation.y += delta * mainSpeed
    }
    if (fantailRotorRef.current) {
      fantailRotorRef.current.rotation.x += delta * fantailSpeed // Spinning inside ducted fan
    }
    if (heliGroupRef.current) {
      const t = state.clock.elapsedTime
      heliGroupRef.current.position.y = position[1] + (isAirborne ? Math.sin(t * 2.4) * 0.05 : 0)
      heliGroupRef.current.rotation.z = isAirborne ? Math.sin(t * 1.6) * 0.015 : 0
      heliGroupRef.current.rotation.x = isAirborne ? Math.cos(t * 1.3) * 0.012 : 0
    }
  })

  // Tactical radar-absorbent matte stealth grey / gunmetal green
  const stealthBodyColor = nightVision ? '#182b18' : '#4a544c'
  const chineDarkColor = nightVision ? '#0f1c0f' : '#333b35'
  const canopyGlassColor = '#0b1622'

  return (
    <group ref={heliGroupRef} position={position}>
      {/* ─── FORWARD COCKPIT & FACETED NOSE SECTION ─── */}
      <group position={[0, 0.05, 1.8]}>
        {/* Pointed stealth nose cone */}
        <mesh castShadow position={[0, -0.05, 2.1]} rotation={[-Math.PI / 16, 0, 0]}>
          <boxGeometry args={[0.7, 0.55, 1.2]} />
          <meshStandardMaterial color={stealthBodyColor} roughness={0.65} metalness={0.35} />
        </mesh>

        {/* Electro-Optical / FLIR Targeting Sensor Ball Turret on nose tip */}
        <mesh position={[0, -0.08, 2.75]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.08, 2.87]}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* 20mm 3-Barrel Gatling Rotary Cannon (Under-Chin Turret) */}
        <group position={[0, -0.32, 2.1]}>
          {/* Gun Turret Housing */}
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.16, 0.45]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Extended Triple Barrels */}
          <mesh position={[0, -0.02, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.75, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Flash Muzzle Brake */}
          <mesh position={[0, -0.02, 0.88]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.06, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.9} />
          </mesh>
        </group>

        {/* Tandem Two-Seat Faceted Stealth Canopy Glass */}
        {/* Pilot Front Canopy */}
        <mesh position={[0, 0.38, 1.3]} rotation={[-Math.PI / 9, 0, 0]}>
          <boxGeometry args={[0.68, 0.55, 1.1]} />
          <meshStandardMaterial
            color={canopyGlassColor}
            roughness={0.12}
            metalness={0.88}
          />
        </mesh>
        {/* Gunner/Copilot Stepped Rear Canopy */}
        <mesh position={[0, 0.54, 0.45]} rotation={[-Math.PI / 14, 0, 0]}>
          <boxGeometry args={[0.74, 0.58, 1.05]} />
          <meshStandardMaterial
            color={canopyGlassColor}
            roughness={0.12}
            metalness={0.88}
          />
        </mesh>
        {/* Canopy Center Structural Stealth Frame Arch */}
        <mesh position={[0, 0.56, 0.95]}>
          <boxGeometry args={[0.76, 0.55, 0.08]} />
          <meshStandardMaterial color={chineDarkColor} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>

      {/* ─── CENTER FUSELAGE WITH RADAR-REFLECTING CHINE EDGES ─── */}
      <group position={[0, 0, 0]}>
        {/* Main upper fuselage spine */}
        <mesh castShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[1.1, 1.05, 3.8]} />
          <meshStandardMaterial color={stealthBodyColor} roughness={0.65} metalness={0.35} />
        </mesh>

        {/* Lower faceted belly hull */}
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[0.92, 0.55, 3.6]} />
          <meshStandardMaterial color={chineDarkColor} roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Left & Right Angled Stealth Chine Wings / Edges */}
        {[-0.62, 0.62].map((xChine, idx) => (
          <mesh key={idx} position={[xChine, -0.05, 0]} rotation={[0, 0, idx === 0 ? Math.PI / 8 : -Math.PI / 8]}>
            <boxGeometry args={[0.26, 0.65, 3.4]} />
            <meshStandardMaterial color={stealthBodyColor} roughness={0.65} metalness={0.35} />
          </mesh>
        ))}

        {/* Flush Engine Air Intakes (Shoulders behind cockpit) */}
        {[-0.55, 0.55].map((xIntake, idx) => (
          <group key={idx} position={[xIntake, 0.5, 0.6]}>
            <mesh rotation={[0, idx === 0 ? 0.2 : -0.2, 0]}>
              <boxGeometry args={[0.35, 0.35, 0.8]} />
              <meshStandardMaterial color={stealthBodyColor} roughness={0.6} />
            </mesh>
            {/* Dark Intake Duct Opening */}
            <mesh position={[0, 0, 0.41]}>
              <planeGeometry args={[0.28, 0.28]} />
              <meshBasicMaterial color="#090d0b" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── STUB WINGS & HELLFIRE MISSILE RACKS ─── */}
      {[-1.0, 1.0].map((xWing, idx) => (
        <group key={idx} position={[xWing, -0.15, 0.1]} rotation={[0, 0, idx === 0 ? 0.08 : -0.08]}>
          {/* Swept Stub Wing */}
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.08, 0.85]} />
            <meshStandardMaterial color={stealthBodyColor} roughness={0.6} metalness={0.4} />
          </mesh>

          {/* Missile Launch Pylon Bracket */}
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.14, 0.18, 0.65]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>

          {/* Dual AGM-114 Hellfire Missiles */}
          {[-0.14, 0.14].map((xMis, mIdx) => (
            <group key={mIdx} position={[xMis, -0.24, 0]}>
              {/* Missile Body */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.72, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
              </mesh>
              {/* Pointed Seeker Nose */}
              <mesh position={[0, 0, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.045, 0.12, 12]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} />
              </mesh>
              {/* High-Visibility Yellow Guidance Stripe */}
              <mesh position={[0, 0, 0.22]}>
                <cylinderGeometry args={[0.047, 0.047, 0.06, 12]} rotation={[Math.PI / 2, 0, 0]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* ─── SINGLE MAIN ROTOR (5-BLADE STEALTH COMPOSITE SYSTEM) ─── */}
      <group position={[0, 0.85, 0.3]}>
        {/* Stealth Aerodynamic Rotor Cowling / Fairing */}
        <mesh castShadow position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.42, 0.58, 0.45, 20]} />
          <meshStandardMaterial color={stealthBodyColor} roughness={0.65} metalness={0.35} />
        </mesh>
        {/* Rotor Mast Shaft */}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.28, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} />
        </mesh>

        {/* Spinning 5-Blade Rotor Assembly */}
        <group ref={mainRotorRef} position={[0, 0.46, 0]}>
          {/* Central Hub Cap */}
          <mesh>
            <cylinderGeometry args={[0.26, 0.26, 0.12, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>

          {/* 5 Composite Rotor Blades (72 degrees apart) */}
          {[0, (2 * Math.PI) / 5, (4 * Math.PI) / 5, (6 * Math.PI) / 5, (8 * Math.PI) / 5].map((angle, bIdx) => (
            <group key={bIdx} rotation={[0, angle, 0]}>
              {/* Blade */}
              <mesh position={[0, 0, 1.85]}>
                <boxGeometry args={[0.16, 0.018, 3.4]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Swept Tip */}
              <mesh position={[0.03, 0, 3.52]} rotation={[0, -0.3, 0]}>
                <boxGeometry args={[0.1, 0.016, 0.28]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
            </group>
          ))}

          {/* Spinning Aerodynamic Blur Disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 3.65, 36]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.18} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* ─── STEALTH TAIL BOOM & DUCTED FANTAIL (FENESTRON) ─── */}
      <group position={[0, 0.2, -1.9]}>
        {/* Tapered stealth tail boom */}
        <mesh castShadow position={[0, 0, -1.2]}>
          <boxGeometry args={[0.42, 0.55, 2.4]} />
          <meshStandardMaterial color={stealthBodyColor} roughness={0.65} metalness={0.35} />
        </mesh>

        {/* Tall Swept Vertical Stabilizer Fin */}
        <group position={[0, 0.65, -2.5]}>
          <mesh castShadow position={[0, 0.45, -0.3]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.14, 1.65, 1.1]} />
            <meshStandardMaterial color={stealthBodyColor} roughness={0.65} metalness={0.35} />
          </mesh>

          {/* ─── CIRCULAR DUCTED FANTAIL (FENESTRON DUCT) ─── */}
          {/* Outer Duct Ring */}
          <mesh position={[0, 0.1, -0.25]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.2, 24]} />
            <meshStandardMaterial color={chineDarkColor} metalness={0.7} roughness={0.4} />
          </mesh>
          {/* Inner Hollow Hole */}
          <mesh position={[0, 0.1, -0.25]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.22, 24]} />
            <meshBasicMaterial color="#080d09" />
          </mesh>

          {/* Spinning Multi-Blade Anti-Torque Fan inside the duct */}
          <group ref={fantailRotorRef} position={[0, 0.1, -0.25]}>
            {/* Center Fan Hub */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 0.24, 16]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} />
            </mesh>
            {/* 8 Ducted Fan Blades */}
            {Array.from({ length: 8 }).map((_, fIdx) => (
              <mesh key={fIdx} rotation={[0, 0, (fIdx * Math.PI) / 4]}>
                <boxGeometry args={[0.04, 0.68, 0.02]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} />
              </mesh>
            ))}
          </group>

          {/* Canted Horizontal Tailplanes with Endplate Fins */}
          <group position={[0, 0.05, -0.25]}>
            {[-0.65, 0.65].map((xTail, tIdx) => (
              <group key={tIdx} position={[xTail, 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.65, 0.06, 0.45]} />
                  <meshStandardMaterial color={stealthBodyColor} roughness={0.6} />
                </mesh>
                {/* Vertical Endplate Fin on tailplane tip */}
                <mesh position={[tIdx === 0 ? -0.32 : 0.32, 0.08, 0]}>
                  <boxGeometry args={[0.04, 0.38, 0.48]} />
                  <meshStandardMaterial color={stealthBodyColor} roughness={0.6} />
                </mesh>
              </group>
            ))}
          </group>

          {/* US Army Tactical Flag & Tail Number Stencil */}
          <group position={[0.08, 1.15, -0.45]}>
            <mesh>
              <planeGeometry args={[0.22, 0.14]} />
              <meshBasicMaterial color="#e2e8f0" />
            </mesh>
          </group>
        </group>
      </group>

      {/* ─── UNDERBELLY TACTICAL CARGO SLING HOOK ─── */}
      <group position={[0, -0.68, 0]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.12, 0.16, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.09, 0.03, 12, 24]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
        </mesh>
      </group>
    </group>
  )
}

// ─── 3D MAIN CONTAINERIZED DATA CENTER MODEL ───
function TacticalContainerModel({
  liftHeight = 0,
  doorAngle = 0,
  selectedComponent,
  onSelectComponent,
  thermalMode = false,
  nightVision = false,
  xrayMode = false,
  interiorLightMode = 'white'
}) {
  const containerRef = useRef()

  // Convert doorAngle degrees to radians
  const doorRad = (doorAngle * Math.PI) / 180

  // Tactical lighting color based on mode
  const interiorLightColor = useMemo(() => {
    if (interiorLightMode === 'stealth_red') return '#ef4444'
    if (interiorLightMode === 'tactical_green') return '#22c55e'
    return '#f8fafc'
  }, [interiorLightMode])

  // Exterior container paint color based on mode
  const containerColor = useMemo(() => {
    if (nightVision) return '#1e3a1e'
    if (thermalMode) return '#1e293b'
    return '#455436' // Olive Drab Green
  }, [nightVision, thermalMode])

  const cornerCastingColor = useMemo(() => {
    if (nightVision) return '#142814'
    return '#2b3621'
  }, [nightVision])

  // Dynamic subtle aerodynamic swaying of suspended container when lifted
  useFrame((state) => {
    if (containerRef.current && liftHeight > 0.1) {
      const t = state.clock.elapsedTime
      containerRef.current.rotation.z = Math.sin(t * 1.5) * 0.012
      containerRef.current.rotation.x = Math.cos(t * 1.2) * 0.01
    } else if (containerRef.current) {
      containerRef.current.rotation.z = 0
      containerRef.current.rotation.x = 0
    }
  })

  // Helicopter hook position (located directly above container)
  const hookPos = useMemo(() => [0, liftHeight + 4.25, 0], [liftHeight])

  // 4 Top ISO Corner Casting anchor points
  const cornerTopFL = useMemo(() => [-1.22, liftHeight + 2.85, 2.85], [liftHeight])
  const cornerTopFR = useMemo(() => [1.22, liftHeight + 2.85, 2.85], [liftHeight])
  const cornerTopRL = useMemo(() => [-1.22, liftHeight + 2.85, -2.85], [liftHeight])
  const cornerTopRR = useMemo(() => [1.22, liftHeight + 2.85, -2.85], [liftHeight])

  return (
    <group>
      {/* ─── STATIC CONCRETE TARMAC / AIRFIELD STAGING PAD ─── */}
      <mesh receiveShadow position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial
          color={nightVision ? '#0d1f0d' : '#8a8d85'}
          roughness={0.88}
          metalness={0.12}
        />
      </mesh>

      {/* Flight line expansion seams */}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <mesh key={`seam-x-${i}`} position={[x, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 32]} />
          <meshBasicMaterial color={nightVision ? '#091509' : '#575a52'} />
        </mesh>
      ))}

      {/* Tactical Staging Ground Ring / Target Pad */}
      <mesh position={[0, -0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 4.35, 32]} />
        <meshBasicMaterial color={nightVision ? '#15803d' : '#eab308'} />
      </mesh>

      {/* Rotor Wash Wind / Downwash Ring when helicopter is active */}
      {liftHeight > 0.05 && (
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.5, 6.8, 32]} />
          <meshBasicMaterial
            color={nightVision ? '#22c55e' : '#cbd5e1'}
            transparent
            opacity={Math.max(0.1, 0.45 - liftHeight * 0.06)}
          />
        </mesh>
      )}

      {/* ─── RAH-66 STEALTH COMBAT HELICOPTER (HOVERING ABOVE) ─── */}
      <StealthHelicopterRAH66
        position={[0, liftHeight + 4.95, 0]}
        nightVision={nightVision}
        isAirborne={liftHeight > 0.05}
      />

      {/* ─── 4 HIGH-TENSILE SLING CABLES CONNECTING HOOK TO CONTAINER ─── */}
      <SlingCable start={hookPos} end={cornerTopFL} />
      <SlingCable start={hookPos} end={cornerTopFR} />
      <SlingCable start={hookPos} end={cornerTopRL} />
      <SlingCable start={hookPos} end={cornerTopRR} />

      {/* ─── LIFTED / ELEVATING CONTAINER STRUCTURE ─── */}
      <group ref={containerRef} position={[0, liftHeight, 0]}>
        {/* Base Skid Frame */}
        <group position={[0, 0.15, 0]}>
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[2.5, 0.28, 5.8]} />
            <meshStandardMaterial color={cornerCastingColor} metalness={0.7} roughness={0.4} />
          </mesh>

          {/* Forklift Pocket Cutouts */}
          {[-1.2, 1.2].map((zPos, idx) => (
            <group key={idx} position={[0, -0.02, zPos]}>
              <mesh position={[-0.45, 0, 0]}>
                <boxGeometry args={[0.34, 0.14, 0.05]} />
                <meshBasicMaterial color="#0f1710" />
              </mesh>
              <mesh position={[0.45, 0, 0]}>
                <boxGeometry args={[0.34, 0.14, 0.05]} />
                <meshBasicMaterial color="#0f1710" />
              </mesh>
            </group>
          ))}

          {/* Interior Diamond-Plate Floor */}
          <mesh position={[0, 0.15, 0.2]} receiveShadow>
            <boxGeometry args={[2.3, 0.02, 5.2]} />
            <meshStandardMaterial
              color={nightVision ? '#112211' : '#334155'}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>

        {/* ISO Corner Castings (8 Corners) */}
        {[
          [-1.22, 0.15, -2.85], [1.22, 0.15, -2.85],
          [-1.22, 0.15, 2.85], [1.22, 0.15, 2.85],
          [-1.22, 2.85, -2.85], [1.22, 2.85, -2.85],
          [-1.22, 2.85, 2.85], [1.22, 2.85, 2.85]
        ].map((pos, i) => (
          <group key={i} position={pos}>
            <mesh castShadow>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshStandardMaterial color={cornerCastingColor} metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Twist-Lock Aperture */}
            <mesh position={[0, 0, (pos[2] > 0 ? 0.115 : -0.115)]}>
              <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} rotation={[Math.PI / 2, 0, 0]} />
              <meshBasicMaterial color="#080c08" />
            </mesh>
          </group>
        ))}

        {/* Container Enclosure Body (Hull) */}
        <group onClick={(e) => { e.stopPropagation(); onSelectComponent('container_hull') }}>
          {/* Rear Wall */}
          <mesh position={[0, 1.5, -2.85]} castShadow receiveShadow>
            <boxGeometry args={[2.44, 2.5, 0.08]} />
            <meshStandardMaterial
              color={containerColor}
              transparent={xrayMode}
              opacity={xrayMode ? 0.25 : 1.0}
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>

          {/* Left Corrugated Side Wall */}
          <group position={[-1.22, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
            <CorrugatedWall
              width={5.6}
              height={2.5}
              ribs={16}
              color={containerColor}
              depth={0.07}
            />
          </group>

          {/* Right Corrugated Side Wall */}
          <group position={[1.22, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <CorrugatedWall
              width={5.6}
              height={2.5}
              ribs={16}
              color={containerColor}
              depth={0.07}
            />
          </group>

          {/* Roof Structure */}
          <mesh position={[0, 2.82, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.48, 0.12, 5.8]} />
            <meshStandardMaterial
              color={containerColor}
              transparent={xrayMode}
              opacity={xrayMode ? 0.2 : 1.0}
              roughness={0.75}
            />
          </mesh>
        </group>

        {/* Rooftop C4ISR Radome */}
        <group position={[0, 2.95, -1.2]} onClick={(e) => { e.stopPropagation(); onSelectComponent('satcom_c4isr') }}>
          <mesh castShadow>
            <sphereGeometry args={[0.38, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.42, 0.44, 0.08, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>

        {/* ─── DUAL SWINGING FRONT CLAMSHELL DOORS (DEFAULT CLOSED: 0 DEG) ─── */}
        {/* Left Door */}
        <group
          position={[-1.22, 1.5, 2.85]}
          rotation={[0, -doorRad, 0]}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('cargo_doors') }}
        >
          <mesh position={[0.58, 0, 0.04]} castShadow>
            <boxGeometry args={[1.18, 2.45, 0.08]} />
            <meshStandardMaterial color={containerColor} roughness={0.65} metalness={0.3} />
          </mesh>
          {/* Subtle flush recessed door latch pocket */}
          <mesh position={[1.05, 0, 0.08]}>
            <boxGeometry args={[0.06, 0.2, 0.02]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>

        {/* Right Door */}
        <group
          position={[1.22, 1.5, 2.85]}
          rotation={[0, doorRad, 0]}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('cargo_doors') }}
        >
          <mesh position={[-0.58, 0, 0.04]} castShadow>
            <boxGeometry args={[1.18, 2.45, 0.08]} />
            <meshStandardMaterial color={containerColor} roughness={0.65} metalness={0.3} />
          </mesh>
          {/* Subtle flush recessed door latch pocket */}
          <mesh position={[-1.05, 0, 0.08]}>
            <boxGeometry args={[0.06, 0.2, 0.02]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>

        {/* Interior Recessed Spotlights (No rod in middle) */}
        {[-0.55, 0.55].map((xLight, lIdx) => (
          <group key={lIdx} position={[xLight, 2.76, 1.2]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
              <meshBasicMaterial color={interiorLightColor} />
            </mesh>
            <pointLight
              position={[0, -0.2, 0]}
              color={interiorLightColor}
              intensity={1.2}
              distance={4.5}
              decay={2}
            />
          </group>
        ))}

        {/* Compute & ECU Interior Modules */}
        <ComputeRack3D
          position={[-0.58, 0.28, 1.8]}
          rotation={[0, 0, 0]}
          isSelected={selectedComponent === 'compute_racks'}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('compute_racks') }}
          thermalMode={thermalMode}
        />
        <ECUChiller3D
          position={[0.58, 0.28, 1.8]}
          rotation={[0, 0, 0]}
          isSelected={selectedComponent === 'ecu_chiller'}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('ecu_chiller') }}
          thermalMode={thermalMode}
        />

        <ComputeRack3D
          position={[-0.58, 0.28, -0.5]}
          rotation={[0, 0, 0]}
          isSelected={selectedComponent === 'compute_racks'}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('compute_racks') }}
          thermalMode={thermalMode}
        />
        <ECUChiller3D
          position={[0.58, 0.28, -0.5]}
          rotation={[0, 0, 0]}
          isSelected={selectedComponent === 'ecu_chiller'}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('ecu_chiller') }}
          thermalMode={thermalMode}
        />

        {/* Sub-Floor Power Umbilical Skid */}
        <group
          position={[0.3, 0.22, 2.7]}
          onClick={(e) => { e.stopPropagation(); onSelectComponent('power_umbilical') }}
        >
          <mesh castShadow position={[0, 0.1, 0]}>
            <boxGeometry args={[0.55, 0.25, 0.35]} />
            <meshStandardMaterial color="#1e2618" metalness={0.7} />
          </mesh>
          {[-0.18, -0.09, 0, 0.09, 0.18].map((x, i) => {
            const colors = ['#dc2626', '#111827', '#2563eb', '#f8fafc', '#16a34a']
            return (
              <mesh key={i} position={[x, 0.1, 0.19]}>
                <cylinderGeometry args={[0.025, 0.025, 0.08, 12]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color={colors[i]} />
              </mesh>
            )
          })}
        </group>
      </group>
    </group>
  )
}

// ─── CAMERA CONTROLLER FOR PRESET VIEWS ───
function CameraController({ cameraPreset, controlsRef }) {
  const { camera } = useThree()

  useEffect(() => {
    if (!controlsRef?.current) return
    switch (cameraPreset) {
      case 'helicopter_flight':
        // Expansive clear high-angle flight sight: frames the entire stealth helicopter, spinning rotors, cables, container, and ground
        camera.position.set(13.0, 9.5, 15.0)
        controlsRef.current.target.set(0, 4.2, 0)
        controlsRef.current.update()
        break
      case 'photo_tactical':
        camera.position.set(8.5, 4.8, 9.5)
        controlsRef.current.target.set(0, 2.0, 0)
        controlsRef.current.update()
        break
      case 'front_doors':
        camera.position.set(0, 2.2, 8.5)
        controlsRef.current.target.set(0, 1.8, 0)
        controlsRef.current.update()
        break
      case 'compute_focus':
        camera.position.set(-2.5, 2.2, 4.8)
        controlsRef.current.target.set(-0.55, 1.5, 1.6)
        controlsRef.current.update()
        break
      case 'ecu_focus':
        camera.position.set(2.5, 2.2, 4.8)
        controlsRef.current.target.set(0.55, 1.5, 1.6)
        controlsRef.current.update()
        break
      case 'power_skid':
        camera.position.set(1.8, 1.2, 4.5)
        controlsRef.current.target.set(0.3, 0.4, 2.5)
        controlsRef.current.update()
        break
      default:
        break
    }
  }, [cameraPreset, camera, controlsRef])

  return null
}

// ─── MAIN EXPORTED COMPONENT ───
export default function TacticalDataCenter3D() {
  const controlsRef = useRef()

  // UI & 3D States
  const [selectedComponent, setSelectedComponent] = useState('compute_racks')
  const [doorAngle, setDoorAngle] = useState(0) // DEFAULT CLOSED (0°)
  const [cameraPreset, setCameraPreset] = useState('helicopter_flight') // Clear wide angle default
  const [thermalMode, setThermalMode] = useState(false)
  const [nightVision, setNightVision] = useState(false)
  const [xrayMode, setXrayMode] = useState(false)
  const [interiorLight, setInteriorLight] = useState('white')
  const [activeMetricTab, setActiveMetricTab] = useState('compute')

  // Helicopter Airlift States: 'ground' | 'lifting' | 'hover' | 'dropping'
  const [airliftState, setAirliftState] = useState('ground')
  const [liftHeight, setLiftHeight] = useState(0) // 0 to 5.0 meters
  const [autoCycle, setAutoCycle] = useState(false)

  // Smooth animation loop for lifting / dropping
  useEffect(() => {
    let animId
    const step = () => {
      setLiftHeight((prev) => {
        if (airliftState === 'lifting') {
          // If lifting, automatically ensure doors are safely closed
          if (doorAngle > 0) setDoorAngle(0)
          const next = prev + 0.045
          if (next >= 4.8) {
            setAirliftState('hover')
            return 4.8
          }
          return next
        } else if (airliftState === 'dropping') {
          const next = prev - 0.045
          if (next <= 0) {
            setAirliftState('ground')
            return 0
          }
          return next
        }
        return prev
      })
      animId = requestAnimationFrame(step)
    }
    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [airliftState, doorAngle])

  // Auto cycle timer if enabled
  useEffect(() => {
    if (!autoCycle) return
    const interval = setInterval(() => {
      setAirliftState((curr) => {
        if (curr === 'ground') return 'lifting'
        if (curr === 'hover') return 'dropping'
        return curr
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [autoCycle])

  // Dynamic Live Telemetry Simulator for realism
  const [liveJitter, setLiveJitter] = useState({
    computeLoad: 76.4,
    tokensPerSec: 16840,
    coldTemp: 19.8,
    ambientTemp: 41.5,
    powerDraw: 52.8,
    fuelHours: 41.7
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveJitter({
        computeLoad: Number((76.4 + (Math.random() * 2.4 - 1.2)).toFixed(1)),
        tokensPerSec: Math.floor(16840 + (Math.random() * 300 - 150)),
        coldTemp: Number((19.8 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        ambientTemp: Number((41.5 + (Math.random() * 0.6 - 0.3)).toFixed(1)),
        powerDraw: Number((52.8 + (Math.random() * 1.2 - 0.6)).toFixed(1)),
        fuelHours: Number((41.7 - 0.02).toFixed(1))
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const selectedData = TACTICAL_COMPONENTS[selectedComponent] || TACTICAL_COMPONENTS['compute_racks']

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: nightVision ? '#051105' : 'var(--black)',
      color: nightVision ? '#4ade80' : 'var(--text-primary)',
      fontFamily: 'monospace, system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ─── TOP TACTICAL MILITARY HUD HEADER ─── */}
      <header style={{
        padding: '0.75rem 1.25rem',
        background: nightVision ? 'rgba(5, 20, 5, 0.95)' : 'rgba(20, 24, 20, 0.95)',
        borderBottom: `1px solid ${nightVision ? '#15803d' : 'var(--border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 10
      }}>
        {/* Left ID & Classification */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: nightVision ? '#14532d' : '#365314',
            color: '#bef264',
            padding: '0.25rem 0.6rem',
            borderRadius: '3px',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            border: '1px solid #65a30d'
          }}>
            TACTICAL EDGE POD
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                TECN-IV // RAH-66 STEALTH TACTICAL AIRLIFT DATA CENTER
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: liftHeight > 0.1 ? '#fde047' : '#22c55e',
                background: liftHeight > 0.1 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                padding: '0.15rem 0.4rem',
                borderRadius: '3px',
                border: `1px solid ${liftHeight > 0.1 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
              }}>
                {liftHeight > 0.1 ? `AIRBORNE HOVER: ${(liftHeight * 3.28).toFixed(1)} FT AGL` : 'TOUCHDOWN GROUNDED (0 FT)'}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: nightVision ? '#86efac' : 'var(--text-muted)' }}>
              CHASSIS ID: <strong style={{ color: '#bef264' }}>BVRU 02 005-7</strong> | CHINOOK CARGO HOOK: <strong style={{ color: '#eab308' }}>12,400 KG LIFTED</strong>
            </div>
          </div>
        </div>

        {/* Right Tactical Quick Toggles & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* FLIR Thermal Mode */}
          <button
            onClick={() => { setThermalMode(!thermalMode); if (nightVision) setNightVision(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              border: thermalMode ? '1px solid #ef4444' : '1px solid var(--border)',
              background: thermalMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: thermalMode ? '#f87171' : 'inherit',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            <Flame size={14} />
            FLIR Thermal
          </button>

          {/* NVG Night Vision Mode */}
          <button
            onClick={() => { setNightVision(!nightVision); if (thermalMode) setThermalMode(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              border: nightVision ? '1px solid #22c55e' : '1px solid var(--border)',
              background: nightVision ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: nightVision ? '#4ade80' : 'inherit',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            <Eye size={14} />
            NVG Green
          </button>

          {/* X-Ray Cutaway Mode */}
          <button
            onClick={() => setXrayMode(!xrayMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              border: xrayMode ? '1px solid #38bdf8' : '1px solid var(--border)',
              background: xrayMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: xrayMode ? '#38bdf8' : 'inherit',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            <Layers size={14} />
            Cutaway
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT: 3D CANVAS + TELEMETRY DOCK ─── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        
        {/* ─── 3D VIEWPORT CONTAINER ─── */}
        <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          
          {/* 3D Canvas */}
          <Canvas
            shadows
            camera={{ position: [13.0, 9.5, 15.0], fov: 42 }}
            style={{ background: nightVision ? '#041004' : '#141814', width: '100%', height: '100%' }}
          >
            <CameraController cameraPreset={cameraPreset} controlsRef={controlsRef} />
            <OrbitControls
              ref={controlsRef}
              makeDefault
              minDistance={1}
              maxDistance={80}
              enableDamping={true}
              dampingFactor={0.06}
              maxPolarAngle={Math.PI / 2 + 0.05}
            />

            {/* Tactical Environment Lighting */}
            <ambientLight intensity={nightVision ? 0.35 : (thermalMode ? 0.5 : 0.75)} />
            <directionalLight
              castShadow
              position={[10, 16, 12]}
              intensity={nightVision ? 0.6 : 1.4}
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
            />
            <directionalLight
              position={[-8, 8, -8]}
              intensity={0.4}
              color={nightVision ? '#22c55e' : '#a3b899'}
            />

            <hemisphereLight
              skyColor={nightVision ? '#15803d' : '#88a070'}
              groundColor={nightVision ? '#052e16' : '#334125'}
              intensity={0.4}
            />

            <Suspense fallback={null}>
              <TacticalContainerModel
                liftHeight={liftHeight}
                doorAngle={doorAngle}
                selectedComponent={selectedComponent}
                onSelectComponent={(id) => setSelectedComponent(id)}
                thermalMode={thermalMode}
                nightVision={nightVision}
                xrayMode={xrayMode}
                interiorLightMode={interiorLight}
              />
            </Suspense>
          </Canvas>

          {/* ─── HELICOPTER AIRLIFT CONTROL PANEL (FLOATING TOP-LEFT) ─── */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            background: 'rgba(15, 23, 15, 0.9)',
            backdropFilter: 'blur(10px)',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(132, 204, 22, 0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 5,
            width: '240px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#bef264', letterSpacing: '0.06em' }}>
                RAH-66 STEALTH TACTICAL AIRLIFT
              </span>
              <span style={{
                fontSize: '0.6rem',
                color: liftHeight > 0.05 ? '#eab308' : '#22c55e',
                fontWeight: 700
              }}>
                {airliftState.toUpperCase()}
              </span>
            </div>

            {/* Quick Action Buttons: Lift / Drop / Auto-Cycle */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => {
                  setDoorAngle(0) // Safe flight door seal
                  setCameraPreset('helicopter_flight') // Automatically switch to clear wide flight view
                  setAirliftState('lifting')
                }}
                disabled={airliftState === 'lifting' || liftHeight >= 4.8}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  padding: '0.45rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: '1px solid #84cc16',
                  background: 'rgba(132, 204, 22, 0.25)',
                  color: '#bef264',
                  cursor: (airliftState === 'lifting' || liftHeight >= 4.8) ? 'not-allowed' : 'pointer',
                  opacity: (airliftState === 'lifting' || liftHeight >= 4.8) ? 0.5 : 1
                }}
              >
                <ArrowUp size={12} />
                LIFT
              </button>

              <button
                onClick={() => {
                  setCameraPreset('helicopter_flight')
                  setAirliftState('dropping')
                }}
                disabled={airliftState === 'dropping' || liftHeight <= 0.05}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  padding: '0.45rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.25)',
                  color: '#7dd3fc',
                  cursor: (airliftState === 'dropping' || liftHeight <= 0.05) ? 'not-allowed' : 'pointer',
                  opacity: (airliftState === 'dropping' || liftHeight <= 0.05) ? 0.5 : 1
                }}
              >
                <ArrowDown size={12} />
                DROP
              </button>

              <button
                onClick={() => setAutoCycle(!autoCycle)}
                title="Toggle continuous lift and drop cycle"
                style={{
                  padding: '0.45rem 0.55rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: autoCycle ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                  background: autoCycle ? 'rgba(234, 179, 8, 0.3)' : 'rgba(0,0,0,0.3)',
                  color: autoCycle ? '#fde047' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Manual Altitude Slider */}
            <div style={{ marginTop: '0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                <span>AIRLIFT ALTITUDE</span>
                <span style={{ color: '#bef264', fontWeight: 700 }}>
                  {liftHeight.toFixed(1)}m ({(liftHeight * 3.28).toFixed(1)} ft)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4.8"
                step="0.1"
                value={liftHeight}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setLiftHeight(val)
                  if (val > 0 && doorAngle > 0) setDoorAngle(0)
                  setAirliftState(val === 0 ? 'ground' : (val >= 4.8 ? 'hover' : 'hover'))
                }}
                style={{ width: '100%', accentColor: '#84cc16', cursor: 'pointer' }}
              />
            </div>

            {/* Clamshell Door Control (Default CLOSED 0 deg) */}
            <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', marginBottom: '0.2rem' }}>
                <span style={{ color: '#a3e635' }}>CLAMSHELL DOORS</span>
                <span style={{ fontWeight: 700, color: doorAngle === 0 ? '#22c55e' : '#fde047' }}>
                  {doorAngle}° ({doorAngle === 0 ? 'SEALED' : 'OPEN'})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="110"
                value={doorAngle}
                disabled={liftHeight > 0.1} // Locked closed in flight for safety
                onChange={(e) => setDoorAngle(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#84cc16', cursor: liftHeight > 0.1 ? 'not-allowed' : 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <button
                  onClick={() => setDoorAngle(0)}
                  style={{
                    fontSize: '0.6rem',
                    padding: '0.2rem 0.4rem',
                    background: doorAngle === 0 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255,255,255,0.06)',
                    border: doorAngle === 0 ? '1px solid #22c55e' : 'none',
                    color: doorAngle === 0 ? '#4ade80' : '#94a3b8',
                    cursor: 'pointer',
                    borderRadius: '2px'
                  }}
                >
                  Combat Seal (0°)
                </button>
                <button
                  onClick={() => {
                    if (liftHeight > 0.1) return
                    setDoorAngle(105)
                  }}
                  disabled={liftHeight > 0.1}
                  style={{
                    fontSize: '0.6rem',
                    padding: '0.2rem 0.4rem',
                    background: doorAngle >= 100 ? 'rgba(132,204,22,0.25)' : 'rgba(255,255,255,0.06)',
                    border: doorAngle >= 100 ? '1px solid #84cc16' : 'none',
                    color: doorAngle >= 100 ? '#bef264' : '#94a3b8',
                    cursor: liftHeight > 0.1 ? 'not-allowed' : 'pointer',
                    borderRadius: '2px',
                    opacity: liftHeight > 0.1 ? 0.4 : 1
                  }}
                >
                  Deploy Open (105°)
                </button>
              </div>
            </div>

            {/* Camera Sights Bar */}
            <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.62rem', color: '#a3e635', marginBottom: '0.25rem' }}>
                CAMERA SIGHTS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                {[
                  { id: 'helicopter_flight', label: '🚁 Clear Flight View' },
                  { id: 'photo_tactical', label: 'Tactical Base' },
                  { id: 'front_doors', label: 'Front Doors' },
                  { id: 'compute_focus', label: 'Compute Blades' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setCameraPreset(preset.id)}
                    style={{
                      padding: '0.3rem 0.45rem',
                      fontSize: '0.62rem',
                      borderRadius: '3px',
                      border: cameraPreset === preset.id ? '1px solid #84cc16' : '1px solid rgba(255,255,255,0.1)',
                      background: cameraPreset === preset.id ? 'rgba(132, 204, 22, 0.25)' : 'rgba(0,0,0,0.3)',
                      color: cameraPreset === preset.id ? '#bef264' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Component Selection Pills (Bottom Bar in 3D scene) */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            display: 'flex',
            gap: '0.35rem',
            background: 'rgba(15, 23, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(100, 130, 80, 0.3)',
            zIndex: 5
          }}>
            <span style={{ fontSize: '0.65rem', alignSelf: 'center', color: '#a3e635', fontWeight: 700, marginRight: '0.2rem' }}>
              INSPECT:
            </span>
            {Object.keys(TACTICAL_COMPONENTS).map(id => {
              const comp = TACTICAL_COMPONENTS[id]
              const isSel = selectedComponent === id
              return (
                <button
                  key={id}
                  onClick={() => setSelectedComponent(id)}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.68rem',
                    borderRadius: '3px',
                    border: isSel ? '1px solid #84cc16' : '1px solid rgba(255,255,255,0.1)',
                    background: isSel ? 'rgba(132, 204, 22, 0.25)' : 'rgba(0,0,0,0.3)',
                    color: isSel ? '#bef264' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: isSel ? 700 : 400
                  }}
                >
                  {comp.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── RIGHT SIDEBAR: DETAILED METRICS & HARDWARE TELEMETRY ─── */}
        <aside style={{
          width: '420px',
          background: nightVision ? 'rgba(6, 18, 6, 0.98)' : 'var(--dark-gray)',
          borderLeft: `1px solid ${nightVision ? '#15803d' : 'var(--border)'}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 8,
          overflowY: 'auto'
        }}>
          {/* Component Quick Inspector Card */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(132, 204, 22, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Shield size={16} color="#84cc16" />
              <span style={{ fontSize: '0.68rem', color: '#84cc16', fontWeight: 700, letterSpacing: '0.06em' }}>
                {selectedData.category.toUpperCase()}
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700 }}>
              {selectedData.name}
            </h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {selectedData.desc}
            </p>

            {/* Spec list */}
            <div style={{
              marginTop: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '4px',
              padding: '0.5rem 0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              {Object.entries(selectedData.specs).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── LIVE OPERATIONAL METRICS SECTION ─── */}
          <div style={{ padding: '0.75rem 1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* Metric Category Tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.35)',
              borderRadius: '4px',
              padding: '0.2rem',
              marginBottom: '0.85rem'
            }}>
              {[
                { id: 'compute', label: 'vGPU Compute', icon: Cpu },
                { id: 'ecu', label: 'ECU & Cooling', icon: Wind },
                { id: 'power', label: 'Microgrid & Fuel', icon: Zap },
                { id: 'c4isr', label: 'C4ISR / Sec', icon: Radio }
              ].map(tab => {
                const Icon = tab.icon
                const isActive = activeMetricTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMetricTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      padding: '0.45rem 0.2rem',
                      borderRadius: '3px',
                      border: 'none',
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontWeight: isActive ? 700 : 400
                    }}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* TAB 1: COMPUTE & VGPU METRICS */}
            {activeMetricTab === 'compute' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ARRAY VGPU LOAD</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#84cc16' }}>{liveJitter.computeLoad}%</div>
                    <div style={{ fontSize: '0.62rem', color: '#22c55e' }}>64 / 64 Slices Active</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AI INFERENCE SPEED</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>{liveJitter.tokensPerSec.toLocaleString()}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Tokens / Sec Sustained</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '0.35rem' }}>
                    <span>Mission Compute Breakdown</span>
                    <span style={{ color: '#84cc16', fontWeight: 700 }}>4 Active Tactical Tasks</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: '42%', background: '#38bdf8' }} title="Drone Video Object Detection (42%)" />
                    <div style={{ width: '28%', background: '#84cc16' }} title="SAR Radar Neural Segmentation (28%)" />
                    <div style={{ width: '18%', background: '#eab308' }} title="Electronic Warfare Signal Classifier (18%)" />
                    <div style={{ width: '12%', background: '#64748b' }} title="System Headroom (12%)" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    <span>■ Video AI (42%)</span>
                    <span>■ SAR Radar (28%)</span>
                    <span>■ EW Signal (18%)</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                    Active Multi-Domain Edge Enclaves
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.68rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Classified Secret Enclave (vGPU 0-15):</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>ARMED (FIPS 140-3)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Coalition Tactical Net (vGPU 16-31):</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>ISOLATED & RUNNING</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Inter-Blade Bus NVLink-Edge:</span>
                      <span style={{ fontWeight: 600 }}>3.2 TB/s Throughput</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Host Memory Allocation:</span>
                      <span style={{ fontWeight: 600 }}>742 GB / 1024 GB ECC DDR5</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ECU & COOLING METRICS */}
            {activeMetricTab === 'ecu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>COLD AISLE TEMP</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>{liveJitter.coldTemp}°C</div>
                    <div style={{ fontSize: '0.62rem', color: '#22c55e' }}>Sub-20°C Verified</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EXT AMBIENT FIELD</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f97316' }}>{liveJitter.ambientTemp}°C</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Delta-T: 21.7°C Heat Rejection</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                    Environmental Control Unit (ECU) Telemetry
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.68rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Chiller Sensible Capacity:</span>
                      <span style={{ fontWeight: 600 }}>45.0 kW (153,500 BTU/hr)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Centrifugal Blower Velocity:</span>
                      <span style={{ fontWeight: 600 }}>4,800 CFM Continuous</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CBRN Positive Overpressure:</span>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>+265 Pa (Positive Barrier Active)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Relative Humidity:</span>
                      <span style={{ fontWeight: 600 }}>38.4% RH Non-Condensing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: POWER & MICROGRID METRICS */}
            {activeMetricTab === 'power' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CONTAINER POWER DRAW</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#eab308' }}>{liveJitter.powerDraw} kW</div>
                    <div style={{ fontSize: '0.62rem', color: '#22c55e' }}>Rating: 75 kW Max</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>JP-8 FUEL RUNTIME</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#bef264' }}>{liveJitter.fuelHours} hrs</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>142 Gallons On-Board</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                    Electrical Subsystem Load Allocation
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.68rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>IT Compute Blade Load:</span>
                      <span style={{ fontWeight: 600 }}>38.5 kW (73.0%)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ECU Chiller & Fans:</span>
                      <span style={{ fontWeight: 600 }}>12.8 kW (24.2%)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tactical PUE (Efficiency):</span>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>1.15 (High Efficiency)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Emergency LiFePO4 Buffer:</span>
                      <span style={{ fontWeight: 600 }}>98.2% SOC (96 kWh Ready)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: C4ISR & PHYSICAL RUGGEDNESS */}
            {activeMetricTab === 'c4isr' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                    C4ISR Comms & Defense Network
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.68rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mil-Satcom Uplink:</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Ka-Band Locked (320 Mbps)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Round-Trip Satcom Latency:</span>
                      <span style={{ fontWeight: 600 }}>22 milliseconds</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Squad MANET Mesh Radio:</span>
                      <span style={{ fontWeight: 600 }}>14 Nodes Synchronized</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                    Physical Hardening & Sensor Alarms
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.68rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>3-Axis Accelerometer / Shock:</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>
                        {liftHeight > 0.05 ? '0.12 G (In-Flight Aerodynamic)' : '0.04 G (Touchdown Damped)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Zero-Trust Tamper Detection:</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>ARMED (0 Interlock Breaches)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom System Status Pill */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: liftHeight > 0.05 ? '#eab308' : '#22c55e',
                  display: 'inline-block'
                }} />
                <span style={{ color: liftHeight > 0.05 ? '#fde047' : '#22c55e', fontWeight: 700 }}>
                  {liftHeight > 0.05 ? 'RAH-66 STEALTH AIRLIFT ACTIVE' : 'TACTICAL NODE OPERATIONAL'}
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>DEFCON 3 READY</span>
            </div>

          </div>
        </aside>

      </div>
    </div>
  )
}
