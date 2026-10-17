# -*- coding: utf-8 -*-
"""Chapters 1, 2, and 3: Pages 1 to 22"""

PAGES = {}

PAGES[1] = """================================================================================
                                   PAGE 1
================================================================================
                                 CHAPTER 1
                               INTRODUCTION

1.1 OVERVIEW

Over the past decade, high-performance computing (HPC) has undergone an unprecedented 
architectural pivot, driven almost exclusively by the exponential growth of deep learning, 
neural network architectures, and large-scale generative artificial intelligence (AI). 
Modern machine learning models—ranging from multi-billion parameter autoregressive 
transformers (e.g., LLaMA, GPT, Mistral, Qwen) to high-resolution diffusion networks 
and multi-modal perceptual backbones—exhibit computational complexities that scale 
super-linearly with model parameter count and dataset volume. 

Central Processing Units (CPUs), designed historically for low-latency scalar execution, 
complex branch prediction, and serialized instruction streams, are fundamentally 
incapable of sustaining the massive matrix multiply-accumulate (GEMM) throughput 
demanded by tensor contractions in neural forward and backward propagation passes. 
Consequently, discrete hardware accelerators, predominantly Graphics Processing Units 
(GPUs) equipped with thousands of specialized SIMD/SIMT (Single Instruction, Multiple 
Threads) cores and high-bandwidth memory (HBM), have become the indispensable bedrock 
of the global computational economy.

Despite their critical utility, access to physical GPU hardware represents one of the 
most severe structural bottlenecks facing modern computer science research, industrial 
prototyping, and academic education. Enterprise-grade accelerator units, such as the 
NVIDIA Hopper H100, Ampere A100, and Blackwell B200 architectures, carry acquisition 
costs ranging from tens of thousands to hundreds of thousands of dollars per chassis. 
These hardware platforms require specialized three-phase high-voltage power 
distribution units (PDUs), industrial liquid-chiller cooling infrastructure, and 
isolated data center footprints that remain completely inaccessible to undergraduate 
laboratories, independent research teams, and cost-constrained educational setups.

In typical university and enterprise research laboratories, physical GPUs are deployed 
in monolithic desktop workstations or shared departmental servers. Under conventional 
operating systems and standard container runtimes, hardware GPUs are assigned as 
monolithic, indivisible peripherals. When a single researcher or student initiates an 
interactive Python script, Jupyter notebook session, or small-scale convolutional 
inference task, the process locks access to the underlying hardware device or claims 
an uninhibited pool of GPU memory. Consequently, a user running an introductory model 
that requires only 1.5 Gigabytes (GB) of VRAM and consumes 12% compute capacity on a 
24 GB GPU effectively starves all other institutional peers from utilizing the 
remaining 22.5 GB of idle memory and 88% of unutilized floating-point execution units. 
This dynamic produces severe resource fragmentation and long queue wait times.
================================================================================
"""

PAGES[2] = """================================================================================
                                   PAGE 2
================================================================================
1.1 OVERVIEW (CONTINUED)

To counteract this profound imbalance between hardware scarcity and utilization 
inefficiency, the enterprise computing sector developed hardware-assisted GPU 
virtualization paradigms. Prominent implementations include NVIDIA vGPU based on 
Single Root I/O Virtualization (SR-IOV) and Multi-Instance GPU (MIG) partitioning. 
NVIDIA MIG, for example, allows an A100 or H100 accelerator to be carved into up to 
seven isolated physical GPU instances, each endowed with dedicated compute cores, 
isolated crossbar memory buses, and partitioned high-bandwidth memory slices.

However, these enterprise virtualization technologies impose severe economic and 
architectural barriers that render them unviable for the broader academic and 
open-source community:

1. Mandatory Enterprise Licensing: Commercial vGPU deployments require recurring, 
   per-concurrent-user software licenses (NVIDIA Virtual Compute Server / vCS or 
   NVIDIA RTX Virtual Workstation), incurring thousands of dollars annually in 
   software overhead alone.
2. Rigid Hardware Restrictions: Technologies such as MIG are strictly restricted 
   to flagship data-center class cards. Consumer-grade, workstation-class, and legacy 
   GPUs (such as NVIDIA GeForce RTX 3080/4090, RTX A4000/A5000, or Quadro cards), 
   which constitute over 90% of all hardware deployed across universities and small 
   enterprises, lack MIG hardware partitioning circuits entirely.
3. Complex Hypervisor Stacks: Traditional vGPU systems require bare-metal enterprise 
   hypervisors (such as VMware ESXi, Citrix Hypervisor, or Red Hat Enterprise Linux KVM), 
   eliminating portability across lightweight, containerized, and local development 
   environments.

The V-GPU project addresses this critical gap by designing and implementing an open, 
lightweight, container-native virtual GPU resource management, multi-tenant slicing, 
and sustainable AI compute orchestration platform. Rather than relying upon proprietary 
hypervisor kernels, V-GPU engineers an asynchronous control plane in Python (FastAPI), 
utilizing Linux namespaces, Control Groups (cgroups), Docker container isolation, and a 
virtual GPU driver model to deliver fine-grained, dynamic slicing of compute capacity 
and VRAM quotas.

Simultaneously, V-GPU recognizes that expanding AI compute infrastructure imposes a 
heavy environmental burden. Training modern deep neural networks consumes gigawatt-hours 
of electrical power and evaporates millions of liters of fresh water in cooling towers. 
V-GPU directly incorporates a first-principles thermodynamic water and power engine, 
tracking Power Usage Effectiveness (PUE), Water Usage Effectiveness (WUE), sensible 
heat dissipation, and carbon emission intensities. Finally, to eliminate technical 
opacity, the platform integrates an air-gapped Retrieval-Augmented Generation (RAG) 
AI copilot that inspects codebase abstract syntax trees (ASTs) and run telemetry locally, 
without external cloud API dependencies.
================================================================================
"""

PAGES[3] = """================================================================================
                                   PAGE 3
================================================================================
1.2 PROBLEM STATEMENT

The core problem addressed by this project is formulated as follows:

"Contemporary artificial intelligence infrastructure suffers from severe economic, 
computational, and operational access barriers caused by the indivisible, monolithic 
allocation of discrete GPU accelerators, the exorbitant licensing overhead of 
proprietary hardware virtualization solutions, the lack of real-time thermodynamic 
and environmental accountability in workload scheduling, and the privacy hazards of 
cloud-dependent AI assistance in secure research environments."

This core problem can be decomposed into four interrelated sub-problems:

1. MONOLITHIC ALLOCATION AND SEVERE RESOURCE FRAGMENTATION:
In academic institutions and collaborative development environments, GPUs are 
typically mounted as monolithic hardware devices within individual workstations or 
shared servers. Operating systems lack native multi-tenant slicing for consumer and 
workstation GPUs. When an interactive session (e.g., Jupyter Notebook, PyTorch 
interactive shell, or data preprocessing script) requests the GPU, it frequently locks 
the entire card or pre-allocates the entire VRAM address space through PyTorch's 
internal caching memory allocator (`cudaMalloc` caching). As an empirical consequence, 
measured average GPU compute utilization across university laboratories hovers between 
15% and 30%, while dozens of other researchers and students remain blocked in 
unproductive queue states.

2. LICENSING BARRIERS AND PROPRIETARY VIRTUALIZATION LOCK-IN:
Commercial solutions that partition GPU hardware (such as NVIDIA vGPU and NVIDIA MIG) 
are engineered for high-margin enterprise data centers. These solutions require 
expensive proprietary grid licenses, enterprise server management infrastructure, and 
specialized server hardware. Commercial virtualization does not function on consumer 
or workstation GPUs. Educational institutions and budget-constrained research teams 
are thus forced into a binary dilemma: either operate with inefficient, unmanaged 
monolithic access or migrate their computational workloads to commercial public clouds 
(e.g., AWS, GCP, Azure), which incur uncontrollable ongoing operational expenditures.
================================================================================
"""

