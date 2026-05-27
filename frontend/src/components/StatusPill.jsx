import React from 'react';

export default function StatusPill({ status }) {
    let bg = 'rgba(102, 102, 102, 0.1)';
    let border = 'var(--text-muted)';
    let color = 'var(--text-primary)';
    
    switch(status.toUpperCase()) {
        case 'RUNNING':
            bg = 'rgba(118, 185, 0, 0.1)';
            border = 'var(--accent)';
            color = 'var(--accent)';
            break;
        case 'FAILED':
        case 'KILLED':
            bg = 'rgba(239, 68, 68, 0.1)';
            border = 'var(--red)';
            color = 'var(--red)';
            break;
        case 'QUEUED':
        case 'IDLE':
            bg = 'rgba(245, 158, 11, 0.1)';
            border = 'var(--yellow)';
            color = 'var(--yellow)';
            break;
        case 'COMPLETED':
            bg = 'rgba(59, 130, 246, 0.1)';
            border = 'var(--blue)';
            color = 'var(--blue)';
            break;
    }

    return (
        <span style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            border: `1px solid ${border}`,
            backgroundColor: bg,
            color: color,
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
        }}>
            {status === 'RUNNING' && <span style={{width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', boxShadow: `0 0 5px ${color}`}}></span>}
            {status}
        </span>
    );
}
