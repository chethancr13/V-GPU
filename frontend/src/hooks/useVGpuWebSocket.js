import { useState, useEffect } from 'react';

export function useVGpuWebSocket(url) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('CONNECTING...');
  const [history, setHistory] = useState({
    compute: Array(50).fill(0),
    memory: Array(50).fill(0),
    timestamps: Array(50).fill('')
  });

  useEffect(() => {
    let ws = new WebSocket(url);
    
    ws.onopen = () => {
      setStatus('CONNECTED');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setData(payload);
        setStatus('CONNECTED');
        
        // Compute averages across physical GPUs if multiple exist
        if (payload.physical_gpus && payload.physical_gpus.length > 0) {
          const gpus = payload.physical_gpus;
          let totalUtil = 0;
          let totalMem = 0;
          
          gpus.forEach(gpu => {
            totalUtil += gpu.gpu_utilization;
            totalMem += gpu.memory_used;
          });
          
          const avgUtil = totalUtil / gpus.length;
          
          // Update History with rolling array
          setHistory(prev => {
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            const newCompute = [...prev.compute.slice(1), avgUtil];
            const newMemory = [...prev.memory.slice(1), totalMem];
            const newTimes = [...prev.timestamps.slice(1), timeStr];
            
            return { compute: newCompute, memory: newMemory, timestamps: newTimes };
          });
        }

      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setStatus('LOST SYNC');
    };

    ws.onclose = () => {
      setStatus('LOST SYNC');
      // Simple reconnect logic
      setTimeout(() => {
        setStatus('RECONNECTING...');
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  // Derived Fleet Stats
  let fleetMode = 'IDLE';
  let fleetAvgAcc = 0;
  let fleetTotalSpeed = 0;
  let fleetDataset = 'None';
  let topModel = null;
  let automlInfo = null;

  if (data?.recent_jobs && data.recent_jobs.length > 0) {
    const jobs = data.recent_jobs;
    const latestJob = jobs[0];
    
    // Check if the backend tagged the latest job as part of a parallel CLUSTER run
    if (latestJob.run_mode === 'CLUSTER') {
      fleetMode = 'CLUSTER';
      // Group and average only the jobs from the same parallel run group
      const currentGroupJobs = jobs.filter(j => j.run_group === latestJob.run_group);
      fleetAvgAcc = currentGroupJobs.reduce((sum, j) => sum + (j.accuracy || 0), 0) / currentGroupJobs.length;
      fleetTotalSpeed = currentGroupJobs.reduce((sum, j) => sum + (j.speed || 0), 0);
      fleetDataset = `${currentGroupJobs.length} Nodes Active`;
    } else {
      fleetMode = 'SINGLE';
      fleetAvgAcc = latestJob.accuracy || 0;
      fleetTotalSpeed = latestJob.speed || 0;
      fleetDataset = latestJob.dataset_used || 'N/A';
    }
    
    // Check for leaderboard in newest job
    if (latestJob.leaderboard) {
      topModel = latestJob.leaderboard; // which is an array of models
    }
    automlInfo = latestJob.automl_info || null;
  }

  return {
    status,
    rawMetrics: data,
    history,
    fleetMode,
    fleetAvgAcc,
    fleetTotalSpeed,
    fleetDataset,
    topModel,
    automlInfo
  };
}
