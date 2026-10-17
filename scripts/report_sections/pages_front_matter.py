# -*- coding: utf-8 -*-
"""Front matter pages i to x"""

PAGES = {}

PAGES['i'] = """================================================================================
                                   PAGE i
================================================================================
                             PROJECT REPORT ON

         V-GPU: A CONTAINERIZED VIRTUAL GPU RESOURCE MANAGEMENT,
         MULTI-TENANT SLICING, AND SUSTAINABLE AI COMPUTE ENGINE
                     WITH AIR-GAPPED RAG COPILOT

              Submitted in partial fulfillment of the requirements
                  for the award of the degree of

                          BACHELOR OF ENGINEERING
                                     IN
                      COMPUTER SCIENCE AND ENGINEERING

                                 Submitted By:
                             [YOUR NAME & USN]
                           [TEAM MEMBER 2 & USN]
                           [TEAM MEMBER 3 & USN]
                           [TEAM MEMBER 4 & USN]

                         Under the Guidance of:
                             [GUIDE NAME]
                      Designation, Dept. of CSE

                   DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
                         [COLLEGE NAME & LOGO HERE]
                             ACADEMIC YEAR: 2025-2026
================================================================================
"""

PAGES['ii'] = """================================================================================
                                   PAGE ii
================================================================================
                   DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
                            [COLLEGE / INSTITUTE NAME]

                                CERTIFICATE

Certified that the project work entitled "V-GPU: A CONTAINERIZED VIRTUAL GPU 
RESOURCE MANAGEMENT, MULTI-TENANT SLICING, AND SUSTAINABLE AI COMPUTE ENGINE 
WITH AIR-GAPPED RAG COPILOT" is a bonafide work carried out by [YOUR NAME] 
(USN: [YOUR USN]), [NAME 2] (USN: [USN 2]), [NAME 3] (USN: [USN 3]), and 
[NAME 4] (USN: [USN 4]) in partial fulfillment for the award of Bachelor of 
Engineering in Computer Science and Engineering from [University Name] during 
the academic year 2025–2026. It is certified that all corrections and suggestions 
indicated for internal assessment have been incorporated into this report. 
The project report has been approved as it satisfies the academic requirements 
prescribed for the Bachelor of Engineering Degree.


________________________     ________________________     ______________________
Name & Signature of Guide     Project Coordinator          Head of the Department
[Designation]                 [Designation]                Department of CSE


External Viva-Voce Examination:

Name of Examiners                                         Signature with Date

1. _________________________________                      ______________________

2. _________________________________                      ______________________
================================================================================
"""

PAGES['iii'] = """================================================================================
                                   PAGE iii
================================================================================
                                DECLARATION

We, the students of final year Bachelor of Engineering in Computer Science and 
Engineering at [College Name], hereby declare that the project work entitled 
"V-GPU: A CONTAINERIZED VIRTUAL GPU RESOURCE MANAGEMENT, MULTI-TENANT SLICING, 
AND SUSTAINABLE AI COMPUTE ENGINE WITH AIR-GAPPED RAG COPILOT" has been 
independently executed by us under the supervision of [Guide Name], [Designation], 
Department of Computer Science and Engineering.

We further declare that the content of this project report is original, relevant 
and specific to our project only. It has not been submitted previously to any 
other university, college, or institute for the award of any degree, diploma, 
or fellowship.

All sources of external literature, algorithmic formulas, open-source libraries, 
and benchmark toolsets referred to during the development and documentation of 
this work have been appropriately acknowledged and cited within the references 
section.


Place: [City]
Date:  [Date]

                                                       Signatures of Candidates:

                                                       1. ______________________
                                                          [Your Name - USN]

                                                       2. ______________________
                                                          [Member 2 - USN]

                                                       3. ______________________
                                                          [Member 3 - USN]

                                                       4. ______________________
                                                          [Member 4 - USN]
================================================================================
"""

