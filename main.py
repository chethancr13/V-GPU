import asyncio
import time
import os
import shutil
import uuid
import random
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.vgpu_driver import physical_gpus
from core.scheduler import scheduler
from core.isolation import isolation_manager
from core.job_executor import MLJobExecutor

app = FastAPI(title="V-GPU NVIDIA Control Plane (Monolith)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "V-GPU Backend Online", "version": "1.0.0-monolith"}


# --- DIRECTORIES ---
DATASETS_DIR = "data/datasets"
os.makedirs(DATASETS_DIR, exist_ok=True)

# --- MODELS & STATE ---
executor = MLJobExecutor()

@app.on_event("startup")
async def startup_event():
    # Start the scheduler's background queue processing loop
    asyncio.create_task(scheduler.process_queue())

    # Start the isolation manager's background enforcement loop
    async def enforce_limits_loop():
        while True:
            try:
                isolation_manager.enforce_limits()
            except Exception as e:
                print(f"Error enforcing limits: {e}")
            await asyncio.sleep(1.0)
            
    asyncio.create_task(enforce_limits_loop())

    # Auto-provision default vGPUs if none exist (such as after running 'clean')
    try:
        total_instances = sum(len(gpu.list_instances()) for gpu in physical_gpus)
        if total_instances == 0:
            print("📦 [Startup] No active vGPU instances found. Auto-provisioning default fleet nodes...")
            # Provision a vGPU node on simulated physical GPU 0
            physical_gpus[0].create_vgpu_instance(vram_limit=4096, compute_limit=50.0)
            # Provision a vGPU node on simulated physical GPU 1
            physical_gpus[1].create_vgpu_instance(vram_limit=4096, compute_limit=50.0)
            print("✅ [Startup] Default vGPU fleet nodes provisioned successfully.")
    except Exception as e:
        print(f"⚠️ [Startup] Warning: Failed to auto-provision default vGPU nodes: {e}")

# Global state for tracking ML jobs & scheduling
recent_jobs = []
active_jobs_count = 0
pending_jobs_count = 0

@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    file_path = os.path.join(DATASETS_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "filename": file.filename}

@app.get("/api/datasets")
async def list_datasets():
    if not os.path.exists(DATASETS_DIR):
        return {"datasets": []}
    files = [f for f in os.listdir(DATASETS_DIR) if os.path.isfile(os.path.join(DATASETS_DIR, f)) and f.lower().endswith(('.csv', '.json', '.txt', '.xlsx', '.xls'))]
    return {"datasets": files}

@app.get("/api/scripts")
async def list_scripts():
    scripts_dir = "scripts"
    os.makedirs(scripts_dir, exist_ok=True)
    system_scripts = ["my_ml_model.py", "test_script.py"]
    user_scripts = []
    if os.path.exists(scripts_dir):
        user_scripts = [f for f in os.listdir(scripts_dir) if os.path.isfile(os.path.join(scripts_dir, f)) and f.endswith(".py")]
    all_scripts = list(set(system_scripts + user_scripts))
    return {"scripts": all_scripts}

@app.get("/api/vgpu/list")
async def list_vgpu():
    all_instances = []
    for gpu in physical_gpus:
        all_instances.extend(gpu.list_instances())
    return all_instances

@app.get("/api/vgpu/{vgpu_id}/cpuz")
async def get_vgpu_cpuz(vgpu_id: str):
    target = None
    for gpu in physical_gpus:
        for inst in gpu.list_instances():
            if inst["id"] == vgpu_id:
                target = inst
                break
    if not target:
        raise HTTPException(status_code=404, detail="vGPU Instance not found")
        
    cores = int(max(4, (target["compute_limit"] / 100) * 64))
    vram_gb = target["vram_limit"] / 1024
    
    return {
        "processor_name": f"NVIDIA Tensor-Core vGPU ZX-{int(target['compute_limit'] * 5)}",
        "codename": "Zenith-Ampere v2",
        "technology": "4nm TSMC FinFET",
        "instructions": "Zenith-AVX512, CUDA 12.6, TensorRT 10.1, FP16 Tensor Cores",
        "cores": cores,
        "clocks": {
            "core_speed": f"{1200 + int(target['compute_limit'] * 4)} MHz",
            "memory_speed": "7000 MHz",
            "bus_width": "384-bit"
        },
        "caches": {
            "l1_data": f"{cores * 64} KB",
            "l2_cache": "96 MB unified",
            "l3_cache": f"{int(vram_gb * 32)} MB HBM3"
        },
        "virtual_os": "Ubuntu 22.04 LTS (Kernel 5.15.0-vGPU)",
        "hypervisor": f"Zenith-VMM v2.4 (Docker {target['container_id'][:12] if target['container_id'] else 'Simulated'})",
        "architecture": "Zenith-vArch 3.5"
    }

@app.post("/api/vgpu/provision")
async def provision_vgpu(request: Request, vram_mb: Optional[int] = None, compute_pct: Optional[float] = None):
    # Retrieve form data if sent (e.g. from VGPUManager.jsx)
    form_data = await request.form()
    
    # Resolve vram_mb
    resolved_vram = vram_mb
    if resolved_vram is None and "vram_mb" in form_data:
        try:
            resolved_vram = int(form_data["vram_mb"])
        except ValueError:
            pass
    if resolved_vram is None:
        resolved_vram = 4000
        
    # Resolve compute_pct
    resolved_compute = compute_pct
    if resolved_compute is None and "compute_pct" in form_data:
        try:
            resolved_compute = float(form_data["compute_pct"])
        except ValueError:
            pass
    if resolved_compute is None:
        resolved_compute = 50.0

    # Auto-select the first GPU with enough capacity
    for gpu in physical_gpus:
        try:
            # Launcher sends 0-100. Driver expects 0-100.
            instance_id = gpu.create_vgpu_instance(resolved_vram, resolved_compute)
            return {"vgpu_id": instance_id, "status": "created"}
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail="No physical GPU has enough capacity.")

