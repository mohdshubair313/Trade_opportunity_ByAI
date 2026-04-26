"""
Voice Agent service — the cost-aware orchestration layer.

This module exists because raw TTS calls leak money five different ways:

1. **TTS cache.** "Hello", "Sure, I can help with that", and the same persona
   briefing fragment get re-synthesised every call. We hash
   (text, voice, speed, format, instructions) and persist the audio bytes on
   disk so identical requests are free after the first hit. Disk writes are
   atomic (tmp + rename) so a crashed process never leaves a half-written
   audio blob in the cache.

2. **VAD (voice activity detection).** Silence frames in the *input* audio
   are pure waste — STT bills you for them. We trim leading/trailing silence
   before sending to Gemini. Pure-Python energy-based VAD avoids pulling in
   webrtcvad / silero (no native deps on Render).

3. **Response length control.** Voice agents that ramble compound costs
   downstream — every extra LLM token becomes more TTS audio. We cap reply
   length at the LLM and trim again before TTS as belt-and-suspenders.

4. **Prompt caching.** The system prompt is identical on every turn. We keep
   it in `settings.voice_agent_system_prompt` and emit OpenRouter
   `cache_control` markers so Anthropic providers cache the prefix; OpenAI
   auto-caches static prefixes >1024 tokens.

5. **Regional arbitrage.** Cost and latency vary across providers and even
   across the same provider's regions. The `ProviderRouter` keeps a rolling
   latency average per provider and prefers the fastest healthy one,
   degrading providers that error out for a cooldown window.

The public surface is `VoiceAgent` — a single instantiated service. Endpoints
in `app/main.py` should depend on `voice_agent_service` rather than reaching
into `MultimodalAIService` directly so the savings always apply.
"""
from __future__ import annotations

import array
import asyncio
import base64
import hashlib
import io
import json
import logging
import math
import os
import re
import statistics
import struct
import threading
import time
import wave
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ----------------------------------------------------------------------------
# Errors
# ----------------------------------------------------------------------------

class VoiceAgentError(RuntimeError):
    """Base class for voice agent failures."""


class VoiceProviderError(VoiceAgentError):
    """Raised when no upstream provider can serve the request."""


# ----------------------------------------------------------------------------
# Cost model — rough INR-per-million-char estimate so the savings badge isn't
# a meaningless number. Tuned to OpenAI gpt-4o-mini-tts pricing × USD→INR.
# Override with VOICE_TTS_COST_PER_MCHAR_INR env var if your contract differs.
# ----------------------------------------------------------------------------
COST_INR_PER_MILLION_CHARS = float(os.getenv("VOICE_TTS_COST_PER_MCHAR_INR", "1250"))