PAGES['iv'] = """================================================================================
                                   PAGE iv
================================================================================
                              ACKNOWLEDGEMENTS

The satisfaction and euphoria that accompany the successful completion of any 
task would be incomplete without expressing gratitude to the people who made 
it possible, whose constant guidance and encouragement served as a beacon of 
light throughout this engineering endeavor.

First and foremost, we express our profound gratitude to our respected Principal, 
[Principal Name], for providing state-of-the-art infrastructural facilities and 
an academic atmosphere conducive to research and engineering development.

We are deeply indebted to Dr. [HOD Name], Professor and Head of the Department 
of Computer Science and Engineering, for their continuous support, valuable 
suggestions, and encouragement throughout the tenure of our academic program.

We express our heartfelt gratitude and sincere indebtedness to our project guide, 
[Guide Name], [Designation], Department of Computer Science and Engineering, 
for their guidance, critical reviews, and technical suggestions during each 
phase of project analysis, architectural modeling, containerized slicing, and 
report drafting.

We also express our sincere thanks to the Project Coordinators and all the 
faculty members and technical staff of the Department of Computer Science and 
Engineering for their direct and indirect assistance during our lab work and 
benchmarking runs.

Lastly, we express our warmest appreciation to our parents, family members, 
and friends for their moral encouragement, patience, and unwavering faith in 
our capabilities throughout our engineering journey.


                                                              [Candidate Names]
================================================================================
"""

PAGES['v'] = """================================================================================
                                   PAGE v
================================================================================
                                  ABSTRACT

High-performance Artificial Intelligence (AI) and Machine Learning (ML) workloads 
have become foundational to scientific discovery, generative computing, and 
enterprise intelligence. However, hardware accelerators—specifically graphics 
processing units (GPUs) such as NVIDIA A100, H100, and RTX architectures—are 
capital-intensive, power-dense, and severely supply-constrained. In academic 
laboratories, research consortia, and startup incubators, access to dedicated 
GPU hardware remains a critical bottleneck. Existing commercial GPU virtualization 
technologies, including NVIDIA vGPU (SR-IOV based) and Multi-Instance GPU (MIG), 
depend upon enterprise-grade hardware licensing, proprietary hypervisors, and 
monolithic multi-thousand-dollar server cards, rendering them inaccessible for 
commodity testbeds, edge clusters, and educational environments.

To address these architectural, economic, and operational inefficiencies, this 
project introduces "V-GPU": a container-native, software-defined virtual GPU 
resource management and compute orchestration platform. V-GPU abstracts 
underlying physical or simulated accelerators into dynamic, fractional virtual 
slices (vGPU instances) that can be allocated with arbitrary memory (VRAM) quotas 
and compute percentages. The platform integrates a multi-policy scheduler supporting 
First-In-First-Out (FIFO), Fair-Share, Priority, Shortest Job First (SJF), and 
time-slicing quantum loops to eliminate job starvation and ensure deterministic 
execution latencies.

Furthermore, V-GPU addresses the acute environmental impact of modern model 
training by embedding a first-principles thermodynamic and green computing engine. 
The system models real-time server power draw, sensible heat dissipation, chiller 
coolant circulation rates, Power Usage Effectiveness (PUE), Water Usage 
Effectiveness (WUE), and localized carbon footprints based on regional grid 
emission factors. To support developers working in secure and air-gapped 
environments, the platform incorporates a local, zero-leakage Retrieval-Augmented 
Generation (RAG) copilot that parses project abstract syntax trees (ASTs), 
markdown schemas, and run logs using hybrid BM25 and vector embeddings to deliver 
sub-second technical query resolution. Experimental benchmarks establish that 
V-GPU eliminates cold-start virtualization overheads, achieves high throughput, 
and provides a production-grade orchestration control plane.
================================================================================
"""

PAGES['vi'] = """================================================================================
                                   PAGE vi
================================================================================
                             TABLE OF CONTENTS

Chapter No.     Title                                                   Page No.
--------------------------------------------------------------------------------
                Certificate                                                   ii
                Declaration                                                  iii
                Acknowledgements                                              iv
                Abstract                                                       v
                List of Figures                                               ix
                List of Tables & Abbreviations                                 x

1               INTRODUCTION                                                   1
                1.1 Overview                                                   1
                1.2 Problem Statement                                          3
                1.3 Objectives                                                 5

2               LITERATURE SURVEY                                              7
                2.1 Evolution of GPU Architectures & Virtualization            7
                2.2 Hardware-Level Partitioning: SR-IOV and NVIDIA MIG         9
                2.3 Container-Native GPU Runtimes and Cloud Schedulers        11
                2.4 Thermodynamic Modeling & Air-Gapped AI Systems            13

3               PROJECT ANALYSIS AND REQUIREMENT                              15
                3.1 Existing System                                           15
                    3.1.1 Drawbacks                                           16
                3.2 Proposed System                                           17
                    3.2.1 Advantages                                          18
                3.3 Functional & Non-Functional Requirements                  19
                3.4 Hardware Requirements                                     21
                3.5 Software Requirements                                     22

4               SYSTEM DESIGN                                                 23
                4.1 System Architecture                                       23
                4.2 Data Flow Diagram (Level 0)                               26
                4.3 Detailed Design                                           28
                    4.3.1 DFD Level 1 and Level 2                             28
                    4.3.2 Use Case Diagrams & Actor Specifications            30
                    4.3.3 Class Diagrams                                      32
                    4.3.4 Activity Diagrams                                   34
                    4.3.5 Sequence Diagrams                                   36
================================================================================
"""

