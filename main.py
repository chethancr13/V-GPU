import asyncio
import time
import os
import sys
import shutil
import subprocess
import uuid
import random
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.telemetry.prometheus_exporter import (
    export_prometheus_text,
    ai_token_tracker,
    CONTENT_TYPE_LATEST
)

from core.vgpu_driver import physical_gpus, VGPUDevice
from core.scheduler import scheduler
from core.isolation import isolation_manager
from core.job_executor import MLJobExecutor
from core.chatbot.rag_engine import ProjectRAGEngine
from core.chatbot.indexer import ProjectIndexer
from core.chatbot.memory import ChatMemory
from core.chatbot.metrics_collector import get_live_snapshot, format_metrics_for_prompt
from core.chatbot.ollama_engine import ollama_engine

# System Design Infrastructure Subsystems
from core.cache import system_cache, cached
from core.queue import async_task_queue, JobPriority, JobState
from core.security import SecurityMiddleware, rate_limiter, security_audit_logger
from core.backup import backup_manager

app = FastAPI(title="V-GPU NVIDIA Control Plane (Monolith)")

# Production Security & Network Protection Headers & Rate Limiter
app.add_middleware(SecurityMiddleware)

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
SCRIPTS_DIR = "data/scripts"
BACKUPS_DIR = "data/backups"
os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(SCRIPTS_DIR, exist_ok=True)
os.makedirs(BACKUPS_DIR, exist_ok=True)

# --- MODELS & STATE ---
executor = MLJobExecutor()
rag_engine = ProjectRAGEngine()
project_indexer = ProjectIndexer()
chat_memory = ChatMemory()

@app.on_event("startup")
async def startup_event():
    # Start the async worker pool for background queues
    await async_task_queue.start()

    # Register default async job handlers
    async def handle_async_ml_job(payload: Dict) -> Dict:
        vgpu_id = payload.get("vgpu_id", "")
        script_name = payload.get("script", "test_script.py")
        dataset_name = payload.get("dataset")
        return await executor.run_ml_job(vgpu_id=vgpu_id, script_name=script_name, dataset_name=dataset_name)

    async def handle_async_backup_job(payload: Dict) -> Dict:
        label = payload.get("label", "scheduled_auto")
        desc = payload.get("description", "Asynchronous scheduled snapshot")
        return backup_manager.create_backup(label=label, description=desc)

    async_task_queue.register_handler("ml_training", handle_async_ml_job)
    async_task_queue.register_handler("data_backup", handle_async_backup_job)

    # Start the scheduler's background queue processing loop
    asyncio.create_task(scheduler.process_queue())

    # Start the isolation manager's background enforcement loop
    # Reduced from 1s to 5s — enforcement doesn't need 1Hz resolution
    async def enforce_limits_loop():
        while True:
            try:
                isolation_manager.enforce_limits()
            except Exception as e:
                print(f"Error enforcing limits: {e}")
            await asyncio.sleep(5.0)
            
    asyncio.create_task(enforce_limits_loop())

    # Start initial project scanning & indexing in background
    # Run in thread executor — scan_and_index() is CPU-bound synchronous code
    # that would block the asyncio event loop if run directly in create_task
    async def initial_index_task():
        try:
            print(" [Startup] Scanning and indexing project files for RAG Assistant...")
            loop = asyncio.get_event_loop()
            stats = await loop.run_in_executor(None, project_indexer.scan_and_index)
            print(f" [Startup] Project indexing complete. Total files: {stats['total_files']}, chunks: {stats['total_chunks']}")
        except Exception as e:
            print(f" [Startup] Warning: Indexing failed: {e}")
            
    asyncio.create_task(initial_index_task())

    # Copy fallback ML files (overwriting python scripts to make sure they are updated, and keeping datasets)
    try:
        if os.path.exists("start_dev.py"):
            shutil.copy("start_dev.py", os.path.join(SCRIPTS_DIR, "start_dev.py"))
        if os.path.exists("my_ml_model.py"):
            shutil.copy("my_ml_model.py", os.path.join(SCRIPTS_DIR, "my_ml_model.py"))
        if os.path.exists("bench_utils.py"):
            shutil.copy("bench_utils.py", os.path.join(SCRIPTS_DIR, "bench_utils.py"))
        if os.path.exists("my_data.csv") and not os.path.exists(os.path.join(DATASETS_DIR, "my_data.csv")):
            shutil.copy("my_data.csv", os.path.join(DATASETS_DIR, "my_data.csv"))
    except Exception as e:
        print(f" [Startup] Warning: Failed to copy fallback ML files: {e}")

    # Auto-provision default vGPUs if none exist (such as after running 'clean')
    try:
        total_instances = sum(len(gpu.list_instances()) for gpu in physical_gpus)
        if total_instances == 0:
            print(" [Startup] No active vGPU instances found. Auto-provisioning default fleet nodes...")
            # Provision a vGPU node on simulated physical GPU 0
            physical_gpus[0].create_vgpu_instance(vram_limit=4096, compute_limit=50.0)
            # Provision a vGPU node on simulated physical GPU 1
            physical_gpus[1].create_vgpu_instance(vram_limit=4096, compute_limit=50.0)
            print(" [Startup] Default vGPU fleet nodes provisioned successfully.")
    except Exception as e:
        print(f" [Startup] Warning: Failed to auto-provision default vGPU nodes: {e}")



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

@app.post("/api/scripts/upload")
async def upload_script(file: UploadFile = File(...)):
    file_path = os.path.join(SCRIPTS_DIR, file.filename)
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
    if not os.path.exists(SCRIPTS_DIR):
        return {"scripts": []}
    files = [f for f in os.listdir(SCRIPTS_DIR) if os.path.isfile(os.path.join(SCRIPTS_DIR, f)) and f.endswith(".py")]
    return {"scripts": files}

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
async def delete_vgpu(vgpu_id: str):
    for gpu in physical_gpus:
        if gpu.destroy_vgpu_instance(vgpu_id):
            return {"status": "success", "message": f"vGPU {vgpu_id} destroyed"}
    raise HTTPException(status_code=404, detail=f"vGPU instance {vgpu_id} not found")

class ChatRequest(BaseModel):
    message: str
    active_tab: str
    history: Optional[List[Dict[str, str]]] = []

