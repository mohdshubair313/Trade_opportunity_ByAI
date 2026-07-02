"""
Multimodal AI services for image analysis and low-latency speech synthesis.

OpenRouter is the primary provider because it gives access to multiple free
vision models plus a dedicated OpenAI-compatible TTS endpoint. Gemini remains
available as a fallback for vision tasks when OpenRouter is unavailable.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import re
import wave
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, Optional, Tuple

import httpx
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class MultimodalAIError(RuntimeError):
    """Base class for multimodal AI failures."""


class InvalidImageError(MultimodalAIError):
    """Raised when the uploaded image is unreadable or unsupported."""


class ProviderUnavailableError(MultimodalAIError):
    """Raised when all configured providers fail."""


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strip_code_fences(text: str) -> str:
    value = text.strip()
    value = re.sub(r"^```(?:json)?\s*", "", value)
    value = re.sub(r"\s*```$", "", value)
    return value.strip()


def _safe_json_loads(text: str) -> Optional[Dict[str, Any]]:
    cleaned = _strip_code_fences(text)
    if not cleaned:
        return None
    try:
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            return None
        try:
            value = json.loads(match.group(0))
            return value if isinstance(value, dict) else None
        except json.JSONDecodeError:
            return None


class MultimodalAIService:
    """Provider-aware service for vision and text-to-speech tasks."""

    def __init__(self) -> None:
        self._openrouter_timeout = httpx.Timeout(45.0, connect=10.0)
        self._tts_timeout = httpx.Timeout(None, connect=10.0, read=None, write=30.0, pool=30.0)

    def _gemini_voice_name(self, voice: str) -> str:
        """Map generic voice names to a safe Gemini fallback voice."""
        supported = {
            "aoede", "charon", "fenrir", "kore", "leda", "orus", "puck", "zephyr",
        }
        candidate = (voice or "").strip().lower()
        if candidate in supported:
            return candidate.capitalize()
        return "Kore"

    def _validate_image(self, image_bytes: bytes, mime_type: str) -> Tuple[str, tuple[int, int]]:
        if not image_bytes:
            raise InvalidImageError("Empty image payload")
        if len(image_bytes) > settings.ai_vision_max_bytes:
            raise InvalidImageError(
                f"Image exceeds the {settings.ai_vision_max_bytes} byte limit"
            )
        try:
            with Image.open(io.BytesIO(image_bytes)) as image:
                image.verify()
            with Image.open(io.BytesIO(image_bytes)) as image_info:
                width, height = image_info.size
                image_format = (image_info.format or "").upper()
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("Uploaded file is not a valid image") from exc

        if width <= 0 or height <= 0:
            raise InvalidImageError("Image dimensions are invalid")
        return image_format or mime_type, (width, height)

    def _vision_prompt(
        self,
        *,
        task: str,
        mime_type: str,
        dimensions: tuple[int, int],
        question: Optional[str],
    ) -> tuple[str, str]:
        if task == "trade_chart":
            system = (
                "You are a senior financial chart analyst. Return strict JSON only. "
                "Be honest about uncertainty, do not overstate conviction, and never "
                "present analysis as guaranteed investment advice."
            )
            user = f"""
Analyze the uploaded trade chart and return strict JSON with this exact schema:
{{
  "summary": "short plain-English chart read",
  "trend": "bullish|bearish|sideways|mixed",
  "signal": "buy_bias|sell_bias|watchlist|unclear",
  "confidence": 0.0,
  "timeframe_guess": "intraday|swing|position|unknown",
  "support_levels": ["string"],
  "resistance_levels": ["string"],
  "patterns": ["string"],
  "indicators": ["string"],
  "risk_notes": ["string"],
  "invalid_reasons": []
}}

Rules:
- If the image is blurry, cropped, not a chart, or unreadable, set "signal" to "unclear",
  keep confidence low, and explain that in "invalid_reasons".
- Mention visible labels, candles, moving averages, RSI, MACD, volume, or annotations only if visible.
- Use short strings in arrays.
- Image metadata: mime_type={mime_type}, dimensions={dimensions[0]}x{dimensions[1]}.
"""
            if question:
                user += f'\nUser focus: "{question.strip()}"\n'
            return system, user.strip()

        if task == "receipt":
            system = (
                "You are an accurate receipt and invoice extraction assistant. "
                "Return strict JSON only and preserve ambiguity when OCR is uncertain."
            )
            user = f"""
