# 🚀 V-GPU Command Cheat Sheet

This guide contains all the commands you need to manage your Virtual GPU environment, run ML models, and clean up Docker containers.

### Quick Start

#### Option A: Web Dashboard (Default)
Starts the FastAPI Backend and opens the Web UI dashboard in your default browser.
```bash
python3 vgpu_launcher.py
```

#### Option B: Tauri Desktop App (Fully Automated)
Running Tauri now automatically ensures Docker Desktop is running, builds the worker container image if missing, syncs the Docker VM clock, starts the backend, and launches the Tauri Desktop GUI.
```bash
# Start directly from the root directory
npm run tauri dev

# OR via the Python launcher script
python3 vgpu_launcher.py tauri
```

---

## 1. Running Tauri + Docker (Clock Sync & Lifecycle Automation)

On macOS and Windows, Docker Desktop runs inside a virtual machine. When the host system sleeps and wakes up, the VM's clock drifts and falls behind the host time. This causes ML job scheduling mismatches, log timestamp drift, and API failures.

To solve this, we have automated the startup lifecycle. When you run `npm run tauri dev` (or `python3 vgpu_launcher.py tauri`), a startup orchestrator script [start_dev.py](scripts/start_dev.py) automatically handles the following:
1. **Verifies Docker status**: Checks if Docker is running. On macOS, if it's shut down, it automatically launches Docker Desktop (`open -a Docker`) and waits for it to become ready.
2. **Checks/Builds Container**: Verifies if the dedicated V-GPU worker image (`vgpu-worker`) exists, and builds it if missing.
3. **Syncs the VM Clock**: Runs a privileged sync command to update the Docker VM time to host time.
4. **Launches Backend**: Starts the FastAPI Uvicorn backend on port `8000`.
5. **Starts Frontend**: Spawns Vite and launches the Tauri GUI window.

### Manual Step-by-Step Launch
If you wish to bypass the automated script and run/debug things manually:

1. **Start Docker Desktop** (Make sure your Docker daemon is active).
2. **Sync Docker VM Clock to Host Time:**
   ```bash
   docker run --rm --privileged alpine hwclock -s
   ```
3. **Build Worker Image:**
   ```bash
   docker build -t vgpu-worker -f vGPU-Worker.Dockerfile .
   ```
4. **Start FastAPI Backend (Port 8000):**
   ```bash
   python3 main.py
   ```
5. **Start Vite Dev Server directly (Port 5173):**
   ```bash
   cd frontend && npm run dev
   ```

---

## 2. Running ML Jobs
You can run any Python script inside the isolated vGPU environment.

**Basic Run (Auto-Provisioning):**
```bash
python3 vgpu_launcher.py run my_ml_model.py auto
```

**Run with a Dataset:**
```bash
python3 vgpu_launcher.py run my_ml_model.py auto mnist_demo
```

**Run with a Local CSV (Smart Import):**
```bash
python3 vgpu_launcher.py run my_ml_model.py auto "datasets/my_data.csv"
```

## 3. Parallel Computing Cluster
V-GPU supports multi-node parallel orchestration with automated load balancing.

**Run on Parallel Cluster (Split Workload):**
```bash
python3 vgpu_launcher.py run-parallel my_ml_model.py dataset1.csv dataset2.csv dataset3.csv
```
*The Desktop Dashboard will automatically switch to fleet-view monitoring.*

## 4. Dataset Management
Easily move your local data into the vGPU isolated environment.

**Manual Import:**
```bash
python3 vgpu_launcher.py import path/to/local_file.csv dataset_name
```

## 5. Cleaning & Resetting
If the backend crashes or you want to wipe all virtual containers.

**Total Reset (Recommended):**
*Stops backend, frontend, and removes all vGPU containers.*
```bash
python3 vgpu_launcher.py clean
```

**Manual Docker Cleanup:**
```bash
# List all vGPU containers
docker ps -a --filter "name=vgpu-"

# Force remove all vGPU containers
docker ps -a -q --filter "name=vgpu-" | xargs docker rm -f
```

## 6. 🦙 Ollama & Qwen 2.5 Local AI Commands

V-GPU is powered by an offline, local **Qwen 2.5** model via **Ollama**. It requires **zero cloud API keys**.

### A. Starting the Ollama Service

**Native (macOS / Windows / Linux — Recommended for GPU acceleration):**
```bash
# Starts the background Ollama daemon on port 11434 (if not already running)
ollama serve
```

