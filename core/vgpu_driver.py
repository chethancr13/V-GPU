import uuid
import random
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
import docker

@dataclass
class VGPUInstance:
    id: str
    physical_gpu_id: int
    vram_limit: int  # MB
    compute_limit: float  # percentage
    memory_bandwidth_limit: float  # percentage
    created_at: float
    container_id: Optional[str] = None

class VGPUDevice:
    def __init__(self, physical_gpu_id: int, total_vram: int = 8192, total_compute: float = 100.0):
        self.physical_gpu_id = physical_gpu_id
        self.total_vram = total_vram  # MB
        self.total_compute = total_compute  # %
        self.instances: Dict[str, VGPUInstance] = {}
        self._simulated_utilization = 0.0
        self._simulated_memory_used = 0.0
        self._simulated_temperature = 40.0
        self._simulated_power_draw = 50.0
        self._last_update = time.time()
        try:
            self.docker_client = docker.from_env()
            self.docker_available = True
        except:
            self.docker_client = None
            self.docker_available = False
            
        # Background monitor thread
        import threading
        self._monitor_running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()

    def _monitor_loop(self):
        while self._monitor_running:
            self._update_real_metrics()
            time.sleep(1)

    def _update_real_metrics(self):
        # Poll actual Docker container stats
        total_cpu_pct = 0.0
        total_mem_used = 0.0
        
        if self.docker_available:
            # Create a list of IDs to avoid dictionary size change during iteration
            for inst in list(self.instances.values()):
                if inst.container_id:
                    try:
                        container = self.docker_client.containers.get(inst.container_id)
                        # Use a small timeout for stats to avoid hanging
                        stats = container.stats(stream=False)
                        
                        # CPU calculation
                        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
                        system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
                        
                        if system_delta > 0:
                            num_cpus = len(stats['cpu_stats']['cpu_usage'].get('percpu_usage', [1]))
                            cpu_pct = (cpu_delta / system_delta) * num_cpus * 100.0
                            total_cpu_pct += cpu_pct
                        
                        mem_used = stats['memory_stats']['usage'] / (1024 * 1024) # MB
                        total_mem_used += mem_used
                    except:
                        pass
        
        # Add some base "idle" noise
        idle_util = random.uniform(0.5, 2.0)
        idle_mem = random.uniform(300, 500)
        
        self._simulated_utilization = max(total_cpu_pct, idle_util)
        self._simulated_memory_used = max(total_mem_used, idle_mem)
        self._simulated_temperature = 40 + (self._simulated_utilization * 0.4) + random.uniform(-0.5, 0.5)
        self._simulated_power_draw = 50 + (self._simulated_utilization * 1.2) + random.uniform(-2, 2)
        self._last_update = time.time()

    def get_metrics(self) -> Dict:
        return {
            "gpu_utilization": self._simulated_utilization,
            "memory_used": self._simulated_memory_used,
            "memory_total": self.total_vram,
            "temperature": self._simulated_temperature,
            "power_draw": self._simulated_power_draw,
            "clock_speeds": {"graphics": 1200 + (self._simulated_utilization * 5), "memory": 7000}
        }

    def create_vgpu_instance(self, vram_limit: int, compute_limit: float, memory_bandwidth_limit: float = 50.0) -> str:
        # Check if resources are available
        used_vram = sum(inst.vram_limit for inst in self.instances.values())
        used_compute = sum(inst.compute_limit for inst in self.instances.values())
        if used_vram + vram_limit > self.total_vram or used_compute + compute_limit > self.total_compute:
            raise ValueError("Insufficient resources")

        instance_id = str(uuid.uuid4())
        
        # Create Docker container as VM if Docker available
        container_id = None
        if self.docker_available:
            try:
                import os
                cwd = os.getcwd()
                container = self.docker_client.containers.run(
                    "vgpu-worker",
                    command=["sleep", "infinity"],
                    detach=True,
                    name=f"vgpu-{instance_id}",
                    environment={
                        "VGPU_ID": instance_id,
                        "VRAM_LIMIT": str(vram_limit),
                        "COMPUTE_LIMIT": str(compute_limit)
                    },
                    volumes={
                        f"{cwd}/data/results/{instance_id}": {"bind": "/workspace/results", "mode": "rw"},
                        f"{cwd}/data/datasets": {"bind": "/workspace/dataset", "mode": "ro"},
                        f"{cwd}": {"bind": "/workspace/scripts", "mode": "ro"}
                    },
                    tty=True,
                    stdin_open=True
                )
                # Create the results directory locally
                os.makedirs(f"{cwd}/data/results/{instance_id}", exist_ok=True)
                container_id = container.id
            except Exception as e:
                print(f"Warning: Failed to create VM container: {e}. Running in simulation mode.")
        else:
            print("Docker not available. Running vGPU in simulation mode without VM.")

        instance = VGPUInstance(
            id=instance_id,
            physical_gpu_id=self.physical_gpu_id,
            vram_limit=vram_limit,
            compute_limit=compute_limit,
            memory_bandwidth_limit=memory_bandwidth_limit,
            created_at=time.time(),
            container_id=container_id
        )
        self.instances[instance_id] = instance
        return instance_id

    def destroy_vgpu_instance(self, instance_id: str) -> bool:
        if instance_id in self.instances:
            instance = self.instances[instance_id]
            if instance.container_id:
                try:
                    container = self.docker_client.containers.get(instance.container_id)
                    container.stop()
                    container.remove()
                except:
                    pass  # Ignore if already removed
            del self.instances[instance_id]
            return True
        return False

    def list_instances(self) -> List[Dict]:
        return [
            {
                "id": inst.id,
                "vram_limit": inst.vram_limit,
                "compute_limit": inst.compute_limit,
                "memory_bandwidth_limit": inst.memory_bandwidth_limit,
                "created_at": inst.created_at,
                "container_id": inst.container_id
            }
            for inst in self.instances.values()
        ]

    def get_container_id(self, vgpu_id: str) -> Optional[str]:
        inst = self.instances.get(vgpu_id)
        if not inst or not inst.container_id:
            return None
            
        # Optimization: Ensure it's running before returning it
        if self.docker_available:
            try:
                container = self.docker_client.containers.get(inst.container_id)
                if container.status != 'running':
                    print(f"🔄 [vGPU Driver] Container {inst.container_id[:12]} is {container.status}. Restarting...")
                    container.start()
            except Exception as e:
                print(f"⚠️ [vGPU Driver] Failed to verify/restart container: {e}")
                
        return inst.container_id

# Global list of physical GPUs (simulated)
physical_gpus = [VGPUDevice(i) for i in range(2)]  # Simulate 2 GPUs

def get_physical_gpu_metrics() -> List[Dict]:
    return [gpu.get_metrics() for gpu in physical_gpus]