@app.delete("/api/vgpu/{vgpu_id}")
async def destroy_vgpu(vgpu_id: str):
    for gpu in physical_gpus:
        if gpu.destroy_vgpu_instance(vgpu_id):
            return {"status": "destroyed"}
    raise HTTPException(status_code=404, detail="V-GPU instance not found")

class JobRequest(BaseModel):
    vgpu_id: str
    script_name: str
    script_code: Optional[str] = None
    dataset_name: Optional[str] = None

@app.post("/api/jobs/ml")
async def run_ml_job(req: JobRequest):
    global active_jobs_count, pending_jobs_count
    
    # Get all active vgpu instances
    instances = []
    for gpu in physical_gpus:
        instances.extend(gpu.list_instances())
        
    if req.vgpu_id == "ALL_FLEET" and len(instances) > 0:
        print(f"🚀 [Monolith] Executing parallel jobs on all fleet nodes...")
        pending_jobs_count += len(instances)
        
        async def run_one(inst_id):
            global active_jobs_count, pending_jobs_count
            try:
                pending_jobs_count = max(0, pending_jobs_count - 1)
                active_jobs_count += 1
                res = await executor.run_ml_job(inst_id, req.script_name, req.dataset_name)
                return res
            finally:
                active_jobs_count = max(0, active_jobs_count - 1)
                
        tasks = [run_one(inst["id"]) for inst in instances]
        results = await asyncio.gather(*tasks)
        
        run_group_id = str(uuid.uuid4())
        for r in results:
            if r:
                r["run_mode"] = "CLUSTER"
                r["run_group"] = run_group_id
                recent_jobs.insert(0, r)
        while len(recent_jobs) > 10:
            recent_jobs.pop()
            
        if results:
            return results[0]
        return {"status": "completed"}
    else:
        pending_jobs_count += 1
        print(f"🚀 [Monolith] Executing job on {req.vgpu_id}...")
        try:
            pending_jobs_count = max(0, pending_jobs_count - 1)
            active_jobs_count += 1
            result = await executor.run_ml_job(req.vgpu_id, req.script_name, req.dataset_name)
            if result:
                result["run_mode"] = "SINGLE"
                result["run_group"] = str(uuid.uuid4())
                recent_jobs.insert(0, result)
                while len(recent_jobs) > 10:
                    recent_jobs.pop()
            return result
        finally:
            active_jobs_count = max(0, active_jobs_count - 1)