PAGES[4] = """================================================================================
                                   PAGE 4
================================================================================
1.2 PROBLEM STATEMENT (CONTINUED)

3. NEGLECT OF THERMODYNAMIC AND ENVIRONMENTAL IMPACT IN SCHEDULING:
Traditional workload schedulers (e.g., Slurm, Kubernetes kube-scheduler, Docker Swarm) 
treat compute nodes purely as abstract vectors of CPU cores and memory allocations. 
They completely ignore the underlying thermodynamic realities of high-density AI 
clusters, including heat dissipation rates, cooling water consumption in evaporative 
cooling towers, regional electricity grid carbon intensities, and ambient thermal 
throttling risks. 

Training a single 70-billion-parameter language model or executing large-scale hyper-
parameter search grids can draw hundreds of kilowatts of steady-state electrical power. 
In data centers utilizing evaporative water-cooling economizers, cooling towers consume 
between 1.5 to 3.0 liters of fresh water per kilowatt-hour of IT energy consumed. Without 
an integrated thermodynamic compute planner that couples workload queuing to Power Usage 
Effectiveness (PUE), Water Usage Effectiveness (WUE), and chiller flow rates, 
data-center and laboratory operators face escalating utility bills, thermal throttling 
penalties, and unmonitored carbon footprints.

4. CODE TRANSPARENCY AND AIR-GAPPED SECURITY IN AI ASSISTANCE:
Modern developers increasingly rely on generative AI assistants (e.g., GitHub Copilot, 
OpenAI ChatGPT, Anthropic Claude) to comprehend complex virtualization codebases, debug 
distributed training scripts, and analyze system telemetry. However, in enterprise, 
defense, healthcare, and academic research settings, codebases, experimental models, 
and datasets are subject to strict Intellectual Property (IP) constraints, Non-Disclosure 
Agreements (NDAs), and air-gapped data confidentiality mandates. 

Transmitting proprietary algorithmic logic and raw telemetry data across public cloud 
APIs exposes organizations to data leakage risks, compliance violations, and external 
service outages. Existing solutions lack an embedded, 100% local, air-gapped 
Retrieval-Augmented Generation (RAG) system capable of parsing raw codebase Abstract 
Syntax Trees (ASTs), markdown specifications, and execution logs to provide grounded, 
verifiable technical explanations on local compute.
================================================================================
"""

PAGES[5] = """================================================================================
                                   PAGE 5
================================================================================
1.3 OBJECTIVES

To resolve the aforementioned challenges, the primary objective of this project is to 
design, architect, implement, benchmark, and validate the "V-GPU" Sustainable Virtual 
Compute Engine and Multi-Tenant Slicing Platform. 

The specific, measurable technical objectives are as follows:

1. DESIGN AND IMPLEMENT A CONTAINER-NATIVE vGPU CONTROL PLANE:
   - Construct a lightweight, asynchronous control plane in Python using FastAPI, 
     Pydantic, and asyncio to manage the full lifecycle of virtual GPU instances.
   - Implement dynamic virtual slicing capable of provisioning arbitrary memory 
     quotas (e.g., 256 MB to 32 GB) and fractional compute allocations (e.g., 10% to 100%) 
     without requiring bare-metal hypervisor installations.
   - Decouple the hardware interface through a software driver layer (`core/vgpu_driver.py`) 
     supporting real-time simulated telemetry emulation and physical NVIDIA NVML hooks.

2. DEVELOP A MULTI-POLICY WORKLOAD SCHEDULER & PROCESS ISOLATION ENGINE:
   - Architect a deterministic job scheduler (`core/scheduler.py`) supporting five 
     pluggable dispatch policies: First-In-First-Out (FIFO), Fair-Share, Priority-Based, 
     Shortest Job First (SJF), and Round-Robin Time-Slicing with configurable quantum limits.
   - Implement process-level cgroup and namespace isolation (`core/isolation.py`) to 
     enforce hard memory clamping, prevent noisy-neighbor starvation, and automatically 
     log or terminate rogue processes that exceed their provisioned quota limits.

3. CONSTRUCT AN END-TO-END THERMODYNAMIC GREEN COMPUTE PLANNER:
   - Formulate and code a rigorous mathematical thermodynamic engine (`core/compute_engine.py` 
     and `WaterComputePlanner.jsx`) that computes theoretical model training FLOPs via 
     Kaplan and Chinchilla scaling laws ($FLOPs = 6ND$).
   - Dynamically compute cluster power consumption, sensible heat dissipation ($\dot{Q} = 
     \dot{m} C_p \Delta T$), required chiller coolant circulation flow rates, PUE, WUE, 
     and localized carbon emissions (grams of $CO_2$ equivalent) based on user-defined 
     regional power grids.
================================================================================
"""

PAGES[6] = """================================================================================
                                   PAGE 6
================================================================================
1.3 OBJECTIVES (CONTINUED)

4. BUILD AN IN-HOUSE AUTOMATION & SCRATCH-BUILT AUTOML PIPELINE:
   - Implement an automated model search and evaluation engine (`core/automl_engine.py`) 
     that trains multiple classification and regression backbones (Random Forests, 
     Gradient Boosting, Deep Neural Networks, Logistic Classifiers) across provisioned 
     vGPU slices.
   - Extract real-time performance metrics (validation accuracy, log loss, training 
     speed, epoch latencies) and compile a dynamic model leaderboard directly inside 
     the user dashboard.

5. IMPLEMENT AN AIR-GAPPED HYBRID RAG AI COPILOT:
   - Engineer an intelligent conversational assistant (`core/chatbot/`) that operates 
     entirely on local compute without communicating with external third-party cloud APIs.
   - Implement a syntax-aware AST chunker for Python source code (`chunker.py`) and a 
     heading-based chunker for Markdown technical documentation.
   - Deploy a sub-word character-level n-gram and TF-IDF vectorizer coupled with a 
     local SQLite vector store (`vector_store.py`) executing hybrid Cosine Similarity 
     and BM25 keyword retrieval.
   - Provide fallback generation capabilities connecting to local Ollama instances 
     (e.g., Qwen 2.5, LLaMA-3) or an integrated deterministic template synthesizer.

6. DELIVER A MODERN, HIGH-PERFORMANCE USER INTERFACE:
   - Build a responsive, reactive presentation tier using React 18, Vite, and modern 
     CSS glassmorphism, featuring live 1 Hz bi-directional WebSocket telemetry streaming.
   - Embed a 3D hardware accelerator visualization module (`BoltAccelerator3D.jsx`) 
     and dynamic virtualization topology map (`VirtualizationTopology.jsx`).
   - Package the full client into a native cross-platform desktop shell utilizing Rust 
     and Tauri to achieve minimal memory footprint and zero browser runtime overhead.

7. VALIDATE SYSTEM PERFORMANCE VIA EMPIRICAL BENCHMARKING:
   - Conduct extensive tri-platform comparative benchmarking evaluating V-GPU against 
     local Jupyter notebook environments and Google Colab cloud runtimes across cold-start 
     latency, peak memory consumption, and multi-tenant fairness.
================================================================================
"""