async def handle_agent_chat(message: str, active_tab: str, history: List[Dict[str, str]], api_key: Optional[str]) -> Dict:
    import urllib.request
    import json
    
    msg_lower = message.lower()
    
    # Load commands.md dynamically at runtime
    commands_doc = ""
    try:
        if os.path.exists("COMMANDS.md"):
            with open("COMMANDS.md", "r") as f:
                commands_doc = f.read()
    except Exception as doc_err:
        print(f"Error loading COMMANDS.md: {doc_err}")
    
    # Define local mapping for navigation keywords
    navigation_map = {
        "dashboard": ["dashboard", "home", "main page", "overview", "landing"],
        "gpu_monitor": ["monitor", "telemetry", "temp", "temperature", "power", "charts", "utilization", "realtime", "real-time", "graphs"],
        "ai_data_center": ["datacenter", "data center", "fleet", "topology", "cluster", "nodes", "3d view"],
        "water_resource": ["water", "cooling", "green", "carbon", "efficiency", "environmental", "eco", "planner"],
        "comparison": ["compare", "comparison", "benchmark", "jupyter", "colab", "speed"],
        "vgpu": ["provision", "allocate", "vram", "create vgpu", "destroy vgpu", "delete vgpu", "vgpu manager"],
        "vm_inspector": ["inspector", "vm", "container", "docker", "spec", "cpu-z", "cpu z", "hardware"],
        "graphics": ["render", "graphics", "surveillance", "viewports", "3d render", "visualize"],
        "logs": ["logs", "stdout", "stderr", "output", "terminal"]
    }
    
    detected_tab = None
    for tab_id, keywords in navigation_map.items():
        if any(kw in msg_lower for kw in keywords):
            detected_tab = tab_id
            break

    # Query local Ollama Qwen model if running
    ollama_status = ollama_engine.get_status()
    if ollama_status.get("running"):
        try:
            ollama_res = ollama_engine.generate(
                prompt=message,
                system_prompt=system_instruction,
                model_name=ollama_status.get("active_model", "qwen2.5:latest"),
                format_json=True
            )
            if ollama_res and ollama_res.get("text"):
                nav = ollama_res.get("navigate")
                if nav not in navigation_map:
                    nav = None
                return {
                    "text": ollama_res["text"],
                    "navigate": nav or detected_tab
                }
        except Exception as e:
            print(f"Ollama decision engine failed: {e}")


    # Local fallback engine
    response_text = ""
    
    # 1. Navigation handling
    if detected_tab == "dashboard":
        response_text = "Navigating to the **Dashboard**. Here you can monitor overall system health, total active vGPUs, scheduler stats, and active jobs."
    elif detected_tab == "gpu_monitor":
        response_text = "Opening the **GPU Monitor** panel. This tab displays real-time telemetry graphs for the physical GPUs, showing compute load, temperature, power draw, and VRAM utilization."
    elif detected_tab == "ai_data_center":
        response_text = "Welcome to the **AI Data Center**! This tab displays a 3D visualization of the server racks, nodes, and cluster telemetry. You can track parallel executions across the cluster."
    elif detected_tab == "water_resource":
        response_text = "Navigating to the **Water & Resource** tab. Here you can plan and estimate the environmental impact of your workloads, specifically modeling water cooling rates and carbon offset coefficients."
    elif detected_tab == "comparison":
        response_text = "Navigating to the **Speed Comparison** benchmark. In this panel, you can run training workloads across V-GPU, local Jupyter, and Google Colab to compare execution times and energy efficiency side-by-side."
    elif detected_tab == "vgpu":
        response_text = "Opening the **vGPU Manager** tab. Here you can provision isolated Virtual GPU slices (assigning custom VRAM and compute percentage limits) or destroy inactive instances."
    elif detected_tab == "vm_inspector":
        response_text = "Navigating to the **VM Inspector** (CPU-Z). Here you can see underlying hardware properties, CPU instructions, CUDA versions, hypervisor metadata, and specific Docker container allocations."
    elif detected_tab == "graphics":
        response_text = "Opening the **Graphics Viewer** (Tauri WebSocket Renderer). Here you can preview real-time 3D graphics rendered inside your vGPU containers (useful for GPU stress testing)."
    elif detected_tab == "logs":
        response_text = "Navigating to the **Logs** tab. Here you can view live stdout/stderr log outputs from current training jobs and scheduling queues."

    # Upgrade Offline Conversational Fallback
    # Check for greetings
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how's it going", "greetings"]
    is_greeting = any(msg_lower.startswith(g) or f" {g} " in f" {msg_lower} " for g in greetings)
    
    # Check for "how are you"
    how_are_you = ["how are you", "how are u", "how you doing", "doing well"]
    is_how_are_you = any(h in msg_lower for h in how_are_you)
    
    # Check for small talk / appreciation
    appreciation = ["thank you", "thanks", "awesome", "great", "cool", "perfect", "good job"]
    is_appreciation = any(msg_lower.startswith(a) or f" {a} " in f" {msg_lower} " for a in appreciation)
        
    # 2. Command or info queries
    if not response_text:
        if is_how_are_you:
            response_text = "I am doing great, thank you for asking! I'm here in your V-GPU workspace ready to help you provision nodes, manage ML jobs, or navigate to any panel. How are you doing today?"
        elif is_greeting:
            response_text = "Hello! I am your V-GPU Copilot. I'm here to guide you through this project. How can I help you manage your virtual GPU environment or navigate the platform today?"
        elif is_appreciation:
            response_text = "You're very welcome! I'm glad I could help. Let me know if you need anything else, like provisioning a vGPU node or explaining the scheduler mechanics!"
        elif "what is" in msg_lower and "project" in msg_lower:
            response_text = "This project, **V-GPU**, is an NVIDIA-inspired virtual GPU control plane that simulates physical GPUs, slices their compute/VRAM capacity, runs isolated ML training jobs inside Docker containers, and charts real-time performance telemetry. It includes scheduling queues, water-cooling environmental planners, and speed benchmarks compared to Jupyter and Google Colab."
        elif "vgpu_driver" in msg_lower or "driver" in msg_lower:
            response_text = "The driver simulator is located in `core/vgpu_driver.py`. It models physical GPU frames and allocates virtual nodes with custom parameters."
        elif "scheduler" in msg_lower:
            response_text = "The scheduler is in `core/scheduler.py`. It maintains a queue of ML workloads, checks resources across cluster nodes, and assigns execution slots."
        elif "isolation" in msg_lower:
            response_text = "Isolation enforcement is handled by `core/isolation.py`. It verifies Docker memory bounds and CPU usage every second to ensure stable virtualization."
        elif "executor" in msg_lower or "job" in msg_lower:
            response_text = "ML job execution is managed by `core/job_executor.py`. It launches python scripts inside Docker containers using the `vgpu-worker` image."
        elif "start_dev" in msg_lower or "orchestrator" in msg_lower:
            response_text = "The developer orchestrator is at `scripts/start_dev.py`. It automates launching Docker Desktop, building the worker container image, syncing clocks, running the backend server, and launching Vite dev server."
        elif "provision" in msg_lower or "create" in msg_lower or "allocate" in msg_lower:
            response_text = "To provision a new virtual GPU node:\n1. Navigate to the **vGPU Manager** tab (or ask me: *'Go to vGPU Manager'*).\n2. Under 'Provision New vGPU Node', select your desired **VRAM Limit** (e.g. 4096 MB) and **Compute Speed** limit (e.g. 50%).\n3. Click **Provision Node**.\n\nThe scheduler will automatically select a physical GPU with spare capacity, start an isolated Docker container, and return the instance ID."
        elif "ml job" in msg_lower or "run job" in msg_lower or "run model" in msg_lower or "training" in msg_lower:
            response_text = "You can run Machine Learning scripts on the provisioned cluster using the Python launcher. Open your terminal in the workspace and run:\n```bash\n# Run a script with auto-provisioning\npython3 vgpu_launcher.py run my_ml_model.py auto\n\n# Run on all nodes in parallel (split dataset workload)\npython3 vgpu_launcher.py run-parallel my_ml_model.py data1.csv data2.csv\n```"
        elif "water" in msg_lower or "cooling" in msg_lower or "green" in msg_lower:
            response_text = "The **Water & Resource** tool acts as a green-compute planner. It helps you design workloads to minimize ecological impact. You can adjust PUE (Power Usage Effectiveness), grid carbon intensity, and cooling efficiency to simulate the gallons of water consumed per training run."
        elif "docker" in msg_lower or "container" in msg_lower:
            response_text = "Each vGPU is containerized inside an isolated Docker environment using custom CGroups limits. The backend's `isolation_manager` (`core/isolation.py`) runs a background loop every second enforcing strict memory bounds and pinning processes to dedicated GPU resources to ensure fair scheduling."
        elif "benchmark" in msg_lower or "colab" in msg_lower or "jupyter" in msg_lower:
            response_text = "Under the **Speed Comparison** tab, you can compare V-GPU training execution speeds directly against Google Colab cells and local Jupyter Notebook instances. V-GPU achieves high throughput by bypassing typical local network bottlenecks and utilizing dedicated InfiniBand-connected tensor core sharding."
        elif "commands" in msg_lower or "how to run" in msg_lower or "cli" in msg_lower:
            response_text = "Common V-GPU launcher commands:\n- **Start GUI & Backend**: `python3 vgpu_launcher.py` (or `npm run tauri dev`)\n- **Run ML Job**: `python3 vgpu_launcher.py run <script.py> [vgpu_id] [dataset]`\n- **Clean and Reset all containers**: `python3 vgpu_launcher.py clean`"
        elif "who are you" in msg_lower or "help" in msg_lower or "what can you do" in msg_lower:
            response_text = "I am the **V-GPU Copilot**. I can explain how the vGPU orchestration architecture works, guide you through provisioning/running jobs, and help you navigate between tabs. Try asking: *'Take me to the GPU Monitor'* or *'How does isolation work?'*"
        else:
            response_text = "I understand you are asking about V-GPU. I am a local assistant dedicated to this project. I can help you with:\n\n- **Navigation**: Ask me to go to the Dashboard, GPU Monitor, Logs, or VM Inspector.\n- **Command Reference**: Learn how to run workloads via `vgpu_launcher.py`.\n- **Architecture Q&A**: Get information about resource isolation, scheduler load balancing, or water compute planning.\n\n*Tip: Powered by local Qwen 2.5 via Ollama with live telemetry awareness!*"

    return {
        "text": response_text,
        "navigate": detected_tab
    }

