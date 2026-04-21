<div align="center">

# TradeInsight AI

**AI-powered market intelligence for Indian equity sectors.**
Pick a sector. Get a cited, persona-tuned report in under fifteen seconds.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

[Pitch](./PITCH.md) · [Architecture](./ARCHITECTURE.md) · [Roadmap](./ROADMAP.md)

</div>

---

## What this is

TradeInsight AI is a full-stack product that turns a sector name (*"pharmaceuticals"*, *"fintech"*) into a **structured, citation-backed, persona-aware** analysis of that sector in the Indian market — backed by live NSE data, news-sentiment scoring, and a scheduled alerts engine that tells you when something material changes.

Built for retail investors, MSME exporters, SME owners, consultants, and finance-exam aspirants who'd otherwise spend hours reading Moneycontrol, Economic Times and broker PDFs to form one opinion.

> For the full product story and investor pitch, see [`PITCH.md`](./PITCH.md).
> For deep technical architecture and the full request trace, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Highlights

- **Agentic AI research pipeline** — multi-model cascade with automatic failover across Gemma 4, Qwen3 Next, Llama 3.3, Nemotron and Gemini 2.5 Flash
- **Grounded citations** — the AI does its own live web search and every claim maps to a real article URL
- **Persona-tuned reports** — 5 personas × 4 capital bands × 4 risk tiers = reports that read differently for each user
- **Compare engine** — rank 2-5 sectors on opportunity / risk / capital / time-to-ROI
- **Watchlists with material-change alerts** — a scheduler re-analyses on cadence; a diff agent pings you only when something substantive changes
- **Multi-format export** — Markdown, PDF, Excel, PowerPoint
- **Live NSE data** — sector indices, 12-month trends, 52-week ranges, Nifty 50 relative strength, 90-day correlation matrix (via yfinance)
- **Full auth stack** — JWT + refresh tokens, guest mode, tier-based quotas, per-user scoped caching

---

## Quick start

### Option A: Docker Compose (recommended)

```bash
# 1. Clone
git clone https://github.com/mohdshubair313/Trade_opportunity_ByAI.git
cd Trade_opportunity_ByAI

# 2. Copy env template and fill in keys
cp .env.example .env          # edit with your API keys — see "Environment" below

# 3. Build + run everything (backend, frontend, Postgres)
docker compose up -d --build

# 4. Open
open http://localhost:3000    # Next.js frontend
open http://localhost:8000/docs  # FastAPI Swagger
```

### Option B: Run services separately

**Backend**
```bash
# From repo root
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in keys
uvicorn app.main:app --reload --loop asyncio
# → http://localhost:8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment

Create a `.env` at the repo root. Only `OPENROUTER_API_KEY` or `GEMINI_API_KEY` is strictly required — the app will fall through gracefully if one is missing.

```ini
# --- AI providers (at least one recommended) ------------------------------
OPENROUTER_API_KEY=sk-or-v1-...         # https://openrouter.ai/keys (free tier)
GEMINI_API_KEY=...                       # https://aistudio.google.com/app/apikey

# --- Auth -----------------------------------------------------------------
SECRET_KEY=change-me-to-something-at-least-32-chars-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# --- Rate limits ----------------------------------------------------------
RATE_LIMIT_PER_MINUTE=10

# --- Database -------------------------------------------------------------
# Leave unset for dev (falls back to SQLite). For production, use a Postgres URL:
# DATABASE_URL=postgresql+psycopg://user:pass@host:5432/tradeinsight

# --- Public URL (OpenRouter attribution header) ---------------------------
PUBLIC_APP_URL=http://localhost:3000

# --- Optional: tune grounded research model -------------------------------
# GROUNDED_RESEARCH_MODEL=gemini-2.5-flash
```

---

## Architecture at a glance

```mermaid
flowchart LR
    U[User] --> F[Next.js 14 Frontend]
    F -->|JWT| B[FastAPI Backend]

    B --> R[Research Agent]
    R --> G[Gemini 2.5 + google_search grounding]
    R --> D[DuckDuckGo news fallback]

    B --> M[Market Data]
    M --> Y[yfinance · NSE indices]

    B --> L[LLM Router]
    L --> O[OpenRouter · Gemma 4 / Qwen / Llama / Nemotron]
    L --> GM[Gemini as backstop]

    B --> DB[(Postgres / SQLite)]

    SCHED[APScheduler] -->|cadence tick| B
    B --> DIFF[DiffAgent]
    DIFF --> ALERT[Alert Event]
    ALERT --> U
