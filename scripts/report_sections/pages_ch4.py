# -*- coding: utf-8 -*-
"""Chapter 4: System Design: Pages 23 to 37"""

PAGES = {}

PAGES[23] = """================================================================================
                                   PAGE 23
================================================================================
                                 CHAPTER 4
                               SYSTEM DESIGN

4.1 SYSTEM ARCHITECTURE

The architectural design of the V-GPU platform follows a decoupled, multi-tiered 
microservices and control-plane paradigm. Traditional GPU cluster managers tightly 
couple hardware drivers, scheduling policies, and user applications within a single 
monolithic operating system image. In contrast, V-GPU strictly separates concerns 
across four distinct, interacting layers:

1. THE PRESENTATION AND INTERACTION TIER:
   The uppermost layer provides developers, researchers, and administrators with 
   intuitive control and monitoring interfaces. It comprises two primary delivery 
   mechanisms:
   - Modern Web Dashboard: Engineered using React 18, Vite, and custom CSS glassmorphic 
     styling. It features interactive panels for dynamic vGPU slice provisioning, 
     drag-and-drop ML job submissions, real-time telemetry gauges, a 3D hardware 
     accelerator topology visualizer (`BoltAccelerator3D.jsx`), and a thermodynamic 
     green computing planner (`WaterComputePlanner.jsx`).
   - Native Desktop Client: Built on the Rust-based Tauri framework. By leveraging 
     native OS webview runtimes rather than bundled Chromium binaries (as in Electron), 
     the desktop client operates with a minimal memory footprint (< 40 MB RAM), 
     providing low-overhead local control.
   - Real-Time Streaming Gateway: A bi-directional WebSocket interface (`/ws/metrics`) 
     streaming system state updates at a continuous 1 Hz frequency.

2. THE APPLICATION CONTROL PLANE & API GATEWAY TIER:
   The central nervous system of V-GPU is an asynchronous control plane engineered in 
   Python using FastAPI, Uvicorn, and asyncio (`main.py`). The gateway exposes 
   strictly validated RESTful endpoints under `/api/` for instance provisioning, 
   workload dispatch, fleet clustering, and benchmark execution. It houses the 
   in-memory system registry, tracks active container handles, coordinates multi-policy 
   job scheduling, and routes queries to the local RAG engine.
================================================================================
"""

PAGES[24] = """================================================================================
                                   PAGE 24
================================================================================
4.1 SYSTEM ARCHITECTURE (CONTINUED)

3. THE CORE EXECUTION, SCHEDULING & DRIVER TIER:
   Situated directly beneath the API gateway, this tier executes all virtualization, 
   scheduling, isolation, and machine learning orchestration logic:
   - Virtual GPU Driver (`core/vgpu_driver.py`): Models physical accelerators as 
     `VGPUDevice` entities and manages the lifecycle of virtual child slices (`VGPUInstance`). 
     When physical NVIDIA hardware is detected, it communicates directly with the 
     hardware via the NVIDIA Management Library (NVML / `pynvml`). In non-CUDA or 
     commodity test environments, it activates a high-fidelity telemetry emulator 
     deriving realistic thermal, frequency, and power curves.
   - Multi-Policy Workload Scheduler (`core/scheduler.py`): Maintains an active job 
     queue, evaluating pending computational tasks against available virtual slices 
     using pluggable dispatch policies: First-In-First-Out (FIFO), Fair-Share, 
     Priority Queueing, Shortest Job First (SJF), and Round-Robin Time-Slicing.
   - Process Isolation & Clamping Engine (`core/isolation.py`): A background 
     supervisor thread continuously auditing active container memory consumption 
     against provisioned quotas, enforcing hard limits via Linux cgroups v2.
   - In-House AutoML Engine (`core/automl_engine.py`): A scratch-built automated 
     training pipeline executing hyperparameter grid searches across multiple 
     model families (Random Forests, Gradient Boosters, MLPs) inside provisioned slices.
   - Air-Gapped Hybrid RAG Copilot (`core/chatbot/`): An embedded intelligence pipeline 
     combining AST-aware Python chunking, SQLite vector storage, and hybrid BM25/Cosine 
     semantic ranking to deliver zero-leakage technical query assistance.

4. THE CONTAINERIZED EXECUTION & ISOLATION RUNTIME TIER:
   The lowest software layer manages physical resource execution through Docker and 
   the Open Container Initiative (OCI) runtime. Each provisioned virtual GPU slice is 
   backed by an independent, isolated Docker container (`vgpu-<instance_id>`) 
   instantiated from a lean, pre-configured image (`vgpu-worker`, built upon 
   `python:3.10-slim`). Workloads executed inside these containers are strictly bound 
   by Linux namespace isolation (PID, mount, network, IPC) and cgroup resource quotas, 
   guaranteeing that a runaway or malicious script cannot compromise host integrity.
================================================================================
"""