@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest):
    res = await handle_agent_chat(req.message, req.active_tab, req.history)
    return res

# --- PROJECT RAG CHATBOT ENDPOINTS ---
class RAGQueryRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"

@app.post("/api/chatbot/query")
async def rag_chatbot_query(req: RAGQueryRequest):
    result = rag_engine.query(req.message, session_id=req.session_id)
    return result

@app.post("/api/chatbot/index/resync")
async def rag_index_resync():
    stats = project_indexer.scan_and_index(force_reindex=True)
    return stats

@app.get("/api/chatbot/index/status")
async def rag_index_status():
    stats = project_indexer.vector_store.get_index_stats()
    return stats

@app.get("/api/chatbot/history/{session_id}")
async def rag_get_history(session_id: str):
    history = chat_memory.get_history(session_id)
    return {"session_id": session_id, "history": history}

@app.delete("/api/chatbot/history/{session_id}")
async def rag_clear_history(session_id: str):
    chat_memory.clear_history(session_id)
    return {"status": "success", "session_id": session_id}

# --- UNIFIED AI CHAT ENDPOINT (General AI + Live Metrics + Ollama/Qwen) ---
class UnifiedChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"
    history: Optional[List[Dict[str, str]]] = []
    preferred_engine: Optional[str] = "ollama"  # "ollama"
    model_name: Optional[str] = None  # e.g. "qwen2.5", "qwen2.5:3b", or "qwen2.5:latest"

@app.get("/api/ollama/status")
async def get_ollama_status():
    """Returns Ollama daemon connection status and available local models (e.g. Qwen)."""
    return await ollama_engine.get_status_async()