Extract structured data from the uploaded receipt or invoice and return strict JSON with:
{{
  "document_type": "receipt|invoice|bill|unknown",
  "merchant_name": null,
  "invoice_number": null,
  "purchase_date": null,
  "currency": null,
  "subtotal": null,
  "tax": null,
  "total": null,
  "line_items": [
    {{"name": "string", "quantity": "string|null", "unit_price": "string|null", "line_total": "string|null"}}
  ],
  "payment_method": null,
  "raw_ocr_text": "string",
  "warnings": ["string"],
  "confidence": 0.0
}}

Rules:
- Do not invent fields you cannot read.
- Use null for missing scalar values.
- If the image is not a receipt/invoice or is too blurry, explain that in "warnings" and lower confidence.
- Image metadata: mime_type={mime_type}, dimensions={dimensions[0]}x{dimensions[1]}.
"""
            if question:
                user += f'\nUser focus: "{question.strip()}"\n'
            return system, user.strip()

        system = (
            "You are a multimodal analyst. Return strict JSON only and clearly call out "
            "uncertainty or invalid input."
        )
        user = f"""
Analyze the uploaded image and return strict JSON with:
{{
  "summary": "short description",
  "key_findings": ["string"],
  "warnings": ["string"],
  "confidence": 0.0
}}

