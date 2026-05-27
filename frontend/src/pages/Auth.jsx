import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlowButton from '../components/GlowButton';
import { api } from '../api/client';
import { Lock } from 'lucide-react';

export default function Auth() {
    const nav = useNavigate();
    const [user, setUser] = useState('admin');
    const [pass, setPass] = useState('admin');
    const [err, setErr] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.auth.login({ username: user, password: pass });
            localStorage.setItem('vgpu_token', res.data.token);
            nav('/dashboard');
        } catch(e) {
            setErr('Invalid secure credentials');
        }
    }

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
            <div style={{ background: 'var(--gray)', padding: '3rem', borderRadius: '8px', border: '1px solid var(--border)', width: '400px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(118,185,0,0.1)', padding: '1rem', borderRadius: '50%' }}>
                        <Lock size={32} color="var(--accent)" />
                    </div>
                    <h2 style={{ margin: 0 }}>Secure Portal</h2>
                </div>
                
                {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', color: 'var(--red)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>{err}</div>}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Operator ID</label>
                        <input value={user} onChange={e=>setUser(e.target.value)} type="text" style={{ background: '#000', border: '1px solid var(--border)', padding: '0.75rem', color: 'white', borderRadius: '4px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Security Key</label>
                        <input value={pass} onChange={e=>setPass(e.target.value)} type="password" style={{ background: '#000', border: '1px solid var(--border)', padding: '0.75rem', color: 'white', borderRadius: '4px', outline: 'none' }} />
                    </div>
                    <GlowButton type="submit" style={{ marginTop: '1rem' }}>Authenticate</GlowButton>
                </form>
            </div>
        </div>
    );
}