PAGES[7] = """================================================================================
                                   PAGE 7
================================================================================
                                 CHAPTER 2
                            LITERATURE SURVEY

2.1 EVOLUTION OF GPU ARCHITECTURES & HARDWARE VIRTUALIZATION

Graphics Processing Units (GPUs) were originally conceived as fixed-function 
pipeline hardware tailored specifically for rasterization, texture mapping, 
and 3D rendering primitives. The advent of programmable vertex and pixel shaders 
in the early 2000s catalyzed the General-Purpose Computing on Graphics 
Processing Units (GPGPU) revolution. With the launch of NVIDIA’s Compute Unified 
Device Architecture (CUDA) in 2006 and the Khronos Group’s OpenCL standard in 
2008, developers gained the ability to express massively parallel arithmetic 
algorithms directly onto thousands of streaming processor cores using high-level 
programming languages.

Over successive microarchitectural generations—from Tesla and Fermi to Kepler, 
Maxwell, Pascal, Volta, Turing, Ampere, and Hopper—GPU hardware evolved from simple 
SIMD (Single Instruction, Multiple Data) execution arrays into sophisticated SIMT 
(Single Instruction, Multiple Threads) compute engines. Volta and subsequent 
architectures introduced specialized hardware execution units known as Tensor 
Cores. Tensor Cores execute mixed-precision matrix multiply-accumulate operations 
($D = A \times B + C$) in a single clock cycle, delivering orders-of-magnitude 
higher computational density for deep learning operations.

However, operating systems historically managed GPUs as secondary peripheral 
devices rather than primary computational resources. Under standard PCI Express 
(PCIe) topologies, a GPU is mounted as a discrete endpoint controlled by a kernel-
mode driver. Early virtualization efforts relied on Direct Device Assignment 
(PCI Passthrough), wherein an entire physical GPU was assigned exclusively to a 
single Virtual Machine (VM). While PCI Passthrough delivers near-native bare-metal 
execution performance, it completely prevents multi-tenant sharing: one VM monopolizes 
the entire card, causing massive resource waste when executing bursty or light workloads.

To overcome the limitations of monolithic assignment, the PCI Special Interest Group 
(PCI-SIG) standardized Single Root I/O Virtualization (SR-IOV). SR-IOV enables a 
single physical PCIe device (known as a Physical Function, or PF) to replicate 
multiple lightweight, virtualized PCIe configuration spaces (known as Virtual 
Functions, or VFs). In GPU architectures supporting SR-IOV, each Virtual Function 
is exposed directly to the guest VM’s operating system through hypervisor hardware 
translation mechanisms such as Intel VT-d or AMD-Vi I/O Memory Management Units 
(IOMMUs). While SR-IOV provides strong hardware-level isolation, its implementation 
requires specialized on-chip virtualization logic and dedicated microcode support.
================================================================================
"""

PAGES[8] = """================================================================================
                                   PAGE 8
================================================================================
2.1 EVOLUTION OF GPU ARCHITECTURES & HARDWARE VIRTUALIZATION (CONTINUED)

The evolution of GPU virtualization can be classified into four distinct architectural 
paradigms, each balancing performance, isolation, and flexibility differently:

1. API Remoting and Wrapper Interception:
   Early academic and open-source frameworks (e.g., rCUDA, gVirt, GVirtuS) operated at 
   the user-space library level. These systems intercepted standard CUDA or OpenCL API 
   runtime calls made by guest applications, marshaled the function arguments and 
   memory buffers over TCP/IP sockets or shared memory channels, and re-executed the 
   calls on the host machine using a background daemon. While API remoting is hardware-
   agnostic and does not require specialized GPU silicon, it introduces severe memory 
   transfer bottlenecks over network links, lacks support for undocumented CUDA driver 
   APIs, and struggles with synchronization latency during frequent host-device memory 
   copies (`cudaMemcpy`).

2. Mediated Pass-Through and Hypervisor Emulation:
   In mediated pass-through architectures (e.g., Intel GVT-g, early NVIDIA GRID), 
   critical performance-sensitive operations (such as shader execution and direct 
   command ring buffer access) are passed directly to the hardware without hypervisor 
   trapping. Conversely, privileged control operations (such as GPU memory page table 
   allocation, display configuration, and interrupt dispatching) are trapped and 
   emulated by a mediator kernel module running in the host hypervisor. This hybrid 
   approach delivers near-native compute speeds while enabling multi-VM time-slicing. 
   However, it relies on complex kernel-level hypervisor patches and proprietary driver 
   hooks.

3. Hardware-Partitioned Multi-Instance Architectures:
   Introduced in the NVIDIA Ampere (A100) and Hopper (H100) data-center architectures, 
   Multi-Instance GPU (MIG) represents the pinnacle of hardware-level isolation. MIG 
   physically partitions the silicon die into up to seven independent GPU instances. 
   Each instance possesses its own dedicated streaming multiprocessors (SMs), memory 
   crossbar interconnects, L2 cache segments, and High-Bandwidth Memory (HBM) banks. 
   Because execution resources are physically isolated at the hardware level, cross-
   tenant cache contention, memory bus saturation, and noisy-neighbor side-channel 
   attacks are completely eradicated.

4. Container-Native Software-Defined Virtualization:
   The latest paradigm—pioneered conceptually by this project (V-GPU)—decouples the 
   control and allocation plane from physical silicon constraints. By leveraging 
   Linux namespaces, control groups (cgroups v2), and container runtimes, compute 
   percentage shares and VRAM address bounds can be dynamically enforced in software. 
   This provides fine-grained, elastic multi-tenancy across any commodity, workstation, 
   or consumer-grade GPU without requiring proprietary hardware hypervisor licenses.
================================================================================
"""

