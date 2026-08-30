from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

DARK = RGBColor(0x0F, 0x17, 0x2A)
ACCENT = RGBColor(0x38, 0xBD, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GRAY = RGBColor(0x9A, 0xA7, 0xB8)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def add_bg(slide, color=RGBColor(0xFF, 0xFF, 0xFF)):
    bg = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    bg.shadow.inherit = False
    return bg

def add_title_slide():
    s = prs.slides.add_slide(BLANK)
    add_bg(s, DARK)
    tb = s.shapes.add_textbox(Inches(1), Inches(2.4), Inches(11.3), Inches(2.6))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = "V-GPU"
    p.font.size = Pt(72); p.font.bold = True; p.font.color.rgb = WHITE; p.alignment = PP_ALIGN.CENTER
    p2 = tf.add_paragraph(); p2.text = "A Containerized Virtual GPU Resource Management & AI Compute Orchestration Platform"
    p2.font.size = Pt(22); p2.font.color.rgb = ACCENT; p2.alignment = PP_ALIGN.CENTER
    p3 = tf.add_paragraph(); p3.text = "Final Year Project   |   Defense Presentation"
    p3.font.size = Pt(18); p3.font.color.rgb = GRAY; p3.alignment = PP_ALIGN.CENTER

def add_section_title(slide, title):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.9))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = title
    p.font.size = Pt(38); p.font.bold = True; p.font.color.rgb = ACCENT

def add_slide(title, bullets, note=None):
    s = prs.slides.add_slide(BLANK)
    add_bg(s)
    add_section_title(s, title)
    tb = s.shapes.add_textbox(Inches(1.2), Inches(1.6), Inches(10.9), Inches(5.3))
    tf = tb.text_frame; tf.word_wrap = True
    first = True
    for b in bullets:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.text = "•  " + b
        p.font.size = Pt(20); p.font.color.rgb = DARK
        p.space_after = Pt(12)
    if note:
        n = s.shapes.add_textbox(Inches(1.2), Inches(6.9), Inches(10.9), Inches(0.5))
        n.text_frame.text = note
    return s

# ---- Slide deck ----
add_title_slide()

add_slide("Outline", [
    "1. Introduction & Problem Statement",
    "2. Objectives",
    "3. Literature Review / Related Work",
    "4. System Architecture",
    "5. Methodology",
    "6. Key Components",
    "7. Results & Evaluation",
    "8. Limitations & Future Work",
    "9. Demonstration",
])

add_slide("Introduction & Problem Statement", [
    "Modern ML workloads demand expensive GPU compute",
    "GPUs are under-utilized when dedicated to single users/jobs",
    "Multi-tenant environments need sharing, isolation, fairness, observability",
    "Enterprise solutions (NVIDIA vGPU/MIG, K8s) require licensed GPUs + heavy infrastructure",
    "Gap: a lightweight, portable, container-native GPU *control plane*",
    "V-GPU reimplements provisioning, scheduling, isolation, monitoring & job execution",
])

add_slide("Objectives", [
    "Provision isolated, quota-limited virtual GPU slices",
    "Schedule & execute ML jobs — single-node and parallel cluster",
    "Enforce per-slice resource limits (VRAM, compute %)",
    "Stream real-time telemetry to web (React) & desktop (Tauri) dashboards",
    "Provide a RAG AI assistant grounded in project code, data & docs",
])

add_slide("Literature Review", [
    "NVIDIA vGPU (SR-IOV)  — hardware slicing, needs licensed GPUs + hypervisor",
    "NVIDIA MIG  — physical partitioning, H100/A100 only",
    "Docker + nvidia-container-toolkit  — containerized jobs, no tenant quotas",
    "Kubernetes + GPU  — powerful, but heavy and complex",
    "V-GPU:  Docker-backed virtual GPU slices + custom lightweight scheduler",
    "Trade-off: portability & simplicity vs. true hardware virtualization",
])

s = add_slide("System Architecture", [
    "FRONTEND:  React + Vite web dashboard  •  Tauri desktop app",
    "BACKEND (FastAPI control plane):  vgpu_driver, scheduler, isolation, job_executor, RAG chatbot",
    "ISOLATION LAYER:  Docker containers (python:3.10-slim worker image)",
    "Storage: SQLite (chat history + vector index), filesystem datasets",
    "AI/LLM: Gemini, optional Ollama/HuggingFace local models",
], note="See architecture diagram in report, sec. 3")

add_slide("Methodology — Provisioning & Jobs", [
    "PROVISION: request vRAM+compute → validate pool → launch vgpu-<id> container → bind-mount results/datasets/scripts",
    "JOB EXEC: run script (docker exec) → capture stdout → regex-parse accuracy/speed/loss + leaderboard",
    "PARALLEL: dedicate a vGPU per dataset → concurrent threads → aggregate cluster metrics",
    "ISOLATION: background loop checks usage vs limits → logs violations",
])

add_slide("Key Component — RAG Copilot", [
    "Indexer + structure-aware chunker: code (AST), markdown (headings), text (overlapping blocks)",
    "Vector store: local TF-IDF/hashing vectorizer, optional Gemini text-embedding-004",
    "Hybrid search: cosine similarity + BM25/keyword boost",
    "Generation routing: Gemini → Ollama/HuggingFace → local synthesizer",
    "Conversational memory in SQLite",
    "Answers grounded in retrieved context with file:line citations",
])

add_slide("Results & Evaluation", [
    "All REST/WebSocket endpoints operational",
    "Real-time telemetry streaming to web & desktop dashboards",
    "Parallel cluster returns aggregated accuracy & throughput",
    "Multi-tenant isolation via Docker namespaces",
    "RAG assistant reduces hallucination via retrieval-grounded citations",
    "Dual interfaces (web + desktop) plus CLI for scripting",
])

add_slide("Limitations (Honest Assessment)", [
    "GPU telemetry (util/temp/power) is MODELED, not read from real sensors",
    "vGPU slicing uses Docker containers — NO MIG / SR-IOV hardware partitioning",
    "Water/energy consumption is a static WUE/PUE model — no physical meters",
    "Isolation logs violations but performs no kernel hardening",
    "No authentication / TLS / network hardening in current build",
    "Demo machine has no NVIDIA GPU — GPU metrics shown are simulated",
])

add_slide("Future Work", [
    "Real GPU telemetry via nvidia-smi / NVML on an NVIDIA host",
    "True hardware GPU sharing with NVIDIA MIG or vGPU",
    "Real water/energy instrumentation (power meters + WUE/PUE)",
    "Network security: authentication, TLS, CORS lockdown, localhost binding",
    "Secure multi-node worker registration (gRPC/HTTP)",
])

add_slide("Demonstration", [
    "1. Launch backend + dashboard",
    "2. Provision vGPU slices",
    "3. Run an ML job & observe metrics",
    "4. Run a parallel cluster job",
    "5. Ask the RAG copilot about the project",
], note="Live walkthrough follows")

add_slide("Thank You", [
    "Questions?",
    "V-GPU — a complete container-native GPU orchestration control plane",
])
add_section_title(prs.slides[-1], "Thank You")

prs.save("/Users/chethanr/Downloads/V-GPU/docs/fyp/V-GPU_Defense.pptx")
print("PPTX saved:", "docs/fyp/V-GPU_Defense.pptx")
print("Slides:", len(prs.slides._sldIdLst))
