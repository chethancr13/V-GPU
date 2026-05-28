import time
import asyncio
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid
from core.vgpu_driver import physical_gpus, VGPUDevice

class SchedulingPolicy(Enum):
    ROUND_ROBIN = "round_robin"
    BEST_FIT = "best_fit"
    PRIORITY = "priority"
    THERMAL_AWARE = "thermal_aware"

from dataclasses import dataclass, field

@dataclass(order=True)
class PrioritizedItem:
    priority: int
    item: Dict = field(compare=False)

class VGPUScheduler:
    def __init__(self, policy: SchedulingPolicy = SchedulingPolicy.ROUND_ROBIN):
        self.policy = policy
        self.job_queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        
        # Track running jobs per vGPU to support time slicing
        self.running_jobs: Dict[str, Dict] = {} # job_id -> job dict
        self.vgpu_assignments: Dict[str, List[str]] = {} # vgpu_id -> list of job_ids
        
        self.completed_jobs: List[Dict] = []
        self.round_robin_index = 0
        self.stats = {
            "total_jobs": 0,
            "completed_jobs": 0,
            "avg_wait_time": 0,
            "avg_throughput": 0,
            "utilization_balance": 0
        }

    async def schedule_job(self, job: Dict) -> Optional[str]:
        # Assign priority based on job priority and policy
        priority = self._calculate_priority(job)
        await self.job_queue.put(PrioritizedItem(priority=priority, item=job))
        self.stats["total_jobs"] += 1
        return job["id"]

    def _calculate_priority(self, job: Dict) -> int:
        base_priority = {"HIGH": 3, "NORMAL": 2, "LOW": 1}.get(job.get("priority", "NORMAL"), 2)
        if self.policy == SchedulingPolicy.PRIORITY:
            return -base_priority  # Higher priority first
        return 0  # For other policies, use FIFO

    async def process_queue(self):
        from core.compute_engine import compute_engine
        
        # This loop runs forever, executing the time-slice ticks
        print("Scheduler process_queue loop started...")
        while True:
            # 1. Pull new jobs from the queue if there are any
            try:
                # Get all jobs currently in the queue without blocking
                while not self.job_queue.empty():
                    print("Queue is not empty, pulling job...")
                    p_item = self.job_queue.get_nowait()
                    priority, job = p_item.priority, p_item.item
                    vgpu_id = self._select_vgpu(job)
                    print(f"Assigning job {job['id']} to vgpu {vgpu_id}")
                    
                    if vgpu_id:
                        job["vgpu_id"] = vgpu_id
                        job["scheduled_at"] = time.time()
                        job["status"] = "RUNNING"
                        
                        # Initialize job progress variables
                        # Estimate total work required (in seconds)
                        if job["type"] == "compute":
                            job["total_work_sec"] = max(0.5, job["size"] / 1000.0) 
                        else:
                            job["total_work_sec"] = max(0.5, job["batch_size"] * 0.1)
                            
                        job["work_completed"] = 0.0
                        
                        self.running_jobs[job["id"]] = job
                        if vgpu_id not in self.vgpu_assignments:
                            self.vgpu_assignments[vgpu_id] = []
                        self.vgpu_assignments[vgpu_id].append(job["id"])
                    else:
                        # Re-queue if no vGPU available
                        await self.job_queue.put(PrioritizedItem(priority=priority, item=job))
                        break # Stop pulling if we can't schedule
                    
                    self.job_queue.task_done()
            except asyncio.QueueEmpty:
                pass

            # 2. Time Slice Tick
            # Simulate 100ms passing in the real world
            tick_duration = 0.1
            
            jobs_to_complete = []
            
            # For each vGPU, divide the tick_duration evenly among its running jobs
            for vgpu_id, job_ids in self.vgpu_assignments.items():
                if not job_ids:
                    continue
                    
                # Time slicing: each job gets a fraction of the hardware's time
                slice_per_job = tick_duration / len(job_ids)
                
                for j_id in list(job_ids): # Copy list to allow removal
                    job = self.running_jobs[j_id]
                    job["work_completed"] += slice_per_job
                    
                    if job["work_completed"] >= job["total_work_sec"]:
                        jobs_to_complete.append(job)
                        job_ids.remove(j_id)
            
            # 3. Process completed jobs
            for job in jobs_to_complete:
                try:
                    # Actually calculate the final metrics
                    result = await compute_engine.calculate_job_metrics(job)
                    job["result"] = result
                    job["status"] = "COMPLETED"
                except Exception as e:
                    job["status"] = "FAILED"
                    job["error"] = str(e)
                
                job["execution_time"] = time.time() - job["scheduled_at"]
                self.completed_jobs.append(job)
                del self.running_jobs[job["id"]]
                
            # Sleep for exactly the tick duration
            await asyncio.sleep(tick_duration)

    def _select_vgpu(self, job: Dict) -> Optional[str]:
        # If user hardcoded a vGPU, use it
        if job.get("vgpu_id"):
            return job["vgpu_id"]
            
        available_vgpus = []
        for gpu in physical_gpus:
            for inst in gpu.list_instances():
                available_vgpus.append(inst["id"])

        if not available_vgpus:
            # Fallback to physical GPUs if no vGPU instances exist
            for gpu in physical_gpus:
                available_vgpus.append(f"physical_{gpu.physical_gpu_id}")

        if not available_vgpus:
            return None

        if self.policy == SchedulingPolicy.ROUND_ROBIN:
            vgpu_id = available_vgpus[self.round_robin_index % len(available_vgpus)]
            self.round_robin_index += 1
            return vgpu_id
        elif self.policy == SchedulingPolicy.BEST_FIT:
            # Select vGPU with most available VRAM
            best_vgpu = max(available_vgpus, key=lambda vid: self._get_vgpu_vram_available(vid))
            return best_vgpu
        elif self.policy == SchedulingPolicy.PRIORITY:
            # For priority, already handled in queue
            return available_vgpus[0]
        elif self.policy == SchedulingPolicy.THERMAL_AWARE:
            # Avoid GPUs above 80°C
            suitable = [vid for vid in available_vgpus if self._get_gpu_temp(vid) < 80]
            if suitable:
                return suitable[0]
            return None
        return available_vgpus[0]

    def _get_vgpu_vram_available(self, vgpu_id: str) -> int:
        return 4096  # MB

    def _get_gpu_temp(self, vgpu_id: str) -> float:
        for gpu in physical_gpus:
            metrics = gpu.get_metrics()
            return metrics["temperature"]
        return 50.0

    def preempt_job(self, job_id: str) -> bool:
        if job_id in self.running_jobs:
            job = self.running_jobs[job_id]
            job["status"] = "PREEMPTED"
            self.completed_jobs.append(job)
            
            # Remove from assignments
            if job["vgpu_id"] in self.vgpu_assignments:
                if job_id in self.vgpu_assignments[job["vgpu_id"]]:
                    self.vgpu_assignments[job["vgpu_id"]].remove(job_id)
            
            del self.running_jobs[job_id]
            return True
        return False

    def get_queue_status(self) -> Dict:
        return {
            "queued_jobs": self.job_queue.qsize(),
            "running_jobs": len(self.running_jobs),
            "completed_jobs": len(self.completed_jobs)
        }

    def get_stats(self) -> Dict:
        if self.completed_jobs:
            wait_times = [job.get("scheduled_at", job["submitted_at"]) - job["submitted_at"] for job in self.completed_jobs]
            self.stats["avg_wait_time"] = sum(wait_times) / len(wait_times)
            self.stats["avg_throughput"] = len(self.completed_jobs) / (time.time() - self.completed_jobs[0]["submitted_at"]) if self.completed_jobs else 0
            
            # Ensure safe division to prevent crashes during simulation resets
            if self.stats["avg_throughput"] < 0 or sum(wait_times) == 0:
                self.stats["avg_throughput"] = 0
        return self.stats

# Global scheduler
scheduler = VGPUScheduler()