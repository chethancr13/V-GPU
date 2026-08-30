# V-GPU — Final Year Project Summary

**Title:** V-GPU: A Containerized Virtual GPU Resource Management & AI Compute Orchestration Platform

## What it is
A full-stack platform that provisions isolated "virtual GPU" slices (backed by Docker containers), schedules and runs ML jobs (single + parallel cluster), streams real-time telemetry to web (React) and desktop (Tauri) dashboards, and provides a Retrieval-Augmented Generation (RAG) AI copilot grounded in the project's own code and data.

## Technology stack
| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, uvicorn |
| Frontend | React, Vite |
| Desktop | Tauri (Rust) |
| Isolation | Docker Engine |
| Storage | SQLite, filesystem |
| AI/LLM | Gemini, Ollama/HuggingFace |
| ML | NumPy, pandas, scikit-learn, PyTorch |

## Deliverables (in `docs/fyp/`)
- **`FYP_Report.md`** — full report (abstract, intro, lit review, architecture, methodology, results, limitations).
- **`V-GPU_Defense.pptx`** — 13-slide defense presentation.
- **`DEMO_WALKTHROUGH.md`** — step-by-step live demo script + likely defense Q&A.
- **`build_ppt.py`** — script that generated the deck (regenerate after edits).

## Core modules
- `core/vgpu_driver.py` — physical GPU model + vGPU provisioning (Docker-backed)
- `core/scheduler.py` — job queue & assignment
- `core/isolation.py` — per-instance resource limit enforcement
- `core/job_executor.py` — run ML scripts in containers, parse metrics
- `core/chatbot/` — RAG pipeline (indexer, chunker, vector store, rag engine, memory)
- `main.py` — FastAPI control plane (API + WebSocket endpoints)
- `vgpu_launcher.py` — CLI (run, run-parallel, import, clean, tauri)

## ⚠️ Honest limitations to state in defense
1. **No NVIDIA GPU on the demo machine** → GPU telemetry (util/temp/power) is **simulated**, not read from real sensors.
2. **No hardware vGPU/MIG/SR-IOV** — vGPU slices are Docker containers.
3. **Water/energy numbers are a modeled WUE/PUE calculation**, no physical meters.
4. **No authentication/TLS/network hardening** in the current build.

## Command cheat-sheet
```bash
python3 vgpu_launcher.py               # start backend + dashboard
python3 vgpu_launcher.py tauri         # start Tauri desktop app
python3 vgpu_launcher.py run my_ml_model.py auto [dataset]
python3 vgpu_launcher.py run-parallel my_ml_model.py d1.csv d2.csv d3.csv
python3 vgpu_launcher.py clean         # reset cluster
curl -X POST http://localhost:8000/api/chatbot/index/resync   # re-index for copilot
```
