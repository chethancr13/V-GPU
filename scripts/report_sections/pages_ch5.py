# -*- coding: utf-8 -*-
"""Chapter 5: Implementation: Pages 38 to 52"""

PAGES = {}

PAGES[38] = """================================================================================
                                   PAGE 38
================================================================================
                                 CHAPTER 5
                              IMPLEMENTATION

5.1 MODULES DESCRIPTION: CONTROL PLANE & ASYNCHRONOUS API GATEWAY (`main.py`)

The primary entry point and central coordinator of the V-GPU platform is the 
asynchronous control plane implemented in `main.py`. Engineered using the high-
performance FastAPI framework on top of the Uvicorn Asynchronous Server Gateway 
Interface (ASGI), `main.py` provides non-blocking, concurrent handling of RESTful 
administrative requests and real-time WebSocket telemetry broadcasts.

KEY RESPONSIBILITIES & IMPLEMENTATION DETAILS:

1. Asynchronous Lifecycle and Singleton State Management:
   The control plane utilizes FastAPI's `lifespan` context manager to manage 
   startup and shutdown sequences. Upon boot, the application initializes the 
   singleton `VGPUDriver` instance, discovers attached physical NVIDIA GPUs via 
   NVML, connects to the local Docker daemon socket (`/var/run/docker.sock`), 
   and launches background worker tasks—including the 1 Hz WebSocket telemetry 
   broadcast loop and the isolation monitoring daemon.

2. RESTful Routing Architecture:
   Endpoints are cleanly partitioned into modular API routers:
   - `/api/vgpu/provision` (`POST`): Ingests JSON payloads validated by Pydantic 
     specifying target GPU index, instance name, memory quota (MB), and compute share 
     (%). Invokes `driver.create_vgpu_instance()`.
   - `/api/vgpu/list` (`GET`): Returns a comprehensive snapshot of all active, 
     allocated, and idle virtual slices, their parent device mappings, and current 
     telemetry.
   - `/api/vgpu/{instance_id}` (`DELETE`): Releases virtual slice resources, 
     destroys the underlying Docker container, and updates the hardware pool.
   - `/api/jobs/ml` (`POST`): Accepts user Python scripts, hyperparameters, and 
     priority weights, passing them to the multi-policy scheduling queue.
   - `/api/jobs/fleet` (`GET`): Exposes the distributed parallel cluster execution 
     state, demonstrating Amdahl's Law parallel scaling across multiple vGPU nodes.
   - `/api/gpu/physical` (`GET`): Exposes physical GPU hardware telemetry 
     (temperature, fan speed, power draw, VRAM allocation).

3. Bi-Directional WebSocket Streaming (`/ws/metrics`):
   Rather than requiring frontend clients to poll REST endpoints repeatedly (which 
   induces high HTTP header overhead and latency jitter), `main.py` establishes a 
   persistent WebSocket channel. A background loop polls system metrics every 1000 ms, 
   serializes the state into compact JSON, and broadcasts updates to all connected 
   clients concurrently using `asyncio.gather()`.
================================================================================
"""

PAGES[39] = """================================================================================
                                   PAGE 39
================================================================================
5.1 MODULES DESCRIPTION: VIRTUAL GPU DRIVER (`core/vgpu_driver.py`)

The hardware abstraction layer of V-GPU is encapsulated entirely within 
`core/vgpu_driver.py`. This module abstracts physical accelerators into software-
defined, sliceable entities, decoupling workload execution from specific silicon 
architectures.

KEY ARCHITECTURAL COMPONENTS:

1. Physical Hardware Modeling (`VGPUDevice`):
   The `VGPUDevice` class models a discrete GPU. It encapsulates physical capacity 
   attributes: total VRAM (e.g., 24,576 MB for an RTX 4090 or 81,920 MB for an A100), 
   allocated VRAM, total compute percentage (100%), allocated compute percentage, 
   clock frequencies, junction temperature, and power dissipation. 
   - Physical Driver Interfacing: The driver interfaces with NVIDIA hardware using 
     `pynvml` (NVIDIA Management Library). It queries device handles via 
     `nvmlDeviceGetHandleByIndex()`, reading real-time metrics such as memory utilization 
     via `nvmlDeviceGetMemoryInfo()` and temperature via `nvmlDeviceGetTemperature()`.
   - High-Fidelity Simulation Fallback: In environments lacking physical CUDA GPUs 
     (such as developer laptops or test runners), the driver activates an analytical 
     thermal and power simulation engine. It models dynamic temperature rise as a 
     differential function of compute load ($T_{t+1} = T_t + \alpha \cdot \text{Load} 
     - \beta \cdot (T_t - T_{\text{ambient}})$), ensuring realistic telemetry.

2. Virtual Slice Lifecycle Management (`VGPUInstance`):
   When `create_vgpu_instance()` is invoked, the driver validates that the requested 
   memory and compute do not exceed available unreserved margins:
   $$\text{VRAM}_{\text{requested}} \le \text{VRAM}_{\text{total}} - \text{VRAM}_{\text{allocated}}$$
   Upon successful validation, it commits the quota reservation and issues an 
   asynchronous call to the Docker engine client to create and start a container:
   ```python
   container = docker_client.containers.run(
       image="vgpu-worker:latest",
       name=f"vgpu-{instance_id}",
       detach=True,
       mem_limit=f"{memory_mb}m",
       memswap_limit=f"{memory_mb}m",
       environment={"VGPU_ID": instance_id, "COMPUTE_QUOTA": str(compute_pct)},
       network_mode="bridge"
   )
   ```
   This architecture ensures that physical memory is clamped at the operating system 
   cgroup level, preventing memory overcommit crashes.
================================================================================
"""