PAGES[9] = """================================================================================
                                   PAGE 9
================================================================================
2.2 COMMERCIAL GPU VIRTUALIZATION SOLUTIONS: NVIDIA vGPU AND NVIDIA MIG

To evaluate the engineering context of V-GPU, a rigorous examination of prevailing 
commercial virtualization solutions is essential. The two dominant commercial 
technologies in high-performance computing are NVIDIA vGPU and NVIDIA MIG.

NVIDIA vGPU (VIRTUAL GPU SOFTWARE SUITE):
NVIDIA vGPU is a commercial software platform designed to virtualize physical NVIDIA 
GPUs across enterprise hypervisors, including VMware ESXi, Citrix Hypervisor, and Red 
Hat Enterprise Linux KVM. Under NVIDIA vGPU, a software manager installed inside the 
hypervisor creates multiple virtual GPU instances from a single physical card. Each VM 
receives a dedicated virtual GPU driver that interacts directly with the assigned slice.

NVIDIA vGPU operates primarily through temporal time-slicing combined with spatial 
framebuffer (VRAM) partitioning:
- Framebuffer Allocation: VRAM is statically carved into fixed power-of-two partitions 
  (e.g., 2GB, 4GB, 8GB, 16GB). Once an instance is provisioned, its memory boundary is 
  rigid and cannot be dynamically adjusted without destroying and recreating the virtual 
  profile.
- Time-Slicing Scheduling: Compute cores (Streaming Multiprocessors) are shared 
  temporally. The hypervisor scheduler grants round-robin time slices (typically 1 to 
  10 milliseconds) to each active VM. A context switch involves saving the active 
  thread registers and state of the current VM, flushing the instruction pipeline, 
  and restoring the register state of the next VM.

CRITICAL DRAWBACKS OF COMMERCIAL vGPU:
1. Enterprise Licensing Overhead: NVIDIA vGPU is not sold as a perpetual consumer 
   product. It requires annual subscription licenses under tiers such as NVIDIA Virtual 
   Compute Server (vCS) for AI/HPC workloads. These licenses cost between $250 and 
   $1,000 per concurrent GPU user annually, creating an insurmountable economic barrier 
   for universities, colleges, and independent development teams.
2. Mandatory Enterprise Hardware: Commercial vGPU drivers strictly refuse to load on 
   consumer-tier GPUs (e.g., GeForce RTX 3080, 4090) or uncertified workstations. They 
   enforce a software lock that requires certified enterprise cards (e.g., A40, A100, 
   L40S), which sell at massive hardware markups.
3. Rigid Partitioning Ratios: vGPU profiles enforce fixed split profiles. If a host 
   allocates an 8GB profile on an A40 card, all other instances on that physical GPU 
   must typically adopt identical profile geometries, severely limiting multi-tenant 
   heterogeneity.
================================================================================
"""

PAGES[10] = """================================================================================
                                   PAGE 10
================================================================================
2.2 COMMERCIAL GPU VIRTUALIZATION SOLUTIONS (CONTINUED)

NVIDIA MULTI-INSTANCE GPU (MIG):
Introduced with the Ampere microarchitecture, NVIDIA MIG represents an engineering 
milestone in true spatial hardware partitioning. Unlike traditional vGPU systems that 
rely on temporal time-slicing and software-managed context switching, MIG partitions 
a single physical GPU die into up to seven physically independent instances (e.g., on 
the A100-80GB and H100-80GB accelerators).

Key architectural features of MIG include:
- Dedicated Compute and Memory Crossbars: Each MIG instance is assigned a discrete 
  number of GPU Processing Clusters (GPCs), a dedicated slice of the shared L2 cache, 
  and independent High-Bandwidth Memory (HBM2e) controllers.
- Guaranteed Quality of Service (QoS): Because memory buses, caches, and execution 
  units are physically uncoupled, memory bandwidth saturation caused by one tenant 
  (e.g., an intensive LLM inference batch) has zero impact on the execution latency 
  or memory bandwidth of a neighboring tenant.
- Fault Isolation: A hardware exception, memory fault, or CUDA kernel crash within 
  one MIG slice does not affect adjacent slices; only the offending instance is reset.

LIMITATIONS OF HARDWARE MIG PARTITIONING:
While MIG provides hardware isolation, its practical real-world adoption is constrained 
by several architectural and operational limitations:

1. Silicon Exclusion: MIG is completely absent from all consumer, workstation, and mid-
   tier data-center GPUs. Neither RTX 30/40 series cards nor data-center inference 
   cards (such as the NVIDIA T4 or L4) possess the physical GPC crossbar switches 
   necessary for MIG.
2. Inelastic Allocation Profiles: MIG partitions can only be established using strictly 
   defined hardware ratios:
   - 1g.10gb (1 GPC, 10 GB HBM)
   - 2g.20gb (2 GPCs, 20 GB HBM)
   - 3g.40gb (3 GPCs, 40 GB HBM)
   - 4g.40gb (4 GPCs, 40 GB HBM)
   - 7g.80gb (Full chip)
   An administrator cannot allocate an arbitrary slice such as 3.5 GB of VRAM or 15% 
   compute share for an introductory student training job.
3. Cold Reconfiguration Latency: Creating or altering MIG geometries requires all 
   active workloads on the entire physical card to be completely terminated, followed 
   by a destructive reconfiguration of the device partitions. Dynamic, on-the-fly 
   auto-scaling without downtime is impossible.
================================================================================
"""

PAGES[11] = """================================================================================
                                   PAGE 11
================================================================================
2.3 CONTAINERIZED GPU RUNTIMES AND CLUSTER SCHEDULERS

To mitigate the hypervisor overhead of classical virtual machines, modern software 
engineering has converged heavily toward containerization platforms, predominantly 
Docker and Open Container Initiative (OCI) runtimes. In cloud-native AI pipelines, 
GPU workloads are packaged inside lightweight Linux containers encapsulating 
deep learning frameworks (PyTorch, TensorFlow, JAX), CUDA runtime libraries, and 
system dependencies.

THE NVIDIA CONTAINER TOOLKIT:
To expose hardware GPUs inside Linux containers, NVIDIA developed the NVIDIA 
Container Toolkit (formerly `nvidia-docker`). The architecture consists of:
- An OCI Prestart Hook (`nvidia-container-runtime-hook`)
- A container CLI library (`libnvidia-container`)
- An OCI runtime wrapper (`nvidia-container-runtime`)

When a container is launched with the `--gpus all` or `--gpus '"device=0"'` flag, 
the runtime inspects the host, identifies the NVIDIA character devices located in 
`/dev` (e.g., `/dev/nvidia0`, `/dev/nvidiactl`, `/dev/nvidia-uvm`), and injects 
these character devices along with the host’s user-mode driver libraries (`libcuda.so`, 
`libnvidia-ml.so`) into the container's private mount namespace.

FUNDAMENTAL DEFICIENCIES OF RAW CONTAINER TOOLKITS:
While the NVIDIA Container Toolkit successfully passes physical GPUs into containers, 
it lacks fundamental resource-management, scheduling, and multi-tenancy capabilities:
1. No Fine-Grained Memory Quotas: The container runtime mounts the entire GPU device 
   node. A process inside the container can allocate the entire physical VRAM address 
   space unless the developer manually sets application-level environment flags 
   (such as `CUDA_VISIBLE_DEVICES` or PyTorch memory fractional caps).
2. Absence of Centralized Scheduling: The toolkit is purely a low-level device 
   injection utility. It has no awareness of job queues, user priorities, fair-share 
   algorithms, or execution deadlocks.
3. Starvation Vulnerability: Multiple containers mounted to the same physical GPU 
   compete directly on the hardware’s unmanaged internal command queues, causing 
   severe context-switch thrashing and memory starvation.

CLOUD CLUSTER SCHEDULERS (KUBERNETES, SLURM, RAY):
At the enterprise scale, distributed schedulers orchestrate cluster compute:
- Slurm (Simple Linux Utility for Resource Management): A staple of academic HPC, 
  Slurm assigns jobs to nodes via Generic Resource (GRES) GPU plugins. However, Slurm 
  historically schedules whole GPUs and requires complex root-level configuration.
- Kubernetes with GPU Operator: Kubernetes deploys the NVIDIA GPU Operator to expose 
  `nvidia.com/gpu` integer resources to Pods. While robust, Kubernetes imposes 
  enormous memory and control-plane overhead, making it impractical for lightweight, 
  single-workstation, or lab-scale testbeds.
================================================================================
"""

