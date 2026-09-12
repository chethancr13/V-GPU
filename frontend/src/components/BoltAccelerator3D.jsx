import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Cpu, Layers, Zap, Flame, Box, RotateCcw,
  Sparkles, Image as ImageIcon, Radio, ShieldCheck,
  Grid, Compass, Maximize2
} from 'lucide-react'

// ─── HARDWARE SPECIFICATIONS ───
const HARDWARE_COMPONENTS = {
  asic: {
    id: 'asic',
    name: 'BOLT-1420 Tensor Processor',
    category: 'Core Neural ASIC',
    specs: {
      'Silicon Process': 'TSMC 4NP Custom FinFET',
      'Die Area': '742 mm² Monolithic',
      'Tensor Engines': '1,420 5th-Gen Tensor Units',
      'Peak Compute': '1,980 TFLOPS (FP8) / 990 TFLOPS (FP16)',
      'Clock Boost': '2,450 MHz Direct Die',
      'Heatspreader': 'Nickel-Plated Vapor Chamber (Chamfered)',
      'TDP Allocation': '285W Core Dynamic',
      'Operating Temp': '64.2°C'
    },
    description: 'Monolithic deep learning processor featuring dense matrix arithmetic units, hardware attention engines, and direct high-speed interconnects to stacked HBM3e modules.'
  },
  mezzanine: {
    id: 'mezzanine',
    name: 'Dual Stepped Mezzanine Modules',
    category: '96GB HBM3e High-Bandwidth Memory',
    specs: {
      'Memory Capacity': '96GB Total (Dual 48GB Mezzanine Cards)',
      'Die Layout': '16 High-Density Silicon Dies (2x4 per card)',
      'Bus Width': '4,096-bit Dual Wide Parallel Bus',
      'Bandwidth': '3.2 TB/s Peak Aggregate Throughput',
      'Mounting': 'Stepped Tiered Socket with Retention Brackets',
      'Operating Temp': '58.4°C'
    },
    description: 'Dual high-density mezzanine cards mounted on stepped socket rails, providing massive memory bandwidth with ultra-short copper traces directly into the BOLT processor.'
  },
  vrm: {
    id: 'vrm',
    name: '16-Phase Digital VRM & Capacitors',
    category: 'Multi-Phase Power Delivery',
    specs: {
      'Phase Config': '16+4 Phase Full Digital Loop',
      'Inductors': 'Molded High-Permeability Alloy Chokes',
      'Capacitors': 'Solid Aluminum-Polymer Cylindrical Cans',
      'Power Stages': '90A DrMOS Smart Power Stages',
      'Efficiency': '94.6% Under Full Transformer Load',
      'VRM Temp': '71.2°C'
    },
    description: 'Industrial-grade voltage regulation module delivering instant transient response for deep learning matrix multiplication spikes with minimal voltage ripple.'
  },
  io_heatsinks: {
    id: 'io_heatsinks',
    name: '800G QSFP-DD Transceivers & Heatsink',
    category: 'High-Speed I/O & Optics',
    specs: {
      'Optical / DAC Cages': 'Dual 800G QSFP-DD High-Speed Ports',
      'Cable Interface': 'Twinaxial Direct Attach Copper (DAC)',
      'Cooling Block': 'Extruded Black Anodized Aluminum Heatsink',
      'Management Port': 'Silver Shielded Gigabit RJ45',
      'Latency': '< 140 ns Port-to-Port',
      'Status': 'Twinax Links Locked (800 Gbps)'
    },
    description: 'High-radix clustering interconnect with dual twinaxial copper DAC cables and dedicated passive fin heatsinks over the optical physical layer transceivers.'
  },
  power_blocks: {
    id: 'power_blocks',
    name: 'Dual 48V DC Terminal Power Blocks',
    category: 'Main Server Power Input',
    specs: {
      'Input Voltage': '48V DC High-Current Server Rail',
      'Capacity': '600W Continuous Sustained',
      'Terminals': 'Dual Vertical Black High-Amp Connector Blocks',
      'Contacts': 'Heavy Gold-Plated Blade Clamps',
      'Filtering': 'Low-ESR High-Voltage Polymer Capacitors'
    },
    description: 'Dual vertical heavy-gauge DC power terminal blocks engineered to feed direct 48V-to-core conversion stages with zero resistive drop.'
  },
  pcie_bus: {
    id: 'pcie_bus',
    name: 'PCIe 5.0 x16 Host Edge Connector',
    category: 'Server Interface',
    specs: {
      'Standard': 'PCI Express 5.0 (32 GT/s per lane)',
      'Throughput': '128 GB/s Bidirectional Bandwidth',
      'Gold Contacts': '30μ Hard Gold over Nickel Barrier with Key Notch',
      'Auxiliary Bridge': 'Top-Edge Inter-Card Sync Gold Fingers',
      'Standoffs': '4x Precision Brass/Gold Mounting Rings'
    },
    description: 'High-speed card edge interface with hard gold contact fingers and precision PCB notch cutouts for seamless host server communication.'
  }
}

// ─── 3D ACCELERATOR MODEL ───

