import asyncio
import time
import random
# pyrefly: ignore [missing-import]
import numpy as np
from typing import Dict, List, Optional, Any
from enum import Enum
import base64
import io

class JobPriority(Enum):
    HIGH = 3
    NORMAL = 2
    LOW = 1

class ComputeEngine:
    def __init__(self):
        # Simulate models
        self.models = {
            'resnet50': 'simulated_resnet',
            'bert': 'simulated_bert'
        }

    async def calculate_job_metrics(self, job: Dict) -> Dict:
        # Calculate resulting metrics for a specific job run
        if job["type"] == "compute":
            return await self._run_compute_job(job)
        elif job["type"] == "inference":
            return await self._run_inference_job(job)
        else:
            raise ValueError("Unknown job type")

    async def _run_compute_job(self, job: Dict) -> Dict:
        # Simulate compute operations using NumPy
        size = job["size"]
        job_type = job["job_type"]

        await asyncio.sleep(0.1)  # Simulate processing time

        if job_type == "matmul":
            # Matrix multiplication
            A = np.random.rand(size, size)
            B = np.random.rand(size, size)
            start = time.time()
            C = np.dot(A, B)
            compute_time = time.time() - start
            gflops = (2 * size**3) / (compute_time * 1e9)  # Simplified GFLOPS
        elif job_type == "fft":
            # FFT
            data = np.random.rand(size) + 1j * np.random.rand(size)
            start = time.time()
            result = np.fft.fft(data)
            compute_time = time.time() - start
            gflops = (5 * size * np.log2(size)) / (compute_time * 1e9)  # Rough estimate
        elif job_type == "reduction":
            # Sum reduction
            data = np.random.rand(size)
            start = time.time()
            result = np.sum(data)
            compute_time = time.time() - start
            gflops = size / (compute_time * 1e9)
        else:
            raise ValueError(f"Unknown compute job type: {job_type}")

        return {
            "gflops_achieved": gflops,
            "execution_time": compute_time
        }

    async def _run_inference_job(self, job: Dict) -> Dict:
        model_name = job["model_name"]
        batch_size = job["batch_size"]

        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not loaded")

        # Simulate inference
        await asyncio.sleep(0.05 * batch_size)  # Simulate processing time

        latency = random.uniform(10, 100)
        throughput = batch_size / (latency / 1000)

        res = {
            "latency_ms": latency,
            "throughput_req_per_sec": throughput,
            "memory_used": random.uniform(100, 1000)  # MB
        }
        if "agent_logs" in job:
            res["agent_logs"] = job["agent_logs"]
        if "agent_findings" in job:
            res["agent_findings"] = job["agent_findings"]
        return res


class GraphicsEngine:
    """Lazy-initialized graphics engine — defers heavy OpenGL context creation
    until first actual render call, saving 200-500ms on application startup."""
    def __init__(self, width: int = 800, height: int = 600):
        self.width = width
        self.height = height
        # Defer context creation to first use
        self._ctx = None
        self._fbo = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy-init: create OpenGL context only when first needed."""
        if self._initialized:
            return
        try:
            import moderngl
            import cv2
            self._ctx = moderngl.create_standalone_context()
            self._fbo = self._ctx.framebuffer(
                color_attachments=[self._ctx.texture((self.width, self.height), 4)]
            )
            self._fbo.use()
            self._initialized = True
        except Exception as e:
            print(f"[GraphicsEngine] Failed to initialize OpenGL context: {e}")
            self._initialized = False

    @property
    def ctx(self):
        self._ensure_initialized()
        return self._ctx

    @property
    def fbo(self):
        self._ensure_initialized()
        return self._fbo

    def render_frame(self) -> bytes:
        self._ensure_initialized()
        if not self._initialized or self._ctx is None:
            # Return a minimal placeholder if OpenGL is unavailable
            return base64.b64encode(b"").decode('utf-8')

        import cv2

        # Simple rotating cube or particle system
        # For simplicity, render a gradient or something
        # In real implementation, use shaders

        # Clear
        self._ctx.clear(0.1, 0.1, 0.1, 1.0)

        # Render something simple
        # For now, just a colored quad
        vertices = np.array([
            -1.0, -1.0, 0.0, 1.0, 0.0, 0.0,
             1.0, -1.0, 0.0, 0.0, 1.0, 0.0,
            -1.0,  1.0, 0.0, 0.0, 0.0, 1.0,
             1.0,  1.0, 0.0, 1.0, 1.0, 1.0
        ], dtype=np.float32)

        vbo = self._ctx.buffer(vertices.tobytes())
        vao = self._ctx.vertex_array(self._ctx.program(
            vertex_shader='''
                #version 330
                in vec3 in_position;
                in vec3 in_color;
                out vec3 color;
                void main() {
                    gl_Position = vec4(in_position, 1.0);
                    color = in_color;
                }
            ''',
            fragment_shader='''
                #version 330
                in vec3 color;
                out vec4 out_color;
                void main() {
                    out_color = vec4(color, 1.0);
                }
            '''
        ), [(vbo, '3f 3f', 'in_position', 'in_color')])

        vao.render(self._ctx.TRIANGLE_STRIP)

        # Read pixels
        pixels = self._fbo.read(components=3)
        image = np.frombuffer(pixels, dtype=np.uint8).reshape((self.height, self.width, 3))
        image = cv2.flip(image, 0)  # Flip vertically

        # Encode to JPEG
        _, encoded = cv2.imencode('.jpg', image)
        return base64.b64encode(encoded.tobytes()).decode('utf-8')

# Global instances
compute_engine = ComputeEngine()
# GraphicsEngine is lazy — OpenGL context created on first render_frame() call,
# not at import time. This avoids blocking startup by 200-500ms.
graphics_engine = GraphicsEngine()