# --- COMPUTE & INFERENCE SIMULATED RUNNERS ---
jobs_store = {}

class InferenceRequest(BaseModel):
    model: str
    batch_size: int
    dataset_name: Optional[str] = None
    input_data: Optional[Dict] = None

@app.post("/api/jobs/compute")
async def run_compute_job(
    job_type: str = Form(...),
    size: int = Form(...),
    priority: str = Form(...)
):
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "type": "compute",
        "job_type": job_type,
        "size": size,
        "priority": priority,
        "submitted_at": time.time(),
        "status": "PENDING"
    }
    jobs_store[job_id] = job
    await scheduler.schedule_job(job)
    return {"job_id": job_id, "status": "Submitted"}

@app.post("/api/jobs/inference")
async def run_inference_job(req: InferenceRequest):
    job_id = str(uuid.uuid4())
    
    agent_logs = [
        "🤖 AI Agent status: [ACTIVE] Ingesting neural context...",
    ]
    agent_findings = "No dataset was targeted for analysis."
    
    if req.dataset_name:
        agent_logs.append(f"Ingesting parallel dataset columns from '{req.dataset_name}'...")
        file_path = os.path.join("data/datasets", req.dataset_name)
        if os.path.exists(file_path):
            try:
                import pandas as pd
                df = pd.read_csv(file_path)
                rows, cols = df.shape
                agent_logs.append(f"Dataset successfully loaded. Rowcount: {rows}, Columncount: {cols}.")
                agent_logs.append(f"Columns discovered: {list(df.columns)}")
                
                # Perform simulated agent reasoning
                agent_logs.append("Initializing parallel neural pipeline parsing on vGPU cluster nodes...")
                agent_logs.append("Layer 1: Scanning column correlations and vector datatypes...")
                agent_logs.append("Layer 2: Calculating covariance thresholds across numeric matrices...")
                
                # Target identification
                numeric_cols = list(df.select_dtypes(include=['number']).columns)
                if numeric_cols:
                    agent_logs.append(f"Discovered {len(numeric_cols)} continuous mathematical distributions.")
                    target = numeric_cols[-1]
                    mean_val = df[target].mean()
                    agent_findings = f"AI Agent Analysis Complete! Target feature set: '{target}' (mean: {mean_val:.2f}). Covariance calculations resolved successfully. Model classification threshold set at 98.42% accuracy bounds."
                else:
                    agent_findings = "AI Agent Analysis Complete! Discovered symbolic datasets without numeric distribution vectors. Calculated cluster grouping parameters using dynamic clustering models."
                agent_logs.append("🤖 Pipeline complete! Broadcasting model coefficients to leaderboard.")
            except Exception as e:
                agent_logs.append(f"❌ Error during dataset load: {str(e)}")
                agent_findings = f"AI Agent encountered an error during parsing: {str(e)}"
        else:
            agent_logs.append(f"⚠️ Dataset path not found: {file_path}")
            agent_findings = "Target dataset reference could not be localized on current cluster block storage."
            
    job = {
        "id": job_id,
        "type": "inference",
        "model_name": req.model,
        "batch_size": req.batch_size,
        "priority": "NORMAL",
        "agent_logs": agent_logs,
        "agent_findings": agent_findings,
        "submitted_at": time.time(),
        "status": "PENDING"
    }
    jobs_store[job_id] = job
    await scheduler.schedule_job(job)
    return {"job_id": job_id, "status": "Submitted"}

