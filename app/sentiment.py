"""
Lightweight sentiment scoring via VADER.

VADER is rule-based, no network calls, and good enough for financial headlines
as a first pass. We can swap in a Gemini-batch scorer later without changing
the call sites (they just take a list of strings).
"""
from __future__ import annotations

from functools import lru_cache
from typing import Iterable, List

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


@lru_cache(maxsize=1)
def _analyzer() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()


def score_text(text: str) -> float:
    """Return VADER compound score in [-1.0, 1.0]. Empty text returns 0.0."""
    if not text or not text.strip():
        return 0.0
    return float(_analyzer().polarity_scores(text)["compound"])


def score_many(texts: Iterable[str]) -> List[float]:
    return [score_text(t) for t in texts]


def label_for(score: float) -> str:
    """Map a compound score to a coarse label used in UI badges."""
    if score >= 0.25:
        return "bullish"
    if score <= -0.25:
        return "bearish"
    return "neutral"
