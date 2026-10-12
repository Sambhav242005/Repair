"""Gemini REST adapter; no secrets in URLs or exception messages."""
import asyncio
import base64
import json
import os
import re
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from typing import Protocol

from .prompts import SYSTEM


class ProviderError(RuntimeError):
    code = "PROVIDER_UNAVAILABLE"


class AIInputError(ValueError):
    code = "VALIDATION_ERROR"


def image_part(data: bytes) -> dict:
    if not isinstance(data, bytes) or not data or len(data) > 5 * 1024 * 1024:
        raise AIInputError("Screenshot must be nonempty PNG/JPEG bytes, at most 5 MB.")
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime = "image/png"
    elif data.startswith(b"\xff\xd8\xff"):
        mime = "image/jpeg"
    else:
        raise AIInputError("Only PNG and JPEG screenshots are supported.")
    return {"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode("ascii")}}


class Provider(Protocol):
    async def generate(self, prompt: str, schema: dict, image: bytes | None, timeout: float) -> str: ...


def configured_provider() -> Provider:
    name = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    if name == "gemini":
        return GeminiProvider()
    if name == "ollama":
        return OllamaProvider()
    raise ProviderError("AI_PROVIDER must be gemini or ollama.")


class OllamaProvider:
    """Local Ollama gateway (including signed-in cloud models) or direct cloud."""
    def __init__(self, model: str | None = None, base_url: str | None = None, api_key: str | None = None):
        self.model = model if model is not None else os.getenv("OLLAMA_MODEL", "gemma4:31b-cloud")
        self.base_url = (base_url if base_url is not None else os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
        self.api_key = api_key if api_key is not None else os.getenv("OLLAMA_API_KEY", "")
        parsed = urlsplit(self.base_url)
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password
                or parsed.query or parsed.fragment or parsed.path not in {"", "/"}):
            raise ProviderError("OLLAMA_BASE_URL must be an HTTP(S) origin without credentials or a path.")
        if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise ProviderError("Remote Ollama endpoints must use HTTPS.")
        if not self.model.strip():
            raise ProviderError("Configure OLLAMA_MODEL.")
        self.cloud = parsed.hostname == "ollama.com" or self.model.endswith("-cloud")
        if parsed.hostname == "ollama.com" and not self.api_key.strip():
            raise ProviderError("Direct Ollama cloud access requires OLLAMA_API_KEY.")

    async def generate(self, prompt: str, schema: dict, image: bytes | None, timeout: float) -> str:
        message = {"role": "user", "content": prompt + "\nReturn only JSON matching this schema:\n" + json.dumps(schema)}
        if image is not None:
            message["images"] = [image_part(image)["inlineData"]["data"]]
        payload = {"model": self.model, "messages": [{"role": "system", "content": SYSTEM}, message], "stream": False}
        # Cloud lacks server-enforced structured outputs; service validates locally.
        if not self.cloud:
            payload["format"] = schema
        return await asyncio.to_thread(self._request, payload, timeout)

    def _request(self, payload: dict, timeout: float) -> str:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = "Bearer " + self.api_key
        request = urllib.request.Request(self.base_url + "/api/chat", data=json.dumps(payload).encode(), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                result = json.load(response)
            if result.get("error") or result.get("done") is not True or result.get("done_reason") not in {None, "stop"}:
                raise ProviderError("Ollama returned failed or incomplete content; retry.")
            content = result.get("message", {}).get("content")
            if not isinstance(content, str) or not content.strip():
                raise ProviderError("Ollama returned no usable content.")
            content = content.strip()
            fenced = re.fullmatch(r"```(?:json)?\s*\n([\s\S]*?)\n```", content)
            return fenced.group(1).strip() if fenced else content
        except urllib.error.HTTPError as exc:
            raise ProviderError(f"Ollama request failed (HTTP {exc.code}); check sign-in, model and quota.") from None
        except (OSError, ValueError, KeyError, IndexError, TypeError, AttributeError):
            raise ProviderError("Ollama is unreachable or returned an invalid envelope; check the server and retry.") from None


class GeminiProvider:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")
        self.model = model if model is not None else os.getenv("GEMINI_MODEL", "")
        if not self.api_key.strip() or not self.model.strip():
            raise ProviderError("Configure backend GEMINI_API_KEY and GEMINI_MODEL, then retry.")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", self.model):
            raise ProviderError("GEMINI_MODEL must be a model ID without a path.")

    async def generate(self, prompt: str, schema: dict, image: bytes | None, timeout: float) -> str:
        parts = [{"text": prompt}]
        if image is not None:
            parts.append(image_part(image))
        payload = {"systemInstruction": {"parts": [{"text": SYSTEM}]},
                   "contents": [{"role": "user", "parts": parts}],
                   "generationConfig": {"responseFormat": {"text": {"mimeType": "application/json", "schema": schema}}}}
        return await asyncio.to_thread(self._request, payload, timeout)

    def _request(self, payload: dict, timeout: float) -> str:
        request = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key}, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                result = json.load(response)
            candidate = result.get("candidates", [{}])[0]
            if candidate.get("finishReason") != "STOP":
                raise ProviderError("Gemini returned blocked or incomplete content; retry with clearer context.")
            text = "".join(p.get("text", "") for p in candidate.get("content", {}).get("parts", []) if not p.get("thought"))
            if not text:
                raise ProviderError("Gemini returned no usable content.")
            return text
        except urllib.error.HTTPError as exc:
            raise ProviderError(f"Gemini request failed (HTTP {exc.code}); check configuration or quota and retry.") from None
        except (OSError, ValueError, KeyError, IndexError, TypeError):
            raise ProviderError("Gemini network request failed or returned an invalid envelope; retry.") from None
