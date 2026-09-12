"""
Live Metrics Collector — Aggregates all real-time platform state into a single snapshot.

This module acts as the "tool" that the LLM can reference when answering
questions about GPU temperatures, VRAM usage, running jobs, and platform health.
"""

import time
from typing import Dict, Any, List


def get_live_snapshot() -> Dict[str, Any]:
    """
    Collects a full real-time snapshot of the V-GPU platform state:
    - Physical GPU metrics (utilization, memory, temperature, power)
    - All active vGPU instances (VRAM limits, compute limits, container IDs)
    - Scheduler state (active/pending/completed jobs, queue length)
    - Recent job results
    - System-level health summary
    """
    from core.vgpu_driver import physical_gpus
    from core.scheduler import scheduler

    # --- 1. Physical GPU metrics ---
    gpu_metrics = []
    for i, gpu in enumerate(physical_gpus):
        m = gpu.get_metrics()
        gpu_metrics.append({
            "gpu_id": i,
            "utilization_pct": round(m["gpu_utilization"], 1),
            "memory_used_mb": round(m["memory_used"], 1),
            "memory_total_mb": m["memory_total"],
            "memory_used_pct": round((m["memory_used"] / m["memory_total"]) * 100, 1) if m["memory_total"] > 0 else 0,
            "temperature_c": round(m["temperature"], 1),
            "power_draw_w": round(m["power_draw"], 1),
            "clock_speed_mhz": round(m["clock_speeds"]["graphics"], 0),
            "stress_mode": getattr(gpu, "simulated_stress", False),
        })

    # --- 2. vGPU instances ---
    vgpu_instances = []
    for gpu in physical_gpus:
        for inst in gpu.list_instances():
            vgpu_instances.append({
                "id": inst["id"],
                "vram_limit_mb": inst["vram_limit"],
                "compute_limit_pct": inst["compute_limit"],
                "physical_gpu_id": gpu.physical_gpu_id,
                "has_container": inst["container_id"] is not None,
                "container_id_short": inst["container_id"][:12] if inst["container_id"] else "simulated",
                "created_at": inst["created_at"],
            })

    # --- 3. Scheduler state ---
    queue_status = scheduler.get_queue_status()
    scheduler_stats = scheduler.get_stats()
    scheduler_state = {
        "active_jobs": queue_status.get("running_jobs", 0),
        "pending_jobs": queue_status.get("queued_jobs", 0),
        "completed_jobs": queue_status.get("completed_jobs", 0),
        "queue_length": queue_status.get("queued_jobs", 0) + queue_status.get("running_jobs", 0),
        "total_jobs_processed": scheduler_stats.get("total_jobs", 0),
        "avg_wait_time_s": round(scheduler_stats.get("avg_wait_time", 0), 2),
        "avg_throughput": round(scheduler_stats.get("avg_throughput", 0), 2),
    }

    # --- 4. Recent jobs ---
    try:
        # Import the recent_jobs list from main module scope
        import sys
        main_module = sys.modules.get("__main__")
        if main_module and hasattr(main_module, "recent_jobs"):
            recent = main_module.recent_jobs[:5]
        else:
            # Fallback: import from the main module
            recent = []
    except Exception:
        recent = []

    recent_jobs_summary = []
    for job in recent:
        recent_jobs_summary.append({
            "vgpu_id": job.get("vgpu_id", "unknown"),
            "script": job.get("script", "unknown"),
            "status": job.get("status", "unknown"),
            "run_mode": job.get("run_mode", "SINGLE"),
            "duration_s": round(job.get("duration", 0), 2) if job.get("duration") else None,
        })

    # --- 5. System health summary ---
    total_gpus = len(physical_gpus)
    total_vgpus = len(vgpu_instances)
    avg_temp = round(sum(g["temperature_c"] for g in gpu_metrics) / max(len(gpu_metrics), 1), 1)
    avg_util = round(sum(g["utilization_pct"] for g in gpu_metrics) / max(len(gpu_metrics), 1), 1)
    total_power = round(sum(g["power_draw_w"] for g in gpu_metrics), 1)
    total_vram_used = round(sum(g["memory_used_mb"] for g in gpu_metrics), 0)
    total_vram_total = sum(g["memory_total_mb"] for g in gpu_metrics)

    system_health = {
        "total_physical_gpus": total_gpus,
        "total_vgpu_instances": total_vgpus,
        "cluster_avg_temperature_c": avg_temp,
        "cluster_avg_utilization_pct": avg_util,
        "cluster_total_power_draw_w": total_power,
        "cluster_total_vram_used_mb": total_vram_used,
        "cluster_total_vram_capacity_mb": total_vram_total,
        "any_gpu_stressed": any(g["stress_mode"] for g in gpu_metrics),
        "any_gpu_hot": any(g["temperature_c"] > 75 for g in gpu_metrics),
    }

    return {
        "timestamp": time.time(),
        "physical_gpus": gpu_metrics,
        "vgpu_instances": vgpu_instances,
        "scheduler": scheduler_state,
        "recent_jobs": recent_jobs_summary,
        "system_health": system_health,
    }


