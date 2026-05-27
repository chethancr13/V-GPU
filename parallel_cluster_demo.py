#!/usr/bin/env python3
import time
import random
import sys
import argparse

def run_parallel_task():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=str)
    args = parser.parse_args()

    ds_name = args.dataset.split('/')[-1] if args.dataset else "Unknown"
    
    print(f"🚀 Cluster Node Initialized.")
    print(f"📂 Processing partition: {ds_name}")
    
    # Simulate parallel processing workload
    time.sleep(3)
    
    accuracy = random.uniform(92, 98)
    speed = random.uniform(300, 600)
    loss = random.uniform(0.05, 0.15)
    
    print(f"📈 Node Metrics Summary:")
    print(f"Accuracy: {accuracy:.2f}%")
    print(f"Speed: {speed:.1f} samples/sec")
    print(f"Loss: {loss:.4f}")
    print(f"Node Task: Data Partition {ds_name} - Operation Complete.")

if __name__ == "__main__":
    run_parallel_task()
