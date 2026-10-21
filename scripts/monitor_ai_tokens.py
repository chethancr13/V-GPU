#!/usr/bin/env python3
"""
V-GPU AI Token & Qwen Model Monitor (Terminal CLI)
Monitors Docker Ollama container, active Qwen model, context windows, and real-time token telemetry.
"""
import sys
import time
import json
import urllib.request
import subprocess
import shutil

OLLAMA_API = "http://localhost:11434"
BACKEND_METRICS = "http://localhost:8000/metrics"

def clear_screen():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()

def get_docker_ollama_status():
    """Query docker container info for Ollama."""
    try:
        res = subprocess.run(
            ["docker", "exec", "ollama", "ollama", "ps"],
            capture_output=True, text=True, timeout=3
        )
        if res.returncode == 0:
            lines = res.stdout.strip().split("\n")
            if len(lines) > 1:
                return {"running": True, "active": lines[1:]}
            return {"running": True, "active": []}
    except Exception:
        pass
    return {"running": False, "active": []}

def get_model_specs(model_name="qwen2.5:3b"):
    """Query Ollama API for architectural max tokens & parameter size."""
    try:
        req = urllib.request.Request(
            f"{OLLAMA_API}/api/show",
            data=json.dumps({"name": model_name}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            minfo = data.get("model_info", {})
            details = data.get("details", {})
            return {
                "name": model_name,
                "arch": minfo.get("general.architecture", "qwen2"),
                "context_length_max": minfo.get("qwen2.context_length", 32768),
                "param_size": details.get("parameter_size", "3.1B"),
                "quantization": details.get("quantization_level", "Q4_K_M")
            }
    except Exception as e:
        return {"name": model_name, "error": str(e), "context_length_max": 32768}

def get_backend_prometheus_tokens():
    """Fetch Prometheus token counters from V-GPU backend."""
    try:
        with urllib.request.urlopen(BACKEND_METRICS, timeout=2) as resp:
            content = resp.read().decode("utf-8")
            metrics = {
                "prompt_total": 0,
                "completion_total": 0,
                "total_tokens": 0,
                "tokens_per_sec": 0.0,
                "calls_total": 0
            }
            for line in content.split("\n"):
                if line.startswith("vgpu_ai_tokens_prompt_total"):
                    try: metrics["prompt_total"] += float(line.split()[-1])
                    except: pass
                elif line.startswith("vgpu_ai_tokens_completion_total"):
                    try: metrics["completion_total"] += float(line.split()[-1])
                    except: pass
                elif line.startswith("vgpu_ai_tokens_total"):
                    try: metrics["total_tokens"] += float(line.split()[-1])
                    except: pass
                elif line.startswith("vgpu_ai_tokens_per_second"):
                    try: metrics["tokens_per_sec"] = float(line.split()[-1])
                    except: pass
                elif line.startswith("vgpu_ai_requests_total"):
                    try: metrics["calls_total"] += float(line.split()[-1])
                    except: pass
            return metrics
    except Exception:
        return None

def get_recent_docker_token_logs(lines=12):
    """Grab recent Ollama timing and token eval lines from docker logs."""
    try:
        res = subprocess.run(
            ["docker", "logs", "--tail", str(lines * 4), "ollama"],
            capture_output=True, text=True, timeout=3
        )
        matches = []
        for line in res.stdout.split("\n"):
            if any(k in line for k in ["print_timing", "prompt eval time", "eval time", "n_ctx_slot", "stop processing", "progress"]):
                matches.append(line.strip())
        return matches[-lines:]
    except Exception:
        return []

def print_dashboard():
    width = min(shutil.get_terminal_size((80, 24)).columns, 90)
    sep = "─" * width

    print("\033[1;36m" + "═" * width + "\033[0m")
    print("\033[1;37;44m" + "  V-GPU AI MONITOR: DOCKER QWEN 2.5 TOKEN TELEMETRY  ".center(width) + "\033[0m")
    print("\033[1;36m" + "═" * width + "\033[0m")

    # 1. Docker Ollama Status
    dock = get_docker_ollama_status()
    if dock["running"]:
        status_badge = "\033[1;32m● RUNNING (Docker container: 'ollama')\033[0m"
    else:
        status_badge = "\033[1;31m○ NOT DETECTED (Start with: docker start ollama)\033[0m"
    print(f"\033[1mOllama Service:\033[0m {status_badge}")

    # 2. Model Specs & Max Tokens
    specs_3b = get_model_specs("qwen2.5:3b")
    specs_7b = get_model_specs("qwen2.5:latest")
    print(sep)
    print("\033[1;33m► QWEN MODEL SPECIFICATIONS & MAX TOKEN LIMITS\033[0m")
    print(f"  • \033[1mqwen2.5:3b\033[0m    : Parameters: \033[36m{specs_3b.get('param_size', '3.1B')}\033[0m | Quant: {specs_3b.get('quantization', 'Q4_K_M')} | Max Arch Context: \033[1;32m{specs_3b.get('context_length_max', 32768):,} tokens (32K)\033[0m")
    print(f"  • \033[1mqwen2.5:latest\033[0m: Parameters: \033[36m{specs_7b.get('param_size', '7.6B')}\033[0m | Quant: {specs_7b.get('quantization', 'Q4_K_M')} | Max Arch Context: \033[1;32m{specs_7b.get('context_length_max', 32768):,} tokens (32K)\033[0m")
    print(f"  • \033[1mActive Runtime Context (num_ctx)\033[0m: \033[1;35m1,536 tokens\033[0m (Optimized low-latency sliding window for V-GPU)")
    print(f"  • \033[1mMax Output Tokens (num_predict)\033[0m : \033[1;35m220 tokens\033[0m (Per answer generation)")

    # 3. Currently Loaded Model in Memory
    print(sep)
    print("\033[1;33m► CURRENTLY LOADED IN V-RAM / RAM (via `docker exec ollama ollama ps`)\033[0m")
    if dock["active"]:
        for act in dock["active"]:
            print(f"  \033[32m✔\033[0m {act}")
    else:
        print("  \033[90m(Idle - Model loads automatically into memory when a query is sent)\033[0m")

    # 4. Aggregated Prometheus AI Token Counters
    prom = get_backend_prometheus_tokens()
    print(sep)
    print("\033[1;33m► AGGREGATED V-GPU AI TOKEN METRICS (Prometheus Telemetry)\033[0m")
    if prom:
        print(f"  • Total AI Requests  : \033[1;37m{int(prom['calls_total'])}\033[0m queries dispatched")
        print(f"  • Prompt (Input)     : \033[1;34m{int(prom['prompt_total']):,} tokens\033[0m (System prompts + User queries + RAG context)")
        print(f"  • Generated (Output) : \033[1;32m{int(prom['completion_total']):,} tokens\033[0m (AI responses)")
        print(f"  • Cumulative Total   : \033[1;35m{int(prom['total_tokens']):,} tokens\033[0m processed")
        print(f"  • Recent Speed       : \033[1;33m{prom['tokens_per_sec']:.1f} tokens/sec\033[0m")
    else:
        print("  \033[90m(Backend at :8000/metrics not reachable or starting up)\033[0m")

    # 5. Live Docker Ollama Inference Logs
    print(sep)
    print("\033[1;33m► RECENT DOCKER OLLAMA TIMING & TOKEN LOGS\033[0m")
    logs = get_recent_docker_token_logs(6)
    if logs:
        for l in logs:
            print(f"  \033[36m│\033[0m \033[90m{l}\033[0m")
    else:
        print("  \033[90m(No recent timing logs in docker buffer)\033[0m")

    print("\033[1;36m" + "═" * width + "\033[0m")
    print("\033[90mPress Ctrl+C to exit. Updates every 2 seconds.\033[0m")

def main():
    if "--once" in sys.argv:
        print_dashboard()
        return

    try:
        while True:
            clear_screen()
            print_dashboard()
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n\033[32mExited AI Monitor.\033[0m")

if __name__ == "__main__":
    main()
