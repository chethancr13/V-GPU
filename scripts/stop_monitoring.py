#!/usr/bin/env python3
"""
Stop Prometheus & Grafana Monitoring Stack.
"""

import subprocess
import os

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    compose_file = os.path.join(root_dir, "docker-compose.monitoring.yml")

    print("Stopping V-GPU Prometheus & Grafana Monitoring Stack...")
    cmd = ["docker", "compose", "-f", compose_file, "down"]
    subprocess.run(cmd, cwd=root_dir)
    print("Monitoring stack stopped.")

if __name__ == "__main__":
    main()