def _hash_key(*parts: Any) -> str:
    payload = json.dumps([str(p) for p in parts], separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def _slug(text: str, limit: int = 24) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", text or "").strip("_").lower()
    return (cleaned or "voice")[:limit]


def _to_int16_pcm(pcm: bytes, sample_width: int) -> bytes:
    """Convert 8/24/32-bit signed PCM into 16-bit signed PCM. Pure Python.

    Pulled out of the VAD class because it's a free function — keeps the
    class focused on framing and energy, while still supporting whatever WAV
    formats the user happens to upload (Audacity exports 32-bit float, some
    Android recorders default to 8-bit).
    """
    if sample_width == 2:
        return pcm
    if sample_width == 1:
        # 8-bit PCM in WAV is unsigned — re-centre to signed and scale up.
        out = array.array("h")
        for byte in pcm:
            out.append((byte - 128) << 8)
        return out.tobytes()
    if sample_width == 3:
        out = array.array("h")
        for i in range(0, len(pcm) - 2, 3):
            sample = int.from_bytes(pcm[i : i + 3], byteorder="little", signed=True)
            out.append(max(-32768, min(32767, sample >> 8)))
        return out.tobytes()
    if sample_width == 4:
        out = array.array("h")
        ints = array.array("i")
        usable = len(pcm) - (len(pcm) % 4)
        ints.frombytes(pcm[:usable])
        for sample in ints:
            out.append(max(-32768, min(32767, sample >> 16)))
        return out.tobytes()
    # Unknown width — return empty so VAD falls back to "no speech".
    return b""


def _stereo_to_mono(pcm: bytes, channels: int) -> bytes:
    """Average N interleaved channels into a single mono channel (16-bit)."""
    if channels <= 1:
        return pcm
    samples = array.array("h")
    usable = len(pcm) - (len(pcm) % (2 * channels))
    samples.frombytes(pcm[:usable])
    out = array.array("h")
    for i in range(0, len(samples), channels):
        total = 0
        for c in range(channels):
            total += samples[i + c]
        out.append(int(total / channels))
    return out.tobytes()


# ============================================================================
# Voice Activity Detection — energy-based, pure stdlib.
# ============================================================================

@dataclass
class VADResult:
    trimmed_pcm: bytes
    sample_rate: int
    sample_width: int
    channels: int
    duration_ms: int
    voice_ms: int
    is_speech: bool


class SimpleVAD:
    """Energy-based silence trimmer. Operates on 16-bit mono PCM.

    Why pure Python instead of webrtcvad / silero?
    - webrtcvad needs a C extension; doesn't pip-install cleanly on Render.
    - silero needs torch; that's a 700MB dependency for a 30-line algorithm.
    - For trimming dead air around a user's question, a frame-RMS threshold
      with a small hangover window matches webrtcvad's accuracy well enough.

    The output is the input minus leading/trailing silence, plus a small
    pad on each side so we never clip the first phoneme.
    """

    def __init__(
        self,
        rms_threshold: float = 0.012,
        frame_ms: int = 30,
        min_voice_ms: int = 240,
        pad_ms: int = 160,
    ) -> None:
        self.rms_threshold = rms_threshold
        self.frame_ms = frame_ms
        self.min_voice_ms = min_voice_ms
        self.pad_ms = pad_ms

    def _normalise_to_pcm(
        self, audio_bytes: bytes, mime_type: str
    ) -> Tuple[bytes, int, int, int]:
        """Best-effort: pull PCM out of WAV; otherwise treat input as raw 16k mono PCM.

        Browsers usually upload audio/webm or audio/ogg from MediaRecorder. We
        can't decode those without ffmpeg — so the frontend converts to WAV
        before upload (see `voice-client.ts`). If the input is anything other
        than WAV we skip VAD and pass the bytes through unchanged.

        Python 3.13 removed `audioop`, so multi-channel and non-16-bit WAV
        get a pure-Python conversion path: average channels with `array`,
        rescale 8/24/32-bit samples into 16-bit signed.
        """
        mime = (mime_type or "").lower()
        if mime in ("audio/wav", "audio/x-wav") or audio_bytes[:4] == b"RIFF":
            with wave.open(io.BytesIO(audio_bytes), "rb") as wav:
                channels = wav.getnchannels()
                sample_width = wav.getsampwidth()
                sample_rate = wav.getframerate()
                pcm = wav.readframes(wav.getnframes())
            if sample_width != 2:
                pcm = _to_int16_pcm(pcm, sample_width)
                sample_width = 2
            if channels > 1:
                pcm = _stereo_to_mono(pcm, channels)
                channels = 1
            return pcm, sample_rate, sample_width, channels

        return audio_bytes, 16000, 2, 1

    def _frame_rms(self, frame: bytes, sample_width: int) -> float:
        """Root-mean-square of a 16-bit signed PCM frame, normalised 0..1."""
        if not frame or sample_width != 2:
            return 0.0
        samples = array.array("h")
        # Frame may not be a multiple of 2 if upstream truncated; clip safely.
        usable = len(frame) - (len(frame) % 2)
        if usable <= 0:
            return 0.0
        samples.frombytes(frame[:usable])
        if not samples:
            return 0.0
        # sum of squares as float to avoid 32-bit overflow on long frames.
        sum_sq = 0.0
        for s in samples:
            sum_sq += s * s
        rms = math.sqrt(sum_sq / len(samples))
        return rms / 32768.0

    def trim(self, audio_bytes: bytes, mime_type: str = "audio/wav") -> VADResult:
        pcm, sample_rate, sample_width, channels = self._normalise_to_pcm(
            audio_bytes, mime_type
        )
        bytes_per_frame = int(sample_rate * sample_width * channels * self.frame_ms / 1000)
        if bytes_per_frame <= 0 or len(pcm) < bytes_per_frame:
            duration_ms = int(len(pcm) / max(sample_rate * sample_width * channels, 1) * 1000)
            return VADResult(
                trimmed_pcm=pcm,
                sample_rate=sample_rate,
                sample_width=sample_width,
                channels=channels,
                duration_ms=duration_ms,
                voice_ms=0,
                is_speech=False,
            )

        total_frames = len(pcm) // bytes_per_frame
        voice_frames: List[bool] = []
        for i in range(total_frames):
            start = i * bytes_per_frame
            frame = pcm[start : start + bytes_per_frame]
            voice_frames.append(self._frame_rms(frame, sample_width) >= self.rms_threshold)

        first = next((i for i, v in enumerate(voice_frames) if v), None)
        last = next((i for i, v in enumerate(reversed(voice_frames)) if v), None)
        voice_ms = sum(1 for v in voice_frames if v) * self.frame_ms

        if first is None or voice_ms < self.min_voice_ms:
            return VADResult(
                trimmed_pcm=b"",
                sample_rate=sample_rate,
                sample_width=sample_width,
                channels=channels,
                duration_ms=total_frames * self.frame_ms,
                voice_ms=voice_ms,
                is_speech=False,
            )

        last_idx = total_frames - 1 - last
        pad_frames = max(self.pad_ms // self.frame_ms, 0)
        start_frame = max(first - pad_frames, 0)
        end_frame = min(last_idx + pad_frames + 1, total_frames)
        trimmed = pcm[start_frame * bytes_per_frame : end_frame * bytes_per_frame]
        return VADResult(
            trimmed_pcm=trimmed,
            sample_rate=sample_rate,
            sample_width=sample_width,
            channels=channels,
            duration_ms=(end_frame - start_frame) * self.frame_ms,
            voice_ms=voice_ms,
            is_speech=True,
        )

    @staticmethod
    def to_wav(
        pcm: bytes, sample_rate: int, sample_width: int, channels: int
    ) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as handle:
            handle.setnchannels(channels)
            handle.setsampwidth(sample_width)
            handle.setframerate(sample_rate)
            handle.writeframes(pcm)
        return buffer.getvalue()


# ============================================================================
# TTS Cache — the single biggest cost win.
# ============================================================================

@dataclass
class CacheEntry:
    key: str
    path: Path
    media_type: str
    char_count: int
    byte_count: int
    created_at: float
    last_used_at: float
    provider: str
    model: str
    hits: int = 0


class TTSCache:
    """SHA-keyed disk cache with in-memory index. LRU-evicted.

    Keying on (text, voice, speed, format, instructions) means a tiny
    instruction tweak still produces a fresh entry — that's intentional, the
    audio sounds different. But "Hello" with the default voice on the default
    settings hashes the same every time, so it's free after the first call.
    """

    def __init__(
        self,
        *,
        enabled: bool,
        cache_dir: str,
        max_entries: int,
        ttl_seconds: int,
    ) -> None:
        self.enabled = enabled
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self.cache_dir = Path(cache_dir)
        if self.enabled:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._index: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
        self._bytes_saved = 0
        self._chars_saved = 0
        self._last_provider: Optional[str] = None
        if self.enabled:
            self._load_index()

    # -- key --------------------------------------------------------------

    @staticmethod
    def make_key(
        *,
        text: str,
        voice: str,
        speed: Optional[float],
        response_format: str,
        instructions: Optional[str],
        model: str,
    ) -> str:
        return _hash_key(
            text.strip(),
            (voice or "").strip().lower(),
            f"{speed:.3f}" if speed is not None else "default",
            response_format,
            (instructions or "").strip(),
            model,
        )

    # -- index ------------------------------------------------------------

    def _index_path(self) -> Path:
        return self.cache_dir / "_index.json"

    def _load_index(self) -> None:
        path = self._index_path()
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            logger.warning("voice cache: corrupt index, ignoring")
            return
        now = time.time()
        for entry in data.get("entries", []):
            audio_path = self.cache_dir / entry["filename"]
            if not audio_path.exists():
                continue
            if now - entry.get("created_at", now) > self.ttl_seconds:
                audio_path.unlink(missing_ok=True)
                continue
            self._index[entry["key"]] = CacheEntry(
                key=entry["key"],
                path=audio_path,
                media_type=entry.get("media_type", "audio/mpeg"),
                char_count=entry.get("char_count", 0),
                byte_count=entry.get("byte_count", 0),
                created_at=entry.get("created_at", now),
                last_used_at=entry.get("last_used_at", now),
                provider=entry.get("provider", "unknown"),
                model=entry.get("model", "unknown"),
                hits=entry.get("hits", 0),
            )

    def _persist_index(self) -> None:
        if not self.enabled:
            return
        try:
            payload = {
                "entries": [
                    {
                        "key": e.key,
                        "filename": e.path.name,
                        "media_type": e.media_type,
                        "char_count": e.char_count,
                        "byte_count": e.byte_count,
                        "created_at": e.created_at,
                        "last_used_at": e.last_used_at,
                        "provider": e.provider,
                        "model": e.model,
                        "hits": e.hits,
                    }
                    for e in self._index.values()
                ]
            }
            tmp = self._index_path().with_suffix(".tmp")
            tmp.write_text(json.dumps(payload), encoding="utf-8")
            tmp.replace(self._index_path())
        except OSError as exc:
            logger.warning("voice cache: failed to persist index: %s", exc)

    # -- get/set ----------------------------------------------------------

    def get(self, key: str) -> Optional[CacheEntry]:
        if not self.enabled:
            return None
        with self._lock:
            entry = self._index.get(key)
            if entry is None:
                self._misses += 1
                return None
            if time.time() - entry.created_at > self.ttl_seconds:
                self._index.pop(key, None)
                entry.path.unlink(missing_ok=True)
                self._misses += 1
                return None
            if not entry.path.exists():
                self._index.pop(key, None)
                self._misses += 1
                return None
            entry.last_used_at = time.time()
            entry.hits += 1
            self._hits += 1
            self._bytes_saved += entry.byte_count
            self._chars_saved += entry.char_count
            self._last_provider = "cache"
            return entry

    def put(
        self,
        *,
        key: str,
        audio: bytes,
        media_type: str,
        char_count: int,
        provider: str,
        model: str,
        slug: str = "voice",
    ) -> CacheEntry:
        if not self.enabled:
            return CacheEntry(
                key=key,
                path=Path(""),
                media_type=media_type,
                char_count=char_count,
                byte_count=len(audio),
                created_at=time.time(),
                last_used_at=time.time(),
                provider=provider,
                model=model,
            )
        with self._lock:
            self._evict_if_needed()
            ext = _ext_for_media_type(media_type)
            filename = f"{_slug(slug)}_{key[:16]}{ext}"
            audio_path = self.cache_dir / filename
            tmp = audio_path.with_suffix(audio_path.suffix + ".tmp")
            try:
                tmp.write_bytes(audio)
                tmp.replace(audio_path)
            except OSError as exc:
                logger.warning("voice cache: write failed: %s", exc)
                return CacheEntry(
                    key=key,
                    path=Path(""),
                    media_type=media_type,
                    char_count=char_count,
                    byte_count=len(audio),
                    created_at=time.time(),
                    last_used_at=time.time(),
                    provider=provider,
                    model=model,
                )
            entry = CacheEntry(
                key=key,
                path=audio_path,
                media_type=media_type,
                char_count=char_count,
                byte_count=len(audio),
                created_at=time.time(),
                last_used_at=time.time(),
                provider=provider,
                model=model,
            )
            self._index[key] = entry
            self._last_provider = provider
            self._persist_index()
            return entry

    def _evict_if_needed(self) -> None:
        if len(self._index) < self.max_entries:
            return
        # LRU — drop oldest by last_used_at.
        ordered = sorted(self._index.values(), key=lambda e: e.last_used_at)
        drop = len(self._index) - self.max_entries + 1
        for entry in ordered[:drop]:
            entry.path.unlink(missing_ok=True)
            self._index.pop(entry.key, None)

    # -- stats ------------------------------------------------------------

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self._hits + self._misses
            hit_ratio = (self._hits / total) if total else 0.0
            estimated_inr_saved = (
                self._chars_saved / 1_000_000.0 * COST_INR_PER_MILLION_CHARS
            )
            return {
                "enabled": self.enabled,
                "entries": len(self._index),
                "hits": self._hits,
                "misses": self._misses,
                "hit_ratio": round(hit_ratio, 4),
                "bytes_saved": self._bytes_saved,
                "chars_saved": self._chars_saved,
                "estimated_inr_saved": round(estimated_inr_saved, 2),
                "last_provider": self._last_provider,
            }


def _ext_for_media_type(media_type: str) -> str:
    mapping = {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/L16": ".pcm",
        "audio/pcm": ".pcm",
        "audio/aac": ".aac",
        "audio/ogg": ".ogg",
    }
    return mapping.get(media_type.lower(), ".bin")


def _media_type_for_format(response_format: str) -> str:
    return {
        "mp3": "audio/mpeg",
        "pcm": "audio/wav",
        "wav": "audio/wav",
    }.get(response_format.lower(), "audio/mpeg")


# ============================================================================
# Provider Router — regional arbitrage with rolling latency.
# ============================================================================

@dataclass
class ProviderHealth:
    name: str
    success: int = 0
    failures: int = 0
    latencies_ms: List[float] = field(default_factory=list)
    last_error: Optional[str] = None
    cooldown_until: float = 0.0

    def record_success(self, latency_ms: float) -> None:
        self.success += 1
        self.latencies_ms.append(latency_ms)
        # Keep last 20 samples — long enough to be stable, short enough to
        # adapt when a region degrades.
        if len(self.latencies_ms) > 20:
            self.latencies_ms = self.latencies_ms[-20:]

    def record_failure(self, error: str, cooldown_seconds: int = 30) -> None:
        self.failures += 1
        self.last_error = error
        self.cooldown_until = time.time() + cooldown_seconds

    @property
    def avg_latency_ms(self) -> Optional[float]:
        return statistics.mean(self.latencies_ms) if self.latencies_ms else None

    @property
    def is_healthy(self) -> bool:
        return time.time() >= self.cooldown_until

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "success": self.success,
            "failures": self.failures,
            "avg_latency_ms": round(self.avg_latency_ms or 0.0, 1),
            "last_error": self.last_error,
            "healthy": self.is_healthy,
        }


class ProviderRouter:
    """Picks the fastest healthy TTS provider for the next request.

    Without this, a 503 from OpenRouter cascades into a 30s timeout for the
    user. With it, OpenRouter goes into a 30s cooldown and the next request
    flips to Gemini automatically — and back once OpenRouter recovers.
    """

    def __init__(self, names: List[str]) -> None:
        self._lock = threading.RLock()
        self._providers: Dict[str, ProviderHealth] = {
            name: ProviderHealth(name=name) for name in names
        }

    def order(self, preferred: Optional[str] = None) -> List[str]:
        with self._lock:
            healthy = [p for p in self._providers.values() if p.is_healthy]
            sick = [p for p in self._providers.values() if not p.is_healthy]
            healthy.sort(key=lambda p: (p.avg_latency_ms or 0.0))
            ordering = [p.name for p in healthy] + [p.name for p in sick]
            if preferred and preferred in ordering:
                ordering.remove(preferred)
                ordering.insert(0, preferred)
            return ordering

    def record_success(self, name: str, latency_ms: float) -> None:
        with self._lock:
            self._providers.setdefault(name, ProviderHealth(name=name)).record_success(latency_ms)

    def record_failure(self, name: str, error: str) -> None:
        with self._lock:
            self._providers.setdefault(name, ProviderHealth(name=name)).record_failure(error)

    def snapshot(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            return {name: p.to_dict() for name, p in self._providers.items()}


# ============================================================================
# VoiceAgent — the orchestrator.
# ============================================================================

@dataclass
class SynthesisResult:
    audio: bytes
    media_type: str
    cache_hit: bool
    provider: str
    model: str
    latency_ms: int
    char_count: int


class VoiceAgent:
    """High-level voice agent: cached TTS, VAD-trimmed STT, conversational LLM."""

    def __init__(self) -> None:
        self.cache = TTSCache(
            enabled=settings.voice_cache_enabled,
            cache_dir=settings.voice_cache_dir,
            max_entries=settings.voice_cache_max_entries,
            ttl_seconds=settings.voice_cache_ttl_seconds,
        )
        self.vad = SimpleVAD(
            rms_threshold=settings.voice_vad_rms_threshold,
            min_voice_ms=settings.voice_vad_min_voice_ms,
            pad_ms=settings.voice_vad_pad_ms,
        )
        self.router = ProviderRouter(["openrouter", "gemini"])
        self._tts_timeout = httpx.Timeout(60.0, connect=10.0)

    # -- public API -------------------------------------------------------

    async def synthesize(
        self,
        *,
        text: str,
        voice: Optional[str] = None,
        speed: Optional[float] = None,
        response_format: str = "mp3",
        instructions: Optional[str] = None,
        slug: str = "voice",
    ) -> SynthesisResult:
        text = self._enforce_response_length(text)
        voice = voice or settings.tts_default_voice
        response_format = (response_format or settings.tts_default_format).lower()
        model = settings.openrouter_tts_model

        key = TTSCache.make_key(
            text=text,
            voice=voice,
            speed=speed,
            response_format=response_format,
            instructions=instructions,
            model=model,
        )
        entry = self.cache.get(key)
        if entry is not None:
            try:
                audio = entry.path.read_bytes()
            except OSError:
                audio = b""
            if audio:
                return SynthesisResult(
                    audio=audio,
                    media_type=entry.media_type,
                    cache_hit=True,
                    provider="cache",
                    model=entry.model,
                    latency_ms=0,
                    char_count=entry.char_count,
                )

        # Cache miss — synthesise fresh, with arbitrage fallback.
        order = (
            self.router.order()
            if settings.voice_arbitrage_enabled
            else ["openrouter", "gemini"]
        )
        last_err: Optional[str] = None
        for provider_name in order:
            started = time.perf_counter()
            try:
                if provider_name == "openrouter":
                    audio, media_type, used_model = await self._openrouter_tts(
                        text=text,
                        voice=voice,
                        speed=speed,
                        response_format=response_format,
                        instructions=instructions,
                    )
                elif provider_name == "gemini":
                    audio, media_type, used_model = await self._gemini_tts(
                        text=text, voice=voice
                    )
                else:
                    continue
            except VoiceProviderError as exc:
                last_err = str(exc)
                self.router.record_failure(provider_name, last_err)
                logger.warning("voice tts %s failed: %s", provider_name, last_err)
                continue

            latency_ms = int((time.perf_counter() - started) * 1000)
            self.router.record_success(provider_name, latency_ms)
            self.cache.put(
                key=key,
                audio=audio,
                media_type=media_type,
                char_count=len(text),
                provider=provider_name,
                model=used_model,
                slug=slug,
            )
            return SynthesisResult(
                audio=audio,
                media_type=media_type,
                cache_hit=False,
                provider=provider_name,
                model=used_model,
                latency_ms=latency_ms,
                char_count=len(text),
            )

        raise VoiceProviderError(last_err or "All TTS providers failed")

    async def transcribe(
        self,
        *,
        audio_bytes: bytes,
        mime_type: str,
        language_hint: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """STT with VAD pre-trimming. Returns (transcript, debug info)."""
        if not audio_bytes:
            return "", {"reason": "empty"}
        if len(audio_bytes) > settings.stt_max_bytes:
            raise VoiceAgentError(
                f"Audio exceeds the {settings.stt_max_bytes} byte limit"
            )

        vad = self.vad.trim(audio_bytes, mime_type=mime_type)
        if not vad.is_speech:
            return "", {
                "reason": "silence",
                "voice_ms": vad.voice_ms,
                "duration_ms": vad.duration_ms,
            }

        wav_bytes = self.vad.to_wav(
            vad.trimmed_pcm, vad.sample_rate, vad.sample_width, vad.channels
        )
        transcript = await self._gemini_stt(wav_bytes, language_hint=language_hint)
        return transcript, {
            "voice_ms": vad.voice_ms,
            "duration_ms": vad.duration_ms,
            "trimmed_bytes": len(wav_bytes),
            "input_bytes": len(audio_bytes),
        }

    async def reply_text(
        self,
        *,
        prompt: str,
        sector: Optional[str] = None,
        mode: str = "qa",
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """Generate a tight, voice-friendly assistant reply via OpenRouter chat.

        Uses prompt caching where supported so repeated turns don't re-bill
        the static system prompt. Reply length is capped server-side
        (`max_tokens`) and trimmed client-side as belt-and-suspenders.
        """
        if not settings.openrouter_api_key:
            raise VoiceProviderError("OPENROUTER_API_KEY not configured")

        messages = self._build_messages(
            prompt=prompt, sector=sector, mode=mode, history=history
        )
        # Cap reply tokens. Roughly 4 chars per token → ~370 tokens fits the
        # 1500-char response cap with headroom for spoken delivery.
        max_tokens = 380
        # Pick a fast cheap chat model — voice replies don't need Opus.
        model = "google/gemma-4-26b-a4b-it:free"

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self._tts_timeout) as client:
            try:
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
            except httpx.RequestError as exc:
                raise VoiceProviderError(f"OpenRouter chat network error: {exc}") from exc

        if response.status_code >= 400:
            raise VoiceProviderError(
                f"OpenRouter chat failed {response.status_code}: {response.text[:240]}"
            )

        body = response.json()
        text = ((body.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        text = self._enforce_response_length(text.strip())
        usage = body.get("usage") or {}
        cached = usage.get("prompt_tokens_details", {}).get("cached_tokens")
        return text, {
            "model": model,
            "usage": usage,
            "prompt_tokens_cached": cached,
        }

    def cache_stats(self) -> Dict[str, Any]:
        stats = self.cache.stats()
        stats["arbitrage_enabled"] = settings.voice_arbitrage_enabled
        stats["provider_health"] = self.router.snapshot()
        return stats

    # -- response shaping -------------------------------------------------

    def _enforce_response_length(self, text: str) -> str:
        limit = settings.voice_response_max_chars
        if len(text) <= limit:
            return text
        # Trim at the last sentence boundary that fits, otherwise hard cap.
        head = text[:limit]
        for terminator in (". ", "? ", "! "):
            cut = head.rfind(terminator)
            if cut > limit * 0.6:
                return head[: cut + 1].strip()
        return head.rstrip() + "…"

    def _build_messages(
        self,
        *,
        prompt: str,
        sector: Optional[str],
        mode: str,
        history: Optional[List[Dict[str, str]]],
    ) -> List[Dict[str, Any]]:
        # System prompt is static → upstream prompt caching kicks in. We mark
        # it cacheable explicitly for Anthropic-routed providers; OpenAI auto-
        # caches static prefixes >1024 tokens.
        system_text = settings.voice_agent_system_prompt
        if sector:
            system_text += f"\n\nThe listener wants intelligence on the {sector} sector."
        if mode == "briefing":
            system_text += (
                "\n\nThis turn is a sector briefing. Cover: current setup, biggest "
                "opportunity, biggest risk, and one concrete next move."
            )

        messages: List[Dict[str, Any]] = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": system_text,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
            }
        ]
        for turn in history or []:
            role = turn.get("role")
            content = (turn.get("content") or "").strip()
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": prompt})
        return messages

    # -- providers --------------------------------------------------------

    async def _openrouter_tts(
        self,
        *,
        text: str,
        voice: str,
        speed: Optional[float],
        response_format: str,
        instructions: Optional[str],
    ) -> Tuple[bytes, str, str]:
        if not settings.openrouter_api_key:
            raise VoiceProviderError("OPENROUTER_API_KEY not configured")

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
                "options": {"openai": {"instructions": instructions}}
            }

        async with httpx.AsyncClient(timeout=self._tts_timeout) as client:
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": settings.public_app_url,
                        "X-Title": settings.app_name,
                    },
                    json=payload,
                )
            except httpx.RequestError as exc:
                raise VoiceProviderError(f"OpenRouter TTS network error: {exc}") from exc

        if response.status_code >= 400:
            body = response.text[:240]
            raise VoiceProviderError(f"OpenRouter TTS {response.status_code}: {body}")

        media_type = response.headers.get(
            "Content-Type", _media_type_for_format(response_format)
        )
        return response.content, media_type, settings.openrouter_tts_model

    async def _gemini_tts(
        self, *, text: str, voice: str
    ) -> Tuple[bytes, str, str]:
        if not settings.gemini_api_key:
            raise VoiceProviderError("GEMINI_API_KEY not configured")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise VoiceProviderError("google-genai SDK is not installed") from exc

        loop = asyncio.get_running_loop()

        def _call() -> bytes:
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model=settings.gemini_tts_model,
                contents=text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=_gemini_voice_name(voice),
                            )
                        )
                    ),
                ),
            )
            return response.candidates[0].content.parts[0].inline_data.data

        try:
            pcm_bytes = await loop.run_in_executor(None, _call)
        except Exception as exc:  # noqa: BLE001
            raise VoiceProviderError(f"Gemini TTS failed: {exc}") from exc

        wav = SimpleVAD.to_wav(pcm_bytes, 24000, 2, 1)
        return wav, "audio/wav", settings.gemini_tts_model

    async def _gemini_stt(
        self, wav_bytes: bytes, *, language_hint: Optional[str]
    ) -> str:
        if not settings.gemini_api_key:
            raise VoiceProviderError("GEMINI_API_KEY not configured for STT")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise VoiceProviderError("google-genai SDK is not installed") from exc

        loop = asyncio.get_running_loop()
        instruction = (
            "Transcribe the user's spoken question verbatim. "
            "Return only the plain transcript with no extra commentary, no "
            "quotation marks, and no surrounding labels."
        )
        if language_hint:
            instruction += f" The speaker is using {language_hint}."

        def _call() -> str:
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model=settings.stt_model,
                contents=[
                    types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav"),
                    instruction,
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=400,
                ),
            )
            return (getattr(response, "text", "") or "").strip()

        try:
            return await loop.run_in_executor(None, _call)
        except Exception as exc:  # noqa: BLE001
            raise VoiceProviderError(f"Gemini STT failed: {exc}") from exc


