import React, { useState } from 'react';
import { useJobs, useGPUFleet, useData } from '../hooks';
import JobRow from '../components/JobRow';
import GlowButton from '../components/GlowButton';
import { api } from '../api/client';
import { PlayCircle, Code, Database, FileCode, Cpu, Terminal } from 'lucide-react';

export default function Jobs() {
    const { jobs, refreshJobs } = useJobs(3000);
    const { fleet } = useGPUFleet();
    const { datasets, scripts, uploadDataset } = useData();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedVGPU, setSelectedVGPU] = useState('ALL_FLEET');
    const [selectedScript, setSelectedScript] = useState('test_script.py');
    const [selectedDataset, setSelectedDataset] = useState('');
    const [customCode, setCustomCode] = useState(`# Project Zenith - Custom AI Logic\nimport time, random\n\nprint("Initializing Custom Distributed Job...")\ntime.sleep(2)\nprint(f"Accuracy: {random.uniform(92, 98)}%")\nprint(f"Speed: {random.uniform(400, 800)} samples/sec")`);
    const [showIDE, setShowIDE] = useState(false);

    // List all active allocations from all physical GPUs
    const activeInstances = [];
    if (fleet) {
        // In the new API structure, metrics might be in useMetrics or useGPUFleet
        // We look for vgpu instances specifically.
    }
    
    // For the UI, we'll try to find instances from the websocket or fleet call
    // Let's assume the API returns they are in fleet_manager (mock) or physical_gpus
    const allInstances = []; // This should be populated by useGPUFleet if updated

    const handleCreateJob = async () => {
        setIsSubmitting(true);
        try {
            const config = {
                script_name: showIDE ? 'custom_injection.py' : selectedScript,
                dataset_name: selectedDataset,
                custom_code: showIDE ? customCode : null
            };

            await api.jobs.submit({
                job_type: selectedVGPU === 'ALL_FLEET' ? 'PARALLEL_TRAINING' : 'SINGLE_NODE_EXE',
                gpu_allocation_id: selectedVGPU,
                config: config
            });
            refreshJobs();
        } catch(e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: '0 0 0.5rem 0' }}>Job Execution Hub</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Securely dispatch ML pipelines to containerized V-GPU nodes.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <GlowButton onClick={() => setShowIDE(!showIDE)} variant="secondary">
                      <Code size={18} /> {showIDE ? 'Close Web-IDE' : 'Open Web-IDE'}
                    </GlowButton>
                    <GlowButton onClick={handleCreateJob} disabled={isSubmitting || !selectedVGPU}>
                        <PlayCircle size={18} /> {isSubmitting ? 'DISPATCHING...' : 'DISPATCH PIPELINE'}
                    </GlowButton>
                </div>
            </div>

            {/* JOB CONFIGURATION GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                {/* 1. Hardware Selector */}
                <div style={{ background: 'var(--gray)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <Cpu size={18} color="var(--accent)" />
                        <h4 style={{ margin: 0 }}>Target Node</h4>
                    </div>
                    <select 
                        value={selectedVGPU} 
                        onChange={e => setSelectedVGPU(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: '#000', border: '1px solid var(--border)', color: 'white', outline: 'none', borderRadius: '4px' }}
                    >
                        <option value="ALL_FLEET"> PARALLEL FLEET (ALL NODES)</option>
                        {/* Map active instances here */}
                    </select>
                </div>

                {/* 2. Script Selector */}
                <div style={{ background: 'var(--gray)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <FileCode size={18} color="var(--accent)" />
                        <h4 style={{ margin: 0 }}>Execution Script</h4>
                    </div>
                    <select 
                        disabled={showIDE}
                        value={selectedScript} 
                        onChange={e => setSelectedScript(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: '#000', border: '1px solid var(--border)', color: 'white', outline: 'none', borderRadius: '4px', opacity: showIDE ? 0.3 : 1 }}
                    >
                        {scripts.map(s => <option key={s} value={s}>{s}</option>)}
                        {!scripts.includes('test_script.py') && <option value="test_script.py">test_script.py (Default)</option>}
                    </select>
                </div>

                {/* 3. Dataset Selector */}
                <div style={{ background: 'var(--gray)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <Database size={18} color="var(--accent)" />
                        <h4 style={{ margin: 0 }}>Input Dataset</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                            value={selectedDataset} 
                            onChange={e => setSelectedDataset(e.target.value)}
                            style={{ flex: 1, padding: '0.75rem', background: '#000', border: '1px solid var(--border)', color: 'white', outline: 'none', borderRadius: '4px' }}
                        >
                            <option value="">None (Synthetic Data)</option>
                            {datasets.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input 
                            type="file" 
                            id="ds-upload" 
                            style={{ display: 'none' }} 
                            onChange={e => e.target.files[0] && uploadDataset(e.target.files[0])} 
                        />
                        <button 
                            onClick={() => document.getElementById('ds-upload').click()}
                            style={{ background: 'var(--dark-gray)', border: '1px solid var(--border)', color: 'white', padding: '0 1rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* WEB IDE BOX */}
            {showIDE && (
                <div style={{ 
                    background: '#0a0a0a', 
                    border: '1px solid var(--accent)', 
                    borderRadius: '8px', 
                    padding: '1.5rem',
                    boxShadow: '0 0 30px rgba(118,185,0,0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Terminal size={16} color="var(--accent)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dynamic Code Injection Mode</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Python 3.11 Kernel</span>
                    </div>
                    <textarea 
                        value={customCode}
                        onChange={e => setCustomCode(e.target.value)}
                        style={{
                            width: '100%',
                            height: '250px',
                            background: '#000',
                            color: 'var(--accent)',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.9rem',
                            padding: '1rem',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '4px',
                            outline: 'none',
                            resize: 'none'
                        }}
                    />
                </div>
            )}

            {/* JOB QUEUE TABLE */}
            <div style={{ background: 'var(--dark-gray)', borderRadius: '8px', border: '1px solid var(--border)', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr', padding: '0 1rem 1rem 1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    <span>Deployment Context</span>
                    <span>Target Node</span>
                    <span>Status</span>
                    <span>Training Metrics</span>
                    <span style={{textAlign: 'right'}}>Lifecycle</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {jobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            No active asynchronous pipelines detected on Redis.
                        </div>
                    ) : (
                        jobs.map(j => <JobRow key={j.id} job={j} onKill={id => api.jobs.kill(id).then(refreshJobs)} />)
                    )}
                </div>
            </div>
        </div>
    );
}
