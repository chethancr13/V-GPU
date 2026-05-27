import React, { useState } from 'react';
import { useGPUFleet, useAllocation } from '../hooks';
import StepWizard from '../components/StepWizard';
import GlowButton from '../components/GlowButton';
import { useNavigate } from 'react-router-dom';

export default function Allocate() {
    const nav = useNavigate();
    const { catalog } = useGPUFleet();
    const { allocate, isAllocating } = useAllocation();
    
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        gpu_model: '',
        vram_slice: 8192,
        count: 1,
        priority: 'NORMAL'
    });

    const steps = ['Select Hardware', 'Virtualize Slice', 'Deploy Array'];

    const handleDeploy = async () => {
        try {
            const res = await allocate(formData);
            nav('/jobs');
        } catch(e) {
            console.error(e);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Provision Fleet Array</h1>
            
            <StepWizard steps={steps} currentStep={step} />

            <div style={{ background: 'var(--gray)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)', minHeight: '300px' }}>
                {step === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3>Select Physical GPU Host</h3>
                        <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>These are the detected NVIDIA-vGPU compatible physical hosts available in your cluster.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {catalog.length > 0 ? catalog.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => setFormData({...formData, gpu_model: c.id})}
                                    style={{
                                        border: formData.gpu_model === c.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        background: formData.gpu_model === c.id ? 'rgba(118,185,0,0.05)' : '#000',
                                        padding: '1.5rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <h4 style={{margin: 0, color: 'var(--text-primary)'}}>{c.name}</h4>
                                    <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0.25rem 0'}}>Architecture: {c.architecture}</p>
                                    <p style={{fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, margin: 0}}>{Math.floor(c.vram_total)} MB VRAM Pool</p>
                                </div>
                            )) : (
                                <div className="skeleton" style={{height: '100px', gridColumn: 'span 2'}}></div>
                            )}
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <h3>Configure Partition Slices</h3>
                        <div>
                            <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>VRAM Slice per Container (MB)</label>
                            <input 
                                type="number" 
                                value={formData.vram_slice} 
                                onChange={e => setFormData({...formData, vram_slice: parseInt(e.target.value)})} 
                                style={{ width: '100%', padding: '1rem', background: '#000', border: '1px solid var(--border)', color: 'white', outline: 'none', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Number of Containers (Count)</label>
                            <input 
                                type="number" 
                                value={formData.count} 
                                onChange={e => setFormData({...formData, count: parseInt(e.target.value)})}
                                style={{ width: '100%', padding: '1rem', background: '#000', border: '1px solid var(--border)', color: 'white', outline: 'none', borderRadius: '4px' }}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3>Review & Deploy</h3>
                        <div style={{ background: '#000', padding: '1.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            <p><strong>Hardware Model:</strong> {formData.gpu_model}</p>
                            <p><strong>VRAM Slices:</strong> {formData.vram_slice} MB x {formData.count} Nodes</p>
                            <p><strong>Priority Queue:</strong> {formData.priority}</p>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                {step > 0 && <GlowButton variant="secondary" onClick={() => setStep(s => s - 1)}>Back</GlowButton>}
                {step < 2 ? (
                    <GlowButton onClick={() => setStep(s => s + 1)} disabled={step===0 && !formData.gpu_model}>Next Step</GlowButton>
                ) : (
                    <GlowButton onClick={handleDeploy} disabled={isAllocating}>{isAllocating ? 'DEPLOYING...' : 'DISPATCH FLEET'}</GlowButton>
                )}
            </div>
        </div>
    );
}
