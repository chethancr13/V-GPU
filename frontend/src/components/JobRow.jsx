import React from 'react';
import { PlayCircle, TerminalSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StatusPill from './StatusPill';

export default function JobRow({ job, onKill }) {
    const { id, type, status, created_at, allocation_id } = job;
    
    // Simulate progress if running
    const progress = status === 'RUNNING' ? Math.floor(Math.random() * 80) + 10 : status === 'COMPLETED' ? 100 : 0;
    
    return (
        <div style={{
            background: 'var(--gray)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.2s',
            marginBottom: '0.5rem'
        }} className="job-row-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {status === 'RUNNING' && <PlayCircle size={18} color="var(--accent)" />}
                {status === 'COMPLETED' && <CheckCircle2 size={18} color="var(--blue)" />}
                {status === 'FAILED' && <AlertTriangle size={18} color="var(--red)" />}
                {(status === 'QUEUED' || status === 'KILLED') && <TerminalSquare size={18} color="var(--text-muted)" />}
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>{id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type: {type}</span>
                </div>
            </div>

            <div>
                <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{allocation_id.substring(0,8)}</span>
            </div>

            <div>
                <StatusPill status={status} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--dark-gray)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: status === 'FAILED' ? 'var(--red)' : status === 'COMPLETED' ? 'var(--blue)' : 'var(--accent)',
                        transition: 'width 1s ease'
                    }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '35px' }}>{progress}%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {status === 'RUNNING' || status === 'QUEUED' ? (
                    <button onClick={() => onKill(id)} style={{
                        background: 'transparent',
                        border: '1px solid var(--red)',
                        color: 'var(--red)',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                    }}>
                        KILL
                    </button>
                ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(created_at * 1000).toLocaleTimeString()}
                    </span>
                )}
            </div>
        </div>
    );
}
