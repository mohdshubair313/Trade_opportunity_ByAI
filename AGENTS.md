# AGENTS.md -- TradeInsight AI

High-signal instructions for OpenCode and other coding agents working in this repo.
Keep it short. If the repo already makes it obvious, do not write it.

---

## 1. What this repo is

Full-stack AI market-intelligence app for Indian equity sectors.

- **Backend:** FastAPI 0.115, Python 3.14, Pydantic v2, SQLAlchemy 2
- **Frontend:** Next.js 14 (App Router), TypeScript 5, Tailwind, Zustand, Recharts
- **Infra:** Docker Compose (backend + frontend + Postgres), or SQLite for local dev

Entrypoints:
- `/api/v1/analyze/{sector}` -- single-sector analysis
- `/api/v1/analyze/compare` -- 2-5 sector comparison
- `app/main.py` -- FastAPI app factory

---

## 2. How to run / verify

### Backend only (local, with SQLite fallback)
```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --loop asyncio
# -> http://localhost:8000/docs
```

### Frontend only
```bash
cd frontend && npm install && npm run dev
# -> http://localhost:3000
```

### Docker (recommended)
```bash
cp app/.env.example .env   # fill in keys, then:
docker compose up -d --build
```

Verification: `curl http://localhost:8000/health` should return JSON with `"status":"healthy"`.

There are **no unit tests** in this repo. Manual verification via Swagger (`/docs`) or curl is the current workflow.

---

## 3. Architecture notes an agent would miss

### Backend layout (`app/`)
- `main.py` -- all route definitions + FastAPI app wiring
- `config.py` -- Pydantic `BaseSettings` (loads `.env` automatically)
- `database.py` -- SQLAlchemy models + CRUD classes; supports SQLite (dev) or Postgres (prod) via `DATABASE_URL`
- `llm_router.py` -- multi-model chain with automatic failover; used by `compare_service.py`, `diff_engine.py`, etc.
- `compare_service.py` -- multi-sector ranking; calls `llm_router` in JSON mode
- `market_data.py` -- yfinance-backed NSE data; has in-process caches
- `data_collector.py` -- DuckDuckGo search + sentiment scoring
- `research_agent.py` -- grounded Gemini research via `google_search` tool; includes `_call_with_retry()` (exponential backoff on 503/429) and `_inject_citation_markers()` (per-claim `[N]` injection from `grounding_supports`)
- `worker.py` -- APScheduler watchlist re-analysis worker; run as separate container in docker-compose
- `schemas.py` -- all Pydantic request/response models

### Frontend layout (`frontend/`)
- `src/app/` -- Next.js App Router pages
- `src/components/` -- React components, loosely grouped by feature
- `src/store/` -- Zustand state management

---

## 4. Developer commands that matter

| Task | Command |
|------|---------|
| Start backend dev | `uvicorn app.main:app --reload --loop asyncio` |
| Start frontend dev | `cd frontend && npm run dev` |
| Typecheck frontend | `cd frontend && npx tsc --noEmit` |
| Lint frontend | `cd frontend && npm run lint` |
| Start worker | `python -m app.worker` |
| Build all | `docker compose up -d --build` |
| Re-seed DB (SQLite) | `rm trade_opportunities_v2.db && uvicorn app.main:app --reload` |

> **Note:** There is no Python linter / formatter configured. Use your own judgment.

Command order when making changes: `lint` (frontend) → manual API test (Swagger).

---

## 5. Env & configuration

- Copy `app/.env.example` to `.env` at repo root. Only `OPENROUTER_API_KEY` or `GEMINI_API_KEY` is strictly required.
- `ENVIRONMENT=development` (default) enables `/docs` and `/redoc`.
- `DATABASE_URL`: unset → SQLite; set to a Postgres URL for production.
- `CORS_ORIGINS` is comma-separated; `localhost:3000` is always appended automatically in `config.py`.

---

## 6. Known production issues (actively being fixed)

### `POST /api/v1/analyze/compare` -- Pydantic ValidationError
- **Crash:** `pydantic_core.ValidationError: 1 validation error for CompareResponse`
- **Root cause:** LLM cascade returns invalid JSON (fallback models miss fields like `scores.1.time_to_roi`). `CompareResponse` in `app/main.py:897` is initialized with no try-except.
- **Fix (applied 2026-06-15):** `CompareResponse` init is wrapped in try-except; on validation failure it falls back to the heuristic path from `compare_service.py`.