**Docker Container:**
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

---

### B. Pulling / Downloading Qwen Models

**1. Fast 3B Model (Recommended — 1.9 GB, ultra-low latency on CPU):**
```bash
# Native
ollama pull qwen2.5:3b

# Docker
docker exec -it ollama ollama pull qwen2.5:3b
```

**2. Full 7.6B Model (4.7 GB, maximum parameter reasoning):**
```bash
# Native
ollama pull qwen2.5:latest

# Docker
docker exec -it ollama ollama pull qwen2.5:latest
```

---

### C. Chatting with Qwen in the Terminal

**Interactive Chat Session:**
```bash
# Native
ollama run qwen2.5:3b

# Docker
docker exec -it ollama ollama run qwen2.5:3b
```
*(Type `/bye` or press `Ctrl + D` to exit).*

**One-Liner Quick Prompt:**
```bash
ollama run qwen2.5:3b "Explain GPU VRAM in two sentences"
```

---

### D. Model Management & Inspection

```bash
# List all installed models
ollama list
# Docker: docker exec ollama ollama list

# Check which model is currently resident in RAM
ollama ps
# Docker: docker exec ollama ollama ps

# Show model details and architecture
ollama show qwen2.5:3b

# Remove an unneeded model
ollama rm <model-name>
```

---

### E. Verifying V-GPU AI Integration

```bash
# 1. Test Ollama daemon connectivity
curl http://localhost:11434/api/tags

# 2. Test V-GPU Ollama bridge status
curl http://localhost:8000/api/ollama/status

# 3. Test Qwen thermodynamic water & power computation
curl -X POST http://localhost:8000/api/ai/compute-water-power \
  -H "Content-Type: application/json" \
  -d '{"model_size_b": 70, "dataset_tokens_b": 300, "target_days": 14}'
```

---

---

## 7. Dashboards & Telemetry

- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Prometheus Metrics Target**: [http://localhost:8000/metrics](http://localhost:8000/metrics)
- **Prometheus Server UI**: [http://localhost:9090](http://localhost:9090)
- **Grafana Monitoring Dashboard**: [http://localhost:3001](http://localhost:3001) (Auto-login enabled)
- **AI Token Monitor API**: [http://localhost:8000/api/metrics/ai-tokens](http://localhost:8000/api/metrics/ai-tokens)

---

## 8. Prometheus & Grafana Monitoring Stack

### Start Monitoring Containers
```bash
# Via launcher shortcut:
python3 vgpu_launcher.py monitoring

# OR direct script:
python3 scripts/start_monitoring.py --open

# OR via docker compose:
docker compose -f docker-compose.monitoring.yml up -d
```

### Stop Monitoring Containers
```bash
python3 vgpu_launcher.py monitoring-down
# OR
docker compose -f docker-compose.monitoring.yml down
```

### Monitored Metrics Overview
- **AI Model Tokens & Latency**:
  - `vgpu_ai_tokens_prompt_total` (Prompt / Input tokens count)
  - `vgpu_ai_tokens_completion_total` (Completion / Output tokens count)
  - `vgpu_ai_tokens_total` (Aggregated total tokens)
  - `vgpu_ai_tokens_per_second` (Instantaneous generation velocity)
  - `vgpu_ai_inference_duration_seconds` (Histogram latency buckets)
- **Physical GPU Hardware Telemetry**:
  - `vgpu_physical_gpu_utilization_percent` (Core utilization 0-100%)
  - `vgpu_physical_gpu_memory_used_mb` & `vgpu_physical_gpu_memory_total_mb`
  - `vgpu_physical_gpu_temperature_celsius` & `vgpu_physical_gpu_power_watts`
- **vGPU Virtualization & Scheduler**:
  - `vgpu_instances_active_count` & `vgpu_instances_allocated_vram_mb`
  - `vgpu_scheduler_jobs_active` & `vgpu_scheduler_jobs_pending`
- **Green-Compute / Water Telemetry**:
  - `vgpu_server_total_power_kw`
  - `vgpu_effective_wue_liters_per_kwh`
  - `vgpu_water_consumption_liters_per_hour`
  - `vgpu_chiller_flow_rate_liters_per_min`

---
*V-GPU - Professional AI Workstation isolation, Local Qwen 2.5 Engine, & Prometheus/Grafana Telemetry.*