PAGES[40] = """================================================================================
                                   PAGE 40
================================================================================
5.1 MODULES DESCRIPTION: SCHEDULER & ISOLATION (`core/scheduler.py`, `core/isolation.py`)

WORKLOAD SCHEDULER (`core/scheduler.py`):
The scheduling subsystem arbitrates computational access across provisioned virtual 
slices. It manages an internal double-ended queue (`collections.deque`) of pending 
tasks and supports five dynamically selectable scheduling policies:

1. First-In-First-Out (FIFO): Jobs are dispatched strictly in the chronological order 
   of their submission timestamp.
2. Fair-Share Allocation: Tracks cumulative compute hours consumed by each tenant or 
   user token. Jobs belonging to users with the lowest historical compute utilization 
   are prioritized, ensuring equitable access in multi-tenant environments.
3. Priority-Based Scheduling: Tasks carry integer priority tags ($P \in [1, 10]$). 
   High-priority production jobs preempt or leapfrog low-priority batch jobs in the 
   queue.
4. Shortest Job First (SJF): Evaluates expected execution duration (estimated from 
   model parameter count and dataset token volume via scaling laws) and dispatches 
   the shortest tasks first, minimizing average queue wait time.
5. Round-Robin Time-Slicing: Dispatches jobs in fixed temporal execution quanta 
   (e.g., $\tau = 500\text{ ms}$). If a task exceeds its quantum, it yields the slice 
   and is re-enqueued at the tail of the active queue.

RESOURCE ISOLATION AND CGROUP SUPERVISOR (`core/isolation.py`):
While Docker provides static memory boundaries, dynamic multi-tenant workloads 
require active supervision to detect rogue memory spikes and compute contention. 
`core/isolation.py` implements an active monitoring daemon:
- The daemon polls container memory statistics via the Docker stats API and the 
  Linux virtual filesystem (`/sys/fs/cgroup/memory/docker/<container_id>/memory.usage_in_bytes`).
- Quota Violation Thresholds: If an active container exceeds 95% of its allocated 
  memory limit, the isolation manager logs a warning event (`ISOLATION_WARNING`).
- Hard Limit Enforcement: If an unhandled memory leak causes an allocation attempt 
  beyond 100% of the provisioned quota, the Linux kernel Out-Of-Memory (OOM) killer 
  traps the allocation. `core/isolation.py` captures the OOM event, marks the job 
  as `FAILED_OOM`, frees the locked virtual slice, and emits an administrative alert 
  over the WebSocket stream.
================================================================================
"""

PAGES[41] = """================================================================================
                                   PAGE 41
================================================================================
5.1 MODULES DESCRIPTION: AIR-GAPPED RAG COPILOT SUITE (`core/chatbot/`)

To support developers in secure and air-gapped environments, V-GPU incorporates a 
fully offline Retrieval-Augmented Generation (RAG) assistant. The pipeline comprises 
four specialized modules:

1. Structure-Aware AST and Markdown Chunker (`core/chatbot/chunker.py`):
   Standard text splitters split documents at arbitrary character boundaries, often 
   severing function headers from their implementation logic. The V-GPU chunker 
   utilizes Python’s native `ast` (Abstract Syntax Tree) module:
   - For Python files (`.py`), it navigates the AST, extracting top-level `FunctionDef`, 
     `AsyncFunctionDef`, and `ClassDef` nodes. Each chunk retains its full enclosing 
     class context, docstrings, and decorator metadata.
   - For technical documentation (`.md`), it splits documents hierarchically at 
     Markdown heading levels (`#`, `##`, `###`), preserving semantic cohesion.

2. Sub-Word Vectorizer and SQLite Storage (`core/chatbot/vector_store.py`):
   To operate with zero external dependencies and zero cloud API latency, the system 
   implements an in-house sub-word character-level n-gram and Term Frequency-Inverse 
   Document Frequency (TF-IDF) vectorizer. Chunks are converted into 512-dimensional 
   sparse-dense hybrid vector representations and stored in an indexed local SQLite 
   table (`knowledge_vectors.db`), accompanied by token inverted indices.

3. Hybrid BM25 and Cosine Retrieval Engine (`core/chatbot/rag_engine.py`):
   When a user submits a technical query (e.g., "How does the scheduler enforce memory 
   quotas?"), the retrieval engine executes a two-stage hybrid search:
   - Lexical Search: Computes BM25 Okapi probabilistic relevance scores over keyword 
     tokens to capture exact class names, function identifiers, and error strings.
   - Semantic Search: Computes Cosine Similarity between the query vector and 
     stored document vectors:
     $$\text{Cosine Sim}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2}$$
   - Reciprocal Rank Fusion (RRF): Combines lexical and semantic ranks to yield the 
     top-$k$ ($k=5$) most relevant codebase snippets.

4. Multi-Backend Synthesizer with Fallback:
   Retrieved context is injected into a strict system prompt. The query is routed to 
   a locally hosted LLM via Ollama (Qwen 2.5 7B, LLaMA-3). If no local LLM runtime 
   is active, an integrated deterministic template engine extracts matching docstrings 
   and code signatures to generate a structured, cited answer.
================================================================================
"""

