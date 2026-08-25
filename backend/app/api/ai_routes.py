"""AI multimodal routes — vision analysis, TTS."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.database import User
from app.core.config import get_settings
from app.core.auth import get_current_active_user
from app.core.schemas import VisionAnalysisResponse, TTSRequest
from app.core.rate_limiter import limiter
from app.integrations.multimodal_ai import (
    MultimodalAIService, MultimodalAIError,
    InvalidImageError, ProviderUnavailableError,
)
from app.integrations.voice_agent import (
    voice_agent_service, VoiceAgentError, VoiceProviderError,
)

logger = logging.getLogger(__name__)
settings = get_settings()
multimodal_ai_service = MultimodalAIService()

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])


@router.post(
    "/vision/analyze",
    response_model=VisionAnalysisResponse,
    operation_id="analyzeImage",
    summary="Analyze trade chart, receipt, or image with AI vision",
)
@limiter.limit("10/minute")
async def analyze_image_with_ai(
    request: Request,
    image: UploadFile = File(...),
    task: str = Form("trade_chart"),
    question: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    """Analyze a trade chart, receipt, or generic image with structured output."""
    if task not in {"trade_chart", "receipt", "generic"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task must be one of trade_chart, receipt, generic")
    mime_type = (image.content_type or "").lower()
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only image uploads are supported")

    try:
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image file too large. Maximum allowed size is 10 MB.")
        result = await multimodal_ai_service.analyze_image(
            image_bytes=image_bytes, mime_type=mime_type, task=task, question=question,
        )
        return VisionAnalysisResponse(**result)
    except InvalidImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except MultimodalAIError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/tts",
    operation_id="synthesizeSpeech",
    summary="Synthesize speech audio from text using AI voice models",
)
@limiter.limit("20/minute")
async def synthesize_speech(
    request: Request,
    payload: TTSRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Synthesize speech with disk-backed cache + regional arbitrage."""
    try:
        result = await voice_agent_service.synthesize(
            text=payload.text,
            voice=payload.voice or settings.tts_default_voice,
            speed=payload.speed,
            response_format=payload.response_format,
            instructions=payload.instructions,
            preferred_provider=payload.preferred_provider,
        )
    except VoiceProviderError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except VoiceAgentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    headers = {
        "X-AI-Provider": result.provider,
        "X-AI-Model": result.model,
        "X-Cache-Hit": "1" if result.cache_hit else "0",
        "X-Latency-Ms": str(result.latency_ms),
        "X-Char-Count": str(result.char_count),
    }
    return StreamingResponse(iter([result.audio]), media_type=result.media_type, headers=headers)