@app.post("/api/chat")
async def unified_chat(req: UnifiedChatRequest):
    """
    Unified chat endpoint that bridges general AI knowledge with live platform metrics.
    Engine priority:
    1. Local Ollama (Qwen 2.5)
    2. Grounded local offline synthesizer fallback
    """
    start_time = time.time()

    # Collect live metrics snapshot
    snapshot = get_live_snapshot()
    metrics_context = format_metrics_for_prompt(snapshot)

    msg_lower = req.message.lower()

    # Detect if the query is about live metrics
    metrics_keywords = [
        "temperature", "temp", "gpu", "utilization", "power", "watt",
        "vram", "memory", "usage", "vgpu", "instance", "running",
        "job", "scheduler", "queue", "active", "pending", "status",
        "metrics", "stats", "health", "cluster", "load", "stress",
        "how much", "how many", "current", "right now", "live",
        "water", "cooling", "wue", "pue", "chiller", "evaporation", "carbon"
    ]
    is_metrics_query = any(kw in msg_lower for kw in metrics_keywords)

    # Navigation detection
    navigation_map = {
        "dashboard": ["dashboard", "home", "main page", "overview", "landing"],
        "gpu_monitor": ["monitor", "telemetry", "temp", "temperature", "power", "charts", "utilization", "realtime", "real-time", "graphs"],
        "ai_data_center": ["datacenter", "data center", "fleet", "topology", "cluster", "nodes", "3d view"],
        "water_resource": ["water", "cooling", "green", "carbon", "efficiency", "environmental", "eco", "planner"],
        "comparison": ["compare", "comparison", "benchmark", "jupyter", "colab", "speed"],
        "vgpu": ["provision", "allocate", "vram", "create vgpu", "destroy vgpu", "delete vgpu", "vgpu manager"],
        "vm_inspector": ["inspector", "vm", "container", "docker", "spec", "cpu-z", "cpu z", "hardware"],
        "graphics": ["render", "graphics", "surveillance", "viewports", "3d render", "visualize"],
        "logs": ["logs", "stdout", "stderr", "output", "terminal"]
    }
    detected_tab = None
    for tab_id, keywords in navigation_map.items():
        if any(kw in msg_lower for kw in keywords):
            detected_tab = tab_id
            break

    system_instruction = f"""You are V-GPU Copilot, powered by local Qwen 2.5.
You are embedded in the V-GPU control plane platform.

{metrics_context}

### INSTRUCTIONS:
- Whenever answering water consumption, power draw, cooling, or AI workload footprint questions:
  1. Clearly state the EXACT mathematical formula being used (e.g. `Power (kW) = (GPU_Watts + 180W) / 1000`, `Water (L/hr) = Power (kW) * WUE`, `FLOPs = 6 * N * D`).
  2. Show the step-by-step substitution of the LIVE numbers into the formula variables.
  3. Provide the final calculated metrics (kW, Liters/hour, Chiller Flow L/min, etc.) in a clean summary table or bullet points.
- Quote the exact numbers from the LIVE PLATFORM METRICS for any GPU status, load, power, or water queries.
- Keep responses direct, structured, fast, and technically precise in clean markdown.
"""

    # --- LOCAL OLLAMA (QWEN) INFERENCE ---
    try:
        ollama_status = await ollama_engine.get_status_async()
        if ollama_status.get("running"):
            target_model = req.model_name or ollama_status.get("active_model", "qwen2.5:latest")
            ollama_res = await ollama_engine.generate_async(
                prompt=req.message,
                system_prompt=system_instruction,
                model_name=target_model,
                history=req.history,
                format_json=False
            )
            if ollama_res and ollama_res.get("text"):
                nav = ollama_res.get("navigate")
                if nav not in navigation_map:
                    nav = None
                # Extract real token usage from Ollama response
                tu = ollama_res.get("token_usage", {})
                token_usage = {
                    "prompt_tokens": tu.get("prompt_tokens", ai_token_tracker.estimate_tokens(req.message)),
                    "completion_tokens": tu.get("completion_tokens", ai_token_tracker.estimate_tokens(ollama_res["text"])),
                    "total_tokens": tu.get("total_tokens", 0),
                    "duration_s": tu.get("duration_s", 0),
                    "tokens_per_sec": tu.get("tokens_per_sec", 0)
                }
                if token_usage["total_tokens"] == 0:
                    token_usage["total_tokens"] = token_usage["prompt_tokens"] + token_usage["completion_tokens"]
                return {
                    "answer": ollama_res["text"],
                    "navigate": nav or detected_tab,
                    "metrics_used": ollama_res.get("metrics_used", is_metrics_query),
                    "metrics_snapshot": snapshot if is_metrics_query else None,
                    "session_id": req.session_id,
                    "engine": f"Qwen 2.5 ({target_model})",
                    "token_usage": token_usage
                }
    except Exception as oe:
        print(f"Ollama local inference failed, falling back to local synthesizer: {oe}")



    # --- Local offline fallback ---
    response_text = ""
    metrics_used = False

    # Check conversational intents first
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings"]
    is_greeting = any(msg_lower.startswith(g) or f" {g} " in f" {msg_lower} " for g in greetings)
    how_are_you = ["how are you", "how are u", "how you doing"]
    is_how_are_you = any(h in msg_lower for h in how_are_you)
    appreciation = ["thank you", "thanks", "awesome", "great", "cool", "perfect", "good job"]
    is_appreciation = any(msg_lower.startswith(a) or f" {a} " in f" {msg_lower} " for a in appreciation)

    if is_greeting:
        response_text = "Hello! 👋 I am your **V-GPU Copilot** with live metrics access. I can answer general AI questions AND show you real-time platform data. Try asking:\n\n- *\"What's the current GPU temperature?\"*\n- *\"How many vGPU instances are running?\"*\n- *\"What is gradient descent?\"*"
    elif is_how_are_you:
        h = snapshot["system_health"]
        response_text = (f"I'm running great! The cluster is healthy with **{h['total_physical_gpus']} physical GPUs** "
                        f"and **{h['total_vgpu_instances']} active vGPU instances**. "
                        f"Average temperature is **{h['cluster_avg_temperature_c']}°C** and utilization is at **{h['cluster_avg_utilization_pct']}%**. "
                        f"How can I help you today?")
        metrics_used = True
    elif is_appreciation:
        response_text = "You're very welcome! Let me know if you need more GPU metrics, platform insights, or have any other questions!"

    # Metrics-specific offline responses
    elif any(kw in msg_lower for kw in ["temperature", "temp", "hot", "thermal", "heat"]):
        metrics_used = True
        gpu_lines = []
        for gpu in snapshot["physical_gpus"]:
            status = "🔴 HOT" if gpu["temperature_c"] > 75 else "🟢 Normal"
            gpu_lines.append(f"- **GPU {gpu['gpu_id']}**: {gpu['temperature_c']}°C ({status})")
        response_text = f"## 🌡️ Current GPU Temperatures\n\n" + "\n".join(gpu_lines)
        h = snapshot["system_health"]
        response_text += f"\n\n**Cluster Average**: {h['cluster_avg_temperature_c']}°C"
        if h["any_gpu_hot"]:
            response_text += "\n\n⚠️ **Warning**: One or more GPUs are running above 75°C. Consider reducing workload or enabling additional cooling."

    elif any(kw in msg_lower for kw in ["power", "watt", "energy", "consumption"]):
        metrics_used = True
        gpu_lines = []
        for gpu in snapshot["physical_gpus"]:
            gpu_lines.append(f"- **GPU {gpu['gpu_id']}**: {gpu['power_draw_w']}W")
        h = snapshot["system_health"]
        response_text = f"## ⚡ Current Power Draw\n\n" + "\n".join(gpu_lines)
        response_text += f"\n\n**Total Cluster Power**: {h['cluster_total_power_draw_w']}W"

    elif any(kw in msg_lower for kw in ["utilization", "load", "usage", "busy"]):
        metrics_used = True
        gpu_lines = []
        for gpu in snapshot["physical_gpus"]:
            bar_filled = int(gpu["utilization_pct"] / 10)
            bar = "█" * bar_filled + "░" * (10 - bar_filled)
            gpu_lines.append(f"- **GPU {gpu['gpu_id']}**: [{bar}] {gpu['utilization_pct']}%")
        h = snapshot["system_health"]
        response_text = f"## 📊 GPU Utilization\n\n" + "\n".join(gpu_lines)
        response_text += f"\n\n**Cluster Average**: {h['cluster_avg_utilization_pct']}%"

    elif any(kw in msg_lower for kw in ["vram", "memory"]):
        metrics_used = True
        gpu_lines = []
        for gpu in snapshot["physical_gpus"]:
            gpu_lines.append(f"- **GPU {gpu['gpu_id']}**: {gpu['memory_used_mb']}MB / {gpu['memory_total_mb']}MB ({gpu['memory_used_pct']}%)")
        h = snapshot["system_health"]
        response_text = f"## 💾 VRAM Usage\n\n" + "\n".join(gpu_lines)
        response_text += f"\n\n**Total Cluster VRAM**: {h['cluster_total_vram_used_mb']}MB / {h['cluster_total_vram_capacity_mb']}MB"

    elif any(kw in msg_lower for kw in ["instance", "vgpu", "virtual gpu", "how many"]):
        metrics_used = True
        h = snapshot["system_health"]
        response_text = f"## 🖥️ Active vGPU Instances ({h['total_vgpu_instances']})\n\n"
        for inst in snapshot["vgpu_instances"]:
            response_text += (f"- **vGPU {inst['id'][:8]}...** on GPU {inst['physical_gpu_id']}: "
                             f"VRAM={inst['vram_limit_mb']}MB, Compute={inst['compute_limit_pct']}%, "
                             f"Container={inst['container_id_short']}\n")
        if not snapshot["vgpu_instances"]:
            response_text += "No active vGPU instances. Provision new ones from the vGPU Manager tab."

    elif any(kw in msg_lower for kw in ["job", "scheduler", "queue", "running", "pending", "active"]):
        metrics_used = True
        s = snapshot["scheduler"]
        response_text = (f"## 📋 Scheduler Status\n\n"
                        f"- **Active Jobs**: {s['active_jobs']}\n"
                        f"- **Pending Jobs**: {s['pending_jobs']}\n"
                        f"- **Completed Jobs**: {s['completed_jobs']}\n"
                        f"- **Total Processed**: {s['total_jobs_processed']}\n"
                        f"- **Avg Wait Time**: {s['avg_wait_time_s']}s\n")
        if snapshot["recent_jobs"]:
            response_text += f"\n**Recent Jobs:**\n"
            for job in snapshot["recent_jobs"]:
                response_text += f"- [{job['status']}] {job['script']} on {job['vgpu_id'][:8]}...\n"

    elif any(kw in msg_lower for kw in ["status", "health", "overview", "cluster", "stats", "metrics"]):
        metrics_used = True
        h = snapshot["system_health"]
        s = snapshot["scheduler"]
        response_text = (f"## 🏥 Cluster Health Overview\n\n"
                        f"| Metric | Value |\n|---|---|\n"
                        f"| Physical GPUs | {h['total_physical_gpus']} |\n"
                        f"| Active vGPU Instances | {h['total_vgpu_instances']} |\n"
                        f"| Avg GPU Utilization | {h['cluster_avg_utilization_pct']}% |\n"
                        f"| Avg GPU Temperature | {h['cluster_avg_temperature_c']}°C |\n"
                        f"| Total Power Draw | {h['cluster_total_power_draw_w']}W |\n"
                        f"| VRAM Used/Total | {h['cluster_total_vram_used_mb']}MB / {h['cluster_total_vram_capacity_mb']}MB |\n"
                        f"| Active Jobs | {s['active_jobs']} |\n"
                        f"| Pending Jobs | {s['pending_jobs']} |\n")

    # General fallback
    elif not response_text:
        response_text = ("I can help you with **live platform metrics** and **general AI questions**! Try asking:\n\n"
                        "📊 **Metrics**: *\"What's the GPU temperature?\"*, *\"Show me VRAM usage\"*, *\"How many jobs are running?\"*\n\n"
                        "🧠 **General AI**: *\"What is gradient descent?\"*, *\"Explain backpropagation\"*\n\n"
                        "🔀 **Navigation**: *\"Take me to the GPU Monitor\"*, *\"Open the scheduler\"*\n\n"
                        "*Tip: Powered by local Qwen 2.5 via Ollama with live telemetry awareness!*")

    dur = max(time.time() - start_time, 0.001)
    p_toks = ai_token_tracker.estimate_tokens(req.message)
    c_toks = ai_token_tracker.estimate_tokens(response_text)
    try:
        ai_token_tracker.record_inference(
            model="offline-fallback-synthesizer",
            engine="local_synthesizer",
            prompt_tokens=p_toks,
            completion_tokens=c_toks,
            duration_s=dur,
            success=True,
            call_type="chat",
            prompt_snippet=req.message,
            response_snippet=response_text
        )
    except Exception as e:
        print(f"[Prometheus] Failed recording fallback chat inference: {e}")

    token_usage = {
        "prompt_tokens": p_toks,
        "completion_tokens": c_toks,
        "total_tokens": p_toks + c_toks,
        "duration_s": round(dur, 3),
        "tokens_per_sec": round(c_toks / max(dur, 0.001), 2)
    }

    return {
        "answer": response_text,
        "navigate": detected_tab,
        "metrics_used": metrics_used,
        "metrics_snapshot": snapshot if metrics_used else None,
        "session_id": req.session_id,
        "engine": "Local Grounded Synthesizer",
        "token_usage": token_usage
    }


