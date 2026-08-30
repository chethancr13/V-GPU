# V-GPU — Defense Demonstration Walkthrough

This is a step-by-step live demo script for your final-year defense.

---

## Before the demo — environment checklist

- [ ] Python 3 + `.venv` present.
- [ ] **Docker Desktop running** (required for real container-backed vGPU instances).
- [ ] Backend packages installed.
- [ ] *Optional but recommended*: `GEMINI_API_KEY` env var set so the copilot gives full LLM answers. Without it, the copilot still works using the local synthesizer.

> **⚠️ IMPORTANT (hardware honesty):** This machine has **no NVIDIA GPU**. All GPU utilization/temperature/power metrics shown in the dashboards are **simulated/modeled**, not read from real GPU sensors. State this clearly at the start of the demo so it cannot be interpreted as misleading.

---

## Demo flow

### Step 1 — Start the backend + dashboard
```bash
python3 vgpu_launcher.py
```
Wait ~5s for uvicorn. Confirm:
- Backend up: `http://localhost:8000` → `{"status":"V-GPU Backend Online",...}`
- Dashboard auto-opens at `http://localhost:5173`

**Say:** "This launches the FastAPI control plane and the React dashboard."

### Step 2 — Provision vGPU slices
In the UI (or via API):
```bash
curl -X POST "http://localhost:8000/api/vgpu/provision?vram_mb=2048&compute_pct=50"
```
Observe a `vgpu-<id>` Docker container being created.

**Say:** "We request a virtual GPU slice with 2 GB VRAM and 50% compute. The driver validates pool capacity and launches an isolated container."

### Step 3 — Run an ML job
```bash
python3 vgpu_launcher.py run my_ml_model.py auto
```
Watch the dashboard show accuracy, speed, loss, and a leaderboard.

**Say:** "The executor runs the script inside the container, captures output, and parses the training metrics. Results surface in the dashboard."

### Step 4 — Parallel cluster
```bash
python3 vgpu_launcher.py run-parallel my_ml_model.py dataset1.csv dataset2.csv dataset3.csv
```
Observe the fleet view and aggregated results.

**Say:** "Each dataset gets its own vGPU; jobs run concurrently; the scheduler aggregates throughput and accuracy."

### Step 5 — RAG copilot
In the dashboard copilot, ask:
- *"How does the scheduler assign jobs to vGPUs?"*
- *"What is the water usage effectiveness model?"*
Point out the **file:line citations** in the answer.

**Say:** "The copilot retrieves relevant project chunks from the vector index and grounds its answer in our actual code and docs — with citations — reducing hallucination."

### Step 6 — Cleanup
```bash
python3 vgpu_launcher.py clean
```
**Say:** "This stops the backend, frontend, and removes all vGPU containers."

---

## What to say about the simulated components (be transparent)

When asked "is this real?": "The orchestration — provisioning, scheduling, isolation logic, job execution, and the RAG assistant — is real and working. The GPU telemetry and water/energy numbers are modeled/simulated because this demo machine has no NVIDIA GPU and no physical meters. On a real NVIDIA host we would read genuine metrics via NVML/nvidia-smi. This is documented in the limitations section."

---

## Likely defense questions & short answers

**Q: Is this real GPU virtualization?**
A: No hardware MIG/SR-IOV. It's a container-native *control plane* that models the concepts. Future work: adopt MIG/real vGPU.

**Q: How is isolation enforced?**
A: Docker namespaces isolate processes; the isolation manager checks usage vs. limits and logs violations.

**Q: Why Docker and not a hypervisor?**
A: Lightweight, fast provisioning, shared kernel, portable, sufficient for demonstrating the orchestration layer.

**Q: How does the RAG assistant avoid hallucinations?**
A: Retrieval retrieves top-k relevant chunks, and generation is grounded in that context with file:line citations.
