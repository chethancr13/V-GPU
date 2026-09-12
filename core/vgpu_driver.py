import uuid
import random
import time
from typing import Dict, List, Optional
from dataclasses import dataclass

# Lazy Docker import — avoid importing docker at module level to prevent
# 200-800ms startup delay when Docker daemon is slow to respond
_docker_module = None

def _get_docker_module():
    """Lazy-import docker module on first use."""
    global _docker_module
    if _docker_module is None:
        try:
            import docker
            _docker_module = docker
        except ImportError:
            _docker_module = False  # Sentinel: module not available
    return _docker_module if _docker_module is not False else None

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
    def __init__(self, physical_gpu_id: int, total_vram: int = 32768, total_compute: float = 100.0):
        self.physical_gpu_id = physical_gpu_id
        self.total_vram = total_vram  # MB
        self.total_compute = total_compute  # %
        self.instances: Dict[str, VGPUInstance] = {}
        self.simulated_stress = False
        self._simulated_utilization = 0.0
        self._simulated_memory_used = 0.0
        self._simulated_temperature = 40.0
        self._simulated_power_draw = 50.0
        self._last_update = time.time()

        # Lazy Docker client — initialized on first actual Docker operation
        self._docker_client = None
        self._docker_available = None  # None = not yet checked

        # Cache scheduler reference to avoid repeated import overhead
        self._scheduler_ref = None

        # Background monitor thread
        import threading
        self._monitor_running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()

    @property
    def docker_client(self):
        """Lazy-initialize Docker client on first access.
        Avoids 200-800ms startup delay per GPU when Docker daemon is slow."""
        if self._docker_available is None:
            self._init_docker()
        return self._docker_client

    @docker_client.setter
    def docker_client(self, value):
        self._docker_client = value

    @property
    def docker_available(self):
        """Check if Docker is available, initializing client if not yet checked."""
        if self._docker_available is None:
            self._init_docker()
        return self._docker_available

    @docker_available.setter
    def docker_available(self, value):
        self._docker_available = value

    def _init_docker(self):
        """Initialize Docker client lazily. Called on first actual use."""
        docker_mod = _get_docker_module()
        if docker_mod is None:
            self._docker_client = None
            self._docker_available = False
            return
        try:
            self._docker_client = docker_mod.from_env()
            self._docker_available = True
        except Exception:
            self._docker_client = None
            self._docker_available = False

    def _get_scheduler(self):
        """Cache scheduler reference to avoid import overhead every monitor tick."""
        if self._scheduler_ref is None:
            try:
                from core.scheduler import scheduler
                self._scheduler_ref = scheduler
            except Exception:
                pass
        return self._scheduler_ref

    def _monitor_loop(self):
        # Increased interval from 1s to 3s — container.stats() is expensive (1-3s per call)
        # and 1Hz resolution isn't needed for simulated telemetry display
        while self._monitor_running:
            self._update_real_metrics()
            time.sleep(3)

    def _update_real_metrics(self):
        # Poll actual Docker container stats
        total_cpu_pct = 0.0
        total_mem_used = 0.0
        
        if self.docker_available:
            # Create a list of IDs to avoid dictionary size change during iteration
            for inst in list(self.instances.values()):
                if inst.container_id:
                    try:
                        container = self._docker_client.containers.get(inst.container_id)
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
                    except Exception:
                        pass
        
        # Add simulated load based on running scheduler tasks and manual stress
        scheduler_load = 0.0
        scheduler_mem = 0.0
        sched = self._get_scheduler()
        if sched is not None:
            try:
                active_instances_with_jobs = 0
                for inst_id in list(self.instances.keys()):
                    assigned_jobs = sched.vgpu_assignments.get(inst_id, [])
                    if assigned_jobs:
                        active_instances_with_jobs += 1
                
                for inst_id in list(self.instances.keys()):
                    assigned_jobs = sched.vgpu_assignments.get(inst_id, [])
                    if assigned_jobs:
                        # Each running job consumes compute and VRAM based on the vGPU configuration
                        inst = self.instances[inst_id]
                        if active_instances_with_jobs > 1:
                            # Distributed workload: workload stress per VM is reduced
                            scheduler_load += (inst.compute_limit / active_instances_with_jobs)
                            scheduler_mem += (inst.vram_limit * 0.85 / active_instances_with_jobs)
                        else:
                            # Single VM workload: full stress load
                            scheduler_load += inst.compute_limit
                            scheduler_mem += inst.vram_limit * 0.85
            except Exception:
                pass

        # Apply manual stress if toggled
        if getattr(self, 'simulated_stress', False):
            num_instances = len(self.instances)
            if num_instances > 1:
                # Partioning to multiple VMs divides manual stress impact
                scheduler_load += 85.0 / num_instances
                scheduler_mem += (self.total_vram * 0.70) / num_instances
            else:
                # Single VM: full stress load
                scheduler_load += 85.0
                scheduler_mem += self.total_vram * 0.70

        # Add some base "idle" noise
        idle_util = random.uniform(0.5, 2.0)
        idle_mem = random.uniform(300, 500)
        
        # Total metrics
        calculated_util = min(100.0, total_cpu_pct + scheduler_load)
        calculated_mem = min(self.total_vram, total_mem_used + scheduler_mem)

        self._simulated_utilization = max(calculated_util, idle_util)
        self._simulated_memory_used = max(calculated_mem, idle_mem)
        self._simulated_temperature = min(98.0, 40 + (self._simulated_utilization * 0.45) + random.uniform(-0.5, 0.5))
        self._simulated_power_draw = min(400.0, 50 + (self._simulated_utilization * 2.8) + random.uniform(-2, 2))
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
                # Pre-create directories locally to prevent Docker from creating them as root-owned
                os.makedirs(f"{cwd}/data/results/{instance_id}", exist_ok=True)
                os.makedirs(f"{cwd}/data/datasets", exist_ok=True)

                # Map compute_limit (0-100%) to CPU shares and memory limit
                # Default Docker CPU shares = 1024. Scale proportionally.
                cpu_quota = max(0.25, compute_limit / 100.0 * 2.0)  # Allow up to 2 CPUs at 100%
                mem_limit_mb = max(256, vram_limit)  # At least 256MB, otherwise match vram_limit

                container = self._docker_client.containers.run(
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
                    # Resource limits to prevent scheduling contention across parallel jobs
                    mem_limit=f"{mem_limit_mb}m",
                    cpus=cpu_quota,
                    # Containers only need exec access, no networking needed
                    network_mode="none",
                    tty=True,
                    stdin_open=True
                )
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
                    container = self._docker_client.containers.get(instance.container_id)
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
                container = self._docker_client.containers.get(inst.container_id)
                if container.status != 'running':
                    print(f" [vGPU Driver] Container {inst.container_id[:12]} is {container.status}. Restarting...")
                    container.start()
            except Exception as e:
                print(f" [vGPU Driver] Container not found or error: {e}. Re-creating container...")
                try:
                    import os
                    cwd = os.getcwd()
                    os.makedirs(f"{cwd}/data/results/{vgpu_id}", exist_ok=True)
                    os.makedirs(f"{cwd}/data/datasets", exist_ok=True)

                    cpu_quota = max(0.25, inst.compute_limit / 100.0 * 2.0)
                    mem_limit_mb = max(256, inst.vram_limit)

                    container = self._docker_client.containers.run(
                        "vgpu-worker",
                        command=["sleep", "infinity"],
                        detach=True,
                        name=f"vgpu-{vgpu_id}",
                        environment={
                            "VGPU_ID": vgpu_id,
                            "VRAM_LIMIT": str(inst.vram_limit),
                            "COMPUTE_LIMIT": str(inst.compute_limit)
                        },
                        volumes={
                            f"{cwd}/data/results/{vgpu_id}": {"bind": "/workspace/results", "mode": "rw"},
                            f"{cwd}/data/datasets": {"bind": "/workspace/dataset", "mode": "ro"},
                            f"{cwd}": {"bind": "/workspace/scripts", "mode": "ro"}
                        },
                        mem_limit=f"{mem_limit_mb}m",
                        cpus=cpu_quota,
                        network_mode="none",
                        tty=True,
                        stdin_open=True
                    )
                    inst.container_id = container.id
                except Exception as re_err:
                    print(f" [vGPU Driver] Failed to recreate container: {re_err}")
                
        return inst.container_id

# Global list of physical GPUs (simulated)
physical_gpus = [VGPUDevice(i) for i in range(2)]  # Simulate 2 GPUs

def get_physical_gpu_metrics() -> List[Dict]:
    return [gpu.get_metrics() for gpu in physical_gpus]