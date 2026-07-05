"""
Agentic LLM router — picks the right model for the right job.

Each "agent" in the app (DiffAgent, CompareAgent, future PersonaRewriteAgent, …)
declares a *task profile* and calls `router.run()`. The router walks a
prioritised model chain until one returns valid output, then falls back to the
next provider. This gives every agent:

  - Model-per-task specialisation (Gemma 4 31B for complex reasoning, Gemma 4
    26B MoE for fast JSON, Qwen3 Next for long-context, Llama 3.3 for prose,
    Gemini 2.5 Flash as the backstop).
  - Built-in retries/fallbacks when any single free-tier model 429s.
  - Consistent JSON validation so callers don't re-implement parsing.
  - Optional web-search grounding via OpenRouter's `web` plugin — useful when
    our own news collector is rate-limited and the model needs fresh context.
  - Observability — every attempt emits a structured log with agent name +
    model + latency + outcome.

OpenRouter access goes through the official ``openrouter`` Python SDK
(https://openrouter.ai/docs/sdks/python/overview). Gemini stays on
``google-genai`` because grounding and `google_search` are not exposed through
OpenRouter.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from app.llm.ai_harness.registry import get_profile
from app.llm.ai_harness.telemetry import HarnessEvent, log_event

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model catalogue
# ---------------------------------------------------------------------------

class Provider(str, Enum):
    OPENROUTER = "openrouter"
    GEMINI = "gemini"


@dataclass(frozen=True)
class ModelSpec:
    """A concrete model identifier scoped to its provider."""
    provider: Provider
    name: str                         # Provider-specific id, e.g. "google/gemma-4-31b-it:free"
    context_window: int               # Tokens
    good_at: tuple[str, ...] = ()     # Freeform tags — "json", "long_context", "reasoning"


# OpenRouter free-tier catalogue verified against /api/v1/models on 2026-04-20.
# Gemini stays as the backstop because it's billed separately via Google's own
# key (and its native `google_search` grounding is richer than OpenRouter's
# plugin for the research agent).
CATALOGUE: Dict[str, ModelSpec] = {
    # Gemma 4 dense 31B IT — best free-tier model for heavy reasoning + JSON.
    "gemma_4_31b": ModelSpec(Provider.OPENROUTER, "google/gemma-4-31b-it:free", 262_144,
                             ("json", "reasoning", "long_context", "agentic")),
    # Gemma 4 MoE 26B (A4B active) — much faster than the dense 31B and still
    # excellent at structured output. Ideal as the top pick on JSON-heavy jobs.
    "gemma_4_26b_moe": ModelSpec(Provider.OPENROUTER, "google/gemma-4-26b-a4b-it:free", 262_144,
                                 ("json", "cheap", "long_context")),
    "qwen3_next_80b": ModelSpec(Provider.OPENROUTER, "qwen/qwen3-next-80b-a3b-instruct:free", 262_144,
                                ("json", "reasoning", "long_context")),
    "nemotron_30b": ModelSpec(Provider.OPENROUTER, "nvidia/nemotron-3-nano-30b-a3b:free", 256_000,
                              ("reasoning", "cheap")),
    "llama_70b": ModelSpec(Provider.OPENROUTER, "meta-llama/llama-3.3-70b-instruct:free", 65_536,
                           ("prose", "reasoning")),
    "hermes_405b": ModelSpec(Provider.OPENROUTER, "nousresearch/hermes-3-llama-3.1-405b:free", 131_072,
                             ("prose", "reasoning", "agentic")),
    "gemini_flash": ModelSpec(Provider.GEMINI, "gemini-2.5-flash", 1_000_000,
                              ("json", "long_context", "grounding")),
}


# ---------------------------------------------------------------------------
# Task profiles
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TaskProfile:
    """Describes a chain of models to try for a given job."""
    name: str
    chain: tuple[str, ...]         # Ordered list of CATALOGUE keys
    json_mode: bool = False        # Ask providers to return JSON
    max_output_tokens: int = 2048
    temperature: float = 0.2
    web_search: bool = False       # Attach OpenRouter's `web` plugin (native→exa)
    context_budget_chars: int = 24_000
    fallback: str = ""
    repair_attempts: int = 0


# Pre-wired agents. Each maps to a specific TaskProfile with its own chain so
# the same router instance serves every agent.
TASKS: Dict[str, TaskProfile] = {
    # DiffAgent: watchlist change detection. Two ~10k-token reports to reason
    # over, strict JSON out. Gemma 4 31B is the strongest free-tier reasoner
    # right now; Qwen3 Next and Llama 70B are sanity backstops.
    "diff": TaskProfile(
        name="diff",
        chain=("gemma_4_31b", "qwen3_next_80b", "llama_70b", "gemini_flash"),
        json_mode=True,
        max_output_tokens=1024,
        temperature=0.0,
    ),
    # CompareAgent: multi-sector leaderboard. Pure JSON, medium input. Gemma 4
    # MoE is fast + great at structured output; Gemma 4 31B is the complex-
    # reasoning upgrade when the MoE isn't confident. `web_search` is on so
    # the model can pull fresh headlines directly when our DDG collector is
    # rate-limited — the grounding makes scores reflect real news, not stale
    # sentiment averages.
    "compare": TaskProfile(
        name="compare",
        chain=("gemma_4_26b_moe", "gemma_4_31b", "qwen3_next_80b", "nemotron_30b", "gemini_flash"),
        json_mode=True,
        max_output_tokens=2048,
        temperature=0.0,
        web_search=True,
    ),
    # PersonaRewriteAgent / offline narrative fallback: prose tone-shifting.
    # Llama 3.3 70B has the cleanest tone control on free tier; Hermes 405B is
    # the heavyweight fallback; Gemma 4 31B backstops that.
    "prose": TaskProfile(
        name="prose",
        chain=("llama_70b", "hermes_405b", "gemma_4_31b", "gemini_flash"),
        json_mode=False,
        max_output_tokens=4096,
        temperature=0.4,
    ),
}


def _task_from_harness(task_key: str) -> TaskProfile:
    profile = get_profile(task_key)
    return TaskProfile(
        name=profile.name,
        chain=profile.model_chain,
        json_mode=profile.json_mode,
        max_output_tokens=profile.max_output_tokens,
        temperature=profile.temperature,
        web_search="openrouter_web" in profile.tools,
        context_budget_chars=profile.context_budget_chars,
        fallback=profile.fallback,
        repair_attempts=profile.repair_attempts,
    )


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

@dataclass
class LLMAttempt:
    model_key: str
    model_id: str
    provider: Provider
    latency_ms: int
    ok: bool
    error: Optional[str] = None


@dataclass
class LLMResult:
    text: str
    parsed: Optional[dict] = None         # Populated when json_mode=True and JSON parsed cleanly
    model_key: str = ""
    attempts: List[LLMAttempt] = field(default_factory=list)


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    # Drop leading/trailing ```json / ``` fences that some models emit.
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _safe_json_loads(text: str) -> Optional[dict]:
    if not text:
        return None
    cleaned = _strip_code_fences(text)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to recover a {...} block from within a longer response.
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            return None
        try:
            value = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return value if isinstance(value, dict) else None


class LLMRouter:
    def __init__(self) -> None:
        self._openrouter_client = None
        self._gemini_client = None

    # ---- Provider clients (lazy) -----------------------------------------

    def _openrouter(self):
        if self._openrouter_client is not None:
            return self._openrouter_client
        key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not key:
            return None
        try:
            from openrouter import OpenRouter  # type: ignore
        except ImportError:
            logger.warning("openrouter SDK missing — `pip install openrouter` to enable OpenRouter routing")
            return None
        self._openrouter_client = OpenRouter(
            api_key=key,
            # Attribution headers — optional but encouraged by OpenRouter.
            http_referer=os.getenv("PUBLIC_APP_URL", "http://localhost:3000"),
            x_open_router_title="TradeInsight AI",
        )
        return self._openrouter_client

    def _gemini(self):
        if self._gemini_client is not None:
            return self._gemini_client
        key = os.getenv("GEMINI_API_KEY", "").strip()
        if not key:
            return None
        try:
            from google import genai  # type: ignore
        except ImportError:
            logger.warning("google-genai SDK missing")
            return None
        self._gemini_client = genai.Client(api_key=key)
        return self._gemini_client

    # ---- Provider calls ---------------------------------------------------

    def _call_openrouter(self, spec: ModelSpec, system: str, user: str,
                        *, json_mode: bool, max_tokens: int, temperature: float,
                        web_search: bool) -> str:
        client = self._openrouter()
        if client is None:
            raise RuntimeError("OpenRouter client not configured")

        messages: List[Dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": user})

        kwargs: Dict[str, Any] = {
            "model": spec.name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if web_search:
            kwargs["plugins"] = [{"id": "web", "max_results": 5}]

        # Retry on transient 429s (rate limits that clear within seconds)
        import time as _time
        last_exc: Optional[Exception] = None
        for attempt in range(3):
            try:
                response = client.chat.send(**kwargs)
                choices = getattr(response, "choices", None) or []
                if not choices:
                    raise RuntimeError("empty choices")
                msg = choices[0].message
                if getattr(msg, "refusal", None):
                    raise RuntimeError(f"model refused: {msg.refusal}")
                content = getattr(msg, "content", None) or ""
                if not content:
                    raise RuntimeError("empty content")
                return content
            except Exception as exc:
                last_exc = exc
                err_str = str(exc).lower()
                if "429" in err_str or "rate limit" in err_str or "too many requests" in err_str or "provider returned error" in err_str:
                    if attempt < 2:
                        delay = 3 * (attempt + 1)
                        logger.info(f"[openrouter] rate limited on {spec.name}, retrying in {delay}s (attempt {attempt + 1})")
                        _time.sleep(delay)
                        continue
                raise
        raise RuntimeError(f"OpenRouter call failed after retries") from last_exc

    def _call_gemini(self, spec: ModelSpec, system: str, user: str,
                    *, json_mode: bool, max_tokens: int, temperature: float) -> str:
        client = self._gemini()
        if client is None:
            raise RuntimeError("Gemini client not configured")
        from google.genai import types  # type: ignore

        contents = f"{system}\n\n{user}" if system else user
        config_kwargs: Dict[str, Any] = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"
        # `thinking_config` is a Gemini 3 feature — 2.x models return 400 on it.
        if spec.name.startswith("gemini-3"):
            config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level="minimal")

        response = client.models.generate_content(
            model=spec.name,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        return (getattr(response, "text", None) or "").strip()

    # ---- Public API -------------------------------------------------------

    def run(self, task_key: str, *, system: str = "", user: str,
            validate: Optional[Callable[[dict], bool]] = None) -> LLMResult:
        """
        Execute a task against its model chain.

        If the profile is in JSON mode we also parse the response into a dict
        and, if `validate` is provided, require it to return True for the
        model's output to count as a success. A failed validation moves on to
        the next model in the chain — useful when one model emits malformed
        JSON.
        """
        try:
            profile = _task_from_harness(task_key)
        except KeyError:
            profile = TASKS.get(task_key)
            if profile is None:
                raise KeyError(f"Unknown task profile: {task_key}")

        result = LLMResult(text="", model_key="")
        for model_key in profile.chain:
            spec = CATALOGUE.get(model_key)
            if spec is None:
                continue

            started = time.time()
            text = ""
            error: Optional[str] = None
            try:
                if spec.provider is Provider.OPENROUTER:
                    text = self._call_openrouter(
                        spec, system=system, user=user,
                        json_mode=profile.json_mode,
                        max_tokens=profile.max_output_tokens,
                        temperature=profile.temperature,
                        web_search=profile.web_search,
                    )
                elif spec.provider is Provider.GEMINI:
                    text = self._call_gemini(
                        spec, system=system, user=user,
                        json_mode=profile.json_mode,
                        max_tokens=profile.max_output_tokens,
                        temperature=profile.temperature,
                    )
                else:
                    raise RuntimeError(f"Unsupported provider {spec.provider}")
            except Exception as exc:  # noqa: BLE001 - every provider can fail
                error = str(exc)[:240]

            latency_ms = int((time.time() - started) * 1000)
            ok = bool(text) and error is None

            parsed: Optional[dict] = None
            if ok and profile.json_mode:
                parsed = _safe_json_loads(text)
                if parsed is None:
                    ok = False
                    error = error or "invalid JSON"
                elif validate is not None and not validate(parsed):
                    ok = False
                    error = "failed validation"

            attempt = LLMAttempt(
                model_key=model_key,
                model_id=spec.name,
                provider=spec.provider,
                latency_ms=latency_ms,
                ok=ok,
                error=error,
            )
            result.attempts.append(attempt)
            logger.info(
                "[agent:%s] model=%s latency=%dms %s%s",
                profile.name,
                spec.name,
                latency_ms,
                "ok" if ok else "fail",
                f" ({error})" if error else "",
            )
            log_event(HarnessEvent(
                task=profile.name,
                phase="model_attempt",
                model=spec.name,
                ok=ok,
                latency_ms=latency_ms,
                input_chars=len(system) + len(user),
                output_chars=len(text),
                fallback=profile.fallback if not ok else None,
                error=error,
            ))

            if ok:
                result.text = text
                result.parsed = parsed
                result.model_key = model_key
                return result

        # All providers exhausted — the caller is responsible for a heuristic
        # fallback. LLMResult.text is empty, LLMResult.parsed is None.
        return result


# A process-wide router instance. Cheap — just holds two lazy clients.
router = LLMRouter()
