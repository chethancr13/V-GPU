import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export function useGPUFleet(pollingInterval = 5000) {
    const [fleet, setFleet] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchFleet = async () => {
            try {
                const [fleetRes, catRes] = await Promise.all([
                    api.gpu.getFleet(),
                    api.gpu.getCatalog()
                ]);
                if (isMounted) {
                    setFleet(fleetRes.data.fleet);
                    setCatalog(catRes.data.catalog);
                    setLoading(false);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Failed to fetch GPU fleet topology.');
                    setLoading(false);
                }
            }
        };

        fetchFleet();
        const interval = setInterval(fetchFleet, pollingInterval);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [pollingInterval]);

    return { fleet, catalog, loading, error };
}

export function useJobs(pollingInterval = 3000) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshJobs = async () => {
        try {
            const res = await api.jobs.list();
            setJobs(res.data.jobs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshJobs();
        const interval = setInterval(refreshJobs, pollingInterval);
        return () => clearInterval(interval);
    }, [pollingInterval]);

    return { jobs, loading, refreshJobs };
}

/**
 * useMetrics — now delegates to the shared MetricsContext instead of
 * opening its own WebSocket connection. This is a backwards-compatible
 * wrapper for any existing consumers.
 */
export function useMetrics() {
    // Re-export from shared context for backward compatibility
    const { useSharedMetrics } = require('../contexts/MetricsContext');
    const { metrics } = useSharedMetrics();
    return { metrics };
}


export function useAllocation() {
    const [isAllocating, setIsAllocating] = useState(false);
    
    const allocate = async (payload) => {
        setIsAllocating(true);
        try {
            const res = await api.gpu.allocate(payload);
            return res.data;
        } catch(e) {
            throw new Error(e.response?.data?.detail || "Allocation failed");
        } finally {
            setIsAllocating(false);
        }
    };

    const release = async (id) => {
        try {
            await api.gpu.release(id);
        } catch(e) {
            console.error("Failed to release GPU");
        }
    };

    return { allocate, release, isAllocating };
}

export function useData() {
    const [datasets, setDatasets] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        try {
            const [dRes, sRes] = await Promise.all([
                api.data.listDatasets(),
                api.data.listScripts()
            ]);
            setDatasets(dRes.data.datasets || []);
            setScripts(sRes.data.scripts || []);
        } catch (e) {
            console.error("Failed to load datasets/scripts", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const uploadDataset = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        await api.data.uploadDataset(formData);
        await refreshData();
    };

    return { datasets, scripts, loading, refreshData, uploadDataset };
}
