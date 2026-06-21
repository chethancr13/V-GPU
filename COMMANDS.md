# 🚀 V-GPU Desktop App & Docker Orchestration Guide

This guide contains instructions on how to start, build, and manage the V-GPU environment with the Electron desktop client and Docker nodes.

---

## 🖥️ Local Development Startup (Electron Client)

### 1. Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
2. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) Start the FastAPI backend server standalone:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### 2. Frontend & Electron Setup
1. Navigate to the `frontend` folder and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Build static files or start the Vite development server (required by Electron):
   ```bash
   npm run dev
   ```
3. Run the Electron Desktop GUI:
   ```bash
   npm run electron
   ```

### 3. Automated Launcher (Recommended)
You can launch the FastAPI backend, Vite dev server, and Electron application with a single command from the project root:
```bash
# Windows
start.bat

# macOS/Linux
chmod +x start.sh
./start.sh

# Or using the Python Launcher:
python vgpu_launcher.py
```

---

## 🐳 Docker Deployment & Container Management

> [!NOTE]
> **Automated Flow:** Running the Electron app via `npm run electron` (or via `start.bat` / `start.sh`) now automatically boots up the FastAPI backend, verifies the `vgpu-worker` Docker image (automatically building it if missing), and provisions the default worker container. Manual setup is not strictly required.

### 1. Manual Build of the vGPU Worker Docker Image (Optional)
If you want to manually build the worker image:
```bash
docker build -t vgpu-worker -f vGPU-Worker.Dockerfile .
```

### 2. Manual Control Plane Deployment inside Docker (Optional)
To run the V-GPU control plane itself inside a container instead of locally:
1. Build the control plane backend image:
   ```bash
   docker build -t vgpu-backend -f Dockerfile .
   ```
2. Run the container (mounting the local Docker socket so it can orchestrate worker containers):
   ```bash
   docker run -d -p 8000:8000 -v /var/run/docker.sock:/var/run/docker.sock --name vgpu-backend vgpu-backend
   ```

---

## ⚡ Running ML Jobs & Container Operations

Use the `vgpu_launcher.py` script to manage dataset imports, trigger training runs inside worker containers, and clean up active resources:

### 1. Import a Dataset
```bash
python vgpu_launcher.py import <local_csv_path> <dataset_name>
```

### 2. Run an ML Job (Auto-provisions a worker container)
```bash
python vgpu_launcher.py run my_ml_model.py auto
```

### 3. Run Parallel Cluster Workload
```bash
python vgpu_launcher.py run-parallel my_ml_model.py dataset1.csv dataset2.csv dataset3.csv
```

### 4. Cluster Environment Cleanup
Stop and remove all worker containers and backend server processes:
```bash
# Via launcher script
python vgpu_launcher.py clean

# Manual PowerShell Docker cleanup
docker ps -a -q --filter "name=vgpu-" | ForEach-Object { docker rm -f $_ }

# Manual Linux/macOS Docker cleanup
docker ps -a -q --filter "name=vgpu-" | xargs docker rm -f
```
