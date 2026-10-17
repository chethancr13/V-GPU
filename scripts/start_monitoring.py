#!/usr/bin/env python3
"""
Launcher script for Prometheus & Grafana Monitoring Stack.
"""

import subprocess
import sys
import time
import os
import webbrowser

def check_docker():
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return res.returncode == 0
    except Exception:
        return False

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    compose_file = os.path.join(root_dir, "docker-compose.monitoring.yml")

    print("=" * 60)
    print(" V-GPU Prometheus & Grafana Monitoring Stack Launcher")
    print("=" * 60)

    if not check_docker():
        print(" Docker is not running or not found. Please start Docker Desktop and retry.")
        sys.exit(1)

    print(f" Starting Prometheus and Grafana containers via {compose_file}...")
    cmd = ["docker", "compose", "-f", compose_file, "up", "-d"]
    ret = subprocess.run(cmd, cwd=root_dir)

    if ret.returncode != 0:
        print(" Failed to launch monitoring containers.")
        sys.exit(ret.returncode)

    print("\n Monitoring Stack is UP and RUNNING!")
    print("   Prometheus UI:        http://localhost:9090")
    print("   Grafana Dashboard:    http://localhost:3001 (auto-login enabled)")
    print("   V-GPU Scrape Target:  http://localhost:8000/metrics")
    print("   AI Token Monitor API: http://localhost:8000/api/metrics/ai-tokens\n")

    # Give Grafana 3 seconds to spin up, then open in browser if requested
    if "--open" in sys.argv:
        time.sleep(3)
        try:
            webbrowser.open("http://localhost:3001/d/vgpu-ai-tokens/v-gpu-cluster-ai-model-tokens-monitoring?orgId=1&kiosk=tv")
        except Exception:
            pass

if __name__ == "__main__":
    main()
