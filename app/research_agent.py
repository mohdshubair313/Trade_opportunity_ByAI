"""
Grounded research agent (ROADMAP §12).

The old pipeline fed Gemini ~10 DDG snippets and hoped the model could extract
a proper sector view from 200-word blurbs. It produced generic reports.

This module asks Gemini to do its own web research via the built-in
``google_search`` tool: Gemini picks queries, fetches the actual article
bodies, and writes a grounded report. We then extract the grounding metadata
(URLs + titles Gemini actually used) and hand them to the UI's citation chips.

If the grounded call fails for any reason (quota, tool not available on the
current model, network hiccup) we surface a ``ResearchUnavailable`` so the
caller can fall back to the legacy DDG + AIAnalyzer path.
"""
from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from google.genai import errors as genai_errors

logger = logging.getLogger(__name__)


class ResearchUnavailable(RuntimeError):
    """Raised when the grounded research call can't produce a report."""


@dataclass
class GroundedSource:
    n: int
    title: str
    url: str
    snippet: Optional[str] = None
    supporting_segments: List[str] = field(default_factory=list)


@dataclass
class GroundedReport:
    sector: str
    report: str                              # Markdown body (no YAML frontmatter)
    sources: List[GroundedSource] = field(default_factory=list)
    search_queries: List[str] = field(default_factory=list)  # Queries Gemini ran
    model: str = ""
    supports: List[Dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Retry helper for Gemini API calls
# ---------------------------------------------------------------------------

TRANSIENT_CODES = {429, 502, 503}


def _call_with_retry(
    client: genai.Client,
    model: str,
    contents: List[types.Content],
    config: types.GenerateContentConfig,
    max_attempts: int = 3,
) -> types.GenerateContentResponse:
    """Call Gemini with exponential backoff on transient errors."""
    last_exc: Optional[Exception] = None
    for attempt in range(1, max_attempts + 1):
        try:
            return client.models.generate_content(
                model=model, contents=contents, config=config,
            )
        except genai_errors.APIError as exc:
            last_exc = exc
            if exc.code in TRANSIENT_CODES and attempt < max_attempts:
                sleep_sec = 2 ** attempt
                logger.warning(
                    "Gemini transient error (code=%d, attempt %d/%d); "
                    "retrying in %ds ...",
                    exc.code, attempt, max_attempts, sleep_sec,
                )
                time.sleep(sleep_sec)
            else:
                raise
        except Exception:
            raise
    raise last_exc  # type: ignore[misc]  # only reached if all attempts failed


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

_PERSONA_FRAMES = {
    "investor": (
        "Reader is a RETAIL INVESTOR. Emphasise listed company names, P/E vs peers, "
        "entry / exit zones, position sizing, catalysts and risks. In 'Stock Suggestions' "
        "give concrete tickers with rationale, entry/stop/target framing, and conviction level."
    ),
    "exporter": (
        "Reader is an MSME EXPORTER. Emphasise HS codes, target countries with growing "
        "demand, tariff / FTA context, port logistics, FX exposure, and RoDTEP / PLI incentives. "
        "In 'Stock Suggestions' section, replace with 'Country-Product Corridors' — list "
        "specific HS-code / destination-country pairs to pursue."
    ),
    "sme_owner": (
        "Reader is an SME OWNER evaluating a new line of business. Emphasise capital required, "
        "break-even timeline, local demand signals, supplier / vendor ecosystem, licenses. "
        "In 'Stock Suggestions' section, replace with 'Launch Checklist' — a 0-6-12 month plan."
    ),
    "student": (
        "Reader is a B-SCHOOL / UPSC / CFA STUDENT writing a sector case study. Emphasise "
        "market sizing methodology, Porter's five forces, policy citations, historical inflection "
        "points. Prefer academic tone and rigor over action items."
    ),
    "consultant": (
        "Reader is an INDEPENDENT CONSULTANT preparing a client deck. Emphasise executive framing, "
        "2x2 matrices, opportunity sizing with assumptions, and a slide-ready structure."
    ),
}


def _persona_block(persona: Optional[Dict]) -> str:
    if not persona:
        return "Reader is a general market observer."
    name = (persona.get("persona") or "").lower()
    frame = _PERSONA_FRAMES.get(name, "Reader is a general market observer.")
    details = []
    for key in ("capital_range", "region", "risk_appetite"):
        if persona.get(key):
            details.append(f"{key}: {persona[key]}")
    if details:
        return f"{frame}\nAdditional reader signal — {'; '.join(details)}."
    return frame


def build_prompt(sector: str, persona: Optional[Dict]) -> str:
    today = datetime.now(timezone.utc).strftime("%B %Y")
    return f"""You are a senior sector analyst covering Indian markets for a subscription research service. Today is {today}.

TASK
Research the **{sector}** sector in India using the google_search tool. Fetch and read the most recent
and most authoritative articles, broker notes, regulatory updates, earnings commentary and reliable blogs
you can find. Then write ONE comprehensive, structured report.

READER CONTEXT
{_persona_block(persona)}

REPORT STRUCTURE (use these exact H1/H2 headings and markdown)
# {sector.title()} Sector — Trade Opportunities Analysis

## Executive Summary
3-5 sentence distillation of the current sector view and the single most important thing the reader
needs to know today.

## Current Market Snapshot
- Sector size, growth rate, recent performance, index levels where relevant.
- Which large-cap names are driving the tape this month.
- Where sentiment sits (bullish / neutral / bearish) and why.

## What's Happening Now
A clear, dated view of what is affecting the sector RIGHT NOW — name specific catalysts (regulatory
actions, earnings surprises, policy announcements, international events). Prefer specifics over generic
trends. Reference dates or recent weeks/months.

## What's Coming Next (3-6 months)
What is LIKELY to move the sector over the next quarter or two. Separate probable events (scheduled
budgets, quarterly earnings, RBI meetings) from speculative but plausible catalysts. Call out risks by name.

## Stock Suggestions
Give 3-6 specific listed Indian companies tied to this sector. For each:
- **Ticker** (NSE symbol)
- One-line **thesis** (why this stock expresses the sector view)
- **Watch-for** catalyst (what would invalidate or confirm it)
- If the reader persona is not 'investor', adapt as per READER CONTEXT above.

## Cross-Sector Impact
Explain how this sector's movements ripple into two or three *other* sectors (e.g. pharma moves often
echo in healthcare + specialty chemicals; banking moves echo in NBFC + real estate). Name the other
sectors and the mechanism.

## Trade Opportunities
### Export Opportunities
### Import Opportunities
### Domestic Trade Opportunities

## Market Drivers
Policy tailwinds, structural demand, tech / innovation vectors.

## Challenges and Risks
Entry barriers, regulatory overhang, valuation concerns, competitive pressure.

## Recommendations
- Short-term (0-6 months)
- Medium-term (6-12 months)
- Long-term (1-3 years)

## Key Contacts and Resources
Industry associations, government bodies, useful databases.

STYLE RULES
- Be specific and data-driven. Use numbers, company names, policy names, dated events. No vague
  "growing market" filler.
- Write in Markdown. Do NOT include a 'References' / 'Sources' section yourself — the renderer attaches
  one from the sources the search tool retrieved.
- Do NOT invent ticker symbols or numbers. Only cite what your tool calls actually returned.
- Keep the total report under ~1200 words.
""".strip()


# ---------------------------------------------------------------------------
# Research call
# ---------------------------------------------------------------------------

def _extract_grounding(
    candidate,
) -> tuple[List[GroundedSource], List[str], List[Dict[str, Any]]]:
    """Pull sources, search queries, and per-claim grounding supports out of
    a Gemini grounded response.

    Returns
    -------
    (sources, queries, supports)
        ``supports`` is a list of dicts, each with ``claim_text`` and
        ``chunk_indices`` (list of zero-based indices into ``grounding_chunks``).
    """
    sources: List[GroundedSource] = []
    queries: List[str] = []
    supports: List[Dict[str, Any]] = []

    metadata = getattr(candidate, "grounding_metadata", None)
    if metadata is None:
        return sources, queries, supports

    chunks = getattr(metadata, "grounding_chunks", None) or []
    for idx, chunk in enumerate(chunks, start=1):
        web = getattr(chunk, "web", None)
        if web is None:
            continue
        uri = getattr(web, "uri", None) or ""
        title = getattr(web, "title", None) or uri
        if not uri:
            continue
        sources.append(GroundedSource(n=idx, title=title, url=uri))

    search_entries = getattr(metadata, "web_search_queries", None) or []
    for q in search_entries:
        if isinstance(q, str) and q:
            queries.append(q)

    # Extract per-claim grounding_supports for inline citation injection
    support_entries = getattr(metadata, "grounding_supports", None) or []
    for sp in support_entries:
        claim_text = getattr(sp, "claim_text", None) or ""
        supporting_chunks = getattr(sp, "supporting_chunks", None) or []
        chunk_indices: List[int] = []
        for chunk_ref in supporting_chunks:
            idx = getattr(chunk_ref, "chunk_index", None)
            if idx is not None:
                chunk_indices.append(idx)
        if claim_text and chunk_indices:
            supports.append({"claim_text": claim_text, "chunk_indices": chunk_indices})

    return sources, queries, supports


def _inject_citation_markers(
    text: str,
    supports: List[Dict[str, Any]],
    sources: List[GroundedSource],
) -> str:
    """Inline `[N]` markers into the report based on grounding_supports.

    Each support associates a claim_text with chunk indices. We resolve those
    chunk indices to the 1-based source numbers (``GroundedSource.n``) and
    insert `` [N1, N2]`` right after the claim text so the frontend's citation
    chip renderer can hook into them.
    """
    if not supports or not sources:
        return text

    chunk_map: Dict[int, int] = {}
    for src in sources:
        chunk_map[src.n - 1] = src.n

    for support in reversed(supports):
        claim_text = support.get("claim_text", "")
        chunk_indices: List[int] = support.get("chunk_indices", [])
        if not claim_text or not chunk_indices:
            continue
        citation_ns = [
            chunk_map[ci] for ci in chunk_indices if ci in chunk_map
        ]
        if not citation_ns:
            continue
        citation_str = " ".join(f"[{n}]" for n in sorted(set(citation_ns)))

        idx = text.lower().rfind(claim_text.lower())
        if idx == -1:
            continue
        end_idx = idx + len(claim_text)
        text = text[:end_idx] + " " + citation_str + text[end_idx:]

    return text


# gemini-2.5-flash is the free-tier friendly model that accepts the
# google_search grounding tool today. gemini-3-*-preview models have
# per-project quotas that are effectively 0 on the free tier for grounded
# calls. Override via env if you have paid quota for a newer model.
_MODEL_GROUNDING = os.getenv("GROUNDED_RESEARCH_MODEL", "gemini-2.5-flash")


def research_sector(sector: str, *, persona: Optional[Dict] = None, client=None) -> GroundedReport:
    """
    Ask Gemini to research ``sector`` with web grounding and return a structured report.

    Raises ``ResearchUnavailable`` on any failure so the caller can fall back.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ResearchUnavailable("GEMINI_API_KEY not configured")

    if client is None:
        try:
            client = genai.Client(api_key=api_key)
        except Exception as exc:
            raise ResearchUnavailable(f"Could not initialise Gemini client: {exc}") from exc

    prompt = build_prompt(sector, persona)
    # Use GoogleSearchRetrieval with dynamic retrieval so Gemini always searches
    tools = [types.Tool(google_search=types.GoogleSearchRetrieval(
        dynamic_retrieval_config=types.DynamicRetrievalConfig(
            mode=types.DynamicRetrievalConfigMode.MODE_DYNAMIC,
            dynamic_threshold=0.1,
        ),
    ))]

    try:
        response = _call_with_retry(
            client,
            model=_MODEL_GROUNDING,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=tools,
                temperature=0.4,
                max_output_tokens=8192,
            ),
        )
    except Exception as exc:
        raise ResearchUnavailable(f"Gemini grounded call failed: {exc}") from exc

    text = (getattr(response, "text", None) or "").strip()
    if not text:
        # Some SDK responses expose the text through candidates[0].content.parts
        candidates = getattr(response, "candidates", None) or []
        if candidates:
            parts = getattr(getattr(candidates[0], "content", None), "parts", None) or []
            text = "\n".join(getattr(p, "text", "") for p in parts).strip()

    if not text:
        raise ResearchUnavailable("Gemini returned an empty response")

    sources: List[GroundedSource] = []
    queries: List[str] = []
    supports: List[Dict[str, Any]] = []
    candidates = getattr(response, "candidates", None) or []
    if candidates:
        sources, queries, supports = _extract_grounding(candidates[0])

    logger.info(
        "Grounded research for %s produced %d chars, %d sources, %d queries, %d supports",
        sector, len(text), len(sources), len(queries), len(supports),
    )

    # Strip any stray citation markers like [1, 2] that Gemini sometimes leaves
    # when it sees its own search results — our renderer builds chips from the
    # sources list, not from inline numbers.
    text = re.sub(r"\s?\[(\d+(?:,\s*\d+)*)\]", "", text)

    # Inject grounded [N] citation markers from grounding_supports metadata
    text = _inject_citation_markers(text, supports, sources)

    return GroundedReport(
        sector=sector,
        report=text,
        sources=sources,
        search_queries=queries,
        model=_MODEL_GROUNDING,
        supports=supports,
    )


# ---------------------------------------------------------------------------
# Offline / no-search fallback — routes through OpenRouter prose chain
# ---------------------------------------------------------------------------

_OFFLINE_SYSTEM = (
    "You are a senior sector analyst covering Indian markets. You do not have "
    "live web access for this response — write from your training knowledge. "
    "Be explicit at the top of the report that the analysis is based on general "
    "market knowledge, not real-time news, so the reader knows the limitation."
)


def _build_offline_prompt(sector: str, persona: Optional[Dict]) -> str:
    today = datetime.now(timezone.utc).strftime("%B %Y")
    return f"""Write a structured markdown report on the **{sector}** sector in India. Today's
month is {today}. You cannot search the web — use your training knowledge, and call
that limitation out in the opening sentence.

READER CONTEXT
{_persona_block(persona)}

Use this structure (exact H1/H2 headings):
# {sector.title()} Sector — Trade Opportunities Analysis (general knowledge)
## Executive Summary
## Current Market Snapshot
## What's Happening Now
## What's Coming Next (3-6 months)
## Stock Suggestions
## Cross-Sector Impact
## Trade Opportunities
### Export Opportunities
### Import Opportunities
### Domestic Trade Opportunities
## Market Drivers
## Challenges and Risks
## Recommendations
## Key Contacts and Resources

Rules:
- Be specific. Use company names and policy names you know about.
- Do NOT invent citations. If you reference a source, write the name in prose —
  no `[N]` markers.
- Mark any forward-looking claim as an estimate.
- Keep under 1200 words.
""".strip()


def research_sector_offline(sector: str, *, persona: Optional[Dict] = None) -> GroundedReport:
    """
    Fallback path used when grounded research AND DDG both fail (container IP
    rate-limited, API quota out, etc.). Routes through the OpenRouter `prose`
    chain so we still return a real LLM-generated report — never the mock
    demo text — with an honest banner explaining the data limitation.
    """
    from app.llm_router import router as llm_router

    prompt = _build_offline_prompt(sector, persona)
    try:
        result = llm_router.run("prose", system=_OFFLINE_SYSTEM, user=prompt)
    except Exception as exc:
        raise ResearchUnavailable(f"Offline router call failed: {exc}") from exc

    if not result.text:
        raise ResearchUnavailable(
            "All LLM providers exhausted on offline path. "
            f"Attempts: {[(a.model_id, a.error or 'ok') for a in result.attempts]}"
        )

    logger.info(
        "Offline research for %s produced %d chars via %s",
        sector, len(result.text), result.model_key,
    )
    return GroundedReport(
        sector=sector,
        report=result.text,
        sources=[],
        search_queries=[],
        model=f"offline:{result.model_key}",
    )
