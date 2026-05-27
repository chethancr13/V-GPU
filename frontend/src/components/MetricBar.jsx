import React from 'react';

export default function MetricBar({ value, max = 100, color = 'var(--accent)' }) {
    const pc = Math.min(100, Math.max(0, (value / max) * 100));
    
    return (
        <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '3px',
            overflow: 'hidden'
        }}>
            <div style={{
                height: '100%',
                backgroundColor: color,
                width: `${pc}%`,
                transition: 'width 0.3s ease-out',
                boxShadow: `0 0 10px ${color}`
            }}></div>
        </div>
    );
}
