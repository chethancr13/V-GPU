import React from 'react';
import { Cpu, Thermometer } from 'lucide-react';
import MetricBar from './MetricBar';
import StatusPill from './StatusPill';

export default function GPUCard({ gpu }) {
    if (!gpu) return <div className="skeleton" style={{height: '220px'}}></div>;

    const { id, model, utilization, vram_used, vram_total, temperature } = gpu;
    const vramPct = vram_total ? (vram_used / vram_total) * 100 : 0;

    return (
        <div style={{
            background: 'var(--gray)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Cpu size={20} color="var(--accent)" />
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{model}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{id.substring(0,8)}</span>
                    </div>
                </div>
                <StatusPill status={utilization > 0 ? 'RUNNING' : 'IDLE'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Compute Load</span>
                    <span style={{ color: 'var(--text-primary)' }}>{utilization.toFixed(1)}%</span>
                </div>
                <MetricBar value={utilization} max={100} color="var(--accent)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>VRAM Allocated</span>
                    <span style={{ color: 'var(--text-primary)' }}>{vram_used} / {vram_total || 0} MB</span>
                </div>
                <MetricBar value={vramPct} max={100} color="var(--blue)" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Thermometer size={14} color={temperature > 75 ? 'var(--red)' : 'var(--text-secondary)'} />
                <span>{temperature.toFixed(1)} °C</span>
            </div>
        </div>
    );
}
