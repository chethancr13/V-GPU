#!/usr/bin/env python3
import subprocess
import time
import sys
import os
import requests
import webbrowser

def start_backend():
    print("🚀 Starting V-GPU Backend (Monolithic)...")
    # Using uvicorn to serve the root FastAPI app
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        env={**os.environ, "PYTHONPATH": os.getcwd()}
    )
    return backend_process



# start_frontend removed as per user request

def start_dashboard():
    print("🖥️ Starting vGPU Web Dashboard (React+Vite)...")
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    dashboard_process = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=frontend_dir,
        env=os.environ.copy()
    )
    return dashboard_process

def start_electron():
    print("🖥️ Launching V-GPU Desktop App (Electron)...")
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    electron_process = subprocess.Popen(
        "npm run electron",
        shell=True,
        cwd=frontend_dir,
        env=os.environ.copy()
    )
    return electron_process

def import_dataset(source_path, target_name):
    import shutil
    print(f"📥 Importing dataset: {source_path} -> {target_name}...")
    target_dir = os.path.join("data", "datasets", target_name)
    os.makedirs(target_dir, exist_ok=True)
    
    if os.path.isfile(source_path):
        # If it's a file, copy it into the folder
        shutil.copy2(source_path, os.path.join(target_dir, os.path.basename(source_path)))
    elif os.path.isdir(source_path):
        # If it's a directory, copy its contents
        for item in os.listdir(source_path):
            s = os.path.join(source_path, item)
            d = os.path.join(target_dir, item)
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)
    else:
        print(f"❌ Source path {source_path} does not exist.")
        return False
    
    print(f"✅ Dataset '{target_name}' imported successfully.")
    return True

