import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function StatCard({ title, value, unit, delta, icon: Icon, sparkline }) {
    return (
        <div style={{
            background: 'var(--gray)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{value}</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{unit}</span>
                    </div>
                </div>
                <div style={{ background: 'var(--light-gray)', padding: '0.75rem', borderRadius: '8px' }}>
                    {Icon && <Icon size={20} color="var(--accent)" />}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {delta && (
                    <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: delta.startsWith('+') ? 'var(--accent)' : 'var(--red)',
                        background: delta.startsWith('+') ? 'rgba(118, 185, 0, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                    }}>
                        {delta}
                    </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs last interval</span>
            </div>

            {sparkline && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', opacity: 0.3 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkline}>
                            <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="var(--accent)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
