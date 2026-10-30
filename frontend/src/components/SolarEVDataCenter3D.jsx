import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Sun, Battery, Zap, RotateCcw, Truck, Maximize2, Minimize2,
  ShieldCheck, Layers, Activity, Gauge, Info, Sparkles, Building,
  Compass, ArrowUpRight, CheckCircle2, Sliders, Wind, Power
} from 'lucide-react'

// ─── COMPONENT TELEMETRY SPECIFICATIONS FOR INTERACTIVE CLICK ───
const SOLAR_EV_COMPONENTS = {
  'solar-field': {
    name: '12.8 MWp Hyperscale Solar PV Field',
    category: 'Renewable Generation Array',
    specs: {
      'Installed Capacity': '12.8 MWp DC (Bifacial N-Type TOPCon)',
      'Module Efficiency': '22.8% Conversion Efficiency',
      'Mounting Architecture': 'Single-Axis Smart Tracking (±45° Azimuth)',
      'String Inverters': '32x 350kW High-Efficiency Central Inverters',
      'Current Generation': '9.42 MW Live Peak AC',
      'Capacity Factor': '26.4% Annualized'
    },
    desc: 'Sprawling utility-scale solar PV field directly coupled via medium-voltage microgrid to data center uninterruptible power distribution.'
  },
  'datacenter-building': {
    name: 'Hyperscale AI Cloud Data Center Facility',
    category: 'Mission-Critical Compute Facility',
    specs: {
      'Facility Footprint': '280,000 sq ft Single-Story Hyperscale Hall',
      'Total IT Load': '7.20 MW Continuous Compute Draw',
      'PUE (Efficiency)': '1.11 Annual Average PUE',
      'Power Source': '100% On-Site Solar PV + BESS Microgrid',
      'HVAC Cooling': 'Rooftop Evaporative Free-Cooling Chiller Arrays',
      'Redundancy Tier': 'Tier IV Fault-Tolerant 2N+1 Architecture'
    },
    desc: 'Main high-density data hall hosting liquid-cooled AI GPU clusters, tensor accelerators, and direct DC busway power distribution.'
  },
  'bess-storage': {
    name: '40 MWh Utility BESS Containerized Battery',
    category: 'Energy Storage & Microgrid Stabilizer',
    specs: {
      'Storage Capacity': '40.0 MWh LFP (Lithium Iron Phosphate)',
      'Continuous Discharge': '10.0 MW Instant Peak Delivery',
      'State of Charge': '94.2% Available Energy (37.7 MWh)',
      'Cycle Life': '6,500 Cycles @ 80% Retention',
      'Autonomy Duration': '5.2 Hours at 100% Critical IT Load',
      'Response Time': '< 4 milliseconds Sub-Cycle UPS Transfer'
    },
    desc: 'Utility-scale Megapack battery enclosures buffering intermittency, performing solar time-shifting, and delivering instant zero-loss emergency power.'
  },
  'ev-fleet-hub': {
    name: 'Bidirectional EV Power Backup & V2G Depot',
    category: 'Mobile Microgrid & Fleet Backup',
    specs: {
      'Fleet Units Connected': '8x Heavy-Duty Commercial EV Battery Trucks',
      'V2G Dispatch Capacity': '2.40 MW Bidirectional Discharge (Vehicle-to-Grid)',
      'Combined Vehicle Storage': '4.8 MWh On-Wheel Mobile Storage',
      'Discharge Standard': 'ISO 15118-20 Bidirectional High-Power DC',
      'Fleet Status': 'Grid Synchronized & Standby Ready',
      'Auxiliary Role': 'Rapid Mobile Deployment for Critical Feeder Support'
    },
    desc: 'Vehicle-to-Grid (V2G) backup charging infrastructure utilizing electric fleet batteries as flexible mobile storage for data center resilience.'
  },
  'substation-yard': {
    name: 'High-Voltage Switchyard & Substation',
    category: 'Grid Interconnection & Transformers',
    specs: {
      'Step-Up Voltage': '34.5 kV Medium-Voltage to 115 kV Grid',
      'Main Transformers': '2x 25 MVA Low-Noise Mineral Oil Transformers',
      'Power Factor': '0.998 Ultra-Low Reactive Loss',
      'Protection': 'SF6 Vacuum Circuit Breakers & Arc Flash Relays',
      'Microgrid Controller': 'Dual-Redundant Automated Islanding PLC'
    },
    desc: 'Enclosed transformer and switchgear yard orchestrating islanded solar generation, battery dispatch, and clean grid interconnection.'
  }
}