PAGES['vii'] = """================================================================================
                                  PAGE vii
================================================================================
                       TABLE OF CONTENTS (CONTINUED)

Chapter No.     Title                                                   Page No.
--------------------------------------------------------------------------------
5               IMPLEMENTATION                                                38
                5.1 Modules Description                                       38
                5.2 Modulewise Algorithms and Code Snippets                   42
                5.3 Mathematical Compute Engine & Scaling Laws                46
                5.4 Thermodynamic Water Cooling & Green Compute Engine        49

6               SYSTEM TESTING                                                53
                6.1 Performance Evaluation                                    53
                6.2 Test Cases (TC-01 through TC-25)                          56

7               RESULTS & SNAPSHOTS                                           61
                7.1 Results (Tri-Platform Benchmarks & Empirical Data)        61
                7.2 Snapshots (Interface Walkthrough & Visual Dashboards)     66

8               FUTURE ENHANCEMENT                                            72
                8.1 Kernel-Level eBPF Telemetry Hooking                       72
                8.2 Kubernetes Custom Resource Definition (CRD) Operator      73
                8.3 Liquid Immersion Cooling Control & Grid Arbitrage         74

9               CONCLUSION                                                    75

10              REFERENCES                                                    77

X               APPENDIXES                                                    79
                Appendix A – Plagiarism Check Report of Implementation Report 79
                Appendix B – Published Implementation Paper                   80
                Appendix C – Certification of Implementation Paper            81
                Appendix D – Project Exhibition Participation Certificate     82
================================================================================
"""

PAGES['viii'] = """================================================================================
                                  PAGE viii
================================================================================
                              LIST OF FIGURES

Figure No.      Figure Title                                            Page No.
--------------------------------------------------------------------------------
Fig. 1.1        Global GPU Scarcity and Utilization Mismatch                   2
Fig. 2.1        Evolutionary Timeline of GPU Virtualization Technologies       8
Fig. 2.2        Architectural Comparison: Bare-Metal MIG vs. V-GPU Containers 10
Fig. 4.1        Comprehensive Multi-Tiered System Architecture                25
Fig. 4.2        Level 0 Context-Level Data Flow Diagram (DFD)                 27
Fig. 4.3        Level 1 Subsystem Data Flow Diagram                           28
Fig. 4.4        Level 2 Job Execution & Telemetry Pipeline DFD                29
Fig. 4.5        UML Use Case Diagram for User & Administrator Roles           31
Fig. 4.6        Detailed Object-Oriented Class Diagram                        33
Fig. 4.7        UML Activity Diagram: vGPU Instance Provisioning Lifecycle    34
Fig. 4.8        UML Activity Diagram: Multi-Policy Job Dispatch & Execution   35
Fig. 4.9        UML Sequence Diagram: Virtual Slicing & Docker Initialization 36
Fig. 4.10       UML Sequence Diagram: Real-Time Telemetry Streaming Loop      37
Fig. 5.1        FastAPI Asynchronous Gateway & Router Architecture            39
Fig. 5.2        Hybrid BM25 and AST Vector Search Pipeline                    41
Fig. 5.3        Thermodynamic Closed-Loop Liquid Cooling Circuit Diagram      50
Fig. 7.1        Provisioning Latency: Docker Cold vs. Warm Start Comparison   62
Fig. 7.2        Tri-Platform Benchmark: V-GPU vs. Jupyter vs. Google Colab    63
Fig. 7.3        Amdahl's Law Speedup Curves Across Parallel Fleet Nodes       64
Fig. 7.4        Web Dashboard & 3D Bolt Accelerator Visualization Snapshot    66
Fig. 7.5        Virtualization Topology & Dynamic Slicing Interface Snapshot  67
Fig. 7.6        Water Compute Planner & Thermodynamic Telemetry Snapshot      69
Fig. 7.7        Air-Gapped RAG Copilot Code Grounding Interface Snapshot      70
================================================================================
"""