// 1. Main PCB Substrate
function PcbSubstrate({ exploded = 0, viewMode, selectedPart, onSelect }) {
  const isSelected = selectedPart === 'pcie_bus'

  // Ultra-detailed 2048x1024 procedural PCB artwork matching the exact photo
  const pcbTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    // Matte dark black PCB base matching photo
    ctx.fillStyle = '#101216'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Subtle dark copper ground planes
    ctx.fillStyle = '#171920'
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80)

    // Warm copper / gold circuit trace fan-outs
    ctx.strokeStyle = '#28241e'
    ctx.lineWidth = 1.6

    // Fan-out traces radiating from central ASIC towards VRM and memory
    for (let x = 600; x <= 1200; x += 16) {
      ctx.beginPath()
      ctx.moveTo(x, 480)
      ctx.lineTo(x + (x < 900 ? -120 : 120), 300)
      ctx.lineTo(x + (x < 900 ? -220 : 260), 160)
      ctx.stroke()
    }

    // High-speed differential pair buses to PCIe connector
    ctx.strokeStyle = '#322d24'
    ctx.lineWidth = 2.0
    for (let x = 300; x <= 1400; x += 22) {
      ctx.beginPath()
      ctx.moveTo(x, 560)
      ctx.lineTo(x + 40, 720)
      ctx.lineTo(x + 40, 940)
      ctx.stroke()
    }

    // Gold test pads, vias & SMT component footprints matching the photo
    ctx.fillStyle = '#b8943e'
    for (let i = 0; i < 400; i++) {
      const rx = 120 + ((i * 47) % (canvas.width - 240))
      const ry = 80 + ((i * 71) % (canvas.height - 160))
      ctx.fillRect(rx, ry, 2.5, 2.5)
    }

    // Dense via stitch grid around ASIC zone
    ctx.fillStyle = '#c5a049'
    for (let vx = 720; vx <= 1080; vx += 20) {
      for (let vy = 380; vy <= 640; vy += 20) {
        if (vx < 800 || vx > 1000 || vy < 440 || vy > 580) {
          ctx.beginPath()
          ctx.arc(vx, vy, 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Laser silkscreen text and reference designators
    ctx.fillStyle = '#788190'
    ctx.font = 'bold 16px "SF Mono", monospace'
    ctx.fillText('BOLT-1420 TENSOR ACCELERATOR', 280, 100)
    ctx.fillText('96GB HBM3e // PCIe Gen5 x16', 280, 126)
    ctx.fillText('TSMC 4NP ARCHITECTURE', 1250, 100)
    ctx.fillText('SECURE HARDWARE ENCLAVE', 1250, 126)
    ctx.fillText('REV 4.2 SERVER BLADE', 780, 920)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
  }, [])

  return (
    <group position={[0, 0, 0]}>
      {/* Main Board Base */}
      <mesh
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onSelect('pcie_bus')
        }}
      >
        <boxGeometry args={[15, 0.16, 6.4]} />
        <meshStandardMaterial
          map={pcbTexture}
          color={viewMode === 'wireframe' ? '#3b82f6' : isSelected ? '#1e293b' : '#14161b'}
          metalness={0.45}
          roughness={0.6}
          wireframe={viewMode === 'wireframe'}
        />
      </mesh>

      {/* Gold PCIe x16 Edge Connector Fingers (Bottom Edge) with exact notch cutout */}
      <group position={[0, -0.02, 3.28]}>
        {/* Left gold contact row */}
        <mesh position={[-3.2, 0, 0]}>
          <boxGeometry args={[4.2, 0.1, 0.36]} />
          <meshStandardMaterial color="#d4af37" metalness={0.92} roughness={0.2} wireframe={viewMode === 'wireframe'} />
        </mesh>
        {/* PCIe Key Notch Gap at x = -0.9 */}
        {/* Right long gold contact row */}
        <mesh position={[2.4, 0, 0]}>
          <boxGeometry args={[5.8, 0.1, 0.36]} />
          <meshStandardMaterial color="#d4af37" metalness={0.92} roughness={0.2} wireframe={viewMode === 'wireframe'} />
        </mesh>
      </group>

      {/* Top Edge Gold Card Finger Connector */}
      <mesh position={[-0.8, -0.02, -3.28]}>
        <boxGeometry args={[3.6, 0.1, 0.32]} />
        <meshStandardMaterial color="#d4af37" metalness={0.92} roughness={0.2} wireframe={viewMode === 'wireframe'} />
      </mesh>

      {/* 4 Precision Gold Standoff Mounting Rings with Drill Holes */}
      {[
        [-7.0, 2.7],
        [-7.0, -2.7],
        [7.0, 2.7],
        [7.0, -2.7],
        [-1.0, -2.8],
        [2.2, 2.8]
      ].map(([x, z], i) => (
        <group key={`standoff-${i}`} position={[x, 0.09, z]}>
          {/* Gold washer ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.46, 32]} />
            <meshStandardMaterial color="#c59b27" metalness={0.88} roughness={0.25} side={THREE.DoubleSide} />
          </mesh>
          {/* Inner dark drill hole */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <circleGeometry args={[0.21, 32]} />
            <meshBasicMaterial color="#040507" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 2. Central BOLT-1420 Processor (Exact match to the photo)
function BoltProcessor({ exploded = 0, viewMode, selectedPart, onSelect }) {
  const isSelected = selectedPart === 'asic'
  const yOffset = exploded * 2.0
  const meshRef = useRef()

  // High-precision laser engraved lid texture matching the photo exactly
  const lidTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    // Brushed metallic champagne/silver gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024)
    grad.addColorStop(0, '#c2c6ce')
    grad.addColorStop(0.25, '#dbe0e8')
    grad.addColorStop(0.5, '#e4e8f0')
    grad.addColorStop(0.75, '#b8bdc7')
    grad.addColorStop(1, '#969ca8')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1024, 1024)

    // Brushed metal horizontal fine lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    for (let i = 0; i < 1024; i += 2) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(1024, i)
      ctx.stroke()
    }

    // Outer beveled chamfer border
    ctx.strokeStyle = '#5a6270'
    ctx.lineWidth = 8
    ctx.strokeRect(40, 40, 944, 944)

    // Inner laser etched hairline
    ctx.strokeStyle = '#727b8c'
    ctx.lineWidth = 2.5
    ctx.strokeRect(64, 64, 896, 896)

    // Center Lightning Bolt icon matching photo
    ctx.fillStyle = '#262d3a'
    ctx.beginPath()
    ctx.moveTo(512, 320)
    ctx.lineTo(485, 430)
    ctx.lineTo(525, 430)
    ctx.lineTo(495, 540)
    ctx.lineTo(545, 415)
    ctx.lineTo(508, 415)
    ctx.closePath()
    ctx.fill()

    // Crisp typography: "B O L T"
    ctx.font = 'bold 76px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1e2430'
    ctx.fillText('B O L T', 512, 630)

    // "1420-000"
    ctx.font = '600 42px "SF Mono", monospace'
    ctx.fillStyle = '#3a4454'
    ctx.fillText('1420-000', 512, 695)

    ctx.font = '22px "SF Mono", monospace'
    ctx.fillStyle = '#556174'
    ctx.fillText('AI TENSOR HYPER-CORE', 512, 755)

    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])

  useFrame(({ clock }) => {
    if (meshRef.current && viewMode === 'thermal') {
      const t = clock.getElapsedTime()
      meshRef.current.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.2
    }
  })

  return (
    <group
      position={[-0.85, 0.12 + yOffset, 0.15]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect('asic')
      }}
    >
      {/* Substrate Carrier / BGA Interposer (Warm Olive/Gold) */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2.85, 0.14, 2.85]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : '#222822'}
          metalness={0.65}
          roughness={0.4}
          wireframe={viewMode === 'wireframe'}
        />
      </mesh>

      {/* Gold Corner Alignment Markers */}
      {[[-1.32, -1.32], [1.32, -1.32], [-1.32, 1.32], [1.32, 1.32]].map(([x, z], i) => (
        <mesh key={`align-${i}`} position={[x, 0.16, z]}>
          <boxGeometry args={[0.16, 0.02, 0.16]} />
          <meshStandardMaterial color="#eab308" metalness={0.95} roughness={0.15} />
        </mesh>
      ))}

      {/* Nickel-Plated Chamfered Integrated Heat Spreader (IHS) Lid */}
      <mesh ref={meshRef} position={[0, 0.24, 0]}>
        <boxGeometry args={[2.45, 0.18, 2.45]} />
        <meshStandardMaterial
          map={lidTexture}
          color={
            viewMode === 'thermal'
              ? '#ef4444'
              : isSelected
              ? '#ffffff'
              : '#d0d5dc'
          }
          emissive={
            viewMode === 'thermal'
              ? '#dc2626'
              : isSelected
              ? '#0284c7'
              : '#000000'
          }
          emissiveIntensity={
            viewMode === 'thermal' ? 0.75 : isSelected ? 0.35 : 0
          }
          metalness={0.88}
          roughness={0.22}
          wireframe={viewMode === 'wireframe'}
        />
      </mesh>

      {/* 4 Black Controller ICs directly to the left of the ASIC matching the photo */}
      {[-1.85].map((x) => (
        <group key="left-chips" position={[x, 0.08, 0]}>
          {[-0.8, -0.25, 0.3, 0.85].map((z, idx) => (
            <mesh key={`side-chip-${idx}`} position={[0, 0, z]}>
              <boxGeometry args={[0.42, 0.1, 0.42]} />
              <meshStandardMaterial color="#1a1e27" metalness={0.8} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Perimeter 0402 Decoupling Capacitor Arrays around Processor */}
      {Array.from({ length: 28 }).map((_, i) => {
        const side = Math.floor(i / 7)
        const step = (i % 7) - 3
        let cx = 0
        let cz = 0
        if (side === 0) { cx = step * 0.4; cz = -1.7 }
        else if (side === 1) { cx = step * 0.4; cz = 1.7 }
        else if (side === 2) { cx = -1.7; cz = step * 0.4 }
        else { cx = 1.7; cz = step * 0.4 }

        return (
          <mesh key={`cap-${i}`} position={[cx, 0.04, cz]}>
            <boxGeometry args={[0.18, 0.07, 0.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
        )
      })}
    </group>
  )
}

// 3. Dual Stepped Mezzanine Memory Modules (HBM3e) matching the photo
function MezzanineMemoryModules({ exploded = 0, viewMode, selectedPart, onSelect }) {
  const isSelected = selectedPart === 'mezzanine'
  const yOffset = exploded * 2.8

  const dieMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: viewMode === 'thermal' ? '#ea580c' : '#14171e',
      emissive: viewMode === 'thermal' ? '#c2410c' : isSelected ? '#0284c7' : '#000000',
      emissiveIntensity: viewMode === 'thermal' ? 0.6 : isSelected ? 0.3 : 0,
      metalness: 0.92,
      roughness: 0.18,
      wireframe: viewMode === 'wireframe'
    })
  }, [viewMode, isSelected])

  return (
    <group
      position={[2.8, 0.16 + yOffset, 0.15]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect('mezzanine')
      }}
    >
      {/* Black Plastic Mezzanine Socket Frame / Bracket Base */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[3.8, 0.12, 3.2]} />
        <meshStandardMaterial color="#0b0d11" metalness={0.85} roughness={0.4} />
      </mesh>

      {/* Dual Stepped/Tiered Mezzanine Cards: Lower Card & Upper Raised Card */}
      {[
        { z: -0.75, yLift: 0.12, label: 'mez-1' },
        { z: 0.75, yLift: 0.32, label: 'mez-2' }
      ].map((card, cardIdx) => (
        <group key={card.label} position={[0, card.yLift, card.z]}>
          {/* Mezzanine Substrate Board */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[3.4, 0.1, 1.35]} />
            <meshStandardMaterial
              color={isSelected ? '#0369a1' : '#151922'}
              metalness={0.6}
              roughness={0.4}
              wireframe={viewMode === 'wireframe'}
            />
          </mesh>

          {/* Retention Latch Bracket / Side Clips */}
          <mesh position={[-1.76, 0.1, 0]}>
            <boxGeometry args={[0.16, 0.24, 1.3]} />
            <meshStandardMaterial color="#090b0e" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[1.76, 0.1, 0]}>
            <boxGeometry args={[0.16, 0.24, 1.3]} />
            <meshStandardMaterial color="#090b0e" metalness={0.9} roughness={0.3} />
          </mesh>

          {/* Gold Connector Contact Pins along bottom */}
          <mesh position={[0, 0.01, -0.66]}>
            <boxGeometry args={[3.2, 0.04, 0.08]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
          </mesh>

          {/* 8 Memory Package Dies (2 rows of 4 square chips) */}
          {[-1.2, -0.4, 0.4, 1.2].map((x, colIdx) => (
            <group key={`chip-col-${colIdx}`}>
              {/* Row A */}
              <mesh position={[x, 0.15, -0.32]} material={dieMaterial}>
                <boxGeometry args={[0.66, 0.08, 0.46]} />
              </mesh>
              {/* Row B */}
              <mesh position={[x, 0.15, 0.32]} material={dieMaterial}>
                <boxGeometry args={[0.66, 0.08, 0.46]} />
              </mesh>

              {/* Passive bypass caps between dies */}
              <mesh position={[x, 0.13, 0]}>
                <boxGeometry args={[0.14, 0.04, 0.08]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

// 4. VRM Power Delivery (Ferrite Chokes, Solid Capacitors, DrMOS)
function VrmPowerStage({ exploded = 0, viewMode, selectedPart, onSelect }) {
  const isSelected = selectedPart === 'vrm'
  const yOffset = exploded * 1.6

  return (
    <group
      position={[-3.3, 0.14 + yOffset, -0.4]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect('vrm')
      }}
    >
      {/* Row of 8 Molded Ferrite Alloy Chokes (Light Silver/Grey Cubes matching photo) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`choke-${i}`} position={[0.45, 0.18, -1.8 + i * 0.48]}>
          <boxGeometry args={[0.42, 0.34, 0.42]} />
          <meshStandardMaterial
            color={
              viewMode === 'thermal'
                ? '#f97316'
                : isSelected
                ? '#38bdf8'
                : '#cbd1dc'
            }
            emissive={viewMode === 'thermal' ? '#ea580c' : '#000000'}
            emissiveIntensity={viewMode === 'thermal' ? 0.6 : 0}
            metalness={0.75}
            roughness={0.28}
            wireframe={viewMode === 'wireframe'}
          />
        </mesh>
      ))}

      {/* Dual Row of Cylindrical Solid Aluminum-Polymer Capacitors (Silver with black base) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={`caps-pair-${i}`} position={[-0.25, 0, -1.8 + i * 0.48]}>
          {/* Inner Cap */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.08, 24]} />
              <meshStandardMaterial color="#111317" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.26, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.44, 24]} />
              <meshStandardMaterial
                color={viewMode === 'thermal' ? '#fb923c' : '#e5e9f0'}
                metalness={0.92}
                roughness={0.15}
                wireframe={viewMode === 'wireframe'}
              />
            </mesh>
          </group>

          {/* Outer Cap */}
          <group position={[-0.38, 0, 0]}>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.08, 24]} />
              <meshStandardMaterial color="#111317" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.26, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.44, 24]} />
              <meshStandardMaterial
                color={viewMode === 'thermal' ? '#fb923c' : '#e5e9f0'}
                metalness={0.92}
                roughness={0.15}
                wireframe={viewMode === 'wireframe'}
              />
            </mesh>
          </group>
        </group>
      ))}

      {/* Row of 8 Black DrMOS Smart Power Stages */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`drmos-${i}`} position={[1.0, 0.06, -1.8 + i * 0.48]}>
          <boxGeometry args={[0.28, 0.08, 0.3]} />
          <meshStandardMaterial color="#1c202a" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// 5. Front I/O, Curved DAC Cables & Black Finned Heatsink (Matching photo)
function FrontIOAndHeatsinks({ exploded = 0, viewMode, selectedPart, onSelect }) {
  const isSelected = selectedPart === 'io_heatsinks'
  const yOffset = exploded * 2.4

  // Smooth realistic curved twinax cables arching up and to the left
  const [cableGeometry1, cableGeometry2] = useMemo(() => {
    const p1 = [
      new THREE.Vector3(-6.4, 0.42, -1.6),
      new THREE.Vector3(-7.4, 0.55, -1.9),
      new THREE.Vector3(-8.8, 0.95, -2.5),
      new THREE.Vector3(-10.2, 1.6, -3.1),
      new THREE.Vector3(-11.5, 2.4, -3.5)
    ]
    const p2 = [
      new THREE.Vector3(-6.4, 0.42, -0.65),
      new THREE.Vector3(-7.6, 0.55, -0.85),
      new THREE.Vector3(-9.0, 1.05, -1.3),
      new THREE.Vector3(-10.4, 1.8, -1.9),
      new THREE.Vector3(-11.8, 2.7, -2.3)
    ]
    const curve1 = new THREE.CatmullRomCurve3(p1)
    const curve2 = new THREE.CatmullRomCurve3(p2)
    return [
      new THREE.TubeGeometry(curve1, 48, 0.18, 16, false),
      new THREE.TubeGeometry(curve2, 48, 0.18, 16, false)
    ]
  }, [])

  return (
    <group
      position={[-5.2, 0.1 + yOffset, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect('io_heatsinks')
      }}
    >
      {/* Black Anodized Aluminum Extruded Finned Heatsinks */}
      <group position={[0.4, 0.35, 0.4]}>
        {/* Heatsink Base Plate */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 0.14, 2.6]} />
          <meshStandardMaterial
            color={viewMode === 'thermal' ? '#3b82f6' : isSelected ? '#38bdf8' : '#111318'}
            metalness={0.92}
            roughness={0.25}
            wireframe={viewMode === 'wireframe'}
          />
        </mesh>
        {/* Longitudinal Cooling Fins */}
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={`fin-${i}`} position={[0, 0.38, -1.1 + i * 0.24]}>
            <boxGeometry args={[1.45, 0.65, 0.07]} />
            <meshStandardMaterial
              color={viewMode === 'thermal' ? '#3b82f6' : '#181b22'}
              metalness={0.9}
              roughness={0.2}
              wireframe={viewMode === 'wireframe'}
            />
          </mesh>
        ))}
      </group>

      {/* Dual QSFP-DD 800G Cages & Plugged Transceivers */}
      {[-1.6, -0.65].map((zPos, idx) => (
        <group key={`cage-${idx}`} position={[-1.0, 0.34, zPos]}>
          {/* Steel Cage */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 0.48, 0.64]} />
            <meshStandardMaterial color="#9aa1ac" metalness={0.92} roughness={0.18} />
          </mesh>
          {/* Transceiver Body */}
          <mesh position={[-0.85, 0.05, 0]}>
            <boxGeometry args={[0.7, 0.42, 0.58]} />
            <meshStandardMaterial color={isSelected ? '#0284c7' : '#333842'} metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Black Pull-Tab Latch Mechanism */}
          <mesh position={[-1.28, 0.15, 0]}>
            <boxGeometry args={[0.26, 0.1, 0.32]} />
            <meshStandardMaterial color="#0d1015" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Silver Shielded RJ45 Out-of-Band Management Cage */}
      <mesh position={[-0.9, 0.48, -2.45]}>
        <boxGeometry args={[0.9, 0.74, 0.82]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.88} roughness={0.2} />
      </mesh>

      {/* Twinaxial DAC Cables */}
      <mesh geometry={cableGeometry1}>
        <meshStandardMaterial color="#1a1d24" roughness={0.5} wireframe={viewMode === 'wireframe'} />
      </mesh>
      <mesh geometry={cableGeometry2}>
        <meshStandardMaterial color="#1a1d24" roughness={0.5} wireframe={viewMode === 'wireframe'} />
      </mesh>
    </group>
  )
}