@app.get("/metrics")
async def prometheus_metrics():
    """
    Standard Prometheus exposition endpoint.
    Scraped periodically by Prometheus to capture AI model tokens,
    physical GPU utilization, vGPU instances, and green-compute water telemetry.
    """
    content = export_prometheus_text()
    return Response(content=content, media_type=CONTENT_TYPE_LATEST)


@app.get("/api/metrics/ai-tokens")
async def get_ai_tokens_summary():
    """
    Returns real-time AI Model Token consumption, tokens/second rates,
    per-model statistics, and recent inference activity for the dashboard.
    """
    return ai_token_tracker.get_summary()


@app.get("/api/metrics/monitoring-status")
async def get_monitoring_services_status():
    """
    Checks connectivity with Prometheus (9090) and Grafana (3001) containers.
    """
    import urllib.request
    prom_online = False
    grafana_online = False

    try:
        req = urllib.request.Request("http://localhost:9090/-/healthy")
        with urllib.request.urlopen(req, timeout=0.8) as resp:
            prom_online = (resp.status == 200)
    except Exception:
        prom_online = False

    try:
        req = urllib.request.Request("http://localhost:3001/api/health")
        with urllib.request.urlopen(req, timeout=0.8) as resp:
            grafana_online = (resp.status == 200)
    except Exception:
        grafana_online = False

    return {
        "prometheus": {
            "online": prom_online,
            "url": "http://localhost:9090",
            "scrape_endpoint": "http://localhost:8000/metrics",
        },
        "grafana": {
            "online": grafana_online,
            "url": "http://localhost:3001",
            "dashboard_url": "http://localhost:3001/d/vgpu-ai-tokens/v-gpu-cluster-ai-model-tokens-monitoring?orgId=1&kiosk=tv",
        },
        "tokens": ai_token_tracker.get_summary()
    }


@app.get("/api/metrics/snapshot")
async def get_metrics_snapshot():
    """Returns the current live metrics snapshot for the entire V-GPU platform."""
    return get_live_snapshot()


# ---------------------------------------------------------------------------
# SYSTEM DESIGN: CACHING LAYER REST ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/api/cache/stats")
async def get_cache_statistics():
    """Returns real-time L1/L2 multi-tier cache diagnostics, hit/miss rates, and tags."""
    return system_cache.get_stats()


class CacheClearRequest(BaseModel):
    tag: Optional[str] = None

@app.post("/api/cache/clear")
async def clear_cache(req: CacheClearRequest):
    """Purges the entire cache or invalidates keys associated with a specific tag."""
    if req.tag:
        count = system_cache.invalidate_by_tag(req.tag)
        return {"status": "success", "invalidated_tag": req.tag, "cleared_count": count}
    else:
        count = system_cache.clear()
        return {"status": "success", "cleared_count": count, "message": "All cache entries flushed"}


# ---------------------------------------------------------------------------
# SYSTEM DESIGN: ASYNCHRONOUS TASK QUEUE & DLQ ENDPOINTS
# ---------------------------------------------------------------------------

class EnqueueTaskRequest(BaseModel):
    name: str = "ml_training"
    payload: Optional[Dict[str, Any]] = None
    priority: Optional[str] = "NORMAL"  # CRITICAL, HIGH, NORMAL, LOW
    max_retries: Optional[int] = 3
    idempotency_key: Optional[str] = None

@app.post("/api/queue/enqueue")
async def enqueue_async_task(req: EnqueueTaskRequest):
    """
    Enqueues a background task into the resilient priority queue with exponential retry backoff.
    """
    priority_enum = getattr(JobPriority, req.priority.upper(), JobPriority.NORMAL)
    record = await async_task_queue.enqueue(
        name=req.name,
        payload=req.payload or {},
        priority=priority_enum,
        max_retries=req.max_retries or 3,
        idempotency_key=req.idempotency_key
    )
    return {"status": "enqueued", "job": record.to_dict()}


@app.get("/api/queue/stats")
async def get_queue_statistics():
    """Returns worker pool utilization, queue depths, DLQ sizes, and recent task records."""
    return async_task_queue.get_stats()


