"""
DiffAgent — material-change detection for watched sectors.

The agent compares yesterday's sector report to today's and returns a
structured verdict: did something material change, what, and which direction.
Routes through the task-specialised LLM chain defined in `app/llm_router.py`
(Nemotron 120B / Qwen3 Next 80B / Llama 3.3 70B → Gemini Flash), with a
deterministic heuristic as the final floor so watchlist ticks never stall.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from app.ai_harness.context import pack_sections
from app.ai_harness.registry import get_profile
from app.ai_harness.validators import validate_diff_payload
from app.llm_router import router

logger = logging.getLogger(__name__)


@dataclass
class DiffVerdict:
    changed: bool
    headline: str
    direction: str  # "up" | "down" | "neutral"
    confidence: float  # 0.0 - 1.0
    summary: Optional[str] = None
    model: Optional[str] = None  # Which model (if any) produced this verdict


_SYSTEM = (
    "You are a financial-analyst assistant specialising in the Indian equity market. "
    "You compare two sector research reports and decide whether anything material has "
    "changed. Your output must be strict JSON that matches the schema the caller gave "
    "you — no markdown, no commentary, no code fences."
)

_USER_TEMPLATE = """Decide whether TODAY's report materially differs from YESTERDAY's.

A material change is a new opportunity, risk, regulatory event, major price / demand
shift, or notable company news that would make a subscribed reader want an alert.
Cosmetic rewording, reordering, or small wording tweaks are NOT material.

Return JSON with this exact shape:
{{
  "changed": true | false,
  "headline": "<=120 char sentence for a push notification",
  "direction": "up" | "down" | "neutral",
  "confidence": 0.0-1.0,
  "summary": "<=300 char explanation of what changed"
}}

Sector: {sector}

YESTERDAY:
---
{previous}
---

TODAY:
---
{current}
---
"""


# ---------------------------------------------------------------------------
# Heuristic fallback (used when every LLM in the chain fails)
# ---------------------------------------------------------------------------

def _fallback_verdict(previous: str, current: str) -> DiffVerdict:
    prev = (previous or "").strip()
    curr = (current or "").strip()

    if not prev:
        return DiffVerdict(
            changed=True,
            headline="First analysis recorded.",
            direction="neutral",
            confidence=0.7,
            summary="Initial baseline captured for this watchlist.",
            model="heuristic",
        )

    prev_low, curr_low = prev.lower(), curr.lower()
    bull_words = ["opportunity", "growth", "surge", "record", "approval", "expansion"]
    bear_words = ["risk", "decline", "fall", "ban", "probe", "downgrade", "loss"]
    prev_bull = sum(prev_low.count(w) for w in bull_words)
    curr_bull = sum(curr_low.count(w) for w in bull_words)
    prev_bear = sum(prev_low.count(w) for w in bear_words)
    curr_bear = sum(curr_low.count(w) for w in bear_words)

    bull_delta = curr_bull - prev_bull
    bear_delta = curr_bear - prev_bear
    len_delta = len(curr) - len(prev)

    if abs(bull_delta) + abs(bear_delta) < 2 and abs(len_delta) < 200:
        return DiffVerdict(
            changed=False,
            headline="No material change.",
            direction="neutral",
            confidence=0.3,
            summary=None,
            model="heuristic",
        )

    direction = "up" if bull_delta - bear_delta > 0 else "down" if bear_delta - bull_delta > 0 else "neutral"
    headline = f"Tone shifted: +{bull_delta} opportunity mentions, +{bear_delta} risk mentions."
    return DiffVerdict(
        changed=True,
        headline=headline,
        direction=direction,
        confidence=0.45,
        summary=f"Heuristic diff detected a tone shift. Length delta {len_delta} chars.",
        model="heuristic",
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _looks_valid(payload: dict) -> bool:
    """Lightweight schema check before accepting a model's JSON output."""
    return isinstance(payload, dict) and validate_diff_payload(payload)


def diff_reports(sector: str, previous: str, current: str, *, ai_analyzer=None) -> DiffVerdict:
    """
    Compare two reports and return a DiffVerdict.

    `ai_analyzer` is accepted for backwards compatibility with the original
    signature but is no longer consulted — the router decides which model to
    call based on the TaskProfile registered under the `"diff"` key.
    """
    del ai_analyzer  # kept for call-site compatibility

    if not current:
        return DiffVerdict(False, "No current report", "neutral", 0.0, None, "heuristic")

    profile = get_profile("diff")
    prompt_overhead = len(_USER_TEMPLATE) + len(sector) + 500
    packed = pack_sections(
        {
            "YESTERDAY": previous or "(no prior report)",
            "TODAY": current,
        },
        max_chars=max(2_000, profile.context_budget_chars - prompt_overhead),
    )

    user_prompt = _USER_TEMPLATE.format(
        sector=sector,
        previous=packed.split("## TODAY")[0].replace("## YESTERDAY", "").strip(),
        current=(packed.split("## TODAY", 1)[1].strip() if "## TODAY" in packed else current[:20_000]),
    )

    try:
        result = router.run("diff", system=_SYSTEM, user=user_prompt, validate=_looks_valid)
    except Exception as exc:
        logger.warning("Router failed for diff task, using heuristic: %s", exc)
        return _fallback_verdict(previous, current)

    payload = result.parsed
    if not payload:
        logger.warning(
            "Diff router chain exhausted for sector=%s — falling back to heuristic. "
            "Attempts: %s",
            sector,
            [(a.model_id, a.error or "ok") for a in result.attempts],
        )
        return _fallback_verdict(previous, current)

    return DiffVerdict(
        changed=bool(payload.get("changed")),
        headline=str(payload.get("headline") or "Material change detected")[:280],
        direction=str(payload.get("direction") or "neutral").lower(),
        confidence=max(0.0, min(1.0, float(payload.get("confidence") or 0.0))),
        summary=(payload.get("summary") or None),
        model=result.model_key,
    )