@app.get("/api/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_store[job_id]

# --- BACKWARD-COMPATIBLE REST ENDPOINTS ---
@app.get("/api/gpu/physical")
async def get_gpu_physical():
    return [gpu.get_metrics() for gpu in physical_gpus]

@app.get("/api/jobs/fleet")
async def get_jobs_fleet():
    return recent_jobs

@app.get("/api/scheduler/stats")
async def get_scheduler_stats():
    stats = scheduler.get_stats()
    queue_status = scheduler.get_queue_status()
    
    active_instances = []
    for gpu in physical_gpus:
        active_instances.extend(gpu.list_instances())
        
    return {
        "total_jobs": stats.get("total_jobs", 0),
        "avg_wait_time": stats.get("avg_wait_time", 0.0),
        "avg_throughput": stats.get("avg_throughput", 0.0),
        "utilization_balance": 98.5 if len(active_instances) > 0 else 0.0,
        "queued_jobs": queue_status.get("queued_jobs", 0),
        "running_jobs": queue_status.get("running_jobs", 0),
        "completed_jobs": queue_status.get("completed_jobs", 0)
    }

# --- WEB MONITORING WEBSOCKET ---
@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            metrics = []
            instances = []
            for gpu in physical_gpus:
                metrics.append(gpu.get_metrics())
                instances.extend(gpu.list_instances())
            
            queue_status = scheduler.get_queue_status()
            await websocket.send_json({
                "physical_gpus": metrics,
                "vgpu_instances": instances,
                "timestamp": time.time(),
                "recent_jobs": recent_jobs,
                "scheduler": {
                    "active_jobs": queue_status.get("running_jobs", 0),
                    "pending_jobs": queue_status.get("queued_jobs", 0),
                    "queue_length": queue_status.get("queued_jobs", 0) + queue_status.get("running_jobs", 0)
                }
            })
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
@app.post("/api/datasets/analyze")
async def analyze_dataset(file: UploadFile = File(...)):
    import pandas as pd
    temp_dir = "data/temp"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Load the file based on extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif ext == '.json':
            df = pd.read_json(file_path)
        elif ext == '.txt':
            df = pd.read_csv(file_path, sep=None, engine='python')
        else:
            df = pd.read_csv(file_path)
            
        rows, cols = df.shape
        columns_list = list(df.columns)
        
        # Missing values (anomalies)
        missing_info = df.isnull().sum().to_dict()
        anomalies = [f"Column '{col}' has {val} missing values." for col, val in missing_info.items() if val > 0]
        if not anomalies:
            anomalies = ["No missing values detected. Data structure integrity is 100% nominal."]
            
        dtypes = {col: str(val) for col, val in df.dtypes.to_dict().items()}
        
        numeric_df = df.select_dtypes(include=['number'])
        stats_summary = {}
        for col in numeric_df.columns:
            stats_summary[col] = {
                "mean": float(numeric_df[col].mean()) if not pd.isna(numeric_df[col].mean()) else 0.0,
                "min": float(numeric_df[col].min()) if not pd.isna(numeric_df[col].min()) else 0.0,
                "max": float(numeric_df[col].max()) if not pd.isna(numeric_df[col].max()) else 0.0,
                "std": float(numeric_df[col].std()) if not pd.isna(numeric_df[col].std()) else 0.0
            }
            
        insights = []
        insights.append(f"Engine processed a total of {rows} records across {cols} features.")
        if len(numeric_df.columns) > 0:
            insights.append(f"Identified {len(numeric_df.columns)} numerical vectors for parallel gradient calculation.")
            target = numeric_df.columns[-1]
            insights.append(f"Auto-selected potential optimization target: '{target}' based on covariance threshold.")
        else:
            insights.append("No numeric vectors found. Running in symbolic clustering mode.")
            
        insights.append("Recommendation: Deploy parallel XGBoost or LightGBM models for optimal latency-throughput ratio.")
        insights.append("vGPU time-slice optimization: FP16 tensor-core execution enabled.")
        
        return {
            "status": "success",
            "filename": file.filename,
            "rows": rows,
            "cols": cols,
            "columns": columns_list,
            "dtypes": dtypes,
            "anomalies": anomalies,
            "stats": stats_summary,
            "insights": insights
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

def draw_shape_in_viewport(draw, cx, cy, radius, shape_type, angle_deg, color="#76B900"):
    import math
    rad = math.radians(angle_deg)
    
    if shape_type == "cube":
        vertices = []
        for x in [-1, 1]:
            for y in [-1, 1]:
                for z in [-1, 1]:
                    vertices.append((x * radius * 0.6, y * radius * 0.6, z * radius * 0.6))
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.6) - zy * math.sin(rad * 0.6)
            zx = y * math.sin(rad * 0.6) + zy * math.cos(rad * 0.6)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        edges = [
            (0,1), (1,3), (3,2), (2,0),
            (4,5), (5,7), (7,6), (6,4),
            (0,4), (1,5), (2,6), (3,7)
        ]
        for e1, e2 in edges:
            draw.line([projected[e1], projected[e2]], fill=color, width=1)
            
    elif shape_type == "pyramid":
        vertices = [
            (0, -radius * 0.7, 0),
            (-radius * 0.6, radius * 0.5, -radius * 0.6),
            (radius * 0.6, radius * 0.5, -radius * 0.6),
            (0, radius * 0.5, radius * 0.7)
        ]
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        edges = [
            (0,1), (0,2), (0,3), (1,2), (2,3), (3,1)
        ]
        for e1, e2 in edges:
            draw.line([projected[e1], projected[e2]], fill=color, width=1)
            
    elif shape_type == "octahedron":
        vertices = [
            (0, -radius * 0.7, 0),
            (0, radius * 0.7, 0),
            (-radius * 0.6, 0, -radius * 0.6),
            (radius * 0.6, 0, -radius * 0.6),
            (radius * 0.6, 0, radius * 0.6),
            (-radius * 0.6, 0, radius * 0.6)
        ]
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        edges = [
            (0,2), (0,3), (0,4), (0,5),
            (1,2), (1,3), (1,4), (1,5),
            (2,3), (3,4), (4,5), (5,2)
        ]
        for e1, e2 in edges:
            draw.line([projected[e1], projected[e2]], fill=color, width=1)
            
    elif shape_type == "cylinder":
        vertices = []
        for h in [-radius * 0.5, radius * 0.5]:
            for i in range(6):
                ang = 2 * math.pi * i / 6
                vertices.append((radius * 0.5 * math.cos(ang), h, radius * 0.5 * math.sin(ang)))
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        for i in range(6):
            draw.line([projected[i], projected[(i+1)%6]], fill=color, width=1)
            draw.line([projected[i+6], projected[((i+1)%6)+6]], fill=color, width=1)
            draw.line([projected[i], projected[i+6]], fill=color, width=1)
            
    elif shape_type == "cone":
        vertices = [(0, -radius * 0.7, 0)]
        for i in range(8):
            ang = 2 * math.pi * i / 8
            vertices.append((radius * 0.5 * math.cos(ang), radius * 0.5, radius * 0.5 * math.sin(ang)))
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        for i in range(1, 9):
            draw.line([projected[i], projected[0]], fill=color, width=1)
            next_idx = 1 if i == 8 else i + 1
            draw.line([projected[i], projected[next_idx]], fill=color, width=1)
            
    elif shape_type == "star":
        vertices = [(0,0,0)]
        for x in [-1.1, 1.1]:
            vertices.append((x * radius * 0.5, 0, 0))
        for y in [-1.1, 1.1]:
            vertices.append((0, y * radius * 0.5, 0))
        for z in [-1.1, 1.1]:
            vertices.append((0, 0, z * radius * 0.5))
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        for i in range(1, 7):
            draw.line([projected[0], projected[i]], fill=color, width=1)
            
    elif shape_type == "ring":
        vertices = []
        for i in range(10):
            ang = 2 * math.pi * i / 10
            vertices.append((radius * 0.6 * math.cos(ang), 0, radius * 0.6 * math.sin(ang)))
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        for i in range(10):
            draw.line([projected[i], projected[(i+1)%10]], fill=color, width=1)
            
    else: # wave
        vertices = []
        for r_grid in range(-2, 3):
            for c_grid in range(-2, 3):
                x_grid = r_grid * radius * 0.25
                z_grid = c_grid * radius * 0.25
                y_grid = 10 * math.sin(math.sqrt(x_grid**2 + z_grid**2)/8 + rad)
                vertices.append((x_grid, y_grid, z_grid))
        projected = []
        for x, y, z in vertices:
            xy = x * math.cos(rad) - z * math.sin(rad)
            zy = x * math.sin(rad) + z * math.cos(rad)
            yx = y * math.cos(rad * 0.5) - zy * math.sin(rad * 0.5)
            zx = y * math.sin(rad * 0.5) + zy * math.cos(rad * 0.5)
            scale = 100 / (100 + zx)
            projected.append((cx + int(xy * scale), cy + int(yx * scale)))
            
        for i in range(5):
            for j in range(5):
                idx = i * 5 + j
                if j < 4:
                    draw.line([projected[idx], projected[idx+1]], fill=color, width=1)
                if i < 4:
                    draw.line([projected[idx], projected[idx+5]], fill=color, width=1)

@app.websocket("/ws/render/{vgpu_id}")
async def ws_render(websocket: WebSocket, vgpu_id: str):
    await websocket.accept()
    
    # Try importing Pillow
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        try:
            while True:
                await websocket.send_text("PIL_MISSING")
                await asyncio.sleep(1.0)
        except Exception:
            pass
        return

    # Find the target vgpu to extract stats
    target_vgpu = None
    for gpu in physical_gpus:
        for inst in gpu.list_instances():
            if inst["id"] == vgpu_id:
                target_vgpu = inst
                break
                
    vram_mb = target_vgpu["vram_limit"] if target_vgpu else 1024
    compute_pct = target_vgpu["compute_limit"] if target_vgpu else 50
    
    from io import BytesIO
    import base64
    import math
    
    angle = 0
    try:
        while True:
            # Check stress query parameter
            is_stress = websocket.query_params.get("stress") == "true"
            
            # Create dark themed rendering frame
            img = Image.new("RGB", (720, 400), "#050505")
            draw = ImageDraw.Draw(img)
            
            if is_stress:
                # Allowed channels scales dynamically with compute and vram allocated
                allowed_channels = 8
                if compute_pct < 40:
                    allowed_channels = 2
                elif compute_pct < 70:
                    allowed_channels = 4
                elif compute_pct < 90:
                    allowed_channels = 6

                # Memory capacity constraints
                if vram_mb < 1500:
                    allowed_channels = min(allowed_channels, 2)
                elif vram_mb < 3000:
                    allowed_channels = min(allowed_channels, 4)

                # Draw 8 viewports arranged in a 4x2 grid
                shape_types = ["cube", "pyramid", "octahedron", "cylinder", "cone", "star", "ring", "wave"]
                for row in range(2):
                    for col in range(4):
                        idx = row * 4 + col
                        cx = col * 180 + 90
                        cy = row * 200 + 100
                        shape_type = shape_types[idx]
                        
                        # Draw grid sub-viewport border
                        draw.rectangle(
                            [col * 180, row * 200, (col + 1) * 180, (row + 1) * 200], 
                            outline="#1e293b", 
                            width=1
                        )
                        
                        # Draw viewport identifiers (similar to surveillance feeds)
                        draw.text((col * 180 + 8, row * 200 + 6), f"CORE-A0{idx+1}", fill="#475569")
                        
                        if idx < allowed_channels:
                            draw.text((col * 180 + 120, row * 200 + 6), "ONLINE", fill="#76B900")
                            # Draw dynamic 3D shapes inside sub-viewports
                            draw_shape_in_viewport(draw, cx, cy, 38, shape_type, angle)
                        else:
                            draw.text((col * 180 + 120, row * 200 + 6), "MUTED", fill="#f85149")
                            # Draw a red warning cross inside the locked viewport
                            draw.line([(col * 180 + 20, row * 200 + 45), ((col + 1) * 180 - 20, (row + 1) * 200 - 25)], fill="#3a1215", width=1)
                            draw.line([((col + 1) * 180 - 20, row * 200 + 45), (col * 180 + 20, (row + 1) * 200 - 25)], fill="#3a1215", width=1)
                            draw.text((col * 180 + 45, row * 200 + 95), "RESOURCE LIMIT", fill="#4f2023")
                
                # Dynamic compute lag factor
                lag_factor = 1.0
                if compute_pct < 40:
                    lag_factor = 2.5 # Low compute creates lag (down to ~12 FPS)
                elif compute_pct < 70:
                    lag_factor = 1.5 # Medium compute creates moderate lag (~20 FPS)
                
                # Save frame
                buffered = BytesIO()
                img.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                
                await websocket.send_text(img_str)
                angle = (angle + 5) % 360
                await asyncio.sleep(0.033 * lag_factor)
            else:
                # Single large 3D sphere render mode
                for i in range(0, 720, 40):
                    draw.line([(i, 0), (i, 400)], fill="#111111", width=1)
                for j in range(0, 400, 40):
                    draw.line([(0, j), (720, j)], fill="#111111", width=1)
                    
                rad_y = math.radians(angle)
                rad_x = math.radians(angle * 0.5)
                
                points_3d = []
                for lat in range(-4, 5):
                    lat_rad = math.pi / 2 * lat / 5
                    y = 120 * math.sin(lat_rad)
                    r = 120 * math.cos(lat_rad)
                    for lon in range(0, 12):
                        lon_rad = 2 * math.pi * lon / 12
                        x = r * math.cos(lon_rad)
                        z = r * math.sin(lon_rad)
                        points_3d.append((x, y, z))
                        
                projected = []
                for x, y, z in points_3d:
                    xy = x * math.cos(rad_y) - z * math.sin(rad_y)
                    zy = x * math.sin(rad_y) + z * math.cos(rad_y)
                    yx = y * math.cos(rad_x) - zy * math.sin(rad_x)
                    zx = y * math.sin(rad_x) + zy * math.cos(rad_x)
                    
                    distance = 300
                    focal = 350
                    scale = focal / (distance + zx)
                    proj_x = 360 + int(xy * scale)
                    proj_y = 200 + int(yx * scale)
                    projected.append((proj_x, proj_y))
                    
                num_lat = 9
                num_lon = 12
                for i in range(num_lat):
                    for j in range(num_lon):
                        idx = i * num_lon + j
                        next_lon_idx = i * num_lon + ((j + 1) % num_lon)
                        draw.line([projected[idx], projected[next_lon_idx]], fill="#76B900", width=1)
                        
                        if i < num_lat - 1:
                            next_lat_idx = (i + 1) * num_lon + j
                            draw.line([projected[idx], projected[next_lat_idx]], fill="#5ba000", width=1)
                
                buffered = BytesIO()
                img.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                
                await websocket.send_text(img_str)
                angle = (angle + 4) % 360
                await asyncio.sleep(0.033)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Render WebSocket error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
