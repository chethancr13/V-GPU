import React from 'react';
import { useGPUFleet, useJobs } from '../hooks';
import StatCard from '../components/StatCard';
import GPUCard from '../components/GPUCard';
import { Server, Activity, Database, Cpu } from 'lucide-react';

export default function Dashboard() {
    const { fleet, loading } = useGPUFleet(5000);
    const { jobs } = useJobs(5000);

    const activeGPUs = fleet ? Object.values(fleet).filter(g => g.utilization > 0).length : 0;
    const totalGPUs = fleet ? Object.keys(fleet).length : 0;
    const queuedJobs = jobs.filter(j => j.status === 'QUEUED').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ margin: '0 0 0.5rem 0' }}>Control Plane</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Central nervous system for your Elastic GPU Array.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                <StatCard title="Active Nodes" value={loading ? '-' : `${activeGPUs}/${totalGPUs}`} unit="GPUs" icon={Server} delta="+2%" />
                <StatCard title="Jobs Queued" value={loading ? '-' : queuedJobs.toString()} unit="tasks" icon={Activity} delta="-15%" />
                <StatCard title="Network Edge" value="4.2" unit="Gbps" icon={Database} />
                <StatCard title="Overall Compute" value={loading ? '-' : fleet && totalGPUs > 0 ? (Object.values(fleet).reduce((a,b)=>a+b.utilization, 0)/totalGPUs).toFixed(1) : '0'} unit="%" icon={Cpu} />
            </div>

            <div>
                <h3 style={{ marginBottom: '1rem' }}>Physical Fleet Topology</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    {loading ? (
                        [1,2,3].map(i => <GPUCard key={i} />)
                    ) : (
                        Object.entries(fleet).map(([id, data]) => (
                            <GPUCard key={id} gpu={{ id, ...data }} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