PAGES[42] = """================================================================================
                                   PAGE 42
================================================================================
5.2 MODULEWISE ALGORITHMS: QUANTUM TIME-SLICING SCHEDULING ALGORITHM

ALGORITHM 5.1: ROUND-ROBIN QUANTUM TIME-SLICING SCHEDULER
--------------------------------------------------------------------------------
Input:  Queue of pending jobs $Q = \{J_1, J_2, \dots, J_n\}$;
        Available vGPU instances $I = \{inst_1, inst_2, \dots, inst_m\}$;
        Time quantum $\tau$ (in milliseconds).
Output: Deterministic job execution stream with starvation prevention.

 1: procedure RUN_SCHEDULER_LOOP($Q, I, \tau$)
 2:     while True do
 3:         Acquire lock on scheduler state
 4:         if $Q$ is empty then
 5:             Release lock
 6:             Sleep for polling interval (100 ms)
 7:             continue
 8:         end if
 9:
10:         for each instance $inst \in I$ do
11:             if $inst.\text{status} == \text{IDLE}$ and not $Q.\text{empty}()$ then
12:                 $J \leftarrow Q.\text{popleft}()$
13:                 if $J.\text{required\_vram} \le inst.\text{memory\_limit\_mb}$ then
14:                     $inst.\text{status} \leftarrow \text{BUSY}$
15:                     $inst.\text{current\_job} \leftarrow J$
16:                     Launch asynchronous worker thread:
17:                         RUN_QUANTUM_JOB($J, inst, \tau$)
18:                 else
19:                     // Re-enqueue job if current slice is too small
20:                     $Q.\text{append}(J)$
21:                 end if
22:             end if
23:         end for
24:         Release lock
25:         Sleep for tick duration (50 ms)
26:     end while
27: end procedure
28:
29: procedure RUN_QUANTUM_JOB($J, inst, \tau$)
30:     $t_{\text{start}} \leftarrow \text{CURRENT\_TIME}()$
31:     Start container execution via Docker exec
32:     while $J.\text{status} == \text{RUNNING}$ do
33:         $t_{\text{elapsed}} \leftarrow \text{CURRENT\_TIME}() - t_{\text{start}}$
34:         if $t_{\text{elapsed}} \ge \tau$ and not $J.\text{is\_finished}()$ then
35:             Pause container execution via `docker pause`
36:             $J.\text{status} \leftarrow \text{YIELDED}$
37:             $inst.\text{status} \leftarrow \text{IDLE}$
38:             $Q.\text{append}(J)$  // Place back at tail of queue
39:             return
40:         end if
41:         Sleep for sample interval (10 ms)
42:     end while
43:     $inst.\text{status} \leftarrow \text{IDLE}$
44:     $J.\text{status} \leftarrow \text{COMPLETED}$
45: end procedure
--------------------------------------------------------------------------------
================================================================================
"""

PAGES[43] = """================================================================================
                                   PAGE 43
================================================================================
5.2 MODULEWISE ALGORITHMS: CGROUP CLAMPING & ENFORCEMENT ALGORITHM

ALGORITHM 5.2: ACTIVE MEMORY CLAMPING & ISOLATION SUPERVISOR
--------------------------------------------------------------------------------
Input:  Active vGPU instances $I = \{inst_1, \dots, inst_m\}$;
        Warning threshold $\theta_{\text{warn}} = 0.90$;
        Hard violation threshold $\theta_{\text{hard}} = 1.00$.
Output: Isolation violation logging, dynamic throttling, and rogue job termination.

 1: procedure MONITOR_ISOLATION_CGROUPS($I, \theta_{\text{warn}}, \theta_{\text{hard}}$)
 2:     while True do
 3:         for each $inst \in I$ do
 4:             if $inst.\text{status} == \text{BUSY}$ then
 5:                 $c\_id \leftarrow inst.\text{container\_id}$
 6:                 // Read memory counter from Linux cgroups v2 hierarchy
 7:                 $usage \leftarrow \text{READ\_SYSFS}("/sys/fs/cgroup/memory/" + c\_id + "/memory.current")$
 8:                 $limit \leftarrow inst.\text{memory\_limit\_mb} \times 1024 \times 1024$
 9:                 $ratio \leftarrow usage / limit$
10:
11:                 // Update real-time instance telemetry record
12:                 $inst.\text{metrics}.\text{memory\_used\_bytes} \leftarrow usage$
13:                 $inst.\text{metrics}.\text{memory\_ratio} \leftarrow ratio$
14:
15:                 if $ratio \ge \theta_{\text{hard}}$ then
16:                     LOG_CRITICAL("Hard Quota Breach on Instance: " + inst.instance_id)
17:                     // Immediately terminate offending container process
18:                     DOCKER_KILL(c_id, signal="SIGKILL")
19:                     RECORD_VIOLATION(inst.instance_id, usage, limit, "OOM_KILL")
20:                     $inst.\text{status} \leftarrow \text{ERROR_CLAMPED}$
21:                     BROADCAST_WS_ALERT("MEMORY_HARD_BREACH", inst.instance_id)
22:
23:                 else if $ratio \ge \theta_{\text{warn}}$ then
24:                     LOG_WARNING("Memory Warning on Instance: " + inst.instance_id)
25:                     // Inject memory pressure throttle via cgroup shares
26:                     WRITE_SYSFS("/sys/fs/cgroup/cpu/" + c_id + "/cpu.weight", value=50)
27:                     RECORD_VIOLATION(inst.instance_id, usage, limit, "MEMORY_THROTTLE")
28:                     BROADCAST_WS_ALERT("MEMORY_WARNING_THROTTLE", inst.instance_id)
29:                 end if
30:             end if
31:         end for
32:         Sleep for audit period (1000 ms)
33:     end while
34: end procedure
--------------------------------------------------------------------------------
================================================================================
"""

