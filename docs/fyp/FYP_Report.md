# V-GPU: A Containerized Virtual GPU Resource Management & AI Compute Orchestration Platform

**Final Year Project Report**

---

## Abstract

V-GPU is a resource-management and orchestration platform for virtualized GPU compute in AI/ML environments. It provisions isolated "virtual GPU" slices backed by Docker containers, schedules and executes ML training jobs in parallel across nodes, streams real-time telemetry to a dashboard, and exposes a Retrieval-Augmented Generation (RAG) AI assistant grounded in the project's own code, data, and documentation. The system demonstrates a full-stack architecture spanning a FastAPI control plane, React/Tauri monitoring interfaces, Docker-based isolation, and an integrated copilot chatbot.

---

## 1. Introduction

### 1.1 Background
Modern machine-learning workloads demand expensive GPU compute. GPUs cannot always be dedicated to a single user or job; multi-tenant environments require *sharing* GPUs while preserving isolation, fairness, and observability. The industry solution is GPU virtualization (NVIDIA vGPU / MIG) combined with cluster schedulers. V-GPU reimplements this *control-plane* behaviour — provisioning, isolation, scheduling, monitoring, and job execution — in a portable, container-native way that runs without a dedicated virtualization hypervisor.

### 1.2 Motivation
- GPUs are costly; sharing reduces cost.
- Multi-tenant isolation prevents one job from starving others.
- Developers need visibility into utilization, throughput, and environmental impact.
- Teams need an intelligent assistant to navigate a complex codebase and dataset.

### 1.3 Objectives
1. Provision isolated, quota-limited virtual GPU slices.
2. Schedule and execute ML jobs (single and parallel across nodes).
3. Enforce per-slice resource limits.
4. Stream real-time telemetry to a web and desktop dashboard.
5. Provide a RAG-based AI assistant grounded in project data.

---

## 2. Literature Review / Related Work

| System | Approach | Limitation |
|--------|----------|-----------|
| NVIDIA vGPU (SR-IOV) | Hardware-level GPU slicing | Requires licensed GPUs + hypervisor |
| NVIDIA MIG | Physical GPU partitioning | H100/A100 GPUs only |
| Docker + GPU (nvidia-container-toolkit) | Containerized GPU jobs | No quota/tenant management |
| Kubernetes + GPU | Cluster scheduling, autoscaling | Heavy, complex setup |
| **V-GPU** | **Docker-backed virtual GPU slices + custom scheduler** | **Simulated metrics (see §9)** |

V-GPU occupies the niche of a lightweight, self-contained GPU *control plane* that models the scheduling/isolation concepts of enterprise systems without the hardware/lab licensing overhead — making it highly suitable as an educational and research platform.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   React + Vite Web Dashboard  │  Tauri Desktop App          │
│   (Metrics, VGPU Manager,     │  (Native GUI)               │
│    Jobs, Water/Energy Planner,                             │
│    RAG Copilot Chatbot)                                    │
└───────────────▲──────────────────────────────┬──────────────┘
                │ HTTP / WebSocket             │
┌───────────────┴──────────────────────────────▼──────────────┐
│                    BACKEND (FastAPI)                        │
│  vgpu_driver.py   scheduler.py   isolation.py               │
│  job_executor.py  benchmark_runner  automl_engine           │
│  RAG chatbot (indexer, vector_store, rag_engine, memory)    │
└───────────────▲──────────────────────────────┬──────────────┘
                │ Docker Engine                │ bind mounts
┌───────────────┴──────────────────────────────▼──────────────┐
│              ISOLATION LAYER (Docker)                       │
│  vgpu-<id> containers (python:3.10-slim)                   │
│  shared kernel, namespace isolation, resource limits        │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Backend (Control Plane) — `main.py`
FastAPI application exposing REST + WebSocket endpoints:
- `POST /api/vgpu/provision` — create a vGPU slice (VRAM MB + compute %).
- `GET /api/vgpu/list` — list active instances.
- `POST /api/jobs/ml` — execute an ML script inside a slice.
- `POST /api/jobs/compute`, `/api/jobs/inference` — other job types.
- `GET /api/gpu/physical` — physical GPU summaries.
- `GET /api/jobs/fleet` — parallel cluster view.
- `WS /ws/metrics` — live telemetry stream.
- `POST /api/chatbot/query` — RAG assistant.