PAGES[25] = """================================================================================
                                   PAGE 25
================================================================================
4.1 SYSTEM ARCHITECTURE (CONTINUED)

FIG. 4.1: COMPREHENSIVE MULTI-TIERED SYSTEM ARCHITECTURE DIAGRAM

+-----------------------------------------------------------------------------+
|                          PRESENTATION & CLIENT TIER                         |
|  +-------------------------------------+  +------------------------------+  |
|  |     React 18 + Vite Web Client      |  |   Rust + Tauri Desktop App   |  |
|  | (Glassmorphic Dashboard, 3D Canvas) |  |  (Native Low-Memory GUI Shell) |  |
|  +-------------------------------------+  +------------------------------+  |
|       | HTTP Requests (/api/*)                 | WebSocket Stream (/ws/*)    |
+-------|----------------------------------------|-----------------------------+
        v                                        v
+-----------------------------------------------------------------------------+
|                     CONTROL PLANE & API GATEWAY TIER                        |
|  +-----------------------------------------------------------------------+  |
|  |                  FastAPI Asynchronous Control Plane                   |  |
|  |   - Pydantic Validation     - REST Route Controllers (/api/vgpu, /jobs)|  |
|  |   - WebSocket Broadcaster   - In-Memory State & Lock Registry         |  |
|  +-----------------------------------------------------------------------+  |
+-------|--------------------|-------------------|----------------------|------+
        v                    v                   v                      v
+-----------------------------------------------------------------------------+
|                     CORE EXECUTION & DRIVER ENGINE TIER                     |
|  +------------------+  +------------------+  +---------------------------+  |
|  |   vGPU Driver    |  | Workload Engine  |  |  Air-Gapped RAG Copilot   |  |
|  | (vgpu_driver.py) |  | (scheduler.py,   |  | - AST Chunker (chunker.py)|  |
|  | - Slicing Logic  |  |  isolation.py)   |  | - SQLite DB (vector_store)|  |
|  | - Telemetry Poll |  | - 5 Schedulers   |  | - Hybrid BM25/Cosine Retr |  |
|  | - NVML / Emulate |  | - CGroup Enforce |  | - Local Ollama Synthesizer|  |
|  +------------------+  +------------------+  +---------------------------+  |
|  +-----------------------------------------------------------------------+  |
|  |           Thermodynamic Water & Green Compute Engine                  |  |
|  | - Kaplan/Chinchilla FLOPs  - Heat Dissipation (Q = m*Cp*dT)           |  |
|  | - PUE / WUE Calculations   - Regional Carbon Emissions (gCO2e)        |  |
|  +-----------------------------------------------------------------------+  |
+-------|---------------------------------------------------------------------+
        v Docker Engine API (UNIX Socket: /var/run/docker.sock)
+-----------------------------------------------------------------------------+
|                  CONTAINERIZED ISOLATION RUNTIME TIER                       |
|  +--------------------------+  +--------------------------+                 |
|  | Instance Slice: vgpu-01  |  | Instance Slice: vgpu-02  |                 |
|  | - Container: vgpu-worker |  | - Container: vgpu-worker |   ... [Multi-   |
|  | - Quota: 4096 MB VRAM    |  | - Quota: 2048 MB VRAM    |        Tenant]  |
|  | - Compute: 50% Share     |  | - Compute: 25% Share     |                 |
|  | - Cgroups v2 & Namespaces|  | - Cgroups v2 & Namespaces|                 |
|  +--------------------------+  +--------------------------+                 |
+-----------------------------------------------------------------------------+
================================================================================
"""

PAGES[26] = """================================================================================
                                   PAGE 26
================================================================================
4.2 DATA FLOW DIAGRAM (LEVEL 0 - CONTEXT LEVEL)

The Level 0 Data Flow Diagram (DFD), also designated as the Context-Level DFD, 
establishes the fundamental operational boundary of the V-GPU system. It models 
the entire platform as a single centralized processing entity, detailing all 
information exchanges, control signals, and telemetry streams crossing between 
external human and hardware entities and the V-GPU control plane.

IDENTIFICATION OF EXTERNAL ENTITIES:
1. Student / ML Researcher: Submits machine learning training scripts, requests 
   virtual GPU slice allocations, monitors live execution metrics, and queries 
   the RAG copilot for technical debugging assistance.
2. System Administrator: Configures physical device parameters, establishes 
   scheduling dispatch policies (FIFO, Fair-Share, Priority, SJF, Time-Slicing), 
   inspects multi-tenant isolation violations, and reviews thermodynamic environmental 
   telemetry.
3. Physical GPU Hardware / NVIDIA NVML: The underlying physical compute substrate 
   providing raw hardware counters, core clock frequencies, memory utilization, and 
   temperature sensor data via PCIe interfaces.
4. Docker Daemon Engine: The local host container runtime executing container 
   creation, process execution (`docker exec`), resource quota clamping, and 
   lifecycle termination commands.
5. Local LLM Runtime (Ollama / Local Weights): The offline, air-gapped language 
   model engine receiving contextual code prompts and returning technical natural 
   language explanations.

DATA FLOW CHARACTERISTICS:
Incoming data flows encompass vGPU provisioning parameters (VRAM in MB, compute 
percentage), user training scripts, job execution configurations, policy switch 
commands, and conversational queries. Outgoing data flows include dynamic JSON 
telemetry packets, real-time WebSocket metric broadcasts (1 Hz), training execution 
logs, model accuracy and loss metrics, isolation breach notifications, thermodynamic 
PUE/WUE reports, and grounded RAG responses with source file citations.
================================================================================
"""