PAGES[44] = """================================================================================
                                   PAGE 44
================================================================================
5.2 MODULEWISE ALGORITHMS: HYBRID COSINE-BM25 AST RETRIEVAL ALGORITHM

ALGORITHM 5.3: HYBRID RECIPROCAL RANK FUSION RETRIEVAL ENGINE
--------------------------------------------------------------------------------
Input:  User query string $Q$;
        Vector Database $D_{\text{vec}}$ containing chunks $C = \{c_1, \dots, c_N\}$;
        Inverted lexical index $D_{\text{lex}}$;
        Constant $k = 60$ for Reciprocal Rank Fusion.
Output: Ranked list of top-K relevant code and documentation chunks.

 1: procedure HYBRID_RETRIEVAL($Q, D_{\text{vec}}, D_{\text{lex}}, K$)
 2:     // Stage 1: Vector Space Semantic Search
 3:     $\vec{q} \leftarrow \text{COMPUTE\_NGRAM\_VECTOR}(Q)$
 4:     VectorScores $\leftarrow$ empty dictionary
 5:     for each chunk $c_i \in D_{\text{vec}}$ do
 6:         $\vec{v}_i \leftarrow c_i.\text{embedding}$
 7:         $\text{sim}_{\text{cos}} \leftarrow (\vec{q} \cdot \vec{v}_i) / (\|\vec{q}\|_2 \cdot \|\vec{v}_i\|_2)$
 8:         $\text{VectorScores}[c_i] \leftarrow \text{sim}_{\text{cos}}$
 9:     end for
10:     $R_{\text{vec}} \leftarrow \text{SORT\_DESCENDING}(\text{VectorScores})$
11:
12:     // Stage 2: Lexical BM25 Okapi Keyword Search
13:     $Tokens_Q \leftarrow \text{TOKENIZE}(Q)$
14:     BM25Scores $\leftarrow$ empty dictionary
15:     for each chunk $c_i \in D_{\text{lex}}$ do
16:         $score_{\text{bm25}} \leftarrow 0$
17:         for each token $t \in Tokens_Q$ do
18:             $IDF_t \leftarrow \ln\left(\frac{N - n(t) + 0.5}{n(t) + 0.5} + 1\right)$
19:             $TF \leftarrow \text{COUNT}(t, c_i.\text{tokens})$
20:             $denom \leftarrow TF + 1.2 \cdot (1 - 0.75 + 0.75 \cdot (|c_i| / \text{avg\_len}))$
21:             $score_{\text{bm25}} \leftarrow score_{\text{bm25}} + IDF_t \cdot \frac{TF \cdot (1.2 + 1)}{denom}$
22:         end for
23:         $\text{BM25Scores}[c_i] \leftarrow score_{\text{bm25}}$
24:     end for
25:     $R_{\text{bm25}} \leftarrow \text{SORT\_DESCENDING}(\text{BM25Scores})$
26:
27:     // Stage 3: Reciprocal Rank Fusion (RRF)
28:     RRF_Scores $\leftarrow$ empty dictionary
29:     for each chunk $c_i \in C$ do
30:         $\text{rank}_{\text{vec}} \leftarrow \text{GET\_RANK}(c_i, R_{\text{vec}})$
31:         $\text{rank}_{\text{bm25}} \leftarrow \text{GET\_RANK}(c_i, R_{\text{bm25}})$
32:         $\text{RRF\_Scores}[c_i] \leftarrow \frac{1}{k + \text{rank}_{\text{vec}}} + \frac{1}{k + \text{rank}_{\text{bm25}}}$
33:     end for
34:
35:     $FinalRanked \leftarrow \text{SORT\_DESCENDING}(\text{RRF\_Scores})$
36:     return $FinalRanked[0 \dots K-1]$
37: end procedure
--------------------------------------------------------------------------------
================================================================================
"""