// ─── SOLAR PV STRING ROW COMPONENT ───
function SolarPanelRow({
  position,
  rotation = [0, 0, 0],
  length = 14,
  panelAngle = 0.45,
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false
}) {
  const panelCount = Math.floor(length / 1.1)

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Structural Ground Racking / Steel Support Posts */}
      {Array.from({ length: Math.ceil(length / 2.5) + 1 }).map((_, idx) => {
        const px = -length / 2 + idx * 2.5
        return (
          <group key={idx} position={[px, 0, 0]}>
            {/* Front Leg (Lower) */}
            <mesh position={[0, 0.4, 0.4]}>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Rear Leg (Higher to angle panel) */}
            <mesh position={[0, 0.75, -0.4]}>
              <cylinderGeometry args={[0.04, 0.04, 1.5, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Angled Cross Strut */}
            <mesh position={[0, 0.8, 0]} rotation={[panelAngle, 0, 0]}>
              <boxGeometry args={[0.06, 0.05, 1.4]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )
      })}

      {/* Longitudinal Mounting Rails */}
      {[-0.35, 0.35].map((rz, rIdx) => (
        <mesh key={rIdx} position={[0, 0.82 - rz * Math.sin(panelAngle), rz * Math.cos(panelAngle)]} rotation={[panelAngle, 0, 0]}>
          <boxGeometry args={[length + 0.2, 0.04, 0.05]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Individual Dark Blue Solar PV Modules */}
      {Array.from({ length: panelCount }).map((_, pIdx) => {
        const px = -length / 2 + 0.55 + pIdx * 1.1
        return (
          <group key={pIdx} position={[px, 0.85, 0]} rotation={[panelAngle, 0, 0]}>
            {/* Silver Aluminum Outer Frame */}
            <mesh>
              <boxGeometry args={[1.04, 0.035, 1.3]} />
              <meshStandardMaterial
                color={isHovered ? '#38bdf8' : '#e2e8f0'}
                metalness={0.85}
                roughness={0.25}
              />
            </mesh>

            {/* Deep Photovoltaic Blue Glass Cell Surface */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.98, 0.015, 1.24]} />
              <meshStandardMaterial
                color={isHovered ? '#1d4ed8' : '#1e3a8a'}
                metalness={0.8}
                roughness={0.15}
                emissive={isHovered ? '#0284c7' : '#0c2340'}
                emissiveIntensity={isHovered ? 0.6 : 0.15}
              />
            </mesh>

            {/* Subtle Cell Grid Lines (Silver Busbars) */}
            {[-0.25, 0, 0.25].map((bx, bIdx) => (
              <mesh key={bIdx} position={[bx, 0.028, 0]}>
                <boxGeometry args={[0.015, 0.005, 1.2]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

// ─── HYPERSCALE DATA CENTER MAIN BUILDING ───
function HyperscaleDataCenterBuilding({
  position = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false
}) {
  const width = 28
  const length = 16
  const height = 4.8

  return (
    <group
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Main Building Concrete Envelope (Matches the large industrial warehouse in image) */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={isHovered ? '#cbd5e1' : '#e2e8f0'}
          roughness={0.4}
          metalness={0.15}
          emissive={isHovered ? '#0284c7' : '#000000'}
          emissiveIntensity={isHovered ? 0.15 : 0}
        />
      </mesh>

      {/* White Flat Insulated Roof (Characteristic of modern data centers) */}
      <mesh position={[0, height + 0.05, 0]} receiveShadow>
        <boxGeometry args={[width * 1.01, 0.1, length * 1.01]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Roof Parapet Trim Lip */}
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[width * 1.02, 0.2, length * 1.02]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Rooftop HVAC Chiller Units & Mechanical Penthouse */}
      {Array.from({ length: 4 }).map((_, rIdx) =>
        Array.from({ length: 3 }).map((_, cIdx) => (
          <group
            key={`${rIdx}-${cIdx}`}
            position={[-width / 2 + 5 + rIdx * 5.8, height + 0.35, -length / 2 + 3.5 + cIdx * 4.5]}
          >
            {/* Chiller Housing Box */}
            <mesh>
              <boxGeometry args={[1.6, 0.5, 2.0]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Chiller Exhaust Cowls on top */}
            {[-0.45, 0.45].map((cx, idx) => (
              <mesh key={idx} position={[cx, 0.3, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.15, 12]} />
                <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
              </mesh>
            ))}
          </group>
        ))
      )}

      {/* Large Air Intake / Exhaust Louvers on Facade (Matches the square louvers in photo) */}
      <group position={[-width / 4, height * 0.55, length / 2 + 0.05]}>
        <mesh>
          <boxGeometry args={[4.2, 2.4, 0.1]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Horizontal Louver Slats */}
        {Array.from({ length: 9 }).map((_, idx) => (
          <mesh key={idx} position={[0, -0.9 + idx * 0.22, 0.06]}>
            <boxGeometry args={[4.0, 0.06, 0.08]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Loading Dock Bays on the Left Facade (Matches loading docks in the photo) */}
      {Array.from({ length: 6 }).map((_, dIdx) => (
        <group key={dIdx} position={[-width / 2 - 0.05, 1.2, -length / 2 + 2.5 + dIdx * 2.0]}>
          {/* Dock Door Recess */}
          <mesh>
            <boxGeometry args={[0.1, 2.2, 1.5]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Dock Leveler / Concrete Bumper */}
          <mesh position={[-0.2, -0.9, 0]}>
            <boxGeometry args={[0.4, 0.4, 1.7]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Architectural Branding & Status Light Bar */}
      <mesh position={[width * 0.25, height * 0.75, length / 2 + 0.06]}>
        <boxGeometry args={[6.5, 0.6, 0.04]} />
        <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// ─── HIGH-VOLTAGE SUBSTATION & INVERTER YARD ───
function SubstationYard({
  position = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false
}) {
  const width = 6.0
  const length = 5.0

  return (
    <group
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Crushed Gravel / Concrete Equipment Pad */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial
          color={isHovered ? '#94a3b8' : '#cbd5e1'}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Main Power Step-Up Transformers */}
      {[-1.5, 1.5].map((tx, idx) => (
        <group key={idx} position={[tx, 0.2, 0]}>
          {/* Transformer Main Oil Tank Body */}
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[1.5, 1.6, 1.8]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Transformer Cooling Radiator Fins */}
          {[-0.85, 0.85].map((rx, rIdx) => (
            <mesh key={rIdx} position={[rx, 0.9, 0]}>
              <boxGeometry args={[0.15, 1.4, 1.6]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          {/* High Voltage Bushings / Insulators on Top */}
          {[-0.4, 0, 0.4].map((bx, bIdx) => (
            <mesh key={bIdx} position={[bx, 1.9, 0.4]}>
              <cylinderGeometry args={[0.07, 0.12, 0.6, 8]} />
              <meshStandardMaterial color="#0284c7" metalness={0.5} roughness={0.2} />
            </mesh>
          ))}
          {/* Conservator Expansion Tank */}
          <mesh position={[0, 1.85, -0.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 1.4, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Central Inverter & Switchgear Kiosk Enclosure */}
      <mesh position={[0, 0.85, -1.6]}>
        <boxGeometry args={[3.2, 1.4, 0.9]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Perimeter Chain-Link Fence Posts */}
      {[-width / 2, width / 2].map((fx, i) =>
        [-length / 2, length / 2].map((fz, j) => (
          <mesh key={`${i}-${j}`} position={[fx, 0.9, fz]}>
            <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* Fence Mesh Enclosure Walls (Semi-transparent) */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[width, 1.6, length]} />
        <meshStandardMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>
    </group>
  )
}

// ─── BESS BATTERY STORAGE CONTAINERS (MEGAPACK STYLE) ───
function BESSContainerArray({
  position = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false
}) {
  const containerCount = 4

  return (
    <group
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Concrete Pad */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[containerCount * 2.8 + 0.6, 0.2, 3.6]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>

      {/* White Megapack Style Battery Energy Storage Units */}
      {Array.from({ length: containerCount }).map((_, cIdx) => {
        const cx = -((containerCount - 1) * 2.8) / 2 + cIdx * 2.8
        return (
          <group key={cIdx} position={[cx, 0.2, 0]}>
            {/* White Weatherproof Container Shell */}
            <mesh position={[0, 0.9, 0]} castShadow>
              <boxGeometry args={[2.4, 1.7, 2.8]} />
              <meshStandardMaterial
                color={isHovered ? '#67e8f9' : '#f8fafc'}
                metalness={0.4}
                roughness={0.25}
                emissive={isHovered ? '#0891b2' : '#000000'}
                emissiveIntensity={isHovered ? 0.35 : 0}
              />
            </mesh>

            {/* Front Panel Seams & Service Doors */}
            <mesh position={[0, 0.9, 1.41]}>
              <boxGeometry args={[2.2, 1.5, 0.02]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>

            {/* Top Climate Control / Inverter Louvers */}
            <mesh position={[0, 1.82, 0]}>
              <boxGeometry args={[2.2, 0.15, 2.6]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Real-time Green Battery Status Indicator LED */}
            <mesh position={[0.8, 1.4, 1.42]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial
                color="#10b981"
                emissive="#10b981"
                emissiveIntensity={1.0}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ─── BIDIRECTIONAL EV FLEET POWER BACKUP & V2G DEPOT ───
function EVBackupFleetDepot({
  position = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
  isHovered = false
}) {
  return (
    <group
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Asphalt Parking Bay Pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[11, 0.1, 5.0]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Painted White EV Charging Bay Stall Lines */}
      {[-4.0, -1.3, 1.3, 4.0].map((lx, idx) => (
        <mesh key={idx} position={[lx, 0.11, 0]}>
          <boxGeometry args={[0.1, 0.02, 4.4]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}

      {/* High-Power Bidirectional DC Charging Dispensers (V2G Pedestals) */}
      {[-2.6, 0, 2.6].map((dx, idx) => (
        <group key={idx} position={[dx, 0.1, -2.1]}>
          {/* Charger Bollard Body */}
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[0.4, 1.3, 0.35]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.2} />
          </mesh>
          {/* Cyan Glow Screen */}
          <mesh position={[0, 0.85, 0.18]}>
            <boxGeometry args={[0.26, 0.35, 0.02]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Cable & Plug tethered to ground */}
          <mesh position={[0.2, 0.4, 0.2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}

      {/* Commercial Electric Battery Backup Trucks (V2G Vehicle Units) */}
      {[-2.6, 2.6].map((vx, vIdx) => (
        <group key={vIdx} position={[vx, 0.1, 0.4]}>
          {/* Main Truck Chassis / Wheels */}
          {[-0.65, 0.65].map((wx, wIdx) =>
            [-1.1, 1.1].map((wz, zIdx) => (
              <mesh key={`${wIdx}-${zIdx}`} position={[wx, 0.32, wz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.32, 0.32, 0.25, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
              </mesh>
            ))
          )}
          {/* Lower Battery Pack Floor Skirt */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.3, 0.3, 2.8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          {/* White EV Utility Truck Body Cab */}
          <mesh position={[0, 0.95, -0.6]} castShadow>
            <boxGeometry args={[1.3, 1.0, 1.2]} />
            <meshStandardMaterial
              color={isHovered ? '#67e8f9' : '#f8fafc'}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          {/* Windshield */}
          <mesh position={[0, 1.05, -1.21]}>
            <boxGeometry args={[1.1, 0.5, 0.05]} />
            <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Rear Mobile Battery Container Module */}
          <mesh position={[0, 1.0, 0.6]} castShadow>
            <boxGeometry args={[1.35, 1.2, 1.7]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0284c7"
              emissiveIntensity={0.2}
              metalness={0.6}
            />
          </mesh>
          {/* V2G Green Active Injection Light */}
          <mesh position={[0, 1.5, 1.45]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.0}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── REALISTIC OPEN COUNTRYSIDE TERRAIN & ACCESS ROADS ───
function CountrysideTerrain({ isLight = true }) {
  return (
    <group>
      {/* Expansive Countryside Grass Terrain (Matches the green/amber fields in photo) */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[84, 0.1, 68]} />
        <meshStandardMaterial
          color={isLight ? '#7da86b' : '#3f6233'}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Inner Mowed Lawn Field around Solar Arrays */}
      <mesh position={[10, 0.01, 8]} receiveShadow>
        <boxGeometry args={[60, 0.05, 46]} />
        <meshStandardMaterial
          color={isLight ? '#8dbf78' : '#49733b'}
          roughness={0.85}
        />
      </mesh>

      {/* Asphalt Perimeter Roadway (Matches curving road on left/bottom in photo) */}
      {/* Left Access Road */}
      <mesh position={[-25, 0.03, 0]}>
        <boxGeometry args={[4.2, 0.05, 66]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      {/* Bottom Cross Road */}
      <mesh position={[5, 0.03, 27]}>
        <boxGeometry args={[64, 0.05, 4.2]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Concrete Apron around Data Center Facility */}
      <mesh position={[-5, 0.02, -8]}>
        <boxGeometry args={[34, 0.04, 22]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
      </mesh>

      {/* Perimeter Security Fence Posts & Transmission Lines */}
      {Array.from({ length: 9 }).map((_, idx) => (
        <group key={idx} position={[-28, 0, -28 + idx * 7]}>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 5.0, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} />
          </mesh>
          {/* Crossarm */}
          <mesh position={[0, 4.7, 0]}>
            <boxGeometry args={[0.08, 0.08, 1.8]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── ANIMATED ENERGY FLOW PARTICLES (SOLAR -> BESS -> DATA CENTER) ───
function MicrogridEnergyPulses({ sunIntensity = 1.0 }) {
  const pulsesRef = useRef([])
  const particleCount = 12

  // Key coordinate waypoints
  // Solar field center ~ [12, 1, 8]
  // Substation ~ [4, 0.5, 12]
  // BESS ~ [-10, 0.5, 12]
  // Data Center ~ [-6, 1, -8]
  const pathPoints = useMemo(() => [
    new THREE.Vector3(16, 0.9, 14),
    new THREE.Vector3(8, 0.8, 13),
    new THREE.Vector3(4, 0.8, 12), // Substation
    new THREE.Vector3(-4, 0.7, 12),
    new THREE.Vector3(-10, 0.7, 12), // BESS
    new THREE.Vector3(-10, 0.7, 0),
    new THREE.Vector3(-6, 0.7, -6), // Data Center entry
  ], [])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(pathPoints), [pathPoints])

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.45 * Math.max(0.2, sunIntensity)
    pulsesRef.current.forEach((pulse, i) => {
      if (!pulse) return
      const u = (t + i / particleCount) % 1
      const pt = curve.getPointAt(u)
      pulse.position.copy(pt)
    })
  })

  return (
    <group>
      {/* Power conduit ground lines */}
      <mesh position={[0, 0.05, 0]}>
        <tubeGeometry args={[curve, 40, 0.08, 8, false]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Flowing Energy Packets */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <mesh key={i} ref={(el) => (pulsesRef.current[i] = el)}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── CAMERA CONTROLLER ───
function CameraController({ viewMode = 'aerial', resetTrigger = 0 }) {
  const { camera } = useThree()

  useEffect(() => {
    if (viewMode === 'aerial') {
      // Perspective matching the exact angle of the user's uploaded aerial photo!
      camera.position.set(22, 28, 36)
      camera.lookAt(2, 2, 4)
    } else if (viewMode === 'solar') {
      camera.position.set(24, 9, 20)
      camera.lookAt(14, 1, 8)
    } else if (viewMode === 'datacenter') {
      camera.position.set(-2, 12, 10)
      camera.lookAt(-6, 3, -8)
    } else if (viewMode === 'bess_ev') {
      camera.position.set(-6, 6, 20)
      camera.lookAt(-8, 1, 12)
    }
  }, [viewMode, resetTrigger, camera])

  return null
}

// ─── MAIN EXPORTED 3D SOLAR EV COMPONENT ───
export default function SolarEVDataCenter3D({
  theme = 'light',
  isActive = true
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [viewPreset, setViewPreset] = useState('aerial') // 'aerial', 'solar', 'datacenter', 'bess_ev'
  const [sunMode, setSunMode] = useState('noon') // 'morning', 'noon', 'evening', 'night'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)

  // Dynamic Theme detection synced with global app theme toggle
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

  // Sun conditions based on time-of-day selector
  const sunData = useMemo(() => {
    if (sunMode === 'morning') {
      return { pos: [35, 14, 18], intensity: 0.85, solarMW: 7.2, label: '09:00 MORNING (720 W/m²)' }
    } else if (sunMode === 'noon') {
      return { pos: [12, 38, 14], intensity: 1.45, solarMW: 12.4, label: '12:00 PEAK NOON (1000 W/m²)' }
    } else if (sunMode === 'evening') {
      return { pos: [-30, 9, 10], intensity: 0.55, solarMW: 3.8, label: '17:30 SUNSET (380 W/m²)' }
    } else {
      return { pos: [0, 5, 0], intensity: 0.1, solarMW: 0.0, label: '23:00 NIGHT (BESS / V2G BACKUP)' }
    }
  }, [sunMode])

  const dcDemandMW = 7.2
  const netSurplusMW = sunData.solarMW - dcDemandMW
  const selectedData = selectedId ? SOLAR_EV_COMPONENTS[selectedId] : null

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '750px' : '480px',
        background: isLight ? '#f8fafc' : '#0a0f14',
        border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'height 0.3s ease, background 0.2s ease, border-color 0.2s ease',
        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
      }}
    >
      {/* ─── TOP LEFT: RENEWABLE ARCHITECTURE BADGE & METRICS ─── */}
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
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sun size={11} color={isLight ? '#facc15' : '#eab308'} />
            SOLAR PV & EV BACKUP MICROGRID
          </div>

          <div
            style={{
              background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
              border: isLight ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.4)',
              color: isLight ? '#047857' : '#34d399',
              padding: '0.2rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.55rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ShieldCheck size={11} color={isLight ? '#047857' : '#34d399'} />
            100% CLEAN RENEWABLE BACKUP
          </div>
        </div>

        <div style={{ fontSize: '0.65rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
          Interactive Aerial Digital Twin • Ground Solar Farm • Megapack BESS • Mobile EV V2G Units
        </div>
      </div>

      {/* ─── TOP RIGHT: SUN TIME-OF-DAY & VIEW CONTROLS ─── */}
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
        {/* Time-of-Day Irradiance Toggles */}
        {[
          { id: 'morning', label: '09:00 AM', icon: Sun },
          { id: 'noon', label: '12:00 PEAK', icon: Sun },
          { id: 'evening', label: '17:30 SUNSET', icon: Wind },
          { id: 'night', label: '23:00 NIGHT', icon: Battery }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSunMode(t.id)}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.55rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: sunMode === t.id
                ? (isLight ? '#fef9c3' : 'rgba(234, 179, 8, 0.25)')
                : (isLight ? '#ffffff' : '#111820'),
              border: sunMode === t.id
                ? '1px solid #eab308'
                : (isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'),
              color: sunMode === t.id
                ? (isLight ? '#854d0e' : '#fde047')
                : (isLight ? '#475569' : '#8b949e'),
              boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            {t.label}
          </button>
        ))}

        {/* Reset Camera View Button */}
        <button
          onClick={() => {
            setViewPreset('aerial')
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
          title="Reset to Aerial Drone Angle"
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
          title={isFullscreen ? 'Collapse 3D View' : 'Expand Fullscreen View'}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* ─── BOTTOM LEFT: CAMERA PERSPECTIVE PRESETS ─── */}
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
          INSPECT:
        </span>
        {[
          { id: 'aerial', label: 'Drone Aerial' },
          { id: 'solar', label: 'Solar Field' },
          { id: 'datacenter', label: 'Data Center' },
          { id: 'bess_ev', label: 'BESS & EV Hub' }
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

      {/* ─── BOTTOM RIGHT: LIVE CLEAN MICROGRID TELEMETRY CHIPS ─── */}
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
          <span style={{ color: isLight ? '#d97706' : '#eab308', fontWeight: 800 }}>SOLAR PV:</span>
          <strong>{sunData.solarMW.toFixed(1)} MW</strong>
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
          <span style={{ color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 800 }}>DC LOAD:</span>
          <strong>{dcDemandMW.toFixed(1)} MW</strong>
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
          <span style={{ color: netSurplusMW >= 0 ? (isLight ? '#16a34a' : '#22c55e') : '#ef4444', fontWeight: 800 }}>
            {netSurplusMW >= 0 ? 'BESS CHARGE:' : 'BESS DISCHARGE:'}
          </span>
          <strong>{Math.abs(netSurplusMW).toFixed(1)} MW</strong>
        </div>
      </div>

      {/* ─── INTERACTIVE INSPECTOR MODAL CARD ─── */}
      {selectedData && (
        <div
          style={{
            position: 'absolute',
            top: '3.2rem',
            left: '1rem',
            zIndex: 20,
            width: '310px',
            background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.95)',
            border: isLight ? '1px solid #38bdf8' : '1px solid rgba(6, 182, 212, 0.4)',
            borderRadius: '6px',
            padding: '0.85rem',
            boxShadow: isLight ? '0 10px 25px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.5)',
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
                {selectedData.category}
              </span>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isLight ? '#0f172a' : '#fff', marginTop: '1px' }}>
                {selectedData.name}
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
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
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginTop: '0.65rem',
              fontSize: '0.6rem',
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            {Object.entries(selectedData.specs).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px' }}>
                <span style={{ color: isLight ? '#64748b' : '#8b949e' }}>{key}</span>
                <strong style={{ color: isLight ? '#0f172a' : '#fff' }}>{value}</strong>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.58rem', color: isLight ? '#475569' : '#94a3b8', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
            {selectedData.desc}
          </p>
        </div>
      )}

      {/* ─── 3D THREE.JS WEBGL SCENE ─── */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isLight ? 1.15 : 1.05
        }}
        camera={{ position: [22, 28, 36], fov: 38, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <CameraController viewMode={viewPreset} resetTrigger={resetTrigger} />

        {/* Ambient Sunlight & Dynamic Sky Lighting */}
        <ambientLight intensity={isLight ? 0.75 : 0.45} />
        <directionalLight
          position={sunData.pos}
          intensity={sunData.intensity}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={120}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <directionalLight position={[-20, 15, -20]} intensity={0.25} />

        <Suspense fallback={null}>
          {/* Natural Countryside Landscape & Access Roads */}
          <CountrysideTerrain isLight={isLight} />

          {/* ═════ 1. HYPERSCALE DATA CENTER FACILITY BUILDING ═════ */}
          <HyperscaleDataCenterBuilding
            position={[-5, 0, -8]}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedId('datacenter-building')
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHoveredId('datacenter-building')
            }}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'datacenter-building' || selectedId === 'datacenter-building'}
          />

          {/* ═════ 2. GROUND SOLAR PHOTOVOLTAIC PV FARM ═════ */}
          {/* Parallel Strings matching the exact perspective layout of the uploaded photo */}
          {/* Front Rows (Close to camera, angled facing the sun) */}
          {Array.from({ length: 7 }).map((_, rowIdx) => {
            const rz = 2.0 + rowIdx * 3.4
            const rx = 11.0 + (rowIdx % 2 === 0 ? 0.8 : -0.8)
            const rLen = 18.0 - (rowIdx > 4 ? (rowIdx - 4) * 2.5 : 0)
            return (
              <SolarPanelRow
                key={`solar-front-${rowIdx}`}
                position={[rx, 0, rz]}
                length={rLen}
                panelAngle={0.42}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId('solar-field')
                }}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  setHoveredId('solar-field')
                }}
                onPointerOut={() => setHoveredId(null)}
                isHovered={hoveredId === 'solar-field' || selectedId === 'solar-field'}
              />
            )
          })}

          {/* Right Perimeter Solar Extension Arrays */}
          {Array.from({ length: 4 }).map((_, rIdx) => {
            const rz = -6.0 + rIdx * 3.2
            const rx = 24.0
            return (
              <SolarPanelRow
                key={`solar-right-${rIdx}`}
                position={[rx, 0, rz]}
                length={12}
                panelAngle={0.42}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId('solar-field')
                }}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  setHoveredId('solar-field')
                }}
                onPointerOut={() => setHoveredId(null)}
                isHovered={hoveredId === 'solar-field' || selectedId === 'solar-field'}
              />
            )
          })}

          {/* ═════ 3. SUBSTATION & INVERTER YARD ═════ */}
          <SubstationYard
            position={[4.0, 0, 13.0]}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedId('substation-yard')
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHoveredId('substation-yard')
            }}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'substation-yard' || selectedId === 'substation-yard'}
          />

          {/* ═════ 4. BESS BATTERY ENERGY STORAGE CONTAINERS ═════ */}
          <BESSContainerArray
            position={[-8.5, 0, 13.0]}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedId('bess-storage')
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHoveredId('bess-storage')
            }}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'bess-storage' || selectedId === 'bess-storage'}
          />

          {/* ═════ 5. BIDIRECTIONAL EV BACKUP FLEET DEPOT (V2G) ═════ */}
          <EVBackupFleetDepot
            position={[-18.5, 0, 4.0]}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedId('ev-fleet-hub')
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHoveredId('ev-fleet-hub')
            }}
            onPointerOut={() => setHoveredId(null)}
            isHovered={hoveredId === 'ev-fleet-hub' || selectedId === 'ev-fleet-hub'}
          />

          {/* ═════ 6. LIVE MICROGRID CONDUIT PULSES ═════ */}
          <MicrogridEnergyPulses sunIntensity={sunData.intensity} />
        </Suspense>

        {/* Smooth OrbitControls with naturally bounded terrain viewing limits */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={10}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.05} // Keep camera above terrain
          minPolarAngle={0.1}
          target={[2, 1.5, 3]}
        />
      </Canvas>
    </div>
  )
}