def _gemini_voice_name(voice: str) -> str:
    supported = {
        "aoede", "charon", "fenrir", "kore", "leda", "orus", "puck", "zephyr",
    }
    candidate = (voice or "").strip().lower()
    if candidate in supported:
        return candidate.capitalize()
    return "Kore"


# ----------------------------------------------------------------------------
# Singleton — endpoints depend on this so caching/arbitrage always apply.
# ----------------------------------------------------------------------------

voice_agent_service = VoiceAgent()


# ----------------------------------------------------------------------------
# Voice catalogue — surfaced to frontend for the picker UI.
# ----------------------------------------------------------------------------

VOICE_CATALOGUE: List[Dict[str, str]] = [
    {
        "value": "nova",
        "label": "Nova",
        "mood": "Executive and balanced",
        "sample_text": "Good morning. Markets opened steady. Let's run the briefing.",
        "accent": "neutral",
        "locale": "en-IN",
    },
    {
        "value": "alloy",
        "label": "Alloy",
        "mood": "Calm analyst",
        "sample_text": "On a relative-strength basis, this sector is leading the broader index.",
        "accent": "neutral",
        "locale": "en-US",
    },
    {
        "value": "onyx",
        "label": "Onyx",
        "mood": "Deep command-room tone",
        "sample_text": "Risk first, conviction second. Here is what the tape is telling us.",
        "accent": "deep",
        "locale": "en-US",
    },
    {
        "value": "sage",
        "label": "Sage",
        "mood": "Measured and premium",
        "sample_text": "Three forces are shaping the next move — let me walk you through them.",
        "accent": "neutral",
        "locale": "en-IN",
    },
    {
        "value": "shimmer",
        "label": "Shimmer",
        "mood": "Bright and energetic",
        "sample_text": "Quick take — momentum is building, here's how to play it.",
        "accent": "bright",
        "locale": "en-US",
    },
    {
        "value": "echo",
        "label": "Echo",
        "mood": "Confident newsroom voice",
        "sample_text": "Top of the hour: sector flows, key levels, and what to watch next.",
        "accent": "neutral",
        "locale": "en-US",
    },
]