### 3.2 Virtual GPU Driver — `core/vgpu_driver.py`
Models physical GPUs as `VGPUDevice` objects. `create_vgpu_instance` validates available resources against configurable totals, then launches a Docker container (`vgpu-<id>`) from the `vgpu-worker` image. A background monitor thread polls container CPU/memory stats and derives utilization/temperature/power metrics.

### 3.3 Scheduler — `core/scheduler.py`
Maintains a job queue and assigns work to vGPU slices based on capacity, enabling single and parallel (`run-parallel`) execution.

### 3.4 Isolation — `core/isolation.py`
A background enforcement loop checks each instance's simulated usage against limits and logs violations, demonstrating fairness enforcement logic.

### 3.5 Job Executor — `core/job_executor.py`
Runs user Python scripts inside the container via Docker `exec`, captures stdout, and parses Accuracy/Speed/Loss metrics and a model leaderboard with regex. Falls back to a high-fidelity simulation when no container exists.

### 3.6 RAG Chatbot — `core/chatbot/`
A complete RAG pipeline:
- **Indexer + Chunker** — structure-aware splitting of code (AST), markdown (headings), and text (overlapping blocks).
- **Vector Store** — local TF-IDF/hashing vectorizer with optional Gemini `text-embedding-004`, hybrid cosine+BM25 search.
- **RAG Engine** — routes generation through Gemini → Ollama/HuggingFace → local synthesizer, with conversational memory in SQLite.

### 3.7 Frontend
React + Vite with components for GPU monitoring, VGPU management, job execution, a water/energy (WUE/PUE) planner, and a copilot chatbot. Tauri provides a native desktop shell.

---

## 4. Methodology

### 4.1 Provisioning flow
1. Client requests a vGPU with `vram_mb` and `compute_pct`.
2. Driver validates available pool capacity.
3. A `vgpu-worker` container is created with resource env vars and bind mounts (results writable; datasets/scripts read-only).
4. Instance registered; monitor thread begins.

### 4.2 Job execution flow
1. Client submits `script_name` + optional `dataset_name`.
2. Executor locates the container and runs the script with `--dataset` if provided.
3. Output is captured and parsed for metrics and leaderboard.
4. Results returned and surfaced in the dashboard.

### 4.3 Parallel cluster
Each dataset spawns a dedicated provisioned vGPU, jobs run concurrently in threads, and results are aggregated into cluster metrics.

### 4.4 RAG assistant flow
Tokens → hybrid vector search → top-k chunk context → LLM generation (with source citations) → history storage.

---

## 5. Algorithms & Mathematical Formulation

### 5.1 Virtual GPU Provisioning (Capacity Validation)
Before creating a slice, the driver verifies the request does not exceed the physical GPU pool (`core/vgpu_driver.py`):

```
reject if:  Σ used_vram   + requested_vram    > total_vram
         or Σ used_compute + requested_compute > 100 (percent)
```

Over-subscription is rejected, enforcing a hard resource budget on each physical GPU.

### 5.2 Telemetry Model
Physical GPU metrics are computed every second from container CPU/memory stats plus a workload-sensitive model (`core/vgpu_driver.py`):

```
utilization  = min(100,  cpu_pct + scheduler_load + idle_noise),  idle_noise ~ U(0.5, 2)
memory_used  = min(total_vram, mem_used + scheduler_mem + idle_noise),  idle_noise ~ U(300, 500)
temperature  = min(98,  40 + utilization·0.45 + U(−0.5, 0.5))
power_draw   = min(400, 50 + utilization·2.8  + U(−2, 2))
clock_gfx    = 1200 + utilization·5
```

