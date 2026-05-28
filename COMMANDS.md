# 🚀 V-GPU Command Cheat Sheet

This guide contains all the commands you need to manage your Virtual GPU environment, run ML models, and clean up Docker containers.

### Quick Start
```bash
# Start all core services (Backend + Desktop GUI)
python3 vgpu_launcher.py
```
*The Desktop Dashboard will open automatically.*

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

## 4. Cleaning & Resetting
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

## 5. Dashboards & Telemetry
- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Desktop Monitor**: Opens automatically on `run`.

---
*V-GPU - Professional AI Workstation isolation.*
