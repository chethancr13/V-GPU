import json
import time
import urllib.request
import urllib.error
import asyncio
from typing import Optional, Dict, Any, List

class OllamaEngine:
    """
    Dedicated local Ollama client for V-GPU.
    Supports:
    - Auto-detecting running Ollama daemon at http://localhost:11434
    - Auto-discovering models (Qwen 2.5, Qwen 2.5 Coder, Unsloth custom models)
    - Full conversational generation with live system context & metrics
    - JSON structured responses for seamless integration with AIComparisonAgent
    """

    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = "qwen2.5"):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    def get_status(self) -> Dict[str, Any]:
        """
        Synchronously check if Ollama daemon is reachable and list installed models.
        """
        try:
            url = f"{self.base_url}/api/tags"
            req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name") for m in data.get("models", [])]
                
                # Auto-select best model: prioritize 3b first for high speed, then qwen2.5:latest, then others
                active = None
                for candidate in ["3b", "qwen2.5:latest", "qwen2.5"]:
                    for m in models:
                        if candidate in m.lower():
                            active = m
                            break
                    if active:
                        break
                if not active:
                    for m in models:
                        if "qwen" in m.lower():
                            active = m
                            break
                if not active and models:
                    active = models[0]
                elif not active:
                    active = self.default_model

                return {
                    "running": True,
                    "models": models,
                    "active_model": active,
                    "base_url": self.base_url
                }
        except Exception:
            return {
                "running": False,
                "models": [],
                "active_model": self.default_model,
                "base_url": self.base_url
            }

    async def get_status_async(self) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.get_status)

    def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model_name: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        format_json: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Call Ollama chat or generate endpoint.
        Returns parsed dict: {"text": str, "navigate": Optional[str], "metrics_used": bool}
        """
        status = self.get_status()
        if not status["running"]:
            return None

        # Resolve model name
        target_model = model_name or status["active_model"] or self.default_model

        url = f"{self.base_url}/api/chat"

        # Auto-select best model: look for qwen models (prioritizing 3b/latest), then fallback
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if history:
            for h in history[-4:]:
                role = "user" if h.get("role") == "user" else "assistant"
                content = h.get("content", h.get("text", ""))
                if content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "stream": False,
            "keep_alive": "24h",
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "top_k": 20,
                "num_ctx": 1536,
                "num_predict": 220,
                "num_thread": 8
            }
        }

        if format_json:
            payload["format"] = "json"

        start_time = time.time()
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                duration_s = max(time.time() - start_time, 0.001)
                raw_text = data.get("message", {}).get("content", "").strip()

                if not raw_text:
                    return None

                # Clean reasoning / thinking tokens from reasoning-enabled models
                import re
                clean_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
                if not clean_text and raw_text:
                    clean_text = raw_text

                # Extract token metrics directly from Ollama response, fallback to heuristic
                prompt_tokens = data.get("prompt_eval_count")
                completion_tokens = data.get("eval_count")
                if prompt_tokens is None or prompt_tokens <= 0:
                    from core.telemetry.prometheus_exporter import ai_token_tracker
                    prompt_tokens = ai_token_tracker.estimate_tokens(prompt + " " + system_prompt)
                if completion_tokens is None or completion_tokens <= 0:
                    from core.telemetry.prometheus_exporter import ai_token_tracker
                    completion_tokens = ai_token_tracker.estimate_tokens(clean_text)

                total_tokens = prompt_tokens + completion_tokens

                # Record into Prometheus & in-memory tracker
                try:
                    from core.telemetry.prometheus_exporter import ai_token_tracker
                    ai_token_tracker.record_inference(
                        model=target_model,
                        engine="ollama",
                        prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens,
                        duration_s=duration_s,
                        success=True,
                        call_type="chat",
                        prompt_snippet=prompt,
                        response_snippet=clean_text
                    )
                except Exception as ex:
                    print(f"[Prometheus] Failed recording Ollama inference: {ex}")

                token_usage = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "duration_s": round(duration_s, 3),
                    "tokens_per_sec": round(completion_tokens / max(duration_s, 0.001), 2)
                }

                # Attempt to parse structured JSON
                try:
                    parsed = json.loads(clean_text)
                    return {
                        "text": parsed.get("text", clean_text),
                        "navigate": parsed.get("navigate"),
                        "metrics_used": parsed.get("metrics_used", True),
                        "model": target_model,
                        "raw": clean_text,
                        "token_usage": token_usage
                    }
                except Exception:
                    # If model returned direct markdown text rather than JSON
                    return {
                        "text": clean_text,
                        "navigate": None,
                        "metrics_used": True,
                        "model": target_model,
                        "raw": clean_text,
                        "token_usage": token_usage
                    }

        except Exception as e:
            duration_s = max(time.time() - start_time, 0.001)
            try:
                from core.telemetry.prometheus_exporter import ai_token_tracker
                prompt_tokens = ai_token_tracker.estimate_tokens(prompt)
                ai_token_tracker.record_inference(
                    model=target_model,
                    engine="ollama",
                    prompt_tokens=prompt_tokens,
                    completion_tokens=0,
                    duration_s=duration_s,
                    success=False,
                    call_type="chat",
                    prompt_snippet=prompt
                )
            except Exception:
                pass
            print(f"Ollama generation failed ({target_model}): {e}")
            return None

    async def generate_async(
        self,
        prompt: str,
        system_prompt: str = "",
        model_name: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        format_json: bool = True
    ) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.generate,
            prompt,
            system_prompt,
            model_name,
            history,
            format_json
        )


ollama_engine = OllamaEngine()