Here `scheduler_load`/`scheduler_mem` distribute actual load across active slices so that a slice with assigned jobs consumes proportionally more "compute".

### 5.3 Time-Slicing Scheduler (Fair CPU Scheduling)
The scheduler simulates a global clock advancing in fixed ticks (`Δt = 0.1s`). For each vGPU with `n` running jobs, hardware time is divided fairly (`core/scheduler.py`):

```
slice_per_job = Δt / n
work_completed(j) += slice_per_job
job completes when work_completed(j) ≥ total_work_sec(j)
```

Estimated total work:
```
compute   job:  total_work_sec = max(0.5, job_size / 1000)
inference job:  total_work_sec = max(0.5, batch_size × 0.1)
```

This is standard round-robin/fair-share time-slicing, the same principle as OS CPU schedulers.

**Placement policies** (`_select_vgpu`):
- **Round Robin**: `index % len(available)`, then increment.
- **Best Fit**: select the slice with maximum available VRAM.
- **Thermal Aware**: prefer slices with temperature < 80°C.
- **Priority**: higher-priority jobs pop the queue first (HIGH=3, NORMAL=2, LOW=1, negated for a min-heap).

**Queue statistics**:
```
avg_wait_time  = Σ(scheduled_at − submitted_at) / num_jobs
avg_throughput = completed_jobs / (now − first_submitted_at)
```

### 5.4 Compute Engine (real, timed operations)
Compute jobs run **real** NumPy operations and measure wall-clock time to derive throughput (`core/compute_engine.py`):

```
Matrix multiply:  GFLOPS = 2·n³        / (compute_time · 10⁹)
FFT:              GFLOPS = 5·n·log₂(n) / (compute_time · 10⁹)
Reduction:        GFLOPS = n           / (compute_time · 10⁹)
Inference:        throughput = batch_size / (latency_ms / 1000)
```

### 5.5 AutoML Engine (models trained from scratch)
The engine diagnoses a dataset, fixes it, then trains real models with pure NumPy (`core/automl_engine.py`).

**Dataset type heuristic**: `classification` if target has < 20 unique values, else `regression`; `time series` if a date/datetime column exists.

**Auto-fix**: numeric NaN → median; categorical NaN → mode; outliers capped at ±3σ (`clip(lower=mean−3σ, upper=mean+3σ)`).

**Neural Network (MLP)** with sigmoid and gradient descent (per-epoch, `m` = batch size):
```
forward:  a1 = σ(X·W1 + b1);    z2 = a1·W2 + b2;    ŷ = σ(z2)
δ2 = ŷ − y
dW2 = (a1ᵀ · δ2) / m;        db2 = Σ(δ2)/m
δ1 = (δ2 · W2ᵀ) ∘ a1 ∘ (1−a1)
dW1 = (Xᵀ · δ1) / m;         db1 = Σ(δ1)/m
update:  W ← W − lr·dW;  b ← b − lr·db
```

**Linear regression** via gradient descent:
```
pred = X·W + b;   dW = (Xᵀ(pred − y)) / m;   db = mean(pred − y)
```

**Evaluation metrics**:
```
MAE  = mean(|ŷ − y|)
RMSE = sqrt(mean((ŷ − y)²))
R²   = 1 − mean((y − ŷ)²) / var(y)
```

**Model selection heuristic**: time series → LSTM/Prophet; rows < 10k → XGBoost + GridSearch; < 100k → LightGBM + Bayesian Opt; else CatBoost + RandomizedSearch.

### 5.6 Water / Energy Consumption Model (WUE)
Server cooling footprint is estimated from power draw (`frontend/src/components/WaterComputePlanner.jsx`):

