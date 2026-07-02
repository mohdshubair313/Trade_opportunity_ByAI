"""Deterministic validators for model outputs."""
from __future__ import annotations

from typing import Any


CAPITAL = {"low", "medium", "high"}
ROI = {"short", "medium", "long"}
DIRECTIONS = {"up", "down", "neutral"}


def validate_compare_payload(payload: dict[str, Any], allowed_sectors: set[str] | None = None) -> bool:
    scores = payload.get("scores")
    if not isinstance(scores, list) or not scores:
        return False
    seen: set[str] = set()
    for row in scores:
        if not isinstance(row, dict):
            return False
        sector = str(row.get("sector", "")).strip().lower()
        if not sector or (allowed_sectors and sector not in allowed_sectors):
            return False
        seen.add(sector)
        for key in ("opportunity_score", "risk_score"):
            try:
                value = float(row.get(key))
            except (TypeError, ValueError):
                return False
            if value < 0 or value > 100:
                return False
        if str(row.get("capital_required", "")).lower() not in CAPITAL:
            return False
        if str(row.get("time_to_roi", "")).lower() not in ROI:
            return False
        try:
            sentiment = float(row.get("sentiment_score"))
        except (TypeError, ValueError):
            return False
        if sentiment < -1 or sentiment > 1:
            return False
        if not str(row.get("top_opportunity", "")).strip():
            return False
        if not str(row.get("top_risk", "")).strip():
            return False

    winner = str(payload.get("winner", "")).strip().lower()
    return bool(winner and winner in seen and str(payload.get("headline", "")).strip())


def validate_diff_payload(payload: dict[str, Any]) -> bool:
    if not isinstance(payload.get("changed"), bool):
        return False
    if payload.get("changed") and not str(payload.get("headline", "")).strip():
        return False
    if str(payload.get("direction", "neutral")).lower() not in DIRECTIONS:
        return False
    try:
        confidence = float(payload.get("confidence"))
    except (TypeError, ValueError):
        return False
    return 0 <= confidence <= 1


def validate_report_text(text: str, *, required_headings: tuple[str, ...] = ()) -> bool:
    if not text or len(text.strip()) < 300:
        return False
    lowered = text.lower()
    return all(heading.lower() in lowered for heading in required_headings)