PAGES[12] = """================================================================================
                                   PAGE 12
================================================================================
2.3 CONTAINERIZED RUNTIMES AND CLUSTER SCHEDULERS (CONTINUED)

TABLE 2.1: COMPARATIVE ARCHITECTURAL MATRIX OF EXISTING GPU VIRTUALIZATION SYSTEMS

--------------------------------------------------------------------------------
Feature / Metric      NVIDIA vGPU     NVIDIA MIG      Docker + GPU    V-GPU (Ours)
--------------------------------------------------------------------------------
Virtualization Level  Hypervisor/VF   Silicon Die     Container OCI   Container +
                      (SR-IOV)        Partitioning    Device Pass     Control Plane

Hardware Requirement  Certified Data  A100 / H100     Any NVIDIA GPU  Commodity,
                      Center Cards    Only            Supported       Workstation &
                                                                      Simulated

Licensing Cost        Commercial Grid None (Built     Open Source     Zero License
                      Annual License  into hardware)  (Apache 2.0)    (Fully Free &
                                                                      Open Source)

Dynamic Memory Slicing Rigid Profiles Rigid Profiles No Quotas      Arbitrary Quotas
                      (Fixed GB)      (10GB/20GB)     (Full Access)   (Megabyte-level)

Compute Slicing       Time-Slicing    Physical Core   Unmanaged       Dynamic Fair-
                      (Milliseconds)  Partitioning    Contention      Share / Quantum

Host Hypervisor       ESXi / KVM /    Bare-Metal OS   Linux Host      Cross-Platform
Dependency            Citrix Xen      or Hypervisor   Kernel          (Linux / macOS
                                                                      / Windows)

Thermodynamic & Green None            None            None            Integrated PUE,
Compute Modeling                                                      WUE, Heat & CO2

Local Air-Gapped AI   None            None            None            Integrated AST
Codebase Assistant                                                    RAG Copilot

Target Deployment     Enterprise      Cloud AI &      Single-User     Academic Labs,
                      VDI & Clouds    Hyperscalers    Dev Systems     SMEs & Clusters
--------------------------------------------------------------------------------

As demonstrated in Table 2.1, existing technologies force organizations into 
unfavorable trade-offs. Enterprise solutions (vGPU, MIG) deliver rigorous isolation 
but impose prohibitive licensing fees, rigid hardware constraints, and infrastructure 
complexity. Conversely, lightweight container tools (Docker with standard GPU runtime) 
provide portability but lack fine-grained quota slicing, intelligent scheduling, and 
multi-tenant fairness. V-GPU resolves this dichotomy by delivering fine-grained 
software-defined slicing and deterministic scheduling on top of lightweight OCI 
containers, while pioneering thermodynamic environmental tracking and local RAG 
intelligence.
================================================================================
"""

PAGES[13] = """================================================================================
                                   PAGE 13
================================================================================
2.4 THERMODYNAMIC MODELING AND AIR-GAPPED RETRIEVAL-AUGMENTED GENERATION

SUSTAINABLE AND THERMODYNAMIC GREEN COMPUTING:
The rapid scaling of deep learning compute infrastructure has triggered an acute 
environmental crisis. As demonstrated by Kaplan et al. (OpenAI) and Hoffmann et al. 
(DeepMind Chinchilla), state-of-the-art model performance scales predictably as a 
power-law function of compute budget ($C \approx 6ND$), where $N$ represents model 
parameter count and $D$ represents the number of training tokens. Modern training runs 
consume petaflop-days to zettaflops of cumulative floating-point operations.

This astronomical computational volume translates directly into massive electrical 
power draw and heat dissipation:
- Power Usage Effectiveness (PUE): Defined by The Green Grid consortium as:
  $$PUE = \frac{\text{Total Facility Energy}}{\text{IT Equipment Energy}}$$
  A typical data center operates with a PUE between 1.2 and 1.6, meaning that for 
  every kilowatt of power consumed by GPU compute cores, an additional 0.2 to 0.6 
  kilowatts is consumed by cooling chillers, fans, and power transformation losses.
- Water Usage Effectiveness (WUE): In modern high-density data centers, cooling 
  towers evaporate vast quantities of fresh water to reject heat into the atmosphere. 
  WUE is defined as:
  $$WUE = \frac{\text{Annual Water Consumption (Liters)}}{\text{IT Equipment Energy (kWh)}}$$
  Empirical studies (Li et al., 2023) reveal that training large models can consume 
  between 1.5 to 3.0 liters of fresh water per kilowatt-hour of compute, evaporating 
  hundreds of thousands of liters of clean water during a single multi-week training run.
- Thermal Throttling: When junction temperatures exceed safe operating limits 
  (typically $83^\circ\text{C}$ to $90^\circ\text{C}$ on modern silicon), internal 
  Dynamic Voltage and Frequency Scaling (DVFS) circuits throttle core clock frequencies, 
  reducing performance by 20% to 40% while wasting electricity.

Despite these critical thermodynamic dynamics, existing workload schedulers treat 
compute nodes purely as abstract allocations of CPU and memory, with zero real-time 
feedback loops linking scheduling decisions to chiller water flow rates, PUE, WUE, 
or regional grid carbon emissions. V-GPU directly fills this void by embedding 
a first-principles thermodynamic engine into the orchestration loop.
================================================================================
"""

