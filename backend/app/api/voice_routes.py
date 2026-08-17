"""Voice agent routes — STT, voice query, full agent turn, voices list, cache stats."""
import base64
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.database import User
from app.core.config import get_settings
from app.core.auth import get_current_active_user
from app.core.schemas import VoiceQueryRequest, VoiceCacheStats, VoiceVoiceOption
from app.core.rate_limiter import limiter
from app.integrations.voice_agent import (
    voice_agent_service, VOICE_CATALOGUE,
    VoiceAgentError, VoiceProviderError,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Voice"])


@router.get("/api/v1/voice/voices", response_model=list[VoiceVoiceOption])
async def list_voice_options():
    """List available voices with sample text for the picker UI."""
    return [VoiceVoiceOption(**voice) for voice in VOICE_CATALOGUE]


@router.get("/api/v1/voice/cache/stats", response_model=VoiceCacheStats)
async def voice_cache_stats():
    """Live cache stats — drives the cost-savings badge in the UI."""
    return VoiceCacheStats(**voice_agent_service.cache_stats())


@router.post("/api/v1/ai/stt")
@limiter.limit("20/minute")
async def transcribe_audio(
    request: Request,
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    """Transcribe an uploaded audio clip after VAD silence-trimming."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")
    max_audio_bytes = getattr(settings, 'stt_max_bytes', 20 * 1024 * 1024)
    if len(audio_bytes) > max_audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file too large. Max {max_audio_bytes // (1024*1024)} MB.",
        )
    mime_type = (audio.content_type or "").lower()
    try:
        transcript, debug = await voice_agent_service.transcribe(
            audio_bytes=audio_bytes, mime_type=mime_type, language_hint=language,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except VoiceAgentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not transcript:
        return JSONResponse(status_code=200, content={"transcript": "", "is_speech": False, "debug": debug})
    return JSONResponse(status_code=200, content={"transcript": transcript, "is_speech": True, "debug": debug})


@router.post("/api/v1/voice/query")
@limiter.limit("15/minute")
async def voice_query(
    request: Request,
    payload: VoiceQueryRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Text-driven voice agent turn: prompt → cached LLM reply → cached TTS."""
    started = datetime.now(timezone.utc)
    try:
        reply_text, debug = await voice_agent_service.reply_text(
            prompt=payload.prompt, sector=payload.sector,
            mode=payload.mode, history=payload.history,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except VoiceAgentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    try:
        synth = await voice_agent_service.synthesize(
            text=reply_text,
            voice=payload.voice or settings.tts_default_voice,
            speed=payload.speed,
            response_format=payload.response_format,
            slug=payload.sector or payload.mode,
            preferred_provider=payload.preferred_provider,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    elapsed_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    audio_b64 = base64.b64encode(synth.audio).decode("ascii")
    return {
        "transcript": {"user_text": payload.prompt, "assistant_text": reply_text, "sector": payload.sector, "mode": payload.mode},
        "audio_base64": audio_b64, "audio_format": synth.media_type,
        "cache_hit": synth.cache_hit, "latency_ms": elapsed_ms,
        "synth_latency_ms": synth.latency_ms, "provider": synth.provider,
        "model": synth.model, "llm_debug": debug,
    }


@router.post("/api/v1/voice/agent")
@limiter.limit("12/minute")
async def voice_agent_turn(
    request: Request,
    audio: UploadFile = File(...),
    sector: Optional[str] = Form(None),
    mode: str = Form("qa"),
    voice: Optional[str] = Form(None),
    response_format: str = Form("mp3"),
    speed: Optional[float] = Form(None),
    history_json: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    """Full conversational pipeline: STT → cached LLM → cached TTS."""
    started = datetime.now(timezone.utc)
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")
    max_audio_bytes = getattr(settings, "stt_max_bytes", 20 * 1024 * 1024)
    if len(audio_bytes) > max_audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file too large. Maximum allowed size is {max_audio_bytes // (1024 * 1024)} MB.",
        )

    mime_type = (audio.content_type or "").lower()
    try:
        user_text, vad_debug = await voice_agent_service.transcribe(
            audio_bytes=audio_bytes, mime_type=mime_type, language_hint=language,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except VoiceAgentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not user_text:
        return JSONResponse(status_code=200, content={
            "transcript": {"user_text": "", "assistant_text": "", "sector": sector, "mode": mode},
            "audio_base64": None, "audio_format": None, "cache_hit": False,
            "latency_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
            "is_speech": False, "vad_debug": vad_debug,
        })

    parsed_history = None
    if history_json:
        try:
            import json as _json
            parsed_history = _json.loads(history_json)
            if not isinstance(parsed_history, list):
                parsed_history = None
        except Exception:
            parsed_history = None

    try:
        reply_text, llm_debug = await voice_agent_service.reply_text(
            prompt=user_text, sector=sector, mode=mode, history=parsed_history,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    try:
        synth = await voice_agent_service.synthesize(
            text=reply_text, voice=voice or settings.tts_default_voice,
            speed=speed, response_format=response_format, slug=sector or mode,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    elapsed_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    audio_b64 = base64.b64encode(synth.audio).decode("ascii")
    return {
        "transcript": {"user_text": user_text, "assistant_text": reply_text, "sector": sector, "mode": mode},
        "audio_base64": audio_b64, "audio_format": synth.media_type,
        "cache_hit": synth.cache_hit, "latency_ms": elapsed_ms,
        "synth_latency_ms": synth.latency_ms, "provider": synth.provider,
        "model": synth.model, "is_speech": True,
        "vad_debug": vad_debug, "llm_debug": llm_debug,
    }
