import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Server, Activity, ArrowLeftRight, LogOut, Cpu } from 'lucide-react';

export default function Layout() {
    const nav = useNavigate();
    
    const navItems = [
        { path: '/dashboard', icon: LayoutGrid, label: 'Control Plane' },
        { path: '/allocate', icon: Server, label: 'Provision Fleet' },
        { path: '/jobs', icon: Activity, label: 'Celery Jobs' },
        { path: '/metrics', icon: ArrowLeftRight, label: 'Fleet Telementry' }
    ];

    return (

        <div className="page-container" style={{ display: 'flex', height: '100vh', background: 'var(--black)' }}>
            <aside style={{ width: '260px', background: 'var(--dark-gray)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <Cpu size={24} color="var(--accent)" />
                    <span style={{ fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>ZENITH</span>
                </div>
                
                <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '0.75rem 1rem', borderRadius: '4px',
                                textDecoration: 'none',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--gray)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'all 0.2s'
                            })}
                        >
                            <item.icon size={18} color="currentColor" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '2rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        PROJECT ZENITH v2.0
                    </div>
                </div>

            </aside>
            <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
                <Outlet />
            </main>
        </div>
    );
}
