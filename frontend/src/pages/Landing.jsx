import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GlowButton from '../components/GlowButton';
import { Cpu, Zap, Activity, Layers, ArrowRight } from 'lucide-react';

export default function Landing() {
    const nav = useNavigate();
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Set high-DPI scaling
        const resize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        window.addEventListener('resize', resize);
        resize();

        // 3D Particles/Nodes representation
        const numParticles = 120;
        const particles = [];
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
                z: (Math.random() - 0.5) * 800,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                vz: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                color: Math.random() > 0.4 ? 'var(--accent)' : '#58a6ff'
            });
        }

        // 3D GPU cluster nodes (spinning wireframe cubes representing hardware slots)
        const numCubes = 4;
        const cubes = [];
        const cubeSize = 80;
        const cubeVertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ];
        const cubeEdges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back face
            [4, 5], [5, 6], [6, 7], [7, 4], // front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // connection wires
        ];

        for (let i = 0; i < numCubes; i++) {
            cubes.push({
                cx: (Math.random() - 0.5) * 600,
                cy: (Math.random() - 0.5) * 400,
                cz: (Math.random() - 0.5) * 400,
                rx: Math.random() * Math.PI,
                ry: Math.random() * Math.PI,
                rz: Math.random() * Math.PI,
                speedX: (Math.random() - 0.5) * 0.005,
                speedY: (Math.random() - 0.5) * 0.005,
                speedZ: (Math.random() - 0.5) * 0.005,
                color: i % 2 === 0 ? 'rgba(118, 185, 0, 0.4)' : 'rgba(88, 166, 255, 0.4)'
            });
        }

        // Handle mouse movement for interactive camera perspective tilting
        const handleMouseMove = (e) => {
            const rx = (e.clientX / window.innerWidth - 0.5) * 0.6;
            const ry = (e.clientY / window.innerHeight - 0.5) * 0.6;
            mouseRef.current.targetX = rx;
            mouseRef.current.targetY = ry;
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Core Render Loop
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Interpolate mouse camera angle for ultra-smooth movement
            const mouse = mouseRef.current;
            mouse.x += (mouse.targetX - mouse.x) * 0.05;
            mouse.y += (mouse.targetY - mouse.y) * 0.05;

            const w = canvas.width / window.devicePixelRatio;
            const h = canvas.height / window.devicePixelRatio;
            const cX = w / 2;
            const cY = h / 2;

            // Camera matrices setup based on mouse position
            const angleX = mouse.y;
            const angleY = mouse.x;
            const cosX = Math.cos(angleX);
            const sinX = Math.sin(angleX);
            const cosY = Math.cos(angleY);
            const sinY = Math.sin(angleY);

            // 1. Draw glowing background grid with deep 3D perspective
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
            ctx.lineWidth = 1;
            const gridSize = 100;
            const gridRange = 8;
            for (let x = -gridRange; x <= gridRange; x++) {
                ctx.beginPath();
                for (let z = -gridRange; z <= gridRange; z++) {
                    const px = x * gridSize;
                    const pz = z * gridSize;
                    const py = 200; // grid floor

                    // Rotate 3D coordinates
                    // Y axis rotation
                    let rx = px * cosY - pz * sinY;
                    let rz = px * sinY + pz * cosY;
                    // X axis rotation
                    let ry = py * cosX - rz * sinX;
                    rz = py * sinX + rz * cosX;

                    // Project coordinates
                    const perspective = 700;
                    const scale = perspective / (perspective + rz + 1000);
                    const x2d = cX + rx * scale;
                    const y2d = cY + ry * scale;

                    if (z === -gridRange) {
                        ctx.moveTo(x2d, y2d);
                    } else {
                        ctx.lineTo(x2d, y2d);
                    }
                }
                ctx.stroke();
            }

            // 2. Animate and project 3D parallel particles
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;

                // Bounce boundaries
                if (Math.abs(p.x) > 400) p.vx *= -1;
                if (Math.abs(p.y) > 400) p.vy *= -1;
                if (Math.abs(p.z) > 400) p.vz *= -1;

                // Apply rotation matrix
                // Y-axis rotation
                let rx = p.x * cosY - p.z * sinY;
                let rz = p.x * sinY + p.z * cosY;
                // X-axis rotation
                let ry = p.y * cosX - rz * sinX;
                rz = p.y * sinX + rz * cosX;

                const perspective = 800;
                const scale = perspective / (perspective + rz + 800);
                p.projX = cX + rx * scale;
                p.projY = cY + ry * scale;
                p.scale = scale;

                // Only render if particle is in viewport
                if (scale > 0) {
                    ctx.beginPath();
                    ctx.arc(p.projX, p.projY, p.size * scale * 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();

                    // Faster glow simulation: draw a secondary semi-transparent outer arc
                    ctx.beginPath();
                    ctx.arc(p.projX, p.projY, p.size * scale * 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = p.color === 'var(--accent)' ? 'rgba(118, 185, 0, 0.15)' : 'rgba(88, 166, 255, 0.15)';
                    ctx.fill();
                }
            });

            // 3. Render 3D GPU sandboxes (Cubes) with glowing vertices and dynamic lines
            cubes.forEach((cube) => {
                cube.rx += cube.speedX;
                cube.ry += cube.speedY;
                cube.rz += cube.speedZ;

                const cosCux = Math.cos(cube.rx);
                const sinCux = Math.sin(cube.rx);
                const cosCuy = Math.cos(cube.ry);
                const sinCuy = Math.sin(cube.ry);
                const cosCuz = Math.cos(cube.rz);
                const sinCuz = Math.sin(cube.rz);

                const projectedVertices = cubeVertices.map(([vx, vy, vz]) => {
                    // Local Cube Rotation
                    // X-axis local rotation
                    let x1 = vx;
                    let y1 = vy * cosCux - vz * sinCux;
                    let z1 = vy * sinCux + vz * cosCux;

                    // Y-axis local rotation
                    let x2 = x1 * cosCuy - z1 * sinCuy;
                    let y2 = y1;
                    let z2 = x1 * sinCuy + z1 * cosCuy;

                    // Z-axis local rotation
                    let x3 = x2 * cosCuz - y2 * sinCuz;
                    let y3 = x2 * sinCuz + y2 * cosCuz;
                    let z3 = z2;

                    // Apply translation into cluster space coordinates
                    let globalX = x3 * cubeSize + cube.cx;
                    let globalY = y3 * cubeSize + cube.cy;
                    let globalZ = z3 * cubeSize + cube.cz;

                    // Apply main camera rotation (mouse-tilting matrix)
                    let rx = globalX * cosY - globalZ * sinY;
                    let rz = globalX * sinY + globalZ * cosY;
                    let ry = globalY * cosX - rz * sinX;
                    rz = globalY * sinX + rz * cosX;

                    const perspective = 800;
                    const scale = perspective / (perspective + rz + 800);
                    return {
                        x: cX + rx * scale,
                        y: cY + ry * scale,
                        z: rz,
                        scale: scale
                    };
                });

                // Draw edges of vGPU hardware slice
                ctx.strokeStyle = cube.color;
                ctx.lineWidth = 1.5;
                cubeEdges.forEach(([start, end]) => {
                    const pStart = projectedVertices[start];
                    const pEnd = projectedVertices[end];
                    if (pStart.scale > 0 && pEnd.scale > 0) {
                        ctx.beginPath();
                        ctx.moveTo(pStart.x, pStart.y);
                        ctx.lineTo(pEnd.x, pEnd.y);
                        ctx.stroke();
                    }
                });

                // Vertex hardware cores
                projectedVertices.forEach((p) => {
                    if (p.scale > 0) {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 4 * p.scale, 0, Math.PI * 2);
                        ctx.fillStyle = 'var(--accent)';
                        ctx.fill();
                    }
                });
            });

            // Draw link lines between adjacent 3D particles to simulate network graph (uses cached projections)
            ctx.strokeStyle = 'rgba(118, 185, 0, 0.04)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i += 8) {
                for (let j = i + 1; j < i + 4; j++) {
                    if (j < particles.length) {
                        let p1 = particles[i];
                        let p2 = particles[j];

                        if (p1.scale > 0 && p2.scale > 0) {
                            ctx.beginPath();
                            ctx.moveTo(p1.projX, p1.projY);
                            ctx.lineTo(p2.projX, p2.projY);
                            ctx.stroke();
                        }
                    }
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw', overflowY: 'auto', overflowX: 'hidden', background: '#030303', fontFamily: '"Outfit", sans-serif' }}>

            {/* Interactive 3D Background Canvas */}
            <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }} />

            {/* Glowing Nebula Overlay */}
            <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '120%', height: '120%', zIndex: 2, background: 'radial-gradient(circle at 50% 50%, rgba(118, 185, 0, 0.05) 0%, rgba(88, 166, 255, 0.03) 30%, transparent 70%)', pointerEvents: 'none' }}></div>

            {/* Top Navigation Headers */}
            <header style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '2rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                    <Cpu size={24} color="var(--accent)" style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }} />
                    V-<span style={{ color: 'var(--accent)' }}>GPU</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <span onClick={() => nav('/dashboard')} style={{ color: '#c9d1d9', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem', fontWeight: 500 }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#c9d1d9'}>Cluster Dashboard</span>
                    <GlowButton variant="secondary" onClick={() => window.open('https://github.com', '_blank')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Docs</GlowButton>
                </div>
            </header>

            {/* Hero Interactive Container */}
            <main style={{ position: 'relative', zIndex: 5, padding: '12rem 2rem 6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>

                {/* Tech Badge */}
                <div className="pulse-anim" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(118, 185, 0, 0.1)', border: '1px solid rgba(118, 185, 0, 0.3)', padding: '0.5rem 1.25rem', borderRadius: '50px', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2.5rem' }}>
                    <Zap size={14} /> Next-Gen AI Virtualization Node Slicing
                </div>

                {/* Mindblowing Hero Title */}
                <h1 style={{ fontSize: 'calc(2.5rem + 3vw)', fontWeight: 900, color: '#fff', margin: 0, textAlign: 'center', lineHeight: 1.05, letterSpacing: '-0.04em', maxWidth: '1000px' }}>
                    Elastic GPU Virtualization for <br />
                    <span style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #00e5ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 20px rgba(118,185,0,0.15))' }}>
                        Parallel AI Computing
                    </span>
                </h1>

                {/* Elegant description */}
                <p style={{ fontSize: '1.25rem', color: '#8b949e', maxWidth: '650px', textAlign: 'center', marginTop: '1.5rem', marginBottom: '3.5rem', lineHeight: 1.6, fontWeight: 400 }}>
                    Provision hardware sandboxes on-demand. Squeeze 100% capacity from massive GPU clusters using hardware time-slicing and asynchronous dataset pipeline execution.
                </p>

                {/* Primary Call-to-actions */}
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <GlowButton onClick={() => nav('/dashboard')} style={{ padding: '1.25rem 2.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Launch Infrastructure Console <ArrowRight size={18} />
                    </GlowButton>
                    <GlowButton variant="secondary" onClick={() => {
                        const target = document.getElementById('architecture-matrix');
                        if (target) target.scrollIntoView({ behavior: 'smooth' });
                    }} style={{ padding: '1.25rem 2.5rem', fontSize: '1rem' }}>
                        Explore Core Slices
                    </GlowButton>
                </div>

                {/* Core Architecture Matrix Panels */}
                <section id="architecture-matrix" style={{ width: '100%', maxWidth: '1100px', marginTop: '12rem', boxSizing: 'border-box' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem' }}>Massively Isolated Sandbox Architecture</h2>
                        <p style={{ color: '#8b949e', fontSize: '1rem' }}>Enterprise-level containerized virtual allocation blocks</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' }}>

                        {/* Matrix Card 1 */}
                        <div style={{ background: 'rgba(22, 27, 34, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2.5rem', transition: 'transform 0.3s ease, border-color 0.3s ease', cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                            <div style={{ width: '50px', height: '50px', background: 'rgba(118,185,0,0.1)', border: '1px solid rgba(118,185,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Cpu size={24} color="var(--accent)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 0.75rem', fontWeight: 700 }}>VRAM Slicing Controls</h3>
                            <p style={{ color: '#8b949e', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                                Allocate dedicated hardware memory envelopes (from 1GB up to 24GB VRAM) for parallel sandboxes with zero host leakage.
                            </p>
                        </div>

                        {/* Matrix Card 2 */}
                        <div style={{ background: 'rgba(22, 27, 34, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2.5rem', transition: 'transform 0.3s ease, border-color 0.3s ease', cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.borderColor = '#58a6ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                            <div style={{ width: '50px', height: '50px', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Activity size={24} color="#58a6ff" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 0.75rem', fontWeight: 700 }}>Time-Sliced Compute Caps</h3>
                            <p style={{ color: '#8b949e', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                                Dynamically throttle execution caps from 10% to 100%. Orchestrate multiple deep learning jobs concurrently on a single physical cluster.
                            </p>
                        </div>

                        {/* Matrix Card 3 */}
                        <div style={{ background: 'rgba(22, 27, 34, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2.5rem', transition: 'transform 0.3s ease, border-color 0.3s ease', cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                            <div style={{ width: '50px', height: '50px', background: 'rgba(118,185,0,0.1)', border: '1px solid rgba(118,185,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Layers size={24} color="var(--accent)" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 0.75rem', fontWeight: 700 }}>Asynchronous Data Pre-loading</h3>
                            <p style={{ color: '#8b949e', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                                Upload physical .csv files directly to the node buffers. Trigger model diagnostics and AutoML hyper-parameter iteration ensembling instantly.
                            </p>
                        </div>

                    </div>
                </section>

                {/* Footer branding */}
                <footer style={{ marginTop: '10rem', color: '#30363d', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div>V-GPU Platform Cluster Console • Enterprise Core 1.0</div>
                    <div>High-Fidelity WebGL-projected 3D hardware nodes simulation active</div>
                </footer>

            </main>
        </div>
    );
}