```

The four moving parts:

1. **Research pipeline** — grounded Gemini first, DDG fallback, OpenRouter prose fallback, deterministic heuristic as the floor.
2. **LLM router** — every AI task picks a profile (`diff`, `compare`, `prose`) that maps to a cascade of models. On 429 or bad JSON, it falls through transparently.
3. **Scheduler + DiffAgent** — re-analyses watched sectors and delivers alerts only on *material* change.
4. **Persistence** — SQLAlchemy over Postgres (prod) or SQLite (dev), fully user-scoped.

Deep dive: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## API overview

Full OpenAPI spec lives at `/docs` when the backend is running. The important routes:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create a new user |
| `POST` | `/api/v1/auth/login` | Exchange credentials for a JWT |
| `POST` | `/api/v1/auth/refresh` | Rotate access token |
| `GET`  | `/api/v1/sectors` | List available sectors with metadata |
| `GET`  | `/api/v1/analyze/{sector}` | Analyse a sector — returns a full report |
| `POST` | `/api/v1/analyze/compare` | Rank 2-5 sectors on opportunity / risk |
| `GET`  | `/api/v1/history` | Paginated list of the user's saved analyses |
| `GET`  | `/api/v1/history/{id}` | Fetch a specific saved analysis |
| `GET`  | `/api/v1/history/{id}/export` | Export as `pdf`, `xlsx`, `pptx` or `md` |
| `DELETE` | `/api/v1/history/{id}` | Delete a saved analysis |
| `GET/POST/DELETE` | `/api/v1/favorites` | Manage favourite sectors |
| `GET/POST/DELETE` | `/api/v1/watchlists` | Manage sector watchlists |
| `GET`  | `/api/v1/alerts` | Inbox of material-change alerts |
| `GET`  | `/api/v1/market-data/{sector}` | Live NSE vitals + 12-month trend |
| `GET`  | `/api/v1/relative-strength/{sector}` | Sector vs Nifty 50 normalised series |
| `GET`  | `/api/v1/correlation-matrix` | 90-day pairwise correlations across NSE sectors |
| `GET`  | `/health` | Liveness probe |

Guest users (no JWT) can call `/analyze/{sector}` for two preset sectors (Technology, Pharmaceuticals). Everything else requires auth.

---

## Tech stack

### Backend — `app/`
- **FastAPI 0.115** · typed, async, OpenAPI-native
- **SQLAlchemy 2** · `aiosqlite` (dev) · `psycopg[binary]` (prod Postgres)
- **Auth** · `python-jose` · `bcrypt` · `passlib` · JWT with refresh tokens
- **LLM routing** · official `openrouter` Python SDK · `google-genai` for grounded research
- **Market data** · `yfinance` + `curl_cffi` for NSE indices
- **News + sentiment** · `duckduckgo-search` · `vaderSentiment`
- **Scheduler** · `APScheduler` — watchlist re-analysis cadence
- **Rate limiting** · `slowapi`
- **Exports** · `reportlab` (PDF) · `python-pptx` · `openpyxl` · `markdown`

### Frontend — `frontend/`
- **Next.js 14** (App Router) · **React 18** · **TypeScript 5**
- **Tailwind CSS** + **Radix UI** primitives
- **framer-motion** + **Lenis** (buttery smooth scroll)
- **Zustand** for state (no Redux ceremony)
- **Recharts** for sector charts
- **Inter** + **Instrument Serif** typography
- **react-markdown** for citation-chip rendering

### Infrastructure
- **Docker Compose** — backend + frontend + Postgres, one command up
- **SQLite fallback** — zero-setup local dev
- **Supabase** — production-friendly Postgres hosting

---

## Project structure

```
Trade_opportunity_ByAI/
├── app/                        # FastAPI backend
│   ├── main.py                 # Routes + app wiring
│   ├── config.py               # Pydantic settings
│   ├── database.py             # ORM models + CRUD classes
│   ├── auth.py                 # JWT + refresh token flow
│   ├── schemas.py              # Pydantic request/response models
│   ├── ai_analyzer.py          # Non-grounded Gemini fallback
│   ├── research_agent.py       # Grounded Gemini + google_search
│   ├── llm_router.py           # Multi-model routing + fallback chains
│   ├── diff_engine.py          # Material-change detection
│   ├── compare_service.py      # Multi-sector leaderboard
│   ├── market_data.py          # yfinance-backed NSE data
│   ├── data_collector.py       # DDG news + sentiment
│   ├── sentiment.py            # VADER wrapper
│   ├── worker.py               # APScheduler worker (watchlists)
│   ├── export_service.py       # PDF / PPTX / XLSX / MD renderers
│   ├── cache.py                # Per-user scoped analysis cache
│   └── notifications.py        # Alert delivery
│
├── frontend/                   # Next.js 14 app
│   ├── src/
│   │   ├── app/                # Routes (dashboard, results, compare, history, favorites, …)
│   │   ├── components/
│   │   │   ├── landing/        # Hero / Features / HowItWorks / Testimonials / CTA
│   │   │   ├── dashboard/      # Sidebar, SectorSearch, AnalysisReport, WatchButton
│   │   │   ├── results/        # ResultsComponents (charts, vitals, sentiment)
│   │   │   ├── animations/     # SmoothScroll · ScrollProgress · BorderBeam · Marquee · TextReveal
│   │   │   └── ui/             # Button, Card, Badge, Skeleton
│   │   ├── hooks/              # useAuth, useAnalysis, useFavorites
│   │   ├── store/              # Zustand store
│   │   └── lib/                # API client, utils
│   ├── tailwind.config.ts
│   └── package.json
│
├── reports/                    # Saved markdown reports (auto-created)
├── docker-compose.yml
├── Dockerfile                  # Backend image
├── frontend/Dockerfile         # Frontend image
├── requirements.txt
├── PITCH.md                    # Product story + investor pitch
├── ARCHITECTURE.md             # Technical deep-dive
├── ROADMAP.md                  # Prioritised backlog
└── readme.md
```

---

## Development

### Running the test flow locally

```bash
# 1. Backend up
docker compose up -d backend postgres