```
Total Power (kW) = (Σ physical GPU power + 180 W aux) / 1000
WUE = 0.28 L/kWh  (closed-loop liquid)   |   0.45 L/kWh (evaporative air)
     + 0.05 L/kWh  penalty if core temp > 70°C (thermal throttling)
Water Consumption (L/hr) = Power (kW) × WUE
Chiller Flow (L/min)     = Power × 1.5 × efficiency multiplier
Evaporative Loss         = 0.95 × hourly water consumption
Recirculated (L/hr)      = (Flow × 60) − Evaporative Loss
```

**Large model training footprint** (6·N FLOPs rule):
```
FLOPs required = 6 × model_params(B)·10⁹ × dataset_tokens(B)·10⁹
Total Water (L) = (cluster MWh × 1000) × WUE_base
```

### 5.7 RAG Retrieval
Chunks are embedded (local sub-word n-gram + TF-IDF hashing, or Gemini) and scored by hybrid cosine + keyword matching (`core/chatbot/vector_store.py`):

```
cosine_sim(A, B) = Σ(A_i · B_i) / (‖A‖ · ‖B‖)
keyword_score   = 0.15·(matched keywords) + 0.35·(title/file matches)
combined_score  = cosine_sim + keyword_score
```

Top-k highest-scoring chunks become the grounding context for LLM generation.

---

## 6. Implementation

- **Language/Runtime**: Python 3 (FastAPI, uvicorn), Node.js (React/Vite), Rust (Tauri).
- **Isolation**: Docker Engine; `python:3.9-slim` backend and `python:3.10-slim` worker images.
- **Data stores**: SQLite (chat history + vector index), filesystem datasets.
- **ML stack in worker**: NumPy, pandas, scikit-learn, CPU PyTorch.
- **AI/LLM**: Gemini 2.5 Flash (generation + embeddings), optional Ollama/HuggingFace local models.
- **CLI**: `vgpu_launcher.py` (run, run-parallel, import, clean, tauri).

---

## 7. Results & Evaluation

- **Functionality**: All endpoints operational; dashboard streams live-rendered telemetry; parallel jobs return aggregated accuracy/throughput.
- **Isolation**: Instances are isolated at the process/namespace level via Docker.
- **Usability**: Dual web + desktop interfaces; CLI convenience for scripting.
- **AI assistant**: Answers are grounded in retrieved project context with file:line citations, reducing hallucination.

---

## 8. Conclusion & Future Work

### Conclusion
V-GPU demonstrates a complete, container-native virtual GPU control plane with scheduling, isolation, telemetry, job execution, and an integrated RAG assistant — a useful educational/research demonstration of enterprise GPU-orchestration concepts.

### Future Work
1. **Real GPU telemetry** — integrate `nvidia-smi` / NVML on an NVIDIA host for genuine utilization/temp/power.
2. **True GPU sharing** — adopt NVIDIA MIG or vGPU for hardware-level slicing.
3. **Real water/energy metering** — couple power draw with real WUE/PUE instrumentation.
4. **Network security** — add authentication, TLS, CORS lockdown, localhost binding.
5. **Multi-node distribution** — worker registration over a secure protocol.

---

## 9. Limitations (IMPORTANT — read for defense)

The following subsystems are **modeled/simulated** and do not read real hardware:
| Component | Reality |
|-----------|---------|
| GPU telemetry (util, temp, power) | Derived from container CPU stats + simulation math, **not** real GPU sensors |
| vGPU hardware slicing | Docker containers acting as slices; **no** MIG/SR-IOV |
| Water/energy consumption | Static WUE/PUE model; **no** physical meters |
| Isolation enforcement | Detects/logs violations only; no kernel hardening |
| Fallback job results | Random accuracy/speed/loss when no container exists |

**Why this matters to your demo:** this machine has **no NVIDIA GPU** (Intel UHD 630 + AMD Radeon Pro 5300M). Any "GPU" metric shown is simulated. Be prepared to either (a) present these as clearly-labeled simulation/modeling, or (b) run on a real NVIDIA GPU machine using `nvidia-smi`/NVML for genuine data.