PAGES[45] = """================================================================================
                                   PAGE 45
================================================================================
5.2 MODULEWISE CODE SNIPPETS: CORE DRIVER & CONTAINER EXECUTION

LISTING 5.1: DYNAMIC SLICE PROVISIONING (`core/vgpu_driver.py`)
```python
def create_vgpu_instance(self, device_id: int, instance_id: str, 
                         memory_limit_mb: int, compute_share_pct: int) -> dict:
    device = self.devices.get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Physical GPU not found")
    
    # Atomic capacity validation
    avail_mem = device.total_memory_mb - device.allocated_memory_mb
    avail_compute = device.total_compute_pct - device.allocated_compute_pct
    
    if memory_limit_mb > avail_mem or compute_share_pct > avail_compute:
        raise HTTPException(status_code=400, detail="Insufficient vGPU capacity")
    
    # Launch Docker worker container with hard cgroup memory clamp
    try:
        container = self.docker_client.containers.run(
            image="vgpu-worker:latest",
            name=f"vgpu-{instance_id}",
            detach=True,
            mem_limit=f"{memory_limit_mb}m",
            memswap_limit=f"{memory_limit_mb}m",
            environment={
                "VGPU_INSTANCE_ID": instance_id,
                "COMPUTE_SHARE": str(compute_share_pct)
            },
            network_mode="bridge"
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Docker creation failed: {exc}")
    
    # Deduct allocations and commit instance record
    device.allocated_memory_mb += memory_limit_mb
    device.allocated_compute_pct += compute_share_pct
    instance = VGPUInstance(
        instance_id=instance_id, parent_device_id=device_id,
        memory_limit_mb=memory_limit_mb, compute_share_pct=compute_share_pct,
        container_id=container.id, status=InstanceStatus.IDLE
    )
    device.instances[instance_id] = instance
    return instance.to_dict()
```
The implementation above ensures atomic capacity validation before the container 
is instantiated, preventing race conditions during concurrent provisioning requests.
================================================================================
"""

PAGES[46] = """================================================================================
                                   PAGE 46
================================================================================
5.3 MATHEMATICAL COMPUTE ENGINE & SCALING LAWS

The mathematical foundation of the V-GPU compute engine is implemented within 
`core/compute_engine.py` and `FORMULA_SHEET.txt`. It models deep learning computational 
scaling, cluster throughput, power draw, and thermodynamic water-cooling circuits.

1. THEORETICAL TRAINING FLOPS (KAPLAN & CHINCHILLA SCALING LAWS):
In autoregressive Transformer models, training requires computing billions of tensor 
contractions for every token of text. The empirical scaling formulations established 
by OpenAI (Kaplan et al., 2020) and DeepMind (Chinchilla, Hoffmann et al., 2022) 
prove that total training FLOPs scale as a linear product of model parameter count 
($N$) and dataset token count ($D$):

$$\text{FLOPs}_{\text{total}} = 6 \cdot N \cdot D$$

DERIVATION OF THE CONSTANT FACTOR (6):
The factor of 6 arises directly from the arithmetic mechanics of backward-mode 
automatic differentiation across linear layers ($y = Wx$):
- Forward Pass (2 FLOPs per parameter per token):
  For each weight in matrix $W$, computing $y = Wx$ requires 1 multiplication and 
  1 addition (1 Multiply-Accumulate / MAC operation = 2 floating-point operations).
- Backward Pass (4 FLOPs per parameter per token):
  The backward pass must compute two distinct Jacobian-vector products:
  1. Gradient of the scalar loss with respect to inputs: $\frac{\partial \mathcal{L}}{\partial x} = W^T \cdot \frac{\partial \mathcal{L}}{\partial y}$ (2 FLOPs)
  2. Gradient of the scalar loss with respect to weights: $\frac{\partial \mathcal{L}}{\partial W} = \frac{\partial \mathcal{L}}{\partial y} \cdot x^T$ (2 FLOPs)
- Total Operations: $2\text{ (forward)} + 4\text{ (backward)} = 6\text{ FLOPs/param/token}$.

WORKED NUMERICAL EXAMPLE:
Consider training a 70-Billion parameter foundation model ($N = 70 \times 10^9$) 
on a 300-Billion token corpus ($D = 300 \times 10^9$):
$$\text{FLOPs}_{\text{total}} = 6 \cdot (70 \times 10^9) \cdot (300 \times 10^9) = 6 \cdot 2.1 \times 10^{22} = 1.26 \times 10^{23}\text{ FLOPs}$$
This equals 126 ZettaFLOPs (0.126 YottaFLOPs) of cumulative arithmetic operations.
================================================================================
"""

