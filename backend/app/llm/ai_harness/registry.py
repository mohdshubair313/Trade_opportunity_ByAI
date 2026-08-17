"""Declarative task registry for AI harness decisions.

This module is intentionally free of provider SDK imports. It gives the app one
place to decide model chains, tool policy, token budgets, and fallback behavior.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HarnessProfile:
    name: str
    model_chain: tuple[str, ...]
    json_mode: bool
    max_output_tokens: int
    temperature: float
    context_budget_chars: int
    tools: tuple[str, ...] = ()
    fallback: str = ""
    repair_attempts: int = 0


PROFILES: dict[str, HarnessProfile] = {
    "sector_research": HarnessProfile(
        name="sector_research",
        model_chain=("gemini_flash",),
        json_mode=False,
        max_output_tokens=8192,
        temperature=0.4,
        context_budget_chars=48_000,
        tools=("google_search",),
        fallback="ddg_then_offline_report",
    ),
    "compare": HarnessProfile(
        name="compare",
        model_chain=("gemma_4_26b_moe", "gemma_4_31b", "qwen3_next_80b", "nemotron_30b", "gemini_flash"),
        json_mode=True,
        max_output_tokens=2048,
        temperature=0.0,
        context_budget_chars=18_000,
        tools=("openrouter_web",),
        fallback="heuristic_compare",
        repair_attempts=1,
    ),
    "diff": HarnessProfile(
        name="diff",
        model_chain=("gemma_4_31b", "qwen3_next_80b", "llama_70b", "gemini_flash"),
        json_mode=True,
        max_output_tokens=1024,
        temperature=0.0,
        context_budget_chars=70_000,
        fallback="heuristic_diff",
        repair_attempts=1,
    ),
    "prose": HarnessProfile(
        name="prose",
        model_chain=("llama_70b", "hermes_405b", "gemma_4_31b", "gemini_flash"),
        json_mode=False,
        max_output_tokens=4096,
        temperature=0.4,
        context_budget_chars=24_000,
        fallback="mock_report_with_banner",
    ),
}


def get_profile(task_key: str) -> HarnessProfile:
    try:
        return PROFILES[task_key]
    except KeyError as exc:
        raise KeyError(f"Unknown AI harness task: {task_key}") from exc