PAGES[14] = """================================================================================
                                   PAGE 14
================================================================================
2.4 THERMODYNAMIC MODELING AND AIR-GAPPED RAG (CONTINUED)

AIR-GAPPED RETRIEVAL-AUGMENTED GENERATION (RAG) IN AI INFRASTRUCTURE:
To navigate, debug, and monitor complex distributed computing infrastructures, 
engineers increasingly turn to Large Language Model (LLM) coding assistants. 
However, standard cloud-based LLM assistants (e.g., GitHub Copilot, ChatGPT, Claude) 
suffer from two fundamental flaws in high-security, academic, and enterprise 
infrastructure environments:

1. Hallucination and Lack of Local Context:
   Pre-trained generalist LLMs have no visibility into the live, running state of a 
   specific laboratory testbed. They cannot inspect real-time Docker container states, 
   active cgroup memory limits, custom scheduling queues, or internal REST route 
   schemas. Consequently, their answers regarding system configuration are generic, 
   outdated, or factually incorrect (hallucinatory).

2. Intellectual Property (IP) and Data Leakage Hazards:
   In industrial research, defense labs, healthcare AI projects, and proprietary 
   academic consortia, source code and training telemetry are governed by strict 
   Non-Disclosure Agreements (NDAs) and air-gapped security policies. Transmitting 
   source code files and execution logs across external public cloud APIs violates data 
   governance mandates, exposing the organization to legal liability and intellectual 
   property theft.

THE HYBRID RETRIEVAL-AUGMENTED GENERATION (RAG) PARADIGM:
Retrieval-Augmented Generation (Lewis et al., 2020) provides an architectural 
solution by decoupling knowledge retrieval from generative language modeling. 
In a RAG architecture:
- An indexing pipeline recursively scans the local codebase, parses Abstract Syntax 
  Trees (ASTs) for classes, functions, and docstrings, and breaks technical documents 
  into semantic chunks.
- These chunks are converted into dense vector embeddings and indexed in a local vector 
  database alongside lexical BM25 inverse-document-frequency indices.
- At query time, the system retrieves the top-$k$ most relevant local code chunks and 
  injects them directly into the context window of a locally hosted, quantized open-
  weights model (such as Qwen 2.5, LLaMA-3, or Mistral running on a local Ollama 
  runtime).

V-GPU implements a 100% self-contained, air-gapped hybrid RAG copilot directly 
within its control plane. By combining AST-aware Python chunking, SQLite-backed vector 
storage, hybrid Cosine-BM25 retrieval ranking, and local template synthesis, V-GPU 
ensures zero data leakage outside the local host while delivering sub-second technical 
explanations grounded in the project’s actual implementation files.
================================================================================
"""

PAGES[15] = """================================================================================
                                   PAGE 15
================================================================================
                                 CHAPTER 3
                     PROJECT ANALYSIS AND REQUIREMENT

3.1 EXISTING SYSTEM

In academic institutions, engineering colleges, research centers, and small-to-medium 
enterprises (SMEs), computational infrastructure for Artificial Intelligence and Deep 
Learning typically relies on one of three prevailing infrastructural models:

1. DEDICATED PHYSICAL WORKSTATIONS:
Under this paradigm, high-end workstations equipped with consumer or workstation GPUs 
(e.g., NVIDIA GeForce RTX 3080/4090, RTX A5000) are assigned to individual research 
groups or placed in physical laboratories. Students and researchers log in locally or 
via Secure Shell (SSH) and run their training scripts, Jupyter notebooks, or model 
evaluations directly on the host operating system.

2. UNMANAGED SHARED LAB SERVERS:
A central rack-mounted server hosting multiple physical GPUs is shared among a cohort 
of users. Access is typically managed via basic Linux user accounts. Users coordinate 
device usage through ad-hoc verbal agreements, shared messaging channels, or manual 
environment flags (e.g., `export CUDA_VISIBLE_DEVICES=1`). The operating system 
provides no automated memory quotas or compute partitioning.

3. PUBLIC CLOUD AI INSTANCES (AWS, GCP, AZURE, RUNPOD):
When local compute proves inadequate or constantly contested, organizations rent 
on-demand GPU compute instances from public cloud providers. These instances deliver 
pre-configured environments (e.g., AWS EC2 P4de/G5 instances) running proprietary 
virtualization stacks.

WORKFLOW OF THE EXISTING SYSTEM:
In a standard unmanaged shared server workflow:
1. User logs in via SSH or launches an interactive Jupyter Notebook server.
2. User executes a Python script initiating PyTorch, TensorFlow, or JAX.
3. The framework's internal memory manager immediately requests a substantial memory 
   arena from the GPU driver (PyTorch's default caching allocator pre-reserves large 
   chunks of VRAM to minimize `cudaMalloc` runtime overhead).
4. Even if the training script only processes a small batch size utilizing 1.5 GB of 
   actual tensor memory, the driver locks 10 GB to 24 GB of VRAM.
5. A secondary user attempting to launch a training run on the same physical device 
   encounters a catastrophic `CUDA: Out of Memory (OOM)` exception and is abruptly 
   terminated.
6. The workstation's compute cores operate at a low fraction of their rated TFLOPS 
   throughput, while the rest of the research cohort remains stalled.
================================================================================
"""

PAGES[16] = """================================================================================
                                   PAGE 16
================================================================================
3.1.1 DRAWBACKS OF EXISTING SYSTEMS

The existing operational workflows suffer from severe technical, economic, and 
environmental deficiencies:

1. SEVERE RESOURCE FRAGMENTATION AND HIGH IDLE TIME:
Because standard operating systems assign GPUs as monolithic endpoints, an entire 
card is held hostage by a single interactive session. Empirical audits of university 
computing labs indicate that average GPU utilization hovers below 25%, with GPUs 
spending the majority of their uptime sitting completely idle while waiting for user 
input, code edits, or data preprocessing in Jupyter notebooks.

2. COMPLETE LACK OF FINE-GRAINED MEMORY CLAMPING:
Consumer and workstation GPUs do not support hardware-enforced memory limits for 
standard processes. A rogue or poorly written student script (e.g., an unbounded tensor 
accumulation loop) can consume the entire memory pool without warning, terminating 
neighboring production jobs and corrupting active research runs.

3. PROHIBITIVE COMMERCIAL LICENSING EXPENSES:
Commercial virtualization software suites (such as NVIDIA vGPU and VMware vSphere 
with Bitfusion) require expensive enterprise subscription licenses. Academic 
departments cannot justify recurring software licensing fees that often exceed the 
capital cost of the physical hardware itself.

4. INELASTIC PARTITIONING AND HARDWARE RESTRICTIONS:
Hardware partitioning technologies (such as NVIDIA MIG) are restricted exclusively 
to high-end enterprise silicon (A100/H100) and enforce rigid, pre-defined partition 
sizes. They cannot create customized, fractional slices (e.g., 512 MB or 1.5 GB VRAM) 
tailored for introductory machine learning assignments.

5. ZERO VISIBILITY INTO THERMODYNAMIC AND ENVIRONMENTAL IMPACT:
Existing workstation setups provide no telemetry regarding power consumption, heat 
generation, cooling water usage, or carbon footprints. Users and lab administrators 
operate with zero awareness of the environmental or financial utility costs incurred 
by their computational workloads.

6. ABSENCE OF SECURE, LOCAL CODEBASE ASSISTANCE:
Developers encountering infrastructure failures or execution bugs must manually 
search online forums or upload code to public LLM services (e.g., ChatGPT), violating 
data privacy mandates and intellectual property boundaries.
================================================================================
"""