PAGES[47] = """================================================================================
                                   PAGE 47
================================================================================
5.3 MATHEMATICAL COMPUTE ENGINE (CONTINUED)

2. TARGET COMPUTE THROUGHPUT (TFLOPS REQUIRED):
To convert cumulative training FLOPs into an actionable engineering delivery schedule, 
the compute engine calculates the required steady-state throughput rate:

$$\text{TFLOPs}_{\text{target}} = \frac{\text{FLOPs}_{\text{total}}}{T_{\text{seconds}} \cdot 10^{12}}$$

Where available time in seconds is computed from the delivery deadline:
$$T_{\text{seconds}} = \text{Target\_Days} \times 24\text{ hours/day} \times 3600\text{ seconds/hour} = \text{Target\_Days} \times 86,400$$

3. HARDWARE CLUSTER SIZING AND GPU COUNT:
Physical hardware accelerators never operate at 100% of their theoretical peak 
silicon throughput due to communication latency, memory bus stalls, and pipeline 
bubbles. The Model FLOPs Utilization (MFU) metric measures real-world efficiency:
$$\text{MFU} = \frac{\text{Observed Throughput (FLOPs/sec)}}{\text{Theoretical Peak Silicon FLOPs}}$$
Typical data-center MFU ranges from 35% to 50% ($0.35 \le \text{MFU} \le 0.50$).

The effective throughput delivered by a single accelerator is:
$$\text{TFLOPs}_{\text{effective\_per\_GPU}} = \text{Peak\_TFLOPs}_{\text{GPU}} \times \text{MFU}$$

Consequently, the minimum number of physical GPUs required to satisfy the delivery 
schedule is:
$$N_{\text{GPUs}} = \left\lceil \frac{\text{TFLOPs}_{\text{target}}}{\text{TFLOPs}_{\text{effective\_per\_GPU}}} \right\rceil = \left\lceil \frac{\text{TFLOPs}_{\text{target}}}{\text{Peak\_TFLOPs}_{\text{GPU}} \times \text{MFU}} \right\rceil$$

WORKED NUMERICAL EXAMPLE:
To train the 70B model ($1.26 \times 10^{23}$ FLOPs) within a 14-day window:
$$T_{\text{seconds}} = 14 \times 86,400 = 1,209,600\text{ seconds}$$
$$\text{TFLOPs}_{\text{target}} = \frac{1.26 \times 10^{23}}{1,209,600 \times 10^{12}} \approx 104,166.67\text{ TFLOPS}$$
Using NVIDIA H100 SXM5 accelerators (Peak FP16 Tensor Core = 989 TFLOPS) at an MFU 
of 42% ($\text{Effective} = 989 \times 0.42 = 415.38\text{ TFLOPS}$):
$$N_{\text{GPUs}} = \left\lceil \frac{104,166.67}{415.38} \right\rceil = \lceil 250.77 \rceil = 251\text{ H100 GPUs}$$
================================================================================
"""

PAGES[48] = """================================================================================
                                   PAGE 48
================================================================================
5.3 MATHEMATICAL COMPUTE ENGINE: PARALLEL SCALING & AMDAHL'S LAW

4. PARALLEL SPEEDUP AND COMMUNICATION OVERHEAD (AMDAHL'S LAW):
When distributed AI training scales across multiple vGPU slices or physical nodes, 
speedup is fundamentally constrained by the serial fraction of the workload and 
inter-node communication overhead (gradient synchronization via AllReduce).

Amdahl's Classical Law defines theoretical speedup $S(p)$ as a function of the 
parallelizable fraction ($f$) and processor count ($p$):
$$S(p) = \frac{1}{(1 - f) + \frac{f}{p}}$$

In distributed deep learning clusters, all-to-all and ring-AllReduce network transfers 
introduce an additional communication penalty term $c(p)$ that scales with cluster size:
$$S_{\text{real}}(p) = \frac{1}{(1 - f) + \frac{f}{p} + c(p)}$$
Where the communication penalty is modeled logarithmically:
$$c(p) = \gamma \cdot \ln(p)$$
Here, $\gamma \approx 0.02$ represents the network interconnect friction factor.

FIG. 5.1: PARALLEL SPEEDUP AND SCALING EFFICIENCY CURVES

Parallel Speedup S(p)
  60 |                                                  Theoretical Linear (f=1.0)
     |                                                 /
  50 |                                                /
     |                                               /  Amdahl (f=0.98)
  40 |                                         .----'
     |                                  .-----'
  30 |                           .-----'
     |                    .-----'
  20 |             .-----'                      Real Cluster with Network
     |      .-----'                             Communication Friction c(p)
  10 | .---'
     |-------------------------------------------------------
     0     8     16    24    32    40    48    56    64  (Worker Node Count p)

As shown in Figure 5.1, as the node count increases beyond 32 workers, communication 
overhead begins to dominate, causing scaling efficiency to diverge from ideal linear 
projections. V-GPU models this friction directly in its fleet scheduler.
================================================================================
"""