def format_metrics_for_prompt(snapshot: Dict[str, Any]) -> str:
    """
    Formats the live metrics snapshot into a human-readable string
    suitable for injection into the LLM system prompt.
    """
    lines = []
    lines.append("### LIVE PLATFORM METRICS (Real-Time V-GPU Cluster State)")
    lines.append("")

    # System health overview
    h = snapshot["system_health"]
    lines.append(f"**Cluster Overview:**")
    lines.append(f"- Physical GPUs: {h['total_physical_gpus']}")
    lines.append(f"- Active vGPU Instances: {h['total_vgpu_instances']}")
    lines.append(f"- Cluster Avg Utilization: {h['cluster_avg_utilization_pct']}%")
    lines.append(f"- Cluster Avg Temperature: {h['cluster_avg_temperature_c']}°C")
    lines.append(f"- Total Power Draw: {h['cluster_total_power_draw_w']}W")
    lines.append(f"- VRAM Used: {h['cluster_total_vram_used_mb']}MB / {h['cluster_total_vram_capacity_mb']}MB")
    lines.append(f"- Any GPU Stressed: {'Yes' if h['any_gpu_stressed'] else 'No'}")
    lines.append(f"- Any GPU Overheating (>75°C): {'Yes' if h['any_gpu_hot'] else 'No'}")
    lines.append("")

    # Per-GPU details
    for gpu in snapshot["physical_gpus"]:
        lines.append(f"**Physical GPU {gpu['gpu_id']}:**")
        lines.append(f"  - Utilization: {gpu['utilization_pct']}%")
        lines.append(f"  - Memory: {gpu['memory_used_mb']}MB / {gpu['memory_total_mb']}MB ({gpu['memory_used_pct']}%)")
        lines.append(f"  - Temperature: {gpu['temperature_c']}°C")
        lines.append(f"  - Power Draw: {gpu['power_draw_w']}W")
        lines.append(f"  - Clock Speed: {gpu['clock_speed_mhz']}MHz")
        lines.append(f"  - Stress Mode: {'ON' if gpu['stress_mode'] else 'OFF'}")
    lines.append("")

    # vGPU instances
    if snapshot["vgpu_instances"]:
        lines.append(f"**Active vGPU Instances ({len(snapshot['vgpu_instances'])}):**")
        for inst in snapshot["vgpu_instances"]:
            lines.append(f"  - vGPU {inst['id'][:8]}... on GPU {inst['physical_gpu_id']}: "
                         f"VRAM={inst['vram_limit_mb']}MB, Compute={inst['compute_limit_pct']}%, "
                         f"Container={inst['container_id_short']}")
    else:
        lines.append("**No active vGPU instances.**")
    lines.append("")

    # Scheduler
    s = snapshot["scheduler"]
    lines.append(f"**Scheduler State:**")
    lines.append(f"  - Active Jobs: {s['active_jobs']}")
    lines.append(f"  - Pending Jobs: {s['pending_jobs']}")
    lines.append(f"  - Completed Jobs: {s['completed_jobs']}")
    lines.append(f"  - Total Processed: {s['total_jobs_processed']}")
    lines.append(f"  - Avg Wait Time: {s['avg_wait_time_s']}s")
    lines.append("")

    # Recent jobs
    if snapshot["recent_jobs"]:
        lines.append(f"**Recent Jobs ({len(snapshot['recent_jobs'])}):**")
        for job in snapshot["recent_jobs"]:
            dur = f", Duration={job['duration_s']}s" if job['duration_s'] else ""
            lines.append(f"  - [{job['status']}] {job['script']} on {job['vgpu_id'][:8]}... ({job['run_mode']}{dur})")
    lines.append("")

    return "\n".join(lines)
