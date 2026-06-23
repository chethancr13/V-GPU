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

To solve this, we have automated the startup lifecycle. When you run `npm run tauri dev` (or `python3 vgpu_launcher.py tauri`), a startup orchestrator script [start_dev.py](file:///Users/chethanr/Downloads/V-GPU/scripts/start_dev.py) automatically handles the following:
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

## 6. Dashboards & Telemetry
- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Desktop Monitor**: Opens automatically on `run`.

---
*V-GPU - Professional AI Workstation isolation.*
