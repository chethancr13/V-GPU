import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

class HuggingFaceModelEngine:
    """
    HuggingFace & Local Inference Engine for small models (< 15B parameters).
    Supports:
    - HuggingFace Serverless Inference API (Qwen2.5-Coder-7B, Llama-3.2-3B, Phi-3.5-mini)
    - Local Ollama Engine (http://localhost:11434)
    - Seamless fallback to Local Grounded Synthesizer
    """
    
    DEFAULT_MODELS = [
        "Qwen/Qwen2.5-Coder-7B-Instruct",
        "meta-llama/Llama-3.2-3B-Instruct",
        "microsoft/Phi-3.5-mini-instruct",
        "mistralai/Mistral-7B-Instruct-v0.3"
    ]

    def __init__(self, model_name: str = "Qwen/Qwen2.5-Coder-7B-Instruct", hf_token: Optional[str] = None):
        self.model_name = model_name
        self.hf_token = hf_token
        self.ollama_url = "http://localhost:11434/api/generate"

    def generate(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        # 1. Try Local Ollama if running
        ollama_resp = self._call_ollama(prompt, system_prompt)
        if ollama_resp:
            return ollama_resp

        # 2. Try HuggingFace Inference API
        hf_resp = self._call_huggingface_api(prompt, system_prompt)
        if hf_resp:
            return hf_resp

        return None

    def _call_ollama(self, prompt: str, system_prompt: str) -> Optional[str]:
        try:
            payload = {
                "model": "qwen2.5-coder:7b",
                "prompt": f"{system_prompt}\n\n{prompt}",
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 512}
            }
            req = urllib.request.Request(
                self.ollama_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if "response" in data and data["response"]:
                    return data["response"].strip()
        except Exception:
            pass
        return None

    def _call_huggingface_api(self, prompt: str, system_prompt: str) -> Optional[str]:
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(model=self.model_name, token=self.hf_token)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            response = client.chat.completions.create(
                messages=messages,
                max_tokens=512,
                temperature=0.2
            )
            if response and response.choices and len(response.choices) > 0:
                return response.choices[0].message.content.strip()
        except Exception:
            pass
        return None