PAGES[17] = """================================================================================
                                   PAGE 17
================================================================================
3.2 PROPOSED SYSTEM

To systematically resolve the structural deficiencies of existing GPU compute 
environments, this project proposes and implements "V-GPU": a containerized virtual 
GPU resource management, multi-tenant slicing, and sustainable AI compute orchestration 
platform featuring an integrated, air-gapped RAG copilot.

The proposed V-GPU system establishes a software-defined control plane that sits 
between incoming machine learning workloads and the underlying computational 
hardware. The system abstracts physical GPUs into arbitrary, customizable virtual 
GPU (vGPU) instances. Each instance is encapsulated within an isolated Docker 
container bound by strict Linux Control Group (cgroups v2) memory quotas and CPU/GPU 
affinity shares.

KEY ARCHITECTURAL PILLARS OF THE PROPOSED SYSTEM:

1. Asynchronous Control Plane & Virtual Driver Layer:
   Developed using Python 3.10+, FastAPI, and asyncio, the control plane exposes a 
   high-performance RESTful and WebSocket API. The virtual GPU driver (`core/vgpu_driver.py`) 
   maintains an active inventory of physical and virtual accelerators, dynamically 
   emulating hardware telemetry (utilization, core frequency, VRAM allocation, 
   junction temperature, fan speed) when physical hardware is absent, while hooking 
   into NVIDIA NVML when physical hardware is present.

2. Pluggable Multi-Policy Workload Scheduler:
   The orchestration engine (`core/scheduler.py`) manages a centralized job queue 
   supporting five distinct scheduling policies: First-In-First-Out (FIFO), Fair-Share 
   Resource Balancing, Priority Queueing, Shortest Job First (SJF), and Round-Robin 
   Time-Slicing with quantum interval preemption. This eliminates starvation and 
   maximizes cluster throughput.

3. Active CGroup Isolation and Resource Clamping:
   A dedicated isolation supervisor (`core/isolation.py`) continuously polls active 
   vGPU container memory footprints. If a container exceeds its provisioned VRAM 
   threshold, the engine triggers automated clamping alerts and terminates rogue 
   processes before host system stability is compromised.

4. Thermodynamic Green Compute Engine:
   The platform embeds a first-principles thermodynamic model calculating real-time 
   sensible heat dissipation, required water chiller circulation flow rates, Power 
   Usage Effectiveness (PUE), Water Usage Effectiveness (WUE), and localized carbon 
   footprints based on regional grid emission factors.
================================================================================
"""

PAGES[18] = """================================================================================
                                   PAGE 18
================================================================================
3.2.1 ADVANTAGES OF THE PROPOSED V-GPU SYSTEM

The proposed V-GPU architecture offers major technical, economic, and operational 
advantages over existing systems:

1. HARDWARE AGNOSTICISM AND ZERO LICENSING OVERHEAD:
   V-GPU is 100% open-source and software-defined. It requires no proprietary enterprise 
   hypervisors (such as VMware ESXi) and zero recurring commercial software licenses. 
   It operates across any standard Linux, macOS, or Windows workstation, democratizing 
   virtualization for colleges, schools, and independent research groups.

2. FINE-GRAINED, ELASTIC MEMORY AND COMPUTE SLICING:
   Unlike commercial MIG which enforces rigid hardware profiles (e.g., 10GB, 20GB), 
   V-GPU allows administrators to provision arbitrary memory allocations (e.g., 512 MB, 
   1200 MB, 4096 MB) and compute percentage shares (e.g., 15%, 35%, 75%). This unlocks 
   true multi-tenant sharing on consumer cards (e.g., RTX 3080/4090).

3. DETERMINISTIC MULTI-POLICY SCHEDULING:
   By supporting five pluggable dispatch algorithms (FIFO, Fair-Share, Priority, SJF, 
   Time-Slicing), V-GPU allows administrators to tailor scheduling behavior to their 
   exact lab policy—prioritizing urgent research runs while ensuring student jobs 
   receive fair execution slices.

4. FIRST-PRINCIPLES THERMODYNAMIC & CARBON OBSERVABILITY:
   V-GPU is the first educational virtualization control plane to provide live 
   telemetry for water consumption, sensible thermal dissipation, chiller pump flow 
   rates, and regional grid carbon footprints ($gCO_2e$), fostering environmental 
   accountability in AI training.

5. ZERO-LEAKAGE, AIR-GAPPED RAG AI COPILOT:
   By embedding a syntax-aware AST chunker, SQLite vector store, and hybrid BM25/Cosine 
   retrieval engine directly on local compute, V-GPU provides researchers with an 
   intelligent codebase assistant that operates with 100% data privacy and zero cloud 
   dependency.

6. COMPREHENSIVE TRI-PLATFORM BENCHMARKING:
   The built-in comparative benchmarking framework (`core/benchmark_runner.py`) enables 
   rigorous, reproducible empirical comparisons between V-GPU, local Jupyter runtimes, 
   and Google Colab cloud instances.
================================================================================
"""

PAGES[19] = """================================================================================
                                   PAGE 19
================================================================================
3.3 FUNCTIONAL & NON-FUNCTIONAL REQUIREMENTS

FUNCTIONAL REQUIREMENTS (FR):

The functional requirements define the core operational behaviors, services, and 
transformations that the V-GPU system must execute:

- FR-01: Virtual GPU Provisioning:
  The system shall allow authenticated administrators and users to provision virtual 
  GPU instances by specifying a unique instance identifier, target physical device, 
  VRAM quota in megabytes, and compute percentage share.

- FR-02: Docker Container Lifecycle Management:
  The system shall automatically initialize, start, monitor, and gracefully destroy 
  isolated Docker worker containers (`vgpu-worker`) associated with each provisioned 
  vGPU instance.

- FR-03: Workload Queueing and Multi-Policy Scheduling:
  The system shall accept submitted computational jobs (Python scripts, ML training 
  routines, synthetic benchmarks), place them in a managed queue, and dispatch them 
  to available vGPU instances according to the active scheduling policy (FIFO, Fair-
  Share, Priority, SJF, or Time-Slicing).

- FR-04: Resource Isolation and Clamping:
  The system shall continuously monitor container memory consumption and enforce hard 
  limits via Linux cgroups. In the event of a quota breach, the isolation manager 
  shall log a violation, emit an alert, and terminate the offending job.

- FR-05: Real-Time Telemetry Streaming:
  The system shall stream hardware and virtual instance metrics (utilization percentage, 
  memory allocation, temperature, power draw, and fan speed) over a bi-directional 
  WebSocket connection at a continuous 1 Hz broadcast frequency.

- FR-06: Thermodynamic and Green Compute Calculation:
  The system shall dynamically calculate training FLOPs ($6ND$), total power draw, 
  sensible heat dissipation ($\dot{Q} = \dot{m} C_p \Delta T$), chiller water flow 
  rates, PUE, WUE, and localized carbon emissions based on user-selected regional 
  grid carbon intensities.

- FR-07: Air-Gapped Codebase RAG Copilot:
  The system shall parse local codebase files into AST and markdown chunks, generate 
  semantic vector embeddings, store them in a local SQLite database, and execute hybrid 
  Cosine-BM25 retrieval to answer technical codebase queries locally without external 
  network calls.
================================================================================
"""

