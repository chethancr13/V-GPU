import time
import logging
from typing import Dict, List
from core.vgpu_driver import physical_gpus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IsolationManager:
    def __init__(self):
        self.violations: List[Dict] = []

    def enforce_limits(self):
        # In simulation, just check and log
        for gpu in physical_gpus:
            metrics = gpu.get_metrics()
            for inst in gpu.list_instances():
                vram_used = metrics["memory_used"] * (inst["vram_limit"] / gpu.total_vram)
                if vram_used > inst["vram_limit"]:
                    self._log_violation(inst["id"], "vram", vram_used, inst["vram_limit"])
                # For compute, simulate
                if metrics["gpu_utilization"] > inst["compute_limit"]:
                    self._log_violation(inst["id"], "compute", metrics["gpu_utilization"], inst["compute_limit"])

    def _log_violation(self, vgpu_id: str, resource: str, used: float, limit: float):
        violation = {
            "vgpu_id": vgpu_id,
            "resource": resource,
            "used": used,
            "limit": limit,
            "timestamp": time.time()
        }
        self.violations.append(violation)
        logger.warning(f"Limit violation: {violation}")

    def get_violations(self) -> List[Dict]:
        return self.violations

# Global instance
isolation_manager = IsolationManager()