def main():
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "import":
            if len(sys.argv) < 3:
                print("Usage: python3 vgpu_launcher.py import <file_or_folder> <target_name>")
                return
            source = sys.argv[2]
            target = sys.argv[3] if len(sys.argv) > 3 else os.path.basename(source).split('.')[0]
            import_dataset(source, target)
            return

        if command == "clean":
            print("🧹 Cleaning up all vGPU instances and containers...")
            try:
                # 1. Kill backend and frontend processes by port
                print("🛑 Stopping backend and frontend...")
                subprocess.run("lsof -ti:8000,5173 | xargs kill -9", shell=True, stderr=subprocess.DEVNULL)
                
                # 2. Cleanup Docker
                import docker
                client = docker.from_env()
                containers = client.containers.list(all=True, filters={"name": "vgpu-"})
                for c in containers:
                    print(f"Removing container {c.name}...")
                    try:
                        c.stop(timeout=2)
                        c.remove()
                    except:
                        pass
                print("✨ Environment fully cleaned and reset.")
            except Exception as e:
                print(f"❌ Clean failed: {e}")
            return

        if command == "run":
            if len(sys.argv) < 3:
                print("Usage: python3 vgpu_launcher.py run <script_name> [vgpu_id] [dataset_path_or_name]")
                return
            script = sys.argv[2]
            vgpu_id = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "auto" else "auto"
            dataset = sys.argv[4] if len(sys.argv) > 4 else None
            
            # Smart Dataset Resolution
            if dataset:
                # If it looks like a local path or a specific file type, auto-import it
                if os.path.exists(dataset) or dataset.endswith(('.csv', '.json', '.txt')) or '/' in dataset or '\\' in dataset:
                    target_name = os.path.basename(dataset).split('.')[0]
                    if import_dataset(dataset, target_name):
                        dataset = target_name # Use the imported name for the API call

            # Additional flags
            compute_limit = 100 # Default to 100 for 'run' if provisioning
            
            # Ensure backend is running
            try:
                requests.get("http://localhost:8000/api/vgpu/list", timeout=2)
            except:
                print("⚠️ Backend is not running. Starting it automatically...")
                start_backend()
                time.sleep(5)

            # Find an active vGPU if id is 'auto'
            if vgpu_id == "auto":
                try:
                    resp = requests.get("http://localhost:8000/api/vgpu/list", timeout=2)
                    insts = resp.json()
                    if insts:
                        vgpu_id = insts[0]["id"]
                    else:
                        print(f"❌ No active vGPU found. Provisioning one with {compute_limit}% compute...")
                        resp = requests.post(f"http://localhost:8000/api/vgpu/provision?vram_mb=2048&compute_pct={compute_limit}")
                        if resp.status_code == 400:
                            print(f"⚠️ Infrastructure Full: {resp.json().get('detail')}")
                            print("💡 Hint: Run 'python3 vgpu_launcher.py clean' to reset the cluster.")
                            return
                        vgpu_id = resp.json().get("vgpu_id")
                        if not vgpu_id:
                            print(f"❌ Failed to provision vGPU: {resp.text}")
                            return
                        print(f"✅ Provisioned vGPU: {vgpu_id}")
                    
                    # Auto-start dashboard and electron
                    start_dashboard()
                    time.sleep(2)
                    start_electron()
                except Exception as e:
                    print(f"❌ Initialization error: {e}")
                    return

            print(f"🧪 Running ML Job on vGPU {vgpu_id}...")
            url = f"http://localhost:8000/api/jobs/ml?vgpu_id={vgpu_id}&script_name={script}"
            if dataset:
                url += f"&dataset_name={dataset}"
            
            try:
                resp = requests.post(url)
                results = resp.json()
                print("\n📈 --- Job Results ---")
                
                # Check for success vs failure
                if results.get("status") == "failed" or results.get("accuracy") is None:
                    print(f"❌ Job Status: {results.get('status', 'failed').upper()}")
                    print("\n⚠️  [VGPU TERMINAL OUTPUT]")
                    print("-" * 30)
                    print(results.get("raw_output", "No output captured."))
                    print("-" * 30)
                else:
                    print(f"Accuracy: {results.get('accuracy')}%")
                    print(f"Speed:    {results.get('speed')} samples/sec")
                    print(f"Loss:     {results.get('loss')}")
                    if results.get("dataset_used"):
                        print(f"Dataset:  {results.get('dataset_used')}")
                    
                    # Print Leaderboard
                    leaderboard = results.get("leaderboard")
                    if leaderboard:
                        print("\n🏆 --- Model Leaderboard ---")
                        print(f"{'Model Name':<20} | {'RMSE':<10} | {'MAE':<10} | {'R2':<10}")
                        print("-" * 60)
                        for m in leaderboard:
                            print(f"{m['name']:<20} | {m['rmse']:<10} | {m['mae']:<10} | {m['r2']:<10}")
                
                print("----------------------\n")
            except Exception as e:
                print(f"❌ Job execution failed: {e}")
            return

        if command == "run-parallel":
            if len(sys.argv) < 3:
                print("Usage: python3 vgpu_launcher.py run-parallel <script_name> <dataset1> <dataset2> ...")
                return
            script = sys.argv[2]
            datasets = sys.argv[3:]
            
            print(f"🚀 Initializing Parallel Cluster for {len(datasets)} jobs...")
            
            # Ensure Backend is running
            try:
                requests.get("http://localhost:8000/api/vgpu/list")
            except:
                print("⚠️ Backend is not running. Starting it automatically...")
                start_backend()
                time.sleep(5)

            # Start dashboard and electron
            start_dashboard()
            time.sleep(2)
            start_electron()
            
            import threading
            results_list = []
            threads = []
            
            def run_single(ds):
                # Request a new vGPU for each parallel job
                try:
                    # Provision a fresh vGPU
                    prov_resp = requests.post("http://localhost:8000/api/vgpu/provision?vram_mb=1024&compute_pct=50")
                    if prov_resp.status_code == 400:
                        print(f"⚠️ [Node {ds}] Resource Failure: Cluster is full. Run 'python3 vgpu_launcher.py clean'.")
                        return
                        
                    vid = prov_resp.json().get("vgpu_id")
                    if not vid:
                        print(f"❌ [Node {ds}] Provisioning failed.")
                        return
                    print(f"✅ Created vGPU {vid} for {ds}")
                    
                    url = f"http://localhost:8000/api/jobs/ml?vgpu_id={vid}&script_name={script}&dataset_name={ds}"
                    job_resp = requests.post(url)
                    res = job_resp.json()
                    res["dataset"] = ds
                    results_list.append(res)
                    print(f"🏁 Job finished for {ds}: Accuracy {res.get('accuracy')}%")
                except Exception as e:
                    print(f"❌ Parallel job failed for {ds}: {e}")

            for ds in datasets:
                t = threading.Thread(target=run_single, args=(ds,))
                t.start()
                threads.append(t)
            
            for t in threads:
                t.join()
                
            print("\n📊 --- Parallel Cluster Aggregated Results ---")
            total_acc = 0
            total_speed = 0
            for res in results_list:
                dataset = res.get('dataset', 'Unknown')
                accuracy = res.get('accuracy', 'N/A')
                speed = res.get('speed', 'N/A')
                print(f"[{dataset}] -> Accuracy: {accuracy}% | Speed: {speed} samples/sec")
                # Print Leaderboard if available for this job
                if res.get("leaderboard"):
                    # Assuming leaderboard is a list and we want to show the top model
                    if res['leaderboard']:
                        top_model = res['leaderboard'][0]
                        print(f"   ∟ Leaderboard (Top Model: {top_model['name']}, R2: {top_model['r2']})")
                total_acc += res.get('accuracy', 0)
                total_speed += res.get('speed', 0)
            
            if results_list:
                avg_acc = total_acc / len(results_list)
                print(f"\n✨ Cluster Metrics: Avg Accuracy: {avg_acc:.2f}% | Total Throughput: {total_speed:.2f} samples/sec")
            print("------------------------------------------\n")
            return

    # Default action: Start everything
    backend = start_backend()
    time.sleep(3)  # Wait for backend to be ready
    
    dashboard = start_dashboard()
    time.sleep(2)
    electron = start_electron()
    
    print("\n🌍 vGPU Environment is ready (Electron Desktop App Mode)!")
    print("Backend:  http://localhost:8000")
    print("Frontend: http://localhost:5173")
    print("\nTo run an ML job, use: python3 vgpu_launcher.py run <script_name>\n")
    
    try:
        backend.wait()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        backend.terminate()
        if dashboard:
            dashboard.terminate()
        if electron:
            electron.terminate()

if __name__ == "__main__":
    main()
