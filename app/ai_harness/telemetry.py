"""Structured harness telemetry helpers."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger("ai_harness")


@dataclass(frozen=True)
class HarnessEvent:
    task: str
    phase: str
    model: Optional[str] = None
    ok: bool = True
    latency_ms: Optional[int] = None
    input_chars: int = 0
    output_chars: int = 0
    fallback: Optional[str] = None
    error: Optional[str] = None


def log_event(event: HarnessEvent) -> None:
    logger.info(
        "task=%s phase=%s model=%s ok=%s latency_ms=%s input_tokens_est=%s "
        "output_tokens_est=%s fallback=%s error=%s",
        event.task,
        event.phase,
        event.model or "",
        event.ok,
        event.latency_ms if event.latency_ms is not None else "",
        max(1, event.input_chars // 4) if event.input_chars else 0,
        max(1, event.output_chars // 4) if event.output_chars else 0,
        event.fallback or "",
        (event.error or "")[:180],
    )