PAGES['ix'] = """================================================================================
                                   PAGE ix
================================================================================
                       LIST OF TABLES & ABBREVIATIONS

LIST OF TABLES:
Table No.       Table Title                                             Page No.
--------------------------------------------------------------------------------
Table 2.1       Comparison Matrix of Existing Virtualization Technologies     12
Table 3.1       Minimum and Recommended Hardware Specifications               21
Table 3.2       System Software Stack and Dependency Framework                22
Table 4.1       System Actor Permission and Role Matrix                       30
Table 6.1       Comprehensive Test Case Suite: Provisioning & Slicing (TC 1-5) 57
Table 6.2       Comprehensive Test Case Suite: Scheduling Policies (TC 6-10)  58
Table 6.3       Comprehensive Test Case Suite: Isolation & Security (TC 11-15) 59
Table 6.4       Comprehensive Test Case Suite: RAG & System Resilience (16-25) 60
Table 7.1       Benchmark Execution Metrics across Standard ML Workloads      63
Table 7.2       AutoML Search Convergence and Hyperparameter Leaderboard      65
Table 7.3       Thermodynamic Water Dissipation across Varying Thermal Loads  65

LIST OF ABBREVIATIONS:
API             Application Programming Interface
AST             Abstract Syntax Tree
BM25            Best Matching 25 (Information Retrieval Ranking Function)
CGroup          Control Group (Linux Kernel Resource Isolation)
CUDA            Compute Unified Device Architecture
DFD             Data Flow Diagram
FIFO            First-In-First-Out
FLOPs           Floating-Point Operations
LLM             Large Language Model
MFU             Model FLOPs Utilization
MIG             Multi-Instance GPU
NVML            NVIDIA Management Library
PUE             Power Usage Effectiveness
RAG             Retrieval-Augmented Generation
REST            Representational State Transfer
SJF             Shortest Job First
SR-IOV          Single Root I/O Virtualization
Tauri           Rust-based Desktop Application Framework
TFLOPS          Tera Floating-Point Operations Per Second
UML             Unified Modeling Language
vGPU            Virtual Graphics Processing Unit
VRAM            Video Random Access Memory
WUE             Water Usage Effectiveness
================================================================================
"""

PAGES['x'] = """================================================================================
                                   PAGE x
================================================================================
                       PROJECT REPORT FORMATTING SPECIFICATIONS

In strict compliance with Academic Examination Regulations, the formatting tokens 
enforced throughout this document are structured as follows:

1. DIMENSIONS AND MARGINS:
   - Paper Size: International Standard A4 (210 mm x 297 mm)
   - Left Margin: 1.25 inches (31.75 mm) [Reserved for hard binding]
   - Right Margin: 1.00 inches (25.40 mm)
   - Top Margin: 0.75 inches (19.05 mm)
   - Bottom Margin: 0.75 inches (19.05 mm)

2. TYPOGRAPHY AND FONT SIZES (TIMES NEW ROMAN):
   - Chapter Headings: 16 pt, Bold, Uppercase, Centered
   - Primary Section Headings (e.g., 1.1, 1.2): 14 pt, Bold, Title Case
   - Subsection Headings (e.g., 3.1.1): 12 pt, Bold, Title Case
   - Body Paragraphs: 12 pt, Normal Text, Justified Alignment
   - Mathematical Formulations & Program Code: 10 pt Monospace (Courier / Consolas)

3. SPACING SPECIFICATIONS:
   - Line Spacing: Exactly 1.5 lines throughout chapters
   - Paragraph Separation: Double line spacing (1 blank line between paragraphs)
   - Single-sided printing on 80+ GSM Executive Bond Paper

4. BINDING AND COLOR CODE:
   - Binding Type: Permanent Hard Bound (Spiral / Comb Binding Strictly Prohibited)
   - Cover Hue: Matte Cream / Off-White Cardboard with Golden Embossed Foil Lettering

5. NUMBERING PROTOCOL:
   - Preliminary Pages (Certificate to Abbreviations): Lowercase Roman Numerals (i to x)
   - Chapter Pages (Chapter 1 Introduction to Appendices): Arabic Numerals (1 to 82)
================================================================================
"""