PAGES[20] = """================================================================================
                                   PAGE 20
================================================================================
3.3 NON-FUNCTIONAL REQUIREMENTS (CONTINUED)

NON-FUNCTIONAL REQUIREMENTS (NFR):

Non-functional requirements specify the quality attributes, performance constraints, 
security standards, and usability criteria that the system must satisfy:

- NFR-01: Low Latency and High Throughput:
  The REST API control plane shall maintain an average response latency of less than 
  50 milliseconds for administrative requests (instance listing, status queries). 
  Virtual slice provisioning from a pre-warmed container pool shall complete in under 
  1.5 seconds.

- NFR-02: Telemetry Sampling Consistency:
  The WebSocket telemetry stream shall broadcast system metrics at a deterministic 
  interval of $1000 \pm 50$ milliseconds, maintaining low jitter under concurrent 
  dashboard connections.

- NFR-03: Fault Tolerance and Graceful Degradation:
  If a worker container crashes or encounters an unhandled runtime exception (e.g., a 
  script syntax error or memory fault), the control plane must catch the error, log 
  the stack trace, update the job status to `FAILED`, and release all locked resources 
  without destabilizing the FastAPI master process.

- NFR-04: Strict Data Privacy and Air-Gapped Security:
  The RAG copilot and telemetry engines shall operate in a completely air-gapped 
  mode. Zero telemetry data, user code, or query prompts shall be transmitted over 
  external internet connections unless an external API is explicitly configured.

- NFR-05: Extensibility and Modularity:
  The scheduling engine, isolation supervisor, and vector retrieval pipelines shall be 
  strictly decoupled using object-oriented interfaces, allowing new scheduling 
  algorithms or embedding models to be added without modifying core control plane logic.

- NFR-06: Cross-Platform Portability:
  The control plane and simulation drivers shall operate seamlessly across Linux 
  (Ubuntu 20.04/22.04 LTS), macOS (Apple Silicon / Intel), and Microsoft Windows 10/11 
  environments.

- NFR-07: Responsive User Interface:
  The web and desktop dashboard shall render complex 3D visual topologies and real-time 
  charts at a consistent 60 frames per second (FPS) without UI freeze.
================================================================================
"""

PAGES[21] = """================================================================================
                                   PAGE 21
================================================================================
3.4 HARDWARE REQUIREMENTS

The V-GPU platform is architected to operate across a broad spectrum of hardware 
environments—ranging from commodity student laptops running in simulated emulation 
mode up to multi-GPU enterprise rackmount servers executing bare-metal containerized 
accelerator slicing. 

TABLE 3.1: HARDWARE SPECIFICATION REQUIREMENTS MATRIX

--------------------------------------------------------------------------------
Component           Minimum Specification           Recommended Enterprise Spec
--------------------------------------------------------------------------------
Host Architecture   x86_64 (Intel Core i5 / AMD     x86_64 Dual AMD EPYC 7763 or
                    Ryzen 5) or ARM64 (Apple M1+)   Intel Xeon Platinum 8380

System Memory (RAM) 16 GB DDR4 Dual-Channel         128 GB - 512 GB DDR4/DDR5 ECC
                    (Minimum for multi-container)   Registered Server Memory

Persistent Storage  256 GB SATA SSD / NVMe          2 TB NVMe PCIe 4.0 SSD
                    (For Docker image caching)      (Read throughput > 5000 MB/s)

Hardware GPU        Integrated Graphics / Any       1 to 8 Discrete GPUs:
                    DirectX12 / Metal GPU           - NVIDIA RTX 4090 (24 GB)
                    (Operates in High-Fidelity      - NVIDIA RTX A5000/A6000
                    Simulation & Emulation Mode)    - NVIDIA A100 / H100 (80 GB)

Network Interface   1 Gbps Ethernet or Wi-Fi 5      10 Gbps / 25 Gbps Dual SFP+
                    (For local dashboard streaming) Optical Ethernet (RoCE/RDMA)

Power Supply (PSU)  500W Standard ATX Supply        1600W - 3200W Titanium 
                                                    Redundant 80-Plus Server PSU

Cooling System      Standard Air Cooling            Closed-Loop Liquid Chiller with
                    (CPU/GPU heatsink and fans)     Integrated Flow-Rate Sensors
--------------------------------------------------------------------------------

SIMULATION & EMULATION CAPABILITY:
A major engineering achievement of V-GPU is its decoupled driver design. When deployed 
on commodity machines without discrete NVIDIA hardware (e.g., student laptops or CI/CD 
virtual machines), the system automatically transitions into its built-in mathematical 
emulation engine (`core/compute_engine.py`). It simulates realistic GPU thermal curves, 
memory allocations, and execution delays derived from empirical A100/RTX4090 performance 
profiles, enabling students to learn cluster orchestration without expensive hardware.
================================================================================
"""

PAGES[22] = """================================================================================
                                   PAGE 22
================================================================================
3.5 SOFTWARE REQUIREMENTS

The V-GPU software architecture is built on modern, open-source programming runtimes, 
asynchronous web frameworks, container engines, and modern frontend tooling.

TABLE 3.2: SOFTWARE STACK AND DEPENDENCY SPECIFICATIONS

--------------------------------------------------------------------------------
Layer / Subsystem   Software Package / Library      Version / Release Spec
--------------------------------------------------------------------------------
Host Operating Sys  Linux (Ubuntu 22.04 LTS),       Linux Kernel >= 5.15
                    macOS (Sonoma / Sequoia),       (Supports cgroups v2 & namespaces)
                    or Windows 10/11 Pro/Enterprise

Container Engine    Docker Community Edition (CE)   Docker Engine >= 24.0
                    with Docker Compose Plugin      OCI Runtime Specification Compliant

Python Runtime      CPython (Standard Distribution) Python 3.10, 3.11, or 3.14

Backend Framework   FastAPI (Asynchronous Web App)  FastAPI >= 0.100.0
                    ASGI Server: Uvicorn            Uvicorn >= 0.22.0

Data Validation     Pydantic (Data Modeling)        Pydantic v2.0+

Hardware Management NVIDIA Management Library       NVML Python Bindings (pynvml)
                    (NVML) / NVIDIA Driver          NVIDIA Driver >= 525.60+

Machine Learning    PyTorch, Scikit-Learn, NumPy,   PyTorch >= 2.0 (CUDA 11.8 / 12.1),
Stack               Pandas, SciPy, Matplotlib       Scikit-Learn >= 1.3.0

Database & Storage  SQLite 3 (Persistent Store)     SQLite >= 3.35 (JSON support)
                    File-based metadata logging     Local filesystem bind-mounts

Frontend Framework  React 18, Vite Bundler,         Node.js >= 18.0 LTS,
                    TailwindCSS / Glassmorphism CSS Lucide React Icons v0.263+

Desktop Shell       Tauri Application Framework     Tauri CLI v1.5+, Rust Toolchain
                    (Rust Core + Webview Wrapper)   Cargo >= 1.70.0

Local AI Engine     Ollama / HuggingFace Transformers Ollama >= 0.1.30 (Local Qwen 2.5,
                    Sub-word n-gram AST Vectorizer  Mistral-7B, or LLaMA-3.2)
--------------------------------------------------------------------------------
================================================================================
"""