// 6. Rear Power Stage: Dual Tall Upright Power Blocks (Matching photo)
function RearPowerStage({ exploded = 0, viewMode, selectedPart, onSelect }) {
  const isSelected = selectedPart === 'power_blocks'
  const yOffset = exploded * 1.8

  return (
    <group
      position={[5.6, 0.15 + yOffset, 0.9]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect('power_blocks')
      }}
    >
      {/* Two Tall Upright Black Rectangular Terminal Blocks in Foreground */}
      {[-0.65, 0.65].map((zPos, idx) => (
        <group key={`power-block-${idx}`} position={[0, 0.65, zPos]}>
          {/* Main Upright Block */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 1.3, 0.95]} />
            <meshStandardMaterial
              color={
                viewMode === 'thermal'
                  ? '#f59e0b'
                  : isSelected
                  ? '#38bdf8'
                  : '#181b22'
              }
              emissive={viewMode === 'thermal' ? '#d97706' : '#000000'}
              emissiveIntensity={viewMode === 'thermal' ? 0.5 : 0}
              metalness={0.75}
              roughness={0.3}
              wireframe={viewMode === 'wireframe'}
            />
          </mesh>

          {/* Top Recessed Slot / Vent */}
          <mesh position={[0, 0.66, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.12]} />
            <meshBasicMaterial color="#08090d" />
          </mesh>

          {/* Internal Gold Bus Blade Terminals */}
          <mesh position={[0.61, 0, 0]}>
            <boxGeometry args={[0.06, 0.5, 0.52]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Cluster of 4 Cylindrical Solid Capacitors next to Power Blocks */}
      {[-0.45, 0.45].map((z, idx) => (
        <group key={`rear-cap-${idx}`}>
          <mesh position={[-1.2, 0.3, z]}>
            <cylinderGeometry args={[0.16, 0.16, 0.58, 20]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 7. Dynamic Animated Signal Flow Stream
function SignalDataParticles({ active = true }) {
  const particlesRef = useRef()

  const particleData = useMemo(() => {
    const count = 75
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const paths = []

    for (let i = 0; i < count; i++) {
      const type = i % 3
      paths.push(type)
      speeds[i] = 0.022 + Math.random() * 0.03
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0.28
      positions[i * 3 + 2] = 0
    }

    return { count, positions, speeds, paths }
  }, [])

  useFrame(() => {
    if (!particlesRef.current || !active) return
    const pos = particlesRef.current.geometry.attributes.position.array

    for (let i = 0; i < particleData.count; i++) {
      const path = particleData.paths[i]
      const speed = particleData.speeds[i]

      if (path === 0) {
        // PCIe Host bus to Central Processor
        pos[i * 3 + 2] -= speed * 1.5
        pos[i * 3] = -0.85 + Math.sin(pos[i * 3 + 2] * 4) * 0.2
        if (pos[i * 3 + 2] < 0.15) pos[i * 3 + 2] = 3.3
      } else if (path === 1) {
        // Central Processor to Dual Mezzanine HBM
        pos[i * 3] += speed * 2.2
        pos[i * 3 + 2] = 0.15 + (i % 2 === 0 ? -0.5 : 0.5)
        if (pos[i * 3] > 4.5) pos[i * 3] = -0.85
      } else {
        // VRM Power loop into Processor
        pos[i * 3] += speed * 1.4
        pos[i * 3 + 2] = -0.3
        if (pos[i * 3] > -0.85) pos[i * 3] = -3.8
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleData.count} array={particleData.positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#38bdf8" size={0.18} transparent opacity={0.85} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// Full Assembled 3D Board Model
function AcceleratorBoardModel({
  exploded = 0,
  viewMode = 'normal',
  selectedPart,
  onSelect,
  activeSignalFlow = true
}) {
  const groupRef = useRef()

  return (
    // Rotated to match the exact perspective angle of the user's uploaded photo!
    <group ref={groupRef} rotation={[-0.32, 0.46, 0.12]}>
      {/* 1. Main Server PCB */}
      <PcbSubstrate exploded={exploded} viewMode={viewMode} selectedPart={selectedPart} onSelect={onSelect} />

      {/* 2. Central BOLT-1420 ASIC Processor */}
      <BoltProcessor exploded={exploded} viewMode={viewMode} selectedPart={selectedPart} onSelect={onSelect} />

      {/* 3. Dual Stepped Mezzanine HBM Modules */}
      <MezzanineMemoryModules exploded={exploded} viewMode={viewMode} selectedPart={selectedPart} onSelect={onSelect} />

      {/* 4. Multi-Phase Digital VRM & Capacitors */}
      <VrmPowerStage exploded={exploded} viewMode={viewMode} selectedPart={selectedPart} onSelect={onSelect} />

      {/* 5. Front QSFP-DD Transceivers, Cables & Heatsinks */}
      <FrontIOAndHeatsinks exploded={exploded} viewMode={viewMode} selectedPart={selectedPart} onSelect={onSelect} />

      {/* 6. Rear Dual Upright DC Power Terminal Blocks */}
      <RearPowerStage exploded={exploded} viewMode={viewMode} selectedPart={selectedPart} onSelect={onSelect} />

      {/* 7. Animated Signal Data Particle Stream */}
      <SignalDataParticles active={activeSignalFlow && viewMode !== 'wireframe'} />
    </group>
  )
}

// ─── MAIN COMPONENT ───
export default function BoltAccelerator3D({ theme = 'dark', isActive = true }) {
  const [exploded, setExploded] = useState(0)
  const [isExploding, setIsExploding] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false) // Default false so it aligns with the photo first!
  const [viewMode, setViewMode] = useState('normal') // 'normal' | 'thermal' | 'wireframe'
  const [bgStyle, setBgStyle] = useState('grid') // 'grid' | 'studio'
  const [activeSignalFlow, setActiveSignalFlow] = useState(true)
  const [selectedPart, setSelectedPart] = useState('asic')
  const [showPhotoComparison, setShowPhotoComparison] = useState(false)
  const controlsRef = useRef()

  // Real-time telemetry simulation
  const [telemetry, setTelemetry] = useState({
    clockGhz: 2.45,
    tempC: 64.2,
    powerWatts: 342,
    tflopsFp8: 1948,
    memoryBw: 3.14,
    pcieBandwidth: 124.6
  })

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setTelemetry({
        clockGhz: +(2.42 + Math.random() * 0.06).toFixed(2),
        tempC: +(63.8 + Math.random() * 0.8).toFixed(1),
        powerWatts: Math.round(338 + Math.random() * 12),
        tflopsFp8: Math.round(1930 + Math.random() * 35),
        memoryBw: +(3.12 + Math.random() * 0.07).toFixed(2),
        pcieBandwidth: +(122.5 + Math.random() * 3.8).toFixed(1)
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [isActive])

  // Camera presets
  const applyPreset = (type) => {
    if (!controlsRef.current) return
    const controls = controlsRef.current
    if (type === 'photo_angle') {
      // Matches the exact angle of the photo!
      controls.object.position.set(12, 10, 14.5)
      controls.target.set(0, 0, 0)
    } else if (type === 'top') {
      controls.object.position.set(0, 20, 0.1)
      controls.target.set(0, 0, 0)
    } else if (type === 'asic') {
      controls.object.position.set(-1.0, 4.8, 5.0)
      controls.target.set(-0.85, 0.2, 0.15)
      setSelectedPart('asic')
    } else if (type === 'mezzanine') {
      controls.object.position.set(3.6, 4.6, 4.8)
      controls.target.set(2.8, 0.2, 0.15)
      setSelectedPart('mezzanine')
    } else if (type === 'front_io') {
      controls.object.position.set(-11, 4.2, -3.8)
      controls.target.set(-5.2, 0.4, 0)
      setSelectedPart('io_heatsinks')
    } else if (type === 'power_blocks') {
      controls.object.position.set(8.5, 4.0, 4.0)
      controls.target.set(5.6, 0.5, 0.9)
      setSelectedPart('power_blocks')
    }
    controls.update()
  }

  // Smooth exploded view toggle
  const toggleExploded = () => {
    setIsExploding(prev => !prev)
    const target = isExploding ? 0 : 1
    const start = exploded
    const duration = 750
    const startTime = performance.now()

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setExploded(start + (target - start) * eased)
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }

  const selectedPartData = HARDWARE_COMPONENTS[selectedPart] || HARDWARE_COMPONENTS.asic

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        position: 'relative',
        backgroundColor: bgStyle === 'grid' ? '#070b14' : '#030406',
        backgroundImage: bgStyle === 'grid' ? `
          linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
          linear-gradient(rgba(56, 189, 248, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.02) 1px, transparent 1px),
          radial-gradient(ellipse 65% 55% at 50% 50%, rgba(14, 165, 233, 0.14) 0%, transparent 80%)
        ` : 'radial-gradient(circle at center, #11141c 0%, #000000 100%)',
        backgroundSize: bgStyle === 'grid' ? '100px 100px, 100px 100px, 20px 20px, 20px 20px, 100% 100%' : '100% 100%',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        transition: 'background 0.3s ease'
      }}
    >
      {/* ─── 3D WebGL Canvas ─── */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <Canvas
          camera={{ position: [12, 10, 14.5], fov: 36 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
          shadows
        >
          <ambientLight intensity={0.7} />

          {/* Main Key Studio Light matching reference photo */}
          <directionalLight
            position={[12, 18, 14]}
            intensity={2.0}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          {/* Cool Rim Light highlighting PCB dark edges & cables */}
          <directionalLight
            position={[-14, -6, -12]}
            intensity={0.9}
            color="#38bdf8"
          />

          {/* Warm Bottom Gold Trace Reflector */}
          <directionalLight
            position={[0, -10, 8]}
            intensity={0.4}
            color="#fbbf24"
          />

          {/* Chip Core Point Light */}
          <pointLight
            position={[-0.85, 2.5, 0.15]}
            intensity={viewMode === 'thermal' ? 2.5 : 1.2}
            color={viewMode === 'thermal' ? '#ef4444' : '#60a5fa'}
            distance={8}
          />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            minDistance={4}
            maxDistance={32}
            maxPolarAngle={Math.PI / 2 + 0.15}
          />

          {/* 3D Perspective CAD Floor Grid (visible when grid background is active) */}
          {bgStyle === 'grid' && (
            <gridHelper
              args={[34, 34, '#0ea5e9', '#1e293b']}
              position={[0, -0.28, 0]}
            />
          )}

          <Suspense fallback={null}>
            <AcceleratorBoardModel
              exploded={exploded}
              viewMode={viewMode}
              selectedPart={selectedPart}
              onSelect={(partId) => setSelectedPart(partId)}
              activeSignalFlow={activeSignalFlow}
            />
          </Suspense>
        </Canvas>

        {/* ─── Top Header: Unified Flex Bar (Never Overlaps) ─── */}
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          {/* Left: Branding & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', pointerEvents: 'auto', flexShrink: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 18px rgba(56, 189, 248, 0.4)',
                flexShrink: 0
              }}
            >
              <Zap size={20} color="#ffffff" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2
                }}
              >
                BOLT-1420 Accelerator 3D
              </h1>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#94a3b8',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginTop: '0.2rem'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981'
                  }}
                />
                1:1 Hardware Match • 96GB HBM3e
              </div>
            </div>
          </div>

          {/* Right: Quick View Mode Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.22)',
              padding: '0.32rem 0.45rem',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'auto',
              flexShrink: 0
            }}
          >
            <button
              onClick={() => setViewMode('normal')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'normal' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: viewMode === 'normal' ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={13} />
              Photoreal 3D
            </button>

            <button
              onClick={() => setViewMode('thermal')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'thermal' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: viewMode === 'thermal' ? '#f87171' : '#94a3b8',
                transition: 'all 0.2s ease'
              }}
            >
              <Flame size={13} />
              Thermal Heatmap
            </button>

            <button
              onClick={() => setViewMode('wireframe')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'wireframe' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                color: viewMode === 'wireframe' ? '#c084fc' : '#94a3b8',
                transition: 'all 0.2s ease'
              }}
            >
              <Box size={13} />
              Wireframe X-Ray
            </button>

            {/* Background Style Toggle (Grid vs Studio Dark) */}
            <button
              onClick={() => setBgStyle(prev => prev === 'grid' ? 'studio' : 'grid')}
              title="Toggle Grid / Studio Dark Background"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: bgStyle === 'grid' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                color: bgStyle === 'grid' ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.2s ease'
              }}
            >
              <Grid size={13} />
              {bgStyle === 'grid' ? 'CAD Grid' : 'Studio Dark'}
            </button>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 0.2rem' }} />

            <button
              onClick={() => setShowPhotoComparison(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: showPhotoComparison ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
                color: showPhotoComparison ? '#facc15' : '#94a3b8',
                transition: 'all 0.2s ease'
              }}
            >
              <ImageIcon size={13} />
              Photo Match
            </button>
          </div>
        </header>

        {/* ─── Bottom Layout: Responsive Toolbar & Telemetry (No Overlap) ─── */}
        <footer
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            zIndex: 10,
            pointerEvents: 'none',
            flexWrap: 'wrap'
          }}
        >
          {/* Left: Floating Controls Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '0.4rem 0.6rem',
              borderRadius: '12px',
              pointerEvents: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Explode / Assembly Toggle */}
            <button
              onClick={toggleExploded}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isExploding ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                background: isExploding ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                color: isExploding ? '#38bdf8' : '#e2e8f0',
                cursor: 'pointer'
              }}
            >
              <Layers size={14} />
              {isExploding ? 'Assemble' : 'Explode Parts'}
            </button>

            {/* Auto-Rotate Toggle */}
            <button
              onClick={() => setAutoRotate(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: autoRotate ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                color: autoRotate ? '#34d399' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              Auto-Spin
            </button>

            {/* Signal Bus Flow Toggle */}
            <button
              onClick={() => setActiveSignalFlow(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: activeSignalFlow ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                color: activeSignalFlow ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <Radio size={14} />
              Data Flow
            </button>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)', margin: '0 0.2rem' }} />

            {/* Camera Presets matching reference angles */}
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>ANGLES:</span>
            <button
              onClick={() => applyPreset('photo_angle')}
              title="Align with user reference photo"
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '0.25rem 0.55rem',
                borderRadius: '5px',
                fontWeight: 600
              }}
            >
              📸 Photo View
            </button>
            <button
              onClick={() => applyPreset('top')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              Top PCB
            </button>
            <button
              onClick={() => applyPreset('asic')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              ASIC
            </button>
            <button
              onClick={() => applyPreset('mezzanine')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              Mezzanine
            </button>
            <button
              onClick={() => applyPreset('front_io')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              Cables / I/O
            </button>
            <button
              onClick={() => applyPreset('power_blocks')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              DC Power
            </button>
          </div>

          {/* Right: Real-Time Telemetry Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.1rem',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              padding: '0.45rem 1.1rem',
              borderRadius: '12px',
              pointerEvents: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>CORE CLOCK</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                {telemetry.clockGhz} GHz
              </span>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>FP8 COMPUTE</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                {telemetry.tflopsFp8} TFLOPS
              </span>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>HBM3e BANDWIDTH</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7' }}>
                {telemetry.memoryBw} TB/s
              </span>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>POWER (TDP)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                {telemetry.powerWatts} W
              </span>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>CORE TEMP</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: telemetry.tempC > 65 ? '#ef4444' : '#10b981' }}>
                {telemetry.tempC} °C
              </span>
            </div>
          </div>
        </footer>

        {/* ─── Reference Image Floating Comparison Modal (When Toggled) ─── */}
        {showPhotoComparison && (
          <div
            style={{
              position: 'absolute',
              top: '5.2rem',
              left: '1.5rem',
              zIndex: 20,
              width: '460px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '1rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Original Reference Card Photo</span>
              </div>
              <button
                onClick={() => setShowPhotoComparison(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#000000'
              }}
            >
              <img
                src="/images/bolt_accelerator_board.png"
                alt="BOLT AI Hardware Accelerator Board Reference"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.6rem 0 0 0', lineHeight: 1.45 }}>
              Compare the 3D model directly against the original photo. Notice the identical beveled silver BOLT lid, stepped mezzanine memory cards, 16-phase VRM, twinax DAC cables, and tall vertical black terminal blocks.
            </p>
          </div>
        )}
      </div>

      {/* ─── Right Sidebar: Hardware Component Inspector ─── */}
      <aside
        style={{
          width: '380px',
          background: 'rgba(13, 17, 26, 0.95)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          zIndex: 10,
          overflowY: 'auto'
        }}
      >
        {/* Component Selector Tabs */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
            HARDWARE ARCHITECTURE INSPECTOR
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
            {Object.values(HARDWARE_COMPONENTS).map((comp) => {
              const active = comp.id === selectedPart
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedPart(comp.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.55rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: active ? '#0284c7' : 'rgba(255,255,255,0.06)',
                    background: active ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255,255,255,0.02)',
                    color: active ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: active ? '#38bdf8' : '#e2e8f0' }}>
                    {comp.name.split(' ')[0]} {comp.name.split(' ')[1] || ''}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {comp.category}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Component Detail Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#38bdf8',
                  letterSpacing: '0.06em'
                }}
              >
                {selectedPartData.category}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  fontWeight: 600
                }}
              >
                ONLINE
              </span>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.35rem 0 0 0', color: '#f8fafc' }}>
              {selectedPartData.name}
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.5rem 0 0 0', lineHeight: 1.45 }}>
              {selectedPartData.description}
            </p>
          </div>

          {/* Specifications Key-Value List */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
              HARDWARE SPECIFICATIONS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(selectedPartData.specs).map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                    padding: '0.3rem 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Architecture Benchmark & Virtualization Status */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(56, 189, 248, 0.02) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '12px',
            padding: '1.1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
              vGPU Virtualization Ready
            </span>
          </div>
          <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Direct hardware partitioning supports up to 8 isolated vGPU slices with full SR-IOV mediated pass-through and hardware memory encryption.
          </p>
        </div>
      </aside>
    </div>
  )
}