PAGES[27] = """================================================================================
                                   PAGE 27
================================================================================
4.2 DATA FLOW DIAGRAM (LEVEL 0 - CONTINUED)

FIG. 4.2: LEVEL 0 CONTEXT-LEVEL DATA FLOW DIAGRAM (DFD)

                 +-----------------------------------------+
                 |          STUDENT / ML RESEARCHER        |
                 +-----------------------------------------+
                   |                 ^                 ^
     vGPU Request, |                 | Job Logs,       | RAG Answer,
     Python Script |                 | Metrics Stream  | Citations
                   v                 |                 |
+-----------------------------------------------------------------------------+
|                                                                             |
|                                                                             |
|                           [PROCESS 0.0: V-GPU]                              |
|                                                                             |
|                    CONTAINERIZED VIRTUAL GPU PLATFORM,                      |
|                  RESOURCE ORCHESTRATOR & RAG COPILOT                        |
|                                                                             |
|                                                                             |
+-----------------------------------------------------------------------------+
   |          ^                 |            ^               ^          |
   | Policy,  | Violations,     | Container  | Stdout,       | Telemetry| Hardware
   | Quotas   | Green Telemetry | Commands   | Exit Status   | Queries  | Metrics
   v          |                 v            |               |          v
+-----------------------+     +--------------------+     +--------------------+
|  SYSTEM ADMINISTRATOR |     |   DOCKER DAEMON    |     |    PHYSICAL GPU    |
|                       |     |      ENGINE        |     |   (NVIDIA NVML)    |
+-----------------------+     +--------------------+     +--------------------+
                                      |            ^
                       Context Prompt |            | LLM Token Stream
                                      v            |
                              +----------------------------+
                              |   LOCAL AIR-GAPPED OLLAMA  |
                              |         LLM ENGINE         |
                              +----------------------------+

As illustrated in Figure 4.2, Process 0.0 encapsulates all internal virtualization, 
queueing, thermodynamic modeling, and indexing subsystems. It acts as the secure, 
authoritative broker between user applications and the containerized compute substrate.
================================================================================
"""

PAGES[28] = """================================================================================
                                   PAGE 28
================================================================================
4.3 DETAILED DESIGN: 4.3.1 DFD LEVEL 1

The Level 1 Data Flow Diagram decomposes the monolithic Process 0.0 into five 
cooperating primary subsystems, revealing the internal pipelines and data stores.

FIG. 4.3: LEVEL 1 SUBSYSTEM DATA FLOW DIAGRAM

                     +----------------------------------+
                     |    USER / CLIENT INTERFACE       |
                     +----------------------------------+
                       |              |              |
          Provision Req|      Job Post|     Query Str|
                       v              v              v
               +---------------+ +---------------+ +---------------+
               | PROCESS 1.0:  | | PROCESS 2.0:  | | PROCESS 3.0:  |
               | VIRTUAL SLICE | | WORKLOAD      | | AIR-GAPPED    |
               | PROVISIONING  | | SCHEDULER &   | | RAG COPILOT   |
               | & DRIVER      | | DISPATCHER    | | ENGINE        |
               +---------------+ +---------------+ +---------------+
                 |           ^     |           ^     |           ^
       Instance  |   Capacity|     | Assign Job| State| Context  | Vector
       Metadata  |   Lookup  |     | Slice     | Poll | Chunks   | Match
                 v           |     v           |      v          |
               +---------------+ +---------------+ +---------------+
               |   DATA STORE  | |  DATA STORE   | |  DATA STORE   |
               |     D1: vGPU  | |   D2: JOB     | |   D3: AST     |
               |    INSTANCES  | |    QUEUE      | |   VECTOR DB   |
               +---------------+ +---------------+ +---------------+
                       |                 |                 |
                       v                 v                 |
               +---------------+ +---------------+         |
               | PROCESS 4.0:  | | PROCESS 5.0:  |         |
               | CONTAINERIZED | | THERMODYNAMIC |         |
               | EXECUTION &   | | GREEN COMPUTE |<--------+
               | CGROUP CLAMP  | | CALCULATOR    | (Compute Hours)
               +---------------+ +---------------+
                       |                 |
                       v                 v
           [ Docker Daemon OCI ]   [ Environmental Dashboard ]

DESCRIPTION OF LEVEL 1 PROCESSES:
- Process 1.0 (Provisioning & Driver): Validates requested VRAM and compute allocations 
  against physical capacity, writes instance descriptors to Data Store D1, and instructs 
  Process 4.0 to instantiate the corresponding Docker container.
- Process 2.0 (Workload Scheduler): Enqueues submitted scripts into Data Store D2, 
  applies the configured dispatch policy, and assigns jobs to idle virtual slices.
- Process 3.0 (RAG Copilot): Ingests user technical questions, converts queries into 
  n-gram vectors, performs hybrid similarity search against Data Store D3, and synthesizes 
  grounded responses.
- Process 4.0 (Execution & Clamping): Executes user scripts via Docker exec, monitors 
  memory consumption, and enforces cgroup quotas.
- Process 5.0 (Green Compute): Calculates FLOPs, PUE, WUE, heat, and carbon emissions.
================================================================================
"""

PAGES[29] = """================================================================================
                                   PAGE 29
================================================================================
4.3.1 DFD LEVEL 2 (DECOMPOSITION OF PROCESS 2.0 & PROCESS 4.0)

To provide deep architectural clarity into job execution, resource isolation, and 
metric parsing, Figure 4.4 details the Level 2 DFD decomposing Process 2.0 (Scheduler) 
and Process 4.0 (Container Execution & Clamping).

FIG. 4.4: LEVEL 2 DETAILED JOB EXECUTION & ISOLATION PIPELINE DFD

   [ User Submitted Script & Priority ]
                     |
                     v
+-----------------------------------------------------------------------------+
| PROCESS 2.1: WORKLOAD VALIDATION & POLICY SORTING                           |
| - Inspects script syntax, parses execution flags, checks user authorization |
| - Sorts queue according to active policy (FIFO / Fair-Share / Priority / SJF|
+-----------------------------------------------------------------------------+
                     |
                     v (Sorted Job Record)
       +----------------------------+
       |   DATA STORE D2: QUEUE     |
       +----------------------------+
                     |
                     v (Job Next in Line)
+-----------------------------------------------------------------------------+
| PROCESS 2.2: SLICE CAPACITY MATCHER & BINDING                               |
| - Scans Data Store D1 (vGPU Instances) for matching available VRAM & compute|
| - Locks target instance state: IDLE -> BUSY                                 |
+-----------------------------------------------------------------------------+
                     |
                     v (Bound Job + Target Instance ID)
+-----------------------------------------------------------------------------+
| PROCESS 4.1: DOCKER RUNTIME COMMAND DISPATCHER                              |
| - Issues Docker API Call: `POST /containers/vgpu-<id>/exec`                 |
| - Mounts workspace directory, passes environment variables                  |
+-----------------------------------------------------------------------------+
         |                                              |
         | (Process Invocation)                         | (Process Streaming)
         v                                              v
+------------------------------------+  +------------------------------------+
| PROCESS 4.2: CGROUP CLAMP MONITOR  |  | PROCESS 4.3: STDOUT REGEX PARSER   |
| - Polls `/sys/fs/cgroup/memory`    |  | - Streams raw terminal output lines|
| - Compares usage to provisioned max|  | - Regex extracts Accuracy, Loss,   |
| - Action: If limit breached, kill  |  |   Epochs, Iteration Latencies      |
+------------------------------------+  +------------------------------------+
         |                                              |
         v (Enforcement Alert / Termination)            v (Structured Telemetry)
+-----------------------------------------------------------------------------+
| PROCESS 4.4: RESULT PERSISTENCE & METRIC BROADCASTER                        |
| - Updates Job Status (COMPLETED / FAILED / CLAMPED) in Data Store D2        |
| - Emits JSON metrics over WebSocket `/ws/metrics` to Frontend Dashboard     |
| - Unlocks target instance: BUSY -> IDLE                                     |
+-----------------------------------------------------------------------------+
================================================================================
"""

PAGES[30] = """================================================================================
                                   PAGE 30
================================================================================
4.3.2 USE CASE DIAGRAMS & ACTOR SPECIFICATIONS

The operational functionality of V-GPU is exposed to three primary human and 
system actors:

1. Student / Machine Learning Researcher: Primary consumer of virtual compute. 
   Creates virtual slices for experimentation, submits ML training jobs, monitors 
   execution telemetry, queries the RAG copilot, and compares benchmark performance.
2. System Administrator / Lab Manager: Manages physical hardware configurations, 
   sets global scheduling policies, monitors isolation violations, and reviews 
   thermodynamic and carbon consumption metrics.
3. System Daemon / Background Worker: Automated system actor executing background 
   health probes, polling Docker container telemetry at 1 Hz, and calculating 
   thermodynamic flow rates.

TABLE 4.1: SYSTEM ACTOR PERMISSION AND USE CASE MATRIX

--------------------------------------------------------------------------------
Use Case ID   Use Case Description            Primary Actor      Secondary Actor
--------------------------------------------------------------------------------
UC-01         Provision Virtual GPU Slice     Researcher / Admin vGPU Driver
UC-02         Submit Machine Learning Job     Researcher         Scheduler
UC-03         Select Active Scheduling Policy System Admin       Scheduler
UC-04         Stream Real-Time Telemetry      Researcher / Admin WebSocket Svc
UC-05         Enforce CGroup Memory Clamping  Isolation Daemon   Docker Engine
UC-06         Calculate Green Thermodynamic   System Admin       Compute Engine
              Metrics (PUE, WUE, Carbon)
UC-07         Query Air-Gapped RAG Copilot    Researcher         Local Ollama
UC-08         Execute Tri-Platform Benchmark  Researcher / Admin Benchmark Runner
UC-09         Release / Destroy vGPU Slice    Researcher / Admin Docker Engine
--------------------------------------------------------------------------------

USE CASE PRECONDITIONS AND FLOW OF EVENTS:
- For UC-01 (Provision Virtual GPU Slice):
  * Precondition: Physical device has sufficient unallocated VRAM and compute percentage.
  * Flow of Events: Actor selects physical GPU, inputs instance name, requested VRAM 
    (MB), and compute share (%). Control plane validates capacity, writes descriptor, 
    and initializes Docker container (`vgpu-<id>`).
  * Postcondition: Instance appears in active inventory with status `IDLE`.
- For UC-02 (Submit Machine Learning Job):
  * Precondition: At least one vGPU instance exists or job is queued for dispatch.
  * Flow of Events: Actor uploads Python script, specifies priority and target instance. 
    Scheduler enqueues job, dispatches to container via `docker exec`, streams stdout, 
    parses metrics, and returns model leaderboard upon completion.
================================================================================
"""

PAGES[31] = """================================================================================
                                   PAGE 31
================================================================================
4.3.2 USE CASE DIAGRAMS (CONTINUED)

FIG. 4.5: UML USE CASE DIAGRAM FOR V-GPU SYSTEM

                                 +--------------------------------------------+
                                 |                V-GPU PLATFORM              |
                                 |                                            |
                                 |    ( UC-01: Provision vGPU Slice )<--+     |
                                 |                   ^                  |     |
                                 |                   | <<include>>      |     |
                                 |    ( UC-09: Destroy vGPU Slice )     |     |
                                 |                                      |     |
    +------------------------+   |    ( UC-02: Submit ML Job )          |     |
    |                        |---+                   ^                  |     |
    |  STUDENT / RESEARCHER  |---|                   | <<extend>>       |     |
    |                        |---+    ( UC-08: Execute Benchmark )      |     |
    +------------------------+   |                                      |     |
                                 |    ( UC-04: Stream Telemetry )       |     |
                                 |                   ^                  |     |
                                 |                   |                  |     |
                                 |    ( UC-07: Query RAG Copilot )      |     |
                                 |                                      |     |
                                 |    ( UC-03: Set Scheduling Policy )  |     |
                                 |                   ^                  |     |
    +------------------------+   |                   |                  |     |
    |                        |---+-------------------+                  |     |
    |  SYSTEM ADMINISTRATOR  |---+                                      |     |
    |                        |---+--------------------------------------+     |
    +------------------------+   |    ( UC-06: Calculate Green PUE/WUE )      |
                                 |                                            |
                                 |    ( UC-05: Enforce CGroup Limits )        |
                                 |                   ^                        |
    +------------------------+   |                   |                        |
    |   ISOLATION DAEMON /   |---+-------------------+                        |
    |     DOCKER ENGINE      |   |                                            |
    +------------------------+   +--------------------------------------------+

As depicted in Figure 4.5, core operational responsibilities are partitioned cleanly. 
Researchers interact primarily with job execution, benchmarking, and the AI copilot, 
while Administrators maintain authority over policy configuration, capacity quotas, 
and environmental sustainability parameters. The Isolation Daemon operates autonomously 
in the background to enforce cgroup limits.
================================================================================
"""

PAGES[32] = """================================================================================
                                   PAGE 32
================================================================================
4.3.3 CLASS DIAGRAMS AND OBJECT-ORIENTED STRUCTURE

The internal architecture of V-GPU is constructed upon rigorous Object-Oriented 
Design (OOD) principles. Core business entities are encapsulated within domain 
classes that maintain internal state, enforce invariant business rules, and expose 
clean method interfaces.

PRIMARY CLASS DEFINITIONS:

1. `VGPUDevice` (`core/vgpu_driver.py`):
   Represents a physical or emulated GPU.
   - Attributes: `device_id: int`, `name: str`, `total_memory_mb: int`, 
     `allocated_memory_mb: int`, `total_compute_pct: int`, `allocated_compute_pct: int`, 
     `temperature_c: float`, `power_w: float`, `instances: Dict[str, VGPUInstance]`.
   - Methods: `has_capacity(vram_mb, compute_pct) -> bool`, `allocate_slice(instance)`, 
     `release_slice(instance_id)`, `poll_hardware_telemetry() -> dict`.

2. `VGPUInstance` (`core/vgpu_driver.py`):
   Represents an active virtual GPU partition bound to an isolated container.
   - Attributes: `instance_id: str`, `parent_device_id: int`, `memory_limit_mb: int`, 
     `compute_share_pct: int`, `status: InstanceStatus`, `container_id: str`, 
     `created_at: datetime`, `metrics: InstanceMetrics`.
   - Methods: `start_container() -> bool`, `stop_container() -> bool`, 
     `execute_script(command: str) -> ExecutionResult`, `clamp_memory()`.

3. `WorkloadScheduler` (`core/scheduler.py`):
   Manages job queueing, policy evaluation, and worker dispatching.
   - Attributes: `policy: SchedulingPolicy`, `job_queue: List[JobRecord]`, 
     `active_jobs: Dict[str, JobRecord]`, `time_quantum_ms: int`.
   - Methods: `enqueue_job(job: JobRecord) -> str`, `set_policy(new_policy)`, 
     `dispatch_next() -> Optional[JobAssignment]`, `reorder_queue()`.

4. `IsolationManager` (`core/isolation.py`):
   Supervises resource boundaries and policy enforcement.
   - Attributes: `polling_interval_s: float`, `violation_log: List[ViolationRecord]`.
   - Methods: `audit_active_instances()`, `inspect_cgroup_memory(container_id) -> int`, 
     `handle_violation(instance_id, excess_mb)`.

5. `RAGEngine` (`core/chatbot/rag_engine.py`):
   Coordinates semantic retrieval and air-gapped answer synthesis.
   - Attributes: `vector_store: VectorStore`, `chunker: ASTChunker`, `top_k: int`.
   - Methods: `index_codebase(root_path: str)`, `search_hybrid(query: str) -> List[Chunk]`, 
     `synthesize_answer(query: str, context: List[Chunk]) -> str`.
================================================================================
"""

PAGES[33] = """================================================================================
                                   PAGE 33
================================================================================
4.3.3 CLASS DIAGRAMS (CONTINUED)

FIG. 4.6: DETAILED OBJECT-ORIENTED CLASS DIAGRAM

+---------------------------------------+       1..* +-------------------------------+
|              VGPUDevice               |----------<>|          VGPUInstance         |
+---------------------------------------+            +-------------------------------+
| - device_id: int                      |            | - instance_id: str            |
| - name: str                           |            | - parent_device_id: int       |
| - total_memory_mb: int                |            | - memory_limit_mb: int        |
| - allocated_memory_mb: int            |            | - compute_share_pct: int      |
| - total_compute_pct: int              |            | - status: InstanceStatus      |
| - allocated_compute_pct: int          |            | - container_id: str           |
| - temperature_c: float                |            | - metrics: InstanceMetrics    |
| - power_w: float                      |            +-------------------------------+
+---------------------------------------+            | + start_container(): bool     |
| + has_capacity(vram, compute): bool   |            | + stop_container(): bool      |
| + allocate_slice(instance): void      |            | + execute_script(cmd): Result |
| + release_slice(inst_id): void        |            | + clamp_memory(): void        |
| + poll_hardware_telemetry(): dict     |            +-------------------------------+
+---------------------------------------+                            ^
                   ^                                                 | executes on
                   | manages                                         |
+---------------------------------------+            +-------------------------------+
|           WorkloadScheduler           |            |           JobRecord           |
+---------------------------------------+            +-------------------------------+
| - policy: SchedulingPolicy            | 1        * | - job_id: str                 |
| - job_queue: List[JobRecord]          |----------->| - script_content: str         |
| - active_jobs: Dict[str, JobRecord]   |            | - priority: int               |
| - time_quantum_ms: int                |            | - status: JobStatus           |
+---------------------------------------+            | - assigned_instance_id: str   |
| + enqueue_job(job): str               |            | - execution_latency_s: float  |
| + set_policy(policy): void            |            +-------------------------------+
| + dispatch_next(): JobAssignment      |                            ^
| + reorder_queue(): void               |                            | evaluates
+---------------------------------------+                            |
                   ^                                 +-------------------------------+
                   | supervises                      |       AutoMLPipeline          |
+---------------------------------------+            +-------------------------------+
|           IsolationManager            |            | - model_types: List[str]      |
+---------------------------------------+            | - best_model: str             |
| - polling_interval_s: float           |            | - leaderboard: List[dict]     |
| - violation_log: List[Violation]      |            +-------------------------------+
+---------------------------------------+            | + train_grid(data_path): dict |
| + audit_active_instances(): void      |            | + evaluate_metrics(): dict    |
| + inspect_cgroup_memory(c_id): int    |            +-------------------------------+
| + handle_violation(inst_id, excess): v|
+---------------------------------------+
================================================================================
"""

PAGES[34] = """================================================================================
                                   PAGE 34
================================================================================
4.3.4 ACTIVITY DIAGRAM: vGPU INSTANCE PROVISIONING

The UML Activity Diagram in Figure 4.7 models the discrete sequential and conditional 
steps executed during the provisioning of a virtual GPU slice.

FIG. 4.7: UML ACTIVITY DIAGRAM - vGPU INSTANCE PROVISIONING

                                 (*) Start
                                     |
                                     v
                       [ Receive Provision Request ]
                       [ (Target GPU, VRAM, Compute) ]
                                     |
                                     v
                       < Is Target GPU Recognized? >
                               /           \
                       [No]   /             \  [Yes]
                             v               v
                [ Raise 404 Not Found ]   [ Query VGPUDevice Capacity ]
                             |                       |
                             |                       v
                             |        < Does Capacity Satisify Quota? >
                             |                   /         \
                             |           [No]   /           \  [Yes]
                             |                 v             v
                             |    [ Raise 400 Insufficient ]  [ Deduct Memory & Compute ]
                             |    [      GPU Capacity      ]  [ From Available Pool     ]
                             |                 |                     |
                             |                 |                     v
                             |                 |          [ Create VGPUInstance Record ]
                             |                 |          [ Status = CREATING          ]
                             |                 |                     |
                             |                 |                     v
                             |                 |          [ Call Docker Engine API:    ]
                             |                 |          [ Launch 'vgpu-worker' Cont. ]
                             |                 |                     |
                             |                 |                     v
                             |                 |          < Did Container Start OK? >
                             |                 |                     /       \
                             |                 |             [No]   /         \  [Yes]
                             |                 |                   v           v
                             |                 |          [ Rollback Memory ] [ Set Status = IDLE ]
                             |                 |          [ Set Status = ERR] [ Register in Store ]
                             |                 |                   |                   |
                             +-----------------+-------------------+                   v
                                               |                              [ Return Success JSON ]
                                               v                                       |
                                           (*) End <-----------------------------------+
================================================================================
"""

PAGES[35] = """================================================================================
                                   PAGE 35
================================================================================
4.3.4 ACTIVITY DIAGRAM: JOB SCHEDULING & EXECUTION LOOP

Figure 4.8 illustrates the dynamic lifecycle of a machine learning job—from initial 
submission and policy sorting to container execution, cgroup memory auditing, 
regex metric parsing, and post-execution cleanup.

FIG. 4.8: UML ACTIVITY DIAGRAM - WORKLOAD SCHEDULING & EXECUTION

                                 (*) Start
                                     |
                                     v
                        [ Client Submits ML Job Script ]
                                     |
                                     v
                        [ Validate Payload & Priority ]
                                     |
                                     v
                        [ Enqueue Job in Queue D2 ]
                                     |
                                     v
                        [ Evaluate Active Policy: ]
                        [ FIFO / Fair-Share / SJF / Priority ]
                                     |
                                     v
                     < Is Matching vGPU Slice Idle? >
                                /         \
                        [No]   /           \  [Yes]
                              v             v
                     [ Remain Queued ]   [ Bind Job to Instance ]
                     [ Wait for Next ]   [ Set Slice = BUSY     ]
                     [ Polling Cycle ]              |
                              ^                     v
                              |          [ Execute via Docker Exec: ]
                              |          [ python3 user_script.py   ]
                              |                     |
                              |                     +--------------+
                              |                     |              |
                              |                     v              v
                              |          [ Audit Cgroups ] [ Stream Output ]
                              |          [ Memory Usage  ] [ To Buffer     ]
                              |                     |              |
                              |                     v              |
                              |          < Exceeded Limit? >       |
                              |                 /     \            |
                              |         [Yes]  /       \ [No]      |
                              |               v         v          |
                              |         [ Send SIGKILL] [ Continue]|
                              |         [ Log Violation]     |     |
                              |               |              |     |
                              |               +-------+------+     |
                              |                       |            |
                              |                       v            v
                              |          [ Wait for Process Exit & Collect Logs ]
                              |                     |
                              |                     v
                              |          [ Parse Accuracy, Loss, Epochs via Regex ]
                              |                     |
                              |                     v
                              |          [ Reset Slice = IDLE; Update Job = DONE ]
                              +---------------------+
                                                    |
                                                    v
                                                (*) End
================================================================================
"""

PAGES[36] = """================================================================================
                                   PAGE 36
================================================================================
4.3.5 SEQUENCE DIAGRAM: vGPU SLICING & PROVISIONING LIFECYCLE

The UML Sequence Diagram in Figure 4.9 details the chronological interaction of 
messages and control flows between the Presentation Client, API Gateway, Virtual 
Driver, and Docker Daemon during instance creation.

FIG. 4.9: UML SEQUENCE DIAGRAM - vGPU PROVISIONING LIFECYCLE

Client                 FastAPI Gateway        vGPU Driver          Docker Daemon
  |                           |                     |                    |
  |--- POST /api/vgpu/prov -->|                     |                    |
  |    {vram: 4096, comp: 50} |                     |                    |
  |                           |-- validate_req() -->|                    |
  |                           |                     |-- has_capacity() ->|
  |                           |                     |   (Internal check) |
  |                           |                     |<-- capacity_ok ----|
  |                           |                     |                    |
  |                           |                     |-- create_instance->|
  |                           |                     |   (Allocates VRAM) |
  |                           |                     |                    |
  |                           |                     |-- docker.run() --->|
  |                           |                     |   name: vgpu-01    |
  |                           |                     |   mem_limit: 4096M |
  |                           |                     |                    |
  |                           |                     |<-- container_id ---|
  |                           |                     |   (Status: IDLE)   |
  |                           |                     |                    |
  |                           |<-- instance_obj ----|                    |
  |<-- 200 OK (Instance JSON)-|                     |                    |
  |                           |                     |                    |
  |===================== TELEMETRY LOOP (1 Hz) ==========================|
  |                           |                     |                    |
  |                           |<-- poll_stats() ----|-- inspect_cont() ->|
  |                           |    (Mem, Temp, W)   |<-- raw_metrics ----|
  |<-- WS /ws/metrics (JSON) -|                     |                    |
  |    {inst_id, mem, temp}   |                     |                    |
  |                           |                     |                    |

As demonstrated in the sequence diagram, the control plane ensures atomic resource 
accounting: VRAM and compute quotas are reserved in the driver registry before the 
underlying Docker container is started. If the container creation fails, the 
allocation is rolled back immediately.
================================================================================
"""

PAGES[37] = """================================================================================
                                   PAGE 37
================================================================================
4.3.5 SEQUENCE DIAGRAM: MACHINE LEARNING JOB EXECUTION PIPELINE

Figure 4.10 documents the sequence of events during the execution of a machine 
learning training script, illustrating how job execution, cgroup memory supervision, 
regex metric parsing, and WebSocket broadcasting interact synchronously and 
asynchronously.

FIG. 4.10: UML SEQUENCE DIAGRAM - ML JOB EXECUTION & METRIC PARSING

Client             API Gateway         Scheduler        vGPU Worker       Isolation
  |                     |                  |                 |                |
  |-- POST /jobs/ml --->|                  |                 |                |
  |   {script, prio: 1} |                  |                 |                |
  |                     |-- enqueue(job) ->|                 |                |
  |                     |<-- job_id -------|                 |                |
  |<-- 202 Accepted ----|                  |                 |                |
  |                     |                  |-- check_idle() -|                |
  |                     |                  |   (Finds slice) |                |
  |                     |                  |                 |                |
  |                     |                  |-- exec_run() -->|                |
  |                     |                  |   (docker exec) |                |
  |                     |                  |                 |                |
  |                     |                  |                 |-- read cgroup->|
  |                     |                  |                 |   memory.usage |
  |                     |                  |                 |<- usage_bytes -|
  |                     |                  |                 |                |
  |                     |                  |<- stdout_stream-|                |
  |                     |                  |   (Epoch 1..N)  |                |
  |                     |                  |                 |                |
  |                     |                  |-- parse_regex()-|                |
  |                     |                  |   (Acc, Loss)   |                |
  |                     |                  |                 |                |
  |                     |<-- job_finished -|                 |                |
  |                     |    {status:DONE} |                 |                |
  |                     |                  |                 |                |
  |<-- WS Broadcast ----|                  |                 |                |
  |    {job_id, acc,    |                  |                 |                |
  |     loss, latency}  |                  |                 |                |
  |                     |                  |                 |                |
================================================================================
"""