# 2. Verify
curl http://localhost:8000/health
# → {"status":"healthy","timestamp":"..."}

# 3. Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"username":"demo","email":"demo@example.com","password":"Demo@1234"}'

# 4. Run an analysis (guest mode works for technology / pharmaceuticals)
curl http://localhost:8000/api/v1/analyze/technology
```

### Hot-reload during dev

- **Backend** — `uvicorn app.main:app --reload` picks up changes instantly
- **Frontend** — `npm run dev` hot-reloads on save

### Common gotchas

| Symptom | Cause + fix |
|---|---|
| `Gemini unavailable (mock_mode)` in logs | `GEMINI_API_KEY` not set — add it to `.env` or rely on OpenRouter |
| DDG returns "Ratelimit" | Docker egress IP is shared with many users. The grounded Gemini path is unaffected; this is only a fallback path |
| Dashboard shows previous user's analyses | Cleared — see the cache-scoping fix; restart backend to wipe in-memory cache |
| `yfinance Failed to create TzCache` | Harmless — redirected to `/tmp/tradeinsight_yf_tz` on startup |

### Useful scripts

```bash
# Typecheck frontend
cd frontend && npx tsc --noEmit

# Lint frontend
cd frontend && npm run lint

# Re-seed DB locally (nukes SQLite file)
rm trade_opportunities_v2.db && uvicorn app.main:app --reload
```

---

## Deployment

The app runs anywhere that speaks Docker:

- **Backend image** — Python 3.11 slim, non-root user, 8000 exposed
- **Frontend image** — Next.js standalone, 3000 exposed
- **Postgres** — either the docker-compose service (dev) or an external managed Postgres (Supabase, Neon, RDS)

A typical production setup:

```
[ CDN / Vercel ]────► frontend (static + SSR)
[ Fly.io / Railway ]─► backend container
[ Supabase / Neon ]──► Postgres
[ Upstash ]──────────► Redis (optional, for distributed cache)
```

---

## Docs & links

- **Product pitch** — [`PITCH.md`](./PITCH.md)
- **Architecture deep-dive** — [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Roadmap** — [`ROADMAP.md`](./ROADMAP.md)
- **API docs** — run the backend, visit `/docs` or `/redoc`

---

## Contributing

This is a personal build right now. Issues and PRs welcome for:

- New sector mappings (NSE tickers)
- Additional export formats
- New persona templates
- Model-router entries as OpenRouter's free-tier catalogue changes

---

## License

MIT — see `LICENSE`.

---

## Credits

- **FastAPI** — https://fastapi.tiangolo.com/
- **Next.js** — https://nextjs.org/
- **OpenRouter** — https://openrouter.ai/
- **Google AI Studio** — https://ai.google.dev/
- **yfinance** — https://github.com/ranaroussi/yfinance
- **shadcn/ui** — inspiration for the UI primitives
- **Magic UI** — inspiration for BorderBeam and Marquee

---

<div align="center">

Built by [@mohdshubair](https://github.com/mohdshubair313) · [Twitter](https://x.com/Shubair313) · [LinkedIn](https://www.linkedin.com/in/mohd-shubair-b1a454250/)

_TradeInsight AI — because your sector view shouldn't take longer to produce than the decision it informs._

</div>
