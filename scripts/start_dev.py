import subprocess
import time
import sys
import os
import signal

def is_docker_running():
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except:
        return False

def check_and_start_docker():
    if is_docker_running():
        print(" Docker is already running.")
        return True
    
    if sys.platform == "darwin":
        print(" Docker is not running. Starting Docker Desktop on macOS...")
        subprocess.run(["open", "-a", "Docker"])
        # Poll up to 45 seconds
        for _ in range(22):
            time.sleep(2)
            if is_docker_running():
                print(" Docker started successfully.")
                return True
        print(" Docker failed to start in time.")
        return False
    else:
        print(" Docker is not running. Please start Docker first.")
        return False

def build_worker_image():
    print(" Checking if 'vgpu-worker' Docker image exists...")
    res = subprocess.run(["docker", "image", "inspect", "vgpu-worker"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if res.returncode != 0:
        print(" 'vgpu-worker' image not found. Building it now from vGPU-Worker.Dockerfile...")
        build_res = subprocess.run(["docker", "build", "-t", "vgpu-worker", "-f", "vGPU-Worker.Dockerfile", "."])
        if build_res.returncode == 0:
            print(" 'vgpu-worker' image built successfully.")
        else:
            print(" Failed to build 'vgpu-worker' image.")
    else:
        print(" 'vgpu-worker' image exists.")

def sync_docker_time():
    print(" Syncing Docker clock with host clock...")
    try:
        subprocess.run(["docker", "run", "--rm", "--privileged", "alpine", "hwclock", "-s"])
        print(" Clock synced.")
    except Exception as e:
        print(f" Warning: Could not sync clock: {e}")

def main():
    # Set CWD to root directory
    os.chdir(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    
    if not check_and_start_docker():
        print(" Proceeding without Docker (falling back to simulation mode)...")
    else:
        build_worker_image()
        sync_docker_time()
        
    print(" Starting V-GPU Backend...")
    # Start the backend uvicorn process
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        env={**os.environ, "PYTHONPATH": os.getcwd()}
    )
    
    print(" Starting Vite Dev Server...")
    # Start Vite in frontend folder
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    vite_process = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=frontend_dir,
        env=os.environ.copy()
    )
    
    # Register cleanup handlers
    def cleanup(signum, frame):
        print("\n Shutting down background processes...")
        try:
            backend_process.terminate()
        except:
            pass
        try:
            vite_process.terminate()
        except:
            pass
        try:
            backend_process.wait(timeout=2)
        except:
            pass
        try:
            vite_process.wait(timeout=2)
        except:
            pass
        sys.exit(0)
        
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    try:
        # Wait for Vite dev server to finish
        vite_process.wait()
    except KeyboardInterrupt:
        cleanup(None, None)
    finally:
        try:
            backend_process.terminate()
            backend_process.wait(timeout=2)
        except:
            pass

if __name__ == "__main__":
    main()