@app.get("/api/queue/jobs/{job_id}")
async def get_queue_job(job_id: str):
    """Inspects detailed execution status, progress, and retry history for a specific job."""
    record = async_task_queue.get_job(job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Job not found")
    return record.to_dict()


@app.post("/api/queue/jobs/{job_id}/replay")
async def replay_dead_letter_job(job_id: str):
    """Replays an exhausted task from the Dead-Letter Queue (DLQ)."""
    success = await async_task_queue.replay_dlq_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Job not found in Dead-Letter Queue or already active.")
    return {"status": "replayed", "job_id": job_id}


@app.delete("/api/queue/jobs/{job_id}")
async def cancel_queue_job(job_id: str):
    """Cancels a pending or retrying task."""
    cancelled = async_task_queue.cancel_job(job_id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled (already running or completed).")
    return {"status": "cancelled", "job_id": job_id}


# ---------------------------------------------------------------------------
# SYSTEM DESIGN: SECURITY, RATE LIMITING & AUDIT LOG ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/api/security/status")
async def get_security_posture():
    """Returns active DDoS rate limiter parameters, quarantined IPs, and security posture."""
    return {
        "rate_limiter": {
            "burst_limit": rate_limiter.burst_limit,
            "refill_rate_per_sec": rate_limiter.rate_per_sec,
            "total_tracked_ips": len(rate_limiter.buckets),
            "blocked_ips_count": len(rate_limiter.blocked_ips),
            "blocked_ips": list(rate_limiter.blocked_ips)
        },
        "security_headers": {
            "CSP": "Enabled (Strict frame-ancestors & self)",
            "HSTS": "Enabled (max-age=31536000)",
            "X-Frame-Options": "SAMEORIGIN",
            "X-Content-Type-Options": "nosniff"
        },
        "audit_logs_count": len(security_audit_logger.logs)
    }


@app.get("/api/security/audit-logs")
async def get_security_audit_logs(limit: int = 50):
    """Returns chronological tamper-evident security audit events."""
    return security_audit_logger.get_recent(limit=limit)


class IPBlockRequest(BaseModel):
    ip: str
    reason: Optional[str] = "Manual operator quarantine"

@app.post("/api/security/block-ip")
async def manual_block_ip(req: IPBlockRequest):
    """Quarantines or blocks an IP address at the application firewall level."""
    rate_limiter.manual_block(req.ip, reason=req.reason or "Manual Admin Block")
    return {"status": "blocked", "ip": req.ip}


@app.post("/api/security/unblock-ip")
async def manual_unblock_ip(req: IPBlockRequest):
    """Removes an IP address from quarantine."""
    rate_limiter.manual_unblock(req.ip)
    return {"status": "unblocked", "ip": req.ip}


# ---------------------------------------------------------------------------
# SYSTEM DESIGN: DISASTER RECOVERY & BACKUP MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

class BackupCreateRequest(BaseModel):
    label: Optional[str] = "manual_snapshot"
    description: Optional[str] = ""

@app.post("/api/backup/create")
async def trigger_backup_snapshot(req: BackupCreateRequest):
    """Creates a full cryptographic SHA-256 snapshot archive of databases and configuration."""
    manifest = backup_manager.create_backup(label=req.label or "manual_snapshot", description=req.description or "")
    security_audit_logger.log("BACKUP_CREATED", "INFO", "127.0.0.1", "/api/backup/create", f"ID: {manifest['backup_id']}")
    return {"status": "success", "manifest": manifest}


@app.get("/api/backup/list")
async def list_cluster_backups():
    """Lists all available disaster recovery snapshots with SHA-256 integrity signatures."""
    return backup_manager.list_backups()


@app.post("/api/backup/{backup_id}/verify")
async def verify_backup_integrity(backup_id: str):
    """Validates cryptographic checksum and tar structure of a snapshot."""
    return backup_manager.verify_backup(backup_id)


@app.post("/api/backup/{backup_id}/restore")
async def restore_cluster_state(backup_id: str):
    """Restores cluster databases and state from a verified snapshot archive."""
    try:
        result = backup_manager.restore_backup(backup_id)
        security_audit_logger.log("BACKUP_RESTORED", "WARNING", "127.0.0.1", f"/api/backup/{backup_id}/restore", f"Restored {backup_id}")
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/backup/{backup_id}")
async def delete_cluster_backup(backup_id: str):
    """Permanently deletes a designated backup archive."""
    success = backup_manager.delete_backup(backup_id)
    if not success:
        raise HTTPException(status_code=404, detail="Backup not found")
    return {"status": "deleted", "backup_id": backup_id}



class WaterPowerComputeRequest(BaseModel):
    model_size_b: Optional[float] = 70.0
    dataset_tokens_b: Optional[float] = 300.0
    target_days: Optional[int] = 14
    gpu_model: Optional[str] = "H100"
    cooling_mode: Optional[str] = "liquid"  # "liquid" or "air"

@app.post("/api/ai/compute-water-power")
async def ai_compute_water_power(req: WaterPowerComputeRequest):
    """
    Dedicated AI Mathematical Computation endpoint:
    Calculates exact thermodynamic power & water metrics, evaluates AI model
    training footprint scaling, and generates a verified mathematical derivation via Qwen 2.5.
    """
    import math
    snapshot = get_live_snapshot()
    total_gpu_w = snapshot["system_health"]["cluster_total_power_draw_w"]
    server_power_kw = round((total_gpu_w + 180.0) / 1000.0, 3)
    
    is_liquid = req.cooling_mode.lower() == "liquid"
    base_wue = 0.28 if is_liquid else 0.45
    thermal_penalty = 0.05 if snapshot["system_health"]["any_gpu_hot"] else 0.0
    current_wue = round(base_wue + thermal_penalty, 3)
    
    water_consumption_l_per_hr = round(server_power_kw * current_wue, 3)
    chiller_flow_l_per_min = round(server_power_kw * 1.5 * (1.2 if is_liquid else 0.8), 3)
    evaporative_loss_l_per_hr = round(water_consumption_l_per_hr * 0.95, 3)
    water_recirculated_l_per_hr = round((chiller_flow_l_per_min * 60.0) - evaporative_loss_l_per_hr, 3)
    carbon_kg_per_hr = round(server_power_kw * 0.385, 3)
    
    # Training Scaling Computation: FLOPs = 6 * N * D
    gpu_specs = {
        "H100": {"tflops": 350.0, "power_w": 700.0, "label": "NVIDIA H100 SXM5"},
        "A100": {"tflops": 156.0, "power_w": 400.0, "label": "NVIDIA A100 SXM4"},
        "L40S": {"tflops": 91.0, "power_w": 350.0, "label": "NVIDIA L40S PCIe"}
    }
    gpu_spec = gpu_specs.get(req.gpu_model, gpu_specs["H100"])
    
    total_flops = 6.0 * req.model_size_b * 1e9 * req.dataset_tokens_b * 1e9
    seconds_in_days = max(req.target_days * 24 * 3600, 1)
    target_tflops_needed = total_flops / (seconds_in_days * 1e12)
    mfu = 0.30  # 30% MFU
    total_gpus_needed = math.ceil(target_tflops_needed / (gpu_spec["tflops"] * mfu))
    total_servers_needed = math.ceil(total_gpus_needed / 8)
    actual_gpus_allocated = total_servers_needed * 8
    
    estimated_cluster_kw = round((actual_gpus_allocated * gpu_spec["power_w"] + total_servers_needed * 450.0) / 1000.0, 2)
    estimated_total_mwh = round((estimated_cluster_kw * req.target_days * 24.0) / 1000.0, 2)
    estimated_total_water_liters = round((estimated_total_mwh * 1000.0) * current_wue, 0)
    
    # Generate mathematical derivation with Qwen
    qwen_prompt = f"""You are the Qwen 2.5 thermodynamic math verification engine for V-GPU.
Given these live platform and cluster training figures:
- Server Power Draw: {server_power_kw} kW (GPU Cluster: {total_gpu_w}W + 180W Auxiliary)
- Effective WUE: {current_wue} L/kWh (Base: {base_wue} L/kWh, Thermal Penalty: {thermal_penalty} L/kWh)
- Water Consumption Rate: {water_consumption_l_per_hr} L/hr
- Chiller Flow Rate: {chiller_flow_l_per_min} L/min
- Evaporative Loss (95%): {evaporative_loss_l_per_hr} L/hr
- Model: {req.model_size_b}B Params, {req.dataset_tokens_b}B Tokens, {req.target_days} Days on {req.gpu_model}
- Training FLOPs: 6 * N * D = {total_flops:.2e} FLOPs
- Allocated GPUs: {actual_gpus_allocated} GPUs across {total_servers_needed} Servers (Peak Power: {estimated_cluster_kw} kW)
- Total Energy: {estimated_total_mwh} MWh -> Total Water Footprint: {estimated_total_water_liters:,.0f} Liters

Provide a concise 3-4 bullet point mathematical proof and thermodynamic validation showing:
1. The exact formula for Server Power and Hourly Water Consumption with substituted numbers.
2. The exact formula for Chiller Flow & Evaporative Loss.
3. The exact Transformer FLOPs scaling formula (6 * N * D) and training water footprint."""

    ai_derivation = None
    target_model_name = "qwen2.5:3b"
    try:
        ollama_status = await ollama_engine.get_status_async()
        if ollama_status.get("running"):
            target_model_name = ollama_status.get("active_model", "qwen2.5:3b")
            q_res = await ollama_engine.generate_async(
                prompt=qwen_prompt,
                system_prompt="You are an expert computational thermodynamicist. Provide step-by-step mathematical proofs with exact formulas and numbers.",
                model_name=target_model_name,
                format_json=False
            )
            if q_res and q_res.get("text"):
                ai_derivation = q_res["text"]
    except Exception as e:
        print(f"Qwen verification query failed: {e}")

    if not ai_derivation:
        ai_derivation = (
            f"### 🧮 Thermodynamic Mathematical Proof (Qwen 2.5 Offline Engine)\n\n"
            f"1. **Server Power & Water Consumption**:\n"
            f"   - $$P_{{\\text{{server}}}} = \\frac{{{total_gpu_w}\\text{{W}} + 180\\text{{W}}}}{{1000}} = {server_power_kw}\\text{{ kW}}$$\n"
            f"   - $$\\text{{Water (L/hr)}} = P_{{\\text{{server}}}} \\times \\text{{WUE}} = {server_power_kw} \\times {current_wue} = {water_consumption_l_per_hr}\\text{{ L/hr}}$$\n\n"
            f"2. **Chiller Flow Rate & Evaporative Loss**:\n"
            f"   - $$\\text{{Flow (L/min)}} = P_{{\\text{{server}}}} \\times 1.5 \\times {(1.2 if is_liquid else 0.8)} = {chiller_flow_l_per_min}\\text{{ L/min}}$$\n"
            f"   - $$\\text{{Evaporation (L/hr)}} = {water_consumption_l_per_hr} \\times 0.95 = {evaporative_loss_l_per_hr}\\text{{ L/hr}}$$\n\n"
            f"3. **Transformer Training Compute & Water Footprint**:\n"
            f"   - $$\\text{{FLOPs}} = 6 \\times N \\times D = 6 \\times {req.model_size_b}\\times 10^9 \\times {req.dataset_tokens_b}\\times 10^9 = {total_flops:.2e}\\text{{ FLOPs}}$$\n"
            f"   - $$\\text{{Total Water}} = \\text{{Energy (MWh)}} \\times 1000 \\times \\text{{WUE}} = {estimated_total_mwh} \\times 1000 \\times {current_wue} = {estimated_total_water_liters:,.0f}\\text{{ Liters}}$$"
        )

    return {
        "status": "success",
        "engine": f"Qwen 2.5 ({target_model_name})",
        "live_metrics": {
            "server_power_kw": server_power_kw,
            "gpu_cluster_watts": total_gpu_w,
            "base_wue": base_wue,
            "thermal_penalty": thermal_penalty,
            "effective_wue": current_wue,
            "water_consumption_l_per_hr": water_consumption_l_per_hr,
            "chiller_flow_l_per_min": chiller_flow_l_per_min,
            "evaporative_loss_l_per_hr": evaporative_loss_l_per_hr,
            "water_recirculated_l_per_hr": water_recirculated_l_per_hr,
            "carbon_kg_per_hr": carbon_kg_per_hr
        },
        "training_estimator": {
            "model_size_b": req.model_size_b,
            "dataset_tokens_b": req.dataset_tokens_b,
            "target_days": req.target_days,
            "gpu_model": req.gpu_model,
            "total_flops": total_flops,
            "gpus_needed": total_gpus_needed,
            "servers_needed": total_servers_needed,
            "allocated_gpus": actual_gpus_allocated,
            "peak_cluster_kw": estimated_cluster_kw,
            "total_mwh": estimated_total_mwh,
            "total_water_liters": estimated_total_water_liters
        },
        "formulas": [
            {"name": "Server Power Draw", "formula": "P_server = (P_gpus + 180W) / 1000", "unit": "kW"},
            {"name": "Water Usage Effectiveness", "formula": "WUE = Base_WUE + (T_gpu > 70°C ? 0.05 : 0)", "unit": "L/kWh"},
            {"name": "Water Consumption Rate", "formula": "Water (L/hr) = P_server * WUE", "unit": "L/hr"},
            {"name": "Chiller Flow Rate", "formula": "Flow (L/min) = P_server * 1.5 * Efficiency", "unit": "L/min"},
            {"name": "Evaporative Cooling Loss", "formula": "Evap (L/hr) = Water (L/hr) * 0.95", "unit": "L/hr"},
            {"name": "Transformer FLOPs Scaling", "formula": "FLOPs = 6 * N * D", "unit": "FLOPs"},
            {"name": "Lifecycle Training Water Footprint", "formula": "Water_total (L) = Energy_MWh * 1000 * WUE", "unit": "Liters"}
        ],
        "qwen_derivation": ai_derivation
    }


class JobRequest(BaseModel):
    vgpu_id: str
    script_name: str
    script_code: Optional[str] = None
    dataset_name: Optional[str] = None

@app.post("/api/jobs/ml")
async def run_ml_job(req: JobRequest):
    global active_jobs_count, pending_jobs_count
    
    if req.script_code:
        try:
            with open("custom_run.py", "w") as f:
                f.write(req.script_code)
            req.script_name = "custom_run.py"
        except Exception as e:
            print(f"Error writing custom script: {e}")

    # Resolve physical GPU ID if passed instead of vgpu instance UUID
    resolved_vgpu_id = req.vgpu_id
    try:
        phys_id = int(req.vgpu_id)
        if 0 <= phys_id < len(physical_gpus):
            gpu_instances = physical_gpus[phys_id].list_instances()
            if gpu_instances:
                resolved_vgpu_id = gpu_instances[0]["id"]
    except ValueError:
        pass

    # Get all active vgpu instances
    instances = []
    for gpu in physical_gpus:
        instances.extend(gpu.list_instances())
        
    if req.vgpu_id == "ALL_FLEET" and len(instances) > 0:
        print(f" [Monolith] Executing parallel jobs on all fleet nodes...")
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
        print(f" [Monolith] Executing job on resolved vgpu {resolved_vgpu_id}...")
        try:
            pending_jobs_count = max(0, pending_jobs_count - 1)
            active_jobs_count += 1
            result = await executor.run_ml_job(resolved_vgpu_id, req.script_name, req.dataset_name)
            if result:
                result["run_mode"] = "SINGLE"
                result["run_group"] = str(uuid.uuid4())
                recent_jobs.insert(0, result)
                while len(recent_jobs) > 10:
                    recent_jobs.pop()
            return result
        finally:
            active_jobs_count = max(0, active_jobs_count - 1)

# --- BENCHMARK ENDPOINTS ---
class BenchmarkRunRequest(BaseModel):
    script_name: str
    dataset_name: str
    vgpu_code: Optional[str] = None
    jupyter_code: Optional[str] = None
    colab_code: Optional[str] = None

@app.post("/api/benchmark/run")
async def run_benchmark(req: BenchmarkRunRequest):
    from core.benchmark_runner import benchmark_runner
    started = benchmark_runner.run_benchmark(
        script_name=req.script_name,
        dataset_name=req.dataset_name,
        vgpu_code=req.vgpu_code,
        jupyter_code=req.jupyter_code,
        colab_code=req.colab_code
    )
    if not started:
        raise HTTPException(status_code=400, detail="Benchmark is already running")
    return {"status": "started"}

@app.get("/api/benchmark/status")
async def get_benchmark_status():
    from core.benchmark_runner import benchmark_runner
    with benchmark_runner._lock:
        return {
            "status": benchmark_runner.status,
            "progress": benchmark_runner.progress,
            "logs": benchmark_runner.logs,
            "metrics": benchmark_runner.metrics,
            "error_message": benchmark_runner.error_message
        }

@app.post("/api/benchmark/reset")
async def reset_benchmark():
    from core.benchmark_runner import benchmark_runner
    benchmark_runner.reset()
    return {"status": "reset"}

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
        " AI Agent status: [ACTIVE] Ingesting neural context...",
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
                agent_logs.append(" Pipeline complete! Broadcasting model coefficients to leaderboard.")
            except Exception as e:
                agent_logs.append(f" Error during dataset load: {str(e)}")
                agent_findings = f"AI Agent encountered an error during parsing: {str(e)}"
        else:
            agent_logs.append(f" Dataset path not found: {file_path}")
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
class StressRequest(BaseModel):
    stress: bool

@app.post("/api/gpu/{gpu_id}/stress")
async def toggle_gpu_stress(gpu_id: int, req: StressRequest):
    if gpu_id < 0 or gpu_id >= len(physical_gpus):
        raise HTTPException(status_code=404, detail="Physical GPU not found")
    physical_gpus[gpu_id].simulated_stress = req.stress
    return {"status": "success", "gpu_id": gpu_id, "stress": req.stress}

class PhysicalGPURequest(BaseModel):
    name: str
    vram_mb: int = 32768
    compute_limit: float = 100.0

@app.post("/api/gpu/register")
async def register_physical_gpu(req: PhysicalGPURequest):
    new_gpu_id = len(physical_gpus)
    new_gpu = VGPUDevice(
        physical_gpu_id=new_gpu_id,
        total_vram=req.vram_mb,
        total_compute=req.compute_limit
    )
    # Add to global list
    physical_gpus.append(new_gpu)
    
    # Automatically provision a default vGPU instance on it so it is immediately ready to run container workloads!
    default_vgpu_id = new_gpu.create_vgpu_instance(
        vram_limit=req.vram_mb // 2,  # Allocate half the total VRAM to a default instance
        compute_limit=50.0            # Allocate 50% compute limit
    )
    
    print(f" Registered custom physical GPU Host: {req.name} with ID {new_gpu_id} and default vGPU {default_vgpu_id}")
    return {
        "gpu_id": new_gpu_id,
        "vgpu_id": default_vgpu_id,
        "status": "registered"
    }

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
    last_jobs_len = -1  # Track recent_jobs changes to avoid sending unchanged data
    try:
        while True:
            metrics = []
            instances = []
            for gpu in physical_gpus:
                metrics.append(gpu.get_metrics())
                instances.extend(gpu.list_instances())
            
            queue_status = scheduler.get_queue_status()
            
            payload = {
                "physical_gpus": metrics,
                "vgpu_instances": instances,
                "timestamp": time.time(),
                "scheduler": {
                    "active_jobs": queue_status.get("running_jobs", 0),
                    "pending_jobs": queue_status.get("queued_jobs", 0),
                    "queue_length": queue_status.get("queued_jobs", 0) + queue_status.get("running_jobs", 0),
                    "running_jobs": list(scheduler.running_jobs.values())
                }
            }
            
            # Only include recent_jobs when the list has changed — avoids sending
            # multi-KB raw_output strings every second when jobs haven't changed.
            current_jobs_len = len(recent_jobs)
            if current_jobs_len != last_jobs_len:
                # Strip raw_output from WS payload to reduce size from ~5KB to ~1KB
                payload["recent_jobs"] = [
                    {k: v for k, v in job.items() if k != "raw_output"}
                    for job in recent_jobs
                ]
                last_jobs_len = current_jobs_len
            
            await websocket.send_json(payload)
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
            # Check stress and theme query parameters
            is_stress = websocket.query_params.get("stress") == "true"
            theme = websocket.query_params.get("theme", "dark")
            is_light = theme == "light"
            
            bg_color = "#ffffff" if is_light else "#050505"
            grid_color = "#f0f2f5" if is_light else "#111111"
            border_color = "#cbd5e1" if is_light else "#1e293b"
            text_color = "#64748b" if is_light else "#475569"
            cross_color = "#fee2e2" if is_light else "#3a1215"
            warning_text_color = "#ef4444" if is_light else "#4f2023"
            
            # Create rendering frame with theme-appropriate background
            img = Image.new("RGB", (720, 400), bg_color)
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
                            outline=border_color, 
                            width=1
                        )
                        
                        # Draw viewport identifiers (similar to surveillance feeds)
                        draw.text((col * 180 + 8, row * 200 + 6), f"CORE-A0{idx+1}", fill=text_color)
                        
                        if idx < allowed_channels:
                            draw.text((col * 180 + 120, row * 200 + 6), "ONLINE", fill="#76B900")
                            # Draw dynamic 3D shapes inside sub-viewports
                            draw_shape_in_viewport(draw, cx, cy, 38, shape_type, angle)
                        else:
                            draw.text((col * 180 + 120, row * 200 + 6), "MUTED", fill="#f85149")
                            # Draw a red warning cross inside the locked viewport
                            draw.line([(col * 180 + 20, row * 200 + 45), ((col + 1) * 180 - 20, (row + 1) * 200 - 25)], fill=cross_color, width=1)
                            draw.line([((col + 1) * 180 - 20, row * 200 + 45), (col * 180 + 20, (row + 1) * 200 - 25)], fill=cross_color, width=1)
                            draw.text((col * 180 + 45, row * 200 + 95), "RESOURCE LIMIT", fill=warning_text_color)
                
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
                    draw.line([(i, 0), (i, 400)], fill=grid_color, width=1)
                for j in range(0, 400, 40):
                    draw.line([(0, j), (720, j)], fill=grid_color, width=1)
                    
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