### yfinance rate limiting
- `yfinance` throws `Too Many Requests` on shared Docker egress IPs and for some index symbols (e.g. `^CNXAUTO`).
- **Fix (applied 2026-06-15):** `_fetch_history` swallows yfinance exceptions and returns `None` so callers degrade gracefully instead of bombing the pipeline.

### `duckduckgo_search` timeouts
- `ddgs.news()` timeout on some queries (e.g., "Automotive sector India").
- **Fix (applied 2026-06-15):** `TimeoutError` caught explicitly in `search_news_articles`; returns empty results so the fallback LLM path runs.

### Deprecation warnings
- `datetime.utcnow()` is used in `app/compare_service.py:209` and `app/main.py:1325`, scheduled for removal in Python. Replace with `datetime.now(datetime.UTC)`.
- **Fix (applied 2026-06-15):** Replaced all `datetime.utcnow()` calls across the entire codebase with `datetime.now(timezone.utc)`. Column defaults using `datetime.utcnow` as a callable reference (no parens) are left intact as they do not emit deprecation warnings.
- The `duckduckgo_search` package has been renamed to `ddgs`. Import updated in `data_collector.py` and `requirements.txt`.

### Gemini 503 / 429 transient errors
- Production Gemini API calls return sporadic 503 (ServiceUnavailable) and 429 (ResourceExhausted) errors.
- **Fix (applied 2026-06-15):** `research_sector()` now uses `_call_with_retry()` — an exponential-backoff wrapper (2s, 4s, 8s sleep) for codes {429, 502, 503}, max 3 attempts. After exhaustion the standard `ResearchUnavailable` exception is raised so the fallback pipeline still runs.

### Missing `grounding_supports` extraction
- The previous `_extract_grounding()` only parsed `grounding_chunks` (URLs) and `web_search_queries`; `grounding_supports` (the per-claim → chunk mapping) was ignored, so inline `[N]` citation markers were not injected into the report text.
- **Fix (applied 2026-06-15):** `_extract_grounding()` now returns a third tuple element `supports: List[Dict]`. `_inject_citation_markers()` uses it to insert `[N]` markers into the report text right after each claim, enabling the frontend's citation chip renderer.

### Outdated `GoogleSearch` tool config
- `research_sector()` used `types.Tool(google_search=types.GoogleSearch())` which is deprecated in the google-genai SDK.
- **Fix (applied 2026-06-15):** Replaced with `types.Tool(google_search=types.GoogleSearchRetrieval(dynamic_retrieval_config=...))` using `MODE_DYNAMIC` and a low threshold (0.1) so Gemini always executes a web search for the sector analysis use case.

---

## 7. What not to change blindly

- **Pydantic v2 > v1.** This repo uses Pydantic v2 syntax (`model_dump()`, `model_validate()`). Do not revert to `.dict()` or `.from_orm()`.
- **Cache scoping.** `AnalysisCache` is keyed by `(sector, user_id)` so persona-framed reports do not leak across users. Do not change the cache key logic unless you also change the cache scope.
- **Guest mode access.** Guests are hard-limited to `technology` and `pharmaceuticals`.
- **Graceful degradation pipeline.** The analysis endpoint has a precise fallback chain (grounded Gemini → DDG + Gemini → OpenRouter offline → mock report). If you change error handling in one step, make sure the next step still runs.
- **Worker independence.** The APScheduler worker container runs `python -m app.worker` separately. It must remain stateless so multiple worker replicas do not duplicate work.

---

## 8. Quick reference: key files for common tasks

| Task | First file(s) to read |
|------|------------------------|
| Add/change an endpoint | `app/main.py` |
| Change response/request shape | `app/schemas.py` |
| Modify sector analysis logic | `app/research_agent.py` (retry, citation injection, tool config), `app/ai_analyzer.py` |
| Change LLM model fallback order | `app/llm_router.py` (`TASKS` dict) |
| Fix compare/multi-sector ranking | `app/compare_service.py`, `app/main.py` around line 897 |
| Add new DB models | `app/database.py` (SQLAlchemy declarative) |
| Change market data (yfinance) | `app/market_data.py` |
| Change news & sentiment | `app/data_collector.py`, `app/sentiment.py` |
| Change persona framing | `app/research_agent.py` (`_PERSONA_FRAMES`) |
| Change frontend routes | `frontend/src/app/` |
| Change frontend state | `frontend/src/store/` |

---

*Last updated: 2026-06-15*
