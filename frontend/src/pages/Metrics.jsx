import React, { useState, useEffect } from 'react';
import { useMetrics } from '../hooks';
import TerminalLog from '../components/TerminalLog';
import MetricBar from '../components/MetricBar';
import { Activity, Server } from 'lucide-react';

export default function Metrics() {
    const { metrics } = useMetrics();
    const [logLines, setLogLines] = useState([]);

    useEffect(() => {
        if(metrics) {
            const timestamp = new Date(metrics.timestamp * 1000).toLocaleTimeString();
            const q = metrics.queued_jobs;
            setLogLines(prev => [...prev.slice(-49), `[${timestamp}] Incoming Telemetry: Cluster sync OK. Tasks queued: ${q}`]);
        }
    }, [metrics]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <h1 style={{ margin: '0 0 0.5rem 0' }}>Real-time Telemetry</h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Live WebSocket feed from backend cluster arrays.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: 'var(--gray)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(118,185,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
                            <Activity size={32} color="var(--accent)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0' }}>WebSocket Connection</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: metrics ? 'var(--accent)' : 'var(--red)', boxShadow: `0 0 10px ${metrics ? 'var(--accent)' : 'var(--red)'}` }}></span>
                                {metrics ? 'Connected (ws://localhost:8000/ws/metrics)' : 'Reconnecting...'}
                            </div>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '1rem' }}>Global Cluster Load</h3>
                    <div style={{ background: 'var(--gray)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {metrics && Object.entries(metrics.fleet_metrics).map(([id, data]) => (
                            <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Server size={14} color="var(--text-muted)"/> {id}
                                    </span>
                                    <span style={{ color: 'var(--accent)' }}>{data.utilization.toFixed(1)}%</span>
                                </div>
                                <MetricBar value={data.utilization} max={100} />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 style={{ marginBottom: '1rem' }}>Live Stream Log</h3>
                    <TerminalLog lines={logLines} />
                </div>
            </div>
        </div>
    );
}