Image metadata: mime_type={mime_type}, dimensions={dimensions[0]}x{dimensions[1]}.
"""
        if question:
            user += f'\nUser focus: "{question.strip()}"\n'
        return system, user.strip()

    async def _openrouter_vision(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        task: str,
        question: Optional[str],
    ) -> Dict[str, Any]:
        if not settings.openrouter_api_key:
            raise ProviderUnavailableError("OPENROUTER_API_KEY not configured")

        _, dimensions = self._validate_image(image_bytes, mime_type)
        system, user_prompt = self._vision_prompt(
            task=task,
            mime_type=mime_type,
            dimensions=dimensions,
            question=question,
        )
        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{image_b64}"

        last_error: Optional[str] = None
        for model in settings.openrouter_vision_models:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    },
                ],
                "temperature": 0.1,
                "max_tokens": 1200,
                "response_format": {"type": "json_object"},
            }
            try:
                async with httpx.AsyncClient(timeout=self._openrouter_timeout) as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.openrouter_api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": settings.public_app_url,
                            "X-Title": settings.app_name,
                        },
                        json=payload,
                    )
            except httpx.TimeoutException as exc:
                last_error = f"timeout from OpenRouter model {model}"
                logger.warning(last_error)
                continue
            except httpx.RequestError as exc:
                last_error = f"network error from OpenRouter model {model}: {exc}"
                logger.warning(last_error)
                continue

            if response.status_code >= 400:
                last_error = f"OpenRouter model {model} failed with {response.status_code}: {response.text[:200]}"
                logger.warning(last_error)
                continue

            body = response.json()
            text = (
                (((body.get("choices") or [{}])[0].get("message") or {}).get("content"))
                or ""
            )
            parsed = _safe_json_loads(text)
            if parsed is None:
                last_error = f"OpenRouter model {model} returned non-JSON output"
                logger.warning(last_error)
                continue

            return {
                "provider": "openrouter",
                "model": model,
                "analysis": parsed,
                "warnings": parsed.get("warnings", []) if isinstance(parsed.get("warnings"), list) else [],
                "created_at": _utc_iso(),
            }

        raise ProviderUnavailableError(last_error or "All OpenRouter vision models failed")

    async def _gemini_vision(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        task: str,
        question: Optional[str],
    ) -> Dict[str, Any]:
        if not settings.gemini_api_key:
            raise ProviderUnavailableError("GEMINI_API_KEY not configured")

        _, dimensions = self._validate_image(image_bytes, mime_type)
        system, user_prompt = self._vision_prompt(
            task=task,
            mime_type=mime_type,
            dimensions=dimensions,
            question=question,
        )

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise ProviderUnavailableError("google-genai SDK is not installed") from exc

        try:
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model=settings.gemini_vision_model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    f"{system}\n\n{user_prompt}",
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=1200,
                ),
            )
        except Exception as exc:  # noqa: BLE001
            raise ProviderUnavailableError(f"Gemini vision failed: {exc}") from exc

        parsed = _safe_json_loads(getattr(response, "text", "") or "")
        if parsed is None:
            raise ProviderUnavailableError("Gemini vision returned invalid JSON")

        return {
            "provider": "gemini",
            "model": settings.gemini_vision_model,
            "analysis": parsed,
            "warnings": parsed.get("warnings", []) if isinstance(parsed.get("warnings"), list) else [],
            "created_at": _utc_iso(),
        }

    async def analyze_image(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        task: str,
        question: Optional[str] = None,
    ) -> Dict[str, Any]:
        if task not in {"trade_chart", "receipt", "generic"}:
            raise MultimodalAIError("Unsupported vision task")

        errors: list[str] = []
        if settings.ai_vision_provider.lower() == "openrouter":
            try:
                result = await self._openrouter_vision(
                    image_bytes=image_bytes,
                    mime_type=mime_type,
                    task=task,
                    question=question,
                )
                result["task"] = task
                return result
            except (ProviderUnavailableError, InvalidImageError) as exc:
                errors.append(str(exc))
                if isinstance(exc, InvalidImageError):
                    raise

        try:
            result = await self._gemini_vision(
                image_bytes=image_bytes,
                mime_type=mime_type,
                task=task,
                question=question,
            )
            result["task"] = task
            return result
        except (ProviderUnavailableError, InvalidImageError) as exc:
            errors.append(str(exc))
            if isinstance(exc, InvalidImageError):
                raise

        raise ProviderUnavailableError("; ".join(errors) or "No multimodal provider succeeded")

    async def open_tts_stream(
        self,
        *,
        text: str,
        voice: str,
        response_format: str,
        speed: Optional[float],
        instructions: Optional[str],
    ) -> Tuple[AsyncIterator[bytes], Dict[str, str]]:
        if settings.openrouter_api_key:
            return await self._openrouter_tts_stream(
                text=text,
                voice=voice,
                response_format=response_format,
                speed=speed,
                instructions=instructions,
            )
        if settings.gemini_api_key:
            return await self._gemini_tts_stream(text=text, voice=voice)
        raise ProviderUnavailableError("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is configured")

    async def _openrouter_tts_stream(
        self,
        *,
        text: str,
        voice: str,
        response_format: str,
        speed: Optional[float],
        instructions: Optional[str],
    ) -> Tuple[AsyncIterator[bytes], Dict[str, str]]:
        client = httpx.AsyncClient(timeout=self._tts_timeout)
        payload: Dict[str, Any] = {
            "model": settings.openrouter_tts_model,
            "input": text,
            "voice": voice,
            "response_format": response_format,
        }
        if speed is not None:
            payload["speed"] = speed
        if instructions and settings.openrouter_tts_model.startswith("openai/"):
            payload["provider"] = {
                "options": {
                    "openai": {
                        "instructions": instructions,
                    }
                }
            }

        try:
            request = client.build_request(
                "POST",
                "https://openrouter.ai/api/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": settings.public_app_url,
                    "X-Title": settings.app_name,
                },
                json=payload,
            )
            response = await client.send(request, stream=True)
        except httpx.TimeoutException as exc:
            await client.aclose()
            raise ProviderUnavailableError("OpenRouter TTS timed out") from exc
        except httpx.RequestError as exc:
            await client.aclose()
            raise ProviderUnavailableError(f"OpenRouter TTS network error: {exc}") from exc

        if response.status_code >= 400:
            body = (await response.aread()).decode("utf-8", errors="replace")[:400]
            await response.aclose()
            await client.aclose()
            raise ProviderUnavailableError(
                f"OpenRouter TTS failed with {response.status_code}: {body}"
            )

        generation_id = response.headers.get("X-Generation-Id", "")
        media_type = response.headers.get("Content-Type", "audio/mpeg")

        async def iterator() -> AsyncIterator[bytes]:
            try:
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk
            finally:
                await response.aclose()
                await client.aclose()

        return iterator(), {
            "Content-Type": media_type,
            "X-AI-Provider": "openrouter",
            "X-AI-Model": settings.openrouter_tts_model,
            "X-Generation-Id": generation_id,
        }

    async def _gemini_tts_stream(
        self,
        *,
        text: str,
        voice: str,
    ) -> Tuple[AsyncIterator[bytes], Dict[str, str]]:
        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise ProviderUnavailableError("google-genai SDK is not installed") from exc

        try:
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model=settings.gemini_tts_model,
                contents=text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=self._gemini_voice_name(voice),
                            )
                        )
                    ),
                ),
            )
            pcm_bytes = response.candidates[0].content.parts[0].inline_data.data
        except Exception as exc:  # noqa: BLE001
            raise ProviderUnavailableError(f"Gemini TTS failed: {exc}") from exc

        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(24000)
            handle.writeframes(pcm_bytes)
        wav_bytes = wav_buffer.getvalue()

        async def iterator() -> AsyncIterator[bytes]:
            chunk_size = 16 * 1024
            for offset in range(0, len(wav_bytes), chunk_size):
                yield wav_bytes[offset : offset + chunk_size]

        return iterator(), {
            "Content-Type": "audio/wav",
            "X-AI-Provider": "gemini",
            "X-AI-Model": settings.gemini_tts_model,
        }
