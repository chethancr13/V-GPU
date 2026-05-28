# V-GPU v2.0
**The Real-World Elastic V-GPU Cloud Array**

A high-performance asynchronous AI orchestration platform that manages real Docker-containerized V-GPU nodes, executes ML jobs with Celery/Redis, and provides deep telemetry.

## Features
- **Real Virtualization**: Spawns actual Docker containers as sandboxed GPU compute nodes.
- **Asynchronous Execution**: Leverages a Redis queue and Celery workers for non-blocking ML jobs.
- **Web-IDE Code Injection**: Prototype custom ML logic directly in the browser and execute in the cluster.
- **Dynamic Dataset Support**: Real `CSV` uploads and selection for model training.

## Infrastructure

```text
                        [ V-GPU React Hub ] <--- WebSockets
                                 |
                                 v
                     [ V-GPU FastAPI API ] (Port 8000)
                        /        |        \
                [ Redis ]  [ Docker.sock ]  [ Data/Datasets ]
                   |             |                |
             [ Celery Worker ] --+----------------+
                   |
             [ Spawns V-GPU Containers ]
```

## Setup & Launch

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### 1. Build the vGPU Compute Image
This image is used to spawn the virtual nodes.
```bash
docker build -t vgpu-worker -f Dockerfile.vgpu .
```

### 2. Launch the SaaS Cluster
This will start Redis, the Celery Worker, and the V-GPU API.
```bash
# REBUILD to apply newly added Docker Socket mounts
docker-compose up -d --build
```

### 3. Start the Web Control Plane
```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`**.
Use Operator **admin** and Key **admin** to enter the V-GPU Console.

---

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/datasets/upload` | Upload `.csv` datasets for ML jobs |
| GET | `/gpu/fleet` | Live hardware utilization telemetry |
| POST | `/gpu/allocate` | Provision a new V-GPU container node |
| POST | `/jobs/submit` | Dispatch ML `scripts/` or `custom_code` |
| WS | `/ws/metrics` | Real-time aggregate cluster-load feed |