PAGES[49] = """================================================================================
                                   PAGE 49
================================================================================
5.4 THERMODYNAMIC WATER COOLING & GREEN COMPUTE ENGINE

The green computing architecture of V-GPU (`WaterComputePlanner.jsx` and 
`core/compute_engine.py`) models the environmental footprint of AI training.

1. DATA CENTER POWER USAGE EFFECTIVENESS (PUE):
Data center power consumption encompasses both compute silicon and auxiliary 
cooling, lighting, and power distribution systems:
$$\text{PUE} = \frac{\text{Total Facility Power (kW)}}{\text{IT Equipment Power (kW)}}$$
$$\text{Facility Power} = \text{IT Power} \times \text{PUE}$$
Where modern air-cooled facilities exhibit $\text{PUE} \approx 1.5$, while state-of-the-
art closed-loop liquid-cooled facilities achieve $\text{PUE} \approx 1.15$.

2. WATER USAGE EFFECTIVENESS (WUE):
In evaporative cooling towers, fresh water is continuously evaporated to reject 
condenser heat into the ambient atmosphere:
$$\text{WUE} = \frac{\text{Annual Water Consumption (Liters)}}{\text{IT Equipment Energy (kWh)}}$$
Total water evaporated during an AI training run of duration $T_{\text{hours}}$ is:
$$\text{Water}_{\text{liters}} = \text{IT Power (kW)} \times T_{\text{hours}} \times \text{WUE}$$

3. SENSIBLE HEAT DISSIPATION & CHILLER COOLANT FLOW RATE:
From the First Law of Thermodynamics, all electrical energy delivered to compute 
silicon is converted into sensible thermal energy:
$$\dot{Q} = P_{\text{thermal}} = \text{IT Power (kW)}$$
In a liquid-cooled cold-plate circuit, the required coolant mass flow rate ($\dot{m}$) 
to maintain safe junction temperatures is governed by the heat transfer equation:
$$\dot{Q} = \dot{m} \cdot C_p \cdot \Delta T$$
Where:
- $\dot{Q}$: Heat dissipation rate in Kilowatts ($\text{kJ/s}$).
- $\dot{m}$: Coolant mass flow rate ($\text{kg/s}$).
- $C_p$: Specific heat capacity of water ($4.184\text{ kJ/kg}\cdot^\circ\text{C}$).
- $\Delta T$: Temperature difference between chiller supply coolant ($T_{\text{in}}$) 
  and return coolant ($T_{\text{out}}$): $\Delta T = T_{\text{out}} - T_{\text{in}}$.

Solving for the volumetric water flow rate in Liters per Minute (LPM):
$$\text{Flow Rate (LPM)} = \frac{\dot{Q} \times 60}{\rho \cdot C_p \cdot \Delta T} = \frac{\dot{Q} \times 60}{1.0 \times 4.184 \times \Delta T} \approx \frac{14.34 \times \dot{Q}}{\Delta T}$$
================================================================================
"""

PAGES[50] = """================================================================================
                                   PAGE 50
================================================================================
5.4 THERMODYNAMIC WATER COOLING & GREEN COMPUTE ENGINE (CONTINUED)

FIG. 5.2: CLOSED-LOOP LIQUID COOLING AND CHILLER CIRCUIT

+-----------------------------------------------------------------------------+
|                          HIGH-DENSITY COMPUTE RACK                          |
|                                                                             |
|  +--------------------+  +--------------------+  +--------------------+     |
|  |   vGPU Node 01     |  |   vGPU Node 02     |  |   vGPU Node 03     |     |
|  | [Cold-Plate Blocks]|  | [Cold-Plate Blocks]|  | [Cold-Plate Blocks]|     |
|  +--------------------+  +--------------------+  +--------------------+     |
|            |                       |                       |                |
|            +-----------------------+-----------------------+                |
|                                    | Hot Return Coolant (Tout = 50°C)       |
+------------------------------------|----------------------------------------+
                                     v
+-----------------------------------------------------------------------------+
|                       PRIMARY HEAT EXCHANGER / CHILLER                      |
|                                                                             |
|      Liquid-to-Liquid / Liquid-to-Air Thermal Energy Transfer Core          |
|      Heat Dissipated: Q = m_dot * Cp * (Tout - Tin)                         |
|                                                                             |
|      +---------------------------------------------------------------+      |
|      |               Evaporative Cooling Tower Loop                  |      |
|      |   Water Consumed via Evaporation: WUE * Total_kWh (Liters)    |      |
|      +---------------------------------------------------------------+      |
+-----------------------------------------------------------------------------+
                                     |
                                     | Chilled Supply Coolant (Tin = 35°C, dT=15°C)
                                     v
                           [ Circulation Pump ]
                        (Flow Rate = 14.34 * Q / dT)
                                     |
                                     +-----> Returns to Rack Cold-Plates

WORKED THERMODYNAMIC CALCULATION:
For a 100 kW server cluster operating with a $15^\circ\text{C}$ coolant temperature 
differential ($\Delta T = 15^\circ\text{C}$):
$$\text{Flow Rate} = \frac{14.34 \times 100}{15} \approx 95.6\text{ Liters per Minute}$$
If the cluster trains for 14 days ($336\text{ hours}$) at a WUE of $1.8\text{ L/kWh}$:
$$\text{Total IT Energy} = 100\text{ kW} \times 336\text{ h} = 33,600\text{ kWh}$$
$$\text{Total Water Consumed} = 33,600\text{ kWh} \times 1.8\text{ L/kWh} = 60,480\text{ Liters of Fresh Water}$$
================================================================================
"""

PAGES[51] = """================================================================================
                                   PAGE 51
================================================================================
5.4 THERMODYNAMIC COOLING: THERMAL THROTTLING & DVFS MODEL

4. THERMAL THROTTLING AND SILICON RELIABILITY:
Silicon reliability and execution performance depend directly upon junction operating 
temperatures ($T_j$). On modern GPU microarchitectures, if cooling heat rejection 
fails to match instantaneous power dissipation, internal sensors trigger Dynamic 
Voltage and Frequency Scaling (DVFS) thermal throttling.

The V-GPU thermal model expresses dynamic junction temperature as:
$$T_j(t + \Delta t) = T_j(t) + \left( \frac{P_{\text{electrical}}(t)}{C_{\text{thermal}}} - \frac{T_j(t) - T_{\text{ambient}}}{R_{\text{thermal}}} \right) \cdot \Delta t$$
Where:
- $C_{\text{thermal}}$: Thermal capacitance of the silicon die and copper cold-plate 
  ($\approx 120\text{ J/}^\circ\text{C}$).
- $R_{\text{thermal}}$: Thermal resistance of the heatsink interface ($\approx 0.08^\circ\text{C/W}$).
- $T_{\text{ambient}}$: Ambient inlet air temperature ($25^\circ\text{C}$).

THERMAL THROTTLING GUARDRAIL FORMULATION:
When junction temperature surpasses the thermal threshold ($T_{\text{throttle}} = 83^\circ\text{C}$), 
the compute engine applies a frequency penalty multiplier $\eta_{\text{thermal}}$:

$$\eta_{\text{thermal}} = \begin{cases} 
1.0 & \text{if } T_j \le 83^\circ\text{C} \\
1.0 - 0.035 \times (T_j - 83) & \text{if } 83^\circ\text{C} < T_j \le 90^\circ\text{C} \\
0.50 \text{ (Emergency Clamp)} & \text{if } T_j > 90^\circ\text{C}
\end{cases}$$

At $88^\circ\text{C}$, the effective compute throughput is throttled by:
$$\eta_{\text{thermal}} = 1.0 - 0.035 \times (88 - 83) = 1.0 - 0.175 = 0.825\text{ (17.5\% throughput loss)}$$
This penalty extends training durations and degrades Model FLOPs Utilization (MFU), 
reinforcing the necessity of real-time thermodynamic scheduling.
================================================================================
"""

PAGES[52] = """================================================================================
                                   PAGE 52
================================================================================
5.4 THERMODYNAMIC COOLING: REGIONAL CARBON EMISSIONS MODELING

5. LOCALIZED CARBON FOOTPRINT MODELING:
Electrical power draw translates into greenhouse gas emissions based on the regional 
energy mix of the local electrical grid. The V-GPU green compute engine computes total 
carbon emissions in grams of $CO_2$ equivalent ($gCO_2e$):

$$\text{Carbon Emissions } (gCO_2e) = \text{Total Facility Energy (kWh)} \times \text{Grid Carbon Intensity } \left(\frac{gCO_2e}{\text{kWh}}\right)$$
$$\text{Carbon Emissions } (gCO_2e) = \left( \text{IT Power (kW)} \times \text{PUE} \times T_{\text{hours}} \right) \times I_{\text{grid}}$$

REGIONAL GRID EMISSION FACTORS ($I_{\text{grid}}$):
The engine embeds official regional grid emission factors (Electricity Maps / EPA):
- Coal-Heavy Grid (e.g., India National Average / US Midwest): $I_{\text{grid}} \approx 720\text{ }gCO_2e/\text{kWh}$
- Natural Gas Weighted Grid (e.g., California CAISO / ERCOT Texas): $I_{\text{grid}} \approx 380\text{ }gCO_2e/\text{kWh}$
- Low-Carbon Nuclear/Hydro Grid (e.g., France / Pacific Northwest): $I_{\text{grid}} \approx 55\text{ }gCO_2e/\text{kWh}$
- 100% Renewable Hydropower/Geothermal (e.g., Iceland / Norway): $I_{\text{grid}} \approx 15\text{ }gCO_2e/\text{kWh}$

COMPARATIVE ENVIRONMENTAL ANALYSIS:
For a 100 kW AI training run lasting 14 days ($33,600\text{ kWh}$ IT energy, $\text{PUE} = 1.25$, 
$\text{Total Facility Energy} = 42,000\text{ kWh}$):
- On a Coal-Dominant Grid:
  $$\text{Emissions} = 42,000\text{ kWh} \times 720\text{ }g/kWh = 30,240,000\text{ }gCO_2e = 30.24\text{ Metric Tons } CO_2$$
- On a Low-Carbon Hydro Grid:
  $$\text{Emissions} = 42,000\text{ kWh} \times 55\text{ }g/kWh = 2,310,000\text{ }gCO_2e = 2.31\text{ Metric Tons } CO_2$$

This represents a 13-fold reduction in carbon emissions for the exact same compute 
workload. By exposing these metrics directly within the UI, V-GPU empowers researchers 
to schedule intensive jobs during off-peak hours when green energy is abundant.
================================================================================
"""
