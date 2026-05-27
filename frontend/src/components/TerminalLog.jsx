import React, { useRef, useEffect } from 'react';

export default function TerminalLog({ lines = [] }) {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    return (
        <div style={{
            background: '#030303',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: '4px solid var(--accent)',
            borderRadius: '4px',
            padding: '1rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            color: '#a3a3a3',
            height: '250px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        }}>
            {lines.length === 0 ? (
                <div style={{opacity: 0.5}}>&gt; Waiting for output stream...</div>
            ) : (
                lines.map((ln, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        gap: '1rem'
                    }}>
                        <span style={{color: 'var(--text-muted)'}}>{i.toString().padStart(4, '0')}</span>
                        <span style={{color: ln.includes('Error') || ln.includes('Failed') ? 'var(--red)' : ln.includes('Success') || ln.includes('Accuracy') ? 'var(--accent)' : 'inherit'}}>
                            {ln}
                        </span>
                    </div>
                ))
            )}
            <div ref={endRef} />
        </div>
    );
}
