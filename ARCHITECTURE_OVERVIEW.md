# TradeInsight AI — Full architecture overview, in plain English

## 1. The big picture

You built a web app that, when a user types a sector name like "textile" or "pharma," does live research on the web, asks an AI to write a structured analyst-style report, runs real market math (correlations, sentiment, capital flows), and shows it as a polished dashboard. Users can save analyses, get alerts, compare two sectors, export to PDF/XLSX/PPTX, and even chat with a voice agent.

Two halves talk to each other:

- **Backend** = FastAPI in Python. Does data fetching, AI calls, math, auth, exports.
- **Frontend** = Next.js + React. Pretty UI, charts, voice agent, payments.
- **Database** = Supabase Postgres. Stores users, refresh tokens, analyses, alerts, watchlists, favorites.
- **Glue** = Docker Compose runs backend + worker + frontend together.

---

## 2. Backend — FastAPI + Pydantic + SQLAlchemy

**What:** FastAPI is the web server that exposes REST endpoints (`/api/v1/analyze`, `/auth/refresh`, etc.). Pydantic validates every request/response. SQLAlchemy 2.0 talks to Postgres.

**Why:**
- FastAPI is async, fast, and gives free OpenAPI docs.
- Pydantic v2 catches bad input *before* it touches your code — fewer runtime crashes.
- SQLAlchemy + `psycopg[binary]` v3 lets you keep your code DB-agnostic (you migrated from SQLite → Supabase Postgres without rewriting models).

**Files:** `app/main.py` (routes), `app/database.py` (engine + session), `app/schemas.py` (Pydantic models), `app/auth.py` (JWT login).

**How you improved it:**
- Started on SQLite → swapped to Supabase Postgres for real production.
- Added refresh tokens + bcrypt password hashing.
- Fixed the *spontaneous-logout bug* in `auth.py:172` — Postgres was returning naive datetimes; you now normalize to UTC-aware before comparing, so `/auth/refresh` no longer 500s.

---

## 3. The AI brain — agentic LLM router

This is the most interesting part of your app. Instead of calling one LLM and praying, you built a smart router that picks the right model for the right job and falls back if it fails.

**Files:** `app/llm_router.py`, `app/research_agent.py`, `app/ai_analyzer.py`, `app/diff_engine.py`, `app/compare_service.py`.

**Models you use (and why each):**

| Model | Provider | Used for | Why |
|---|---|---|---|
| `gemini-2.5-flash` + `google_search` | Google | Live grounded research | Only Gemini exposes Google Search as a tool — gives real citations |
| Nemotron 120B | OpenRouter (free) | Diff/compare reports (huge context) | 1M context, great reasoning, costs ₹0 |
| Qwen3 Next 80B | OpenRouter (free) | Compare task primary | Strong at structured JSON |
| Llama 3.3 70B | OpenRouter (free) | Prose / fallback | Good prose, reliable |
| Hermes 405B | OpenRouter (free) | Long-form prose backup | Highest quality fallback |

**TaskProfiles** (`llm_router.py`):
- `diff` profile → tries Nemotron 120B → Qwen3 → Llama → Gemini
- `compare` profile → Qwen3 → Nemotron 30B → Llama → Gemini
- `prose` profile → Llama → Hermes → Nemotron 120B → Gemini

**The 4-tier fallback when a user asks for a sector report (`main.py`):**
1. Try **grounded Gemini** with `google_search` (real-time web research with citations).
2. If that fails → DDG search + Gemini analyzer.
3. If that fails → OpenRouter offline `prose` chain (no live web, but disclaims it).
4. Absolute last resort → mock report.

**Why this is "agentic":** the router *decides* per task which model to use, validates the JSON it gets back, and self-corrects by trying the next model in the chain. You consciously chose **not** to use LangChain/LangGraph yet — too heavy for a simple fallback chain. LangGraph is reserved for Sprint 6 multi-step workflows like "Explain this move."

**How you improved it:**
- Original code returned mock data on any failure → you made `ai_analyzer` *raise* errors instead, so `main.py` falls through to the offline chain. That fixed the "textile shows mock data" bug.
- Added a circuit breaker in `data_collector.py` (2 strikes on 429s and DDG is skipped) so you don't waste time retrying rate-limited search.

---

## 4. Real data, not just AI vibes

You wired actual market math so the app isn't "AI text + made-up numbers."

- **`yfinance` + `curl_cffi`** → pulls live NSE sector index data. `curl_cffi` is needed because Yahoo blocks plain Python requests; it impersonates Chrome's TLS fingerprint.
- **VADER (`vaderSentiment`)** → gives sentiment scores on news headlines without an extra API call.
- **Pearson correlation** (NumPy/manual) → computes a real correlation matrix across sector indices for the heatmap.
- **DuckDuckGo search (`duckduckgo-search`)** → free news scraper, fed into Gemini when grounded research isn't available.

Why these: all are free, no API keys needed, and run in Docker with no external dependencies.

---

## 5. Background work — scheduler + worker

**Files:** `app/worker.py`, `app/notifications.py`.

- **APScheduler `BlockingScheduler`** runs in a separate Docker container. Every X minutes it checks watchlists, computes deltas vs. the last analysis (`diff_engine.py`), and emails users if something changed.
- **Resend HTTP API** sends the email (no SMTP setup, no nodemailer, just an HTTP POST).

**Why a separate container:** keeps the API process lean. The scheduler doesn't block request handling.

---

## 6. Auth & payments

- **JWT + refresh tokens** (`python-jose`), bcrypt for passwords (`passlib`).
- **Razorpay** on the frontend for Pro-tier upgrades (`PricingCheckoutGrid.tsx`, `razorpay.d.ts`).
- **Rate limiter** (`slowapi`) on expensive endpoints.

---

## 7. Exports — multi-format reports

`app/export_service.py` + `app/report_generator.py`:
- **`reportlab`** → PDF
- **`openpyxl`** → XLSX
- **`python-pptx`** → PPTX

Why: all are pure-Python, no system dependencies (no LibreOffice, no Chromium). Plays nicely in Docker.

---

## 8. Frontend — Next.js 14 + Tailwind + Framer Motion

**Stack (`package.json`):**
- **Next.js 14 App Router** — file-based routing, SSR, RSC where it helps.
- **Tailwind CSS** — utility classes, no custom CSS files.
- **shadcn-style UI** built on **Radix primitives** (`@radix-ui/*`) for accessible dialogs, dropdowns, tabs.
- **Framer Motion** — animated headers, page transitions, the "Analysis" intro.
- **Recharts** — charts (sentiment bubbles, capital flows, trends, correlation heatmap).
- **Zustand** — lightweight global state (instead of Redux).
- **Axios** — HTTP client with response interceptors that auto-refresh JWTs.
- **react-markdown** — renders the AI reports with `[1]`, `[2]` citation chips.
- **Lenis** — silky smooth scroll on the landing page.
- **react-hot-toast** — toast notifications.

**Why this stack:** Next 14 + Tailwind + Radix is the modern default. Zustand instead of Redux because your global state is tiny (auth, favorites, current analysis). Framer + Lenis is what gives the app the "premium feel."

**Standout pages:**
- `app/page.tsx` — landing (Hero, Features, HowItWorks, Testimonials, CTA, Footer).
- `app/dashboard/page.tsx` — sector search.
- `app/results/page.tsx` — the analysis canvas: SectorVitals, AI Intelligence box, CapitalFlowChart, SentimentBubbles, CorrelationHeatmap, TrendProjection, AIOperatorStudio, full report.
- `app/voice/page.tsx` — voice agent (live waveform, conversation panel).
- `app/compare/page.tsx` — head-to-head sector comparison.

**Lazy loading:** all heavy chart components in `results/page.tsx` are `dynamic(... { ssr: false })`. That keeps the initial JS bundle small and avoids SSR hydration issues with Recharts/Framer.

---

## 9. Infrastructure — Docker Compose

Three services running together:
1. `backend` — FastAPI on uvicorn (with `--loop asyncio` because uvloop choked on Windows).
2. `worker` — APScheduler.
3. `frontend` — Next.js standalone build.

**Why Docker Compose:** one command (`docker compose up`) gives you the full stack on any machine, identical to prod.

---

## 10. How you improved the system over time (sprint timeline)

| Sprint | What you added | Why |
|---|---|---|
| 1 | Trust signals (citations, sources, disclaimers) | Users won't trust AI without proof |
| 2 | Real market data (yfinance, VADER, correlations) | Not just LLM vibes — actual math |
| 3 | Monetization (Pro tier, Razorpay) | Path to revenue |
| 4 | Pricing promise (faster reports, exports, watchlists) | Make Pro actually worth it |
| 5 | **Agentic LLM router + grounded research** | Different LLMs for different jobs; resilient fallbacks |
| 6+ | Sprint planned: "Explain this move," portfolio mode, voice brief, WhatsApp bot, OG cards (LangGraph for these) | Wow features for retention |

**Other improvements you made along the way:**
- Pinned all dependencies after multiple `httpx` / `pydantic` conflicts (locked to `httpx==0.28.1`, `pydantic==2.9.2`, `google-genai==1.60.0`, `openai==2.32.0`).
- Made `ThinkingConfig` conditional — only added when model starts with `gemini-3` (the `gemini-2.5-flash` default doesn't support it).
- Fixed SSR crash in `Sidebar.tsx` (moved `window.location.search` into `useEffect`).
- Refactored `compare_sectors` from blocking `asyncio.run()` into proper async/await.
- Removed unused Supabase JS client from frontend (was crashing without env vars).

---

## 11. The full request lifecycle (textile example)

1. User types "textile" on `/dashboard`, hits search.
2. Frontend `useAnalysis.ts` POSTs to `/api/v1/analyze`.
3. FastAPI validates with Pydantic, attaches the user from JWT.
4. `main.py` calls `research_sector("textile", persona=...)` → Gemini 2.5 Flash with `google_search`.
5. Gemini does live web research, writes the 7-section report, returns sources.
6. In parallel the backend pulls yfinance data for the textile index, runs VADER on news headlines, computes correlations.
7. Everything is bundled and saved to Postgres.
8. Frontend gets the response, lazy-loads chart components, renders the analysis canvas with markdown citations.
9. User clicks "Watch" → goes into watchlist table; the worker container will email them on changes.

---

## 12. Why this architecture is good

- **Resilient:** 4-tier AI fallback, circuit breaker on rate limits, refresh-token retries.
- **Cheap:** OpenRouter free models + Gemini free tier mean LLM costs are near ₹0.
- **Modular:** swapping a model = changing one entry in `CATALOGUE`. Swapping a DB = changing one URL.
- **Honest:** real market math, real news, real citations — not just LLM hallucinations.
- **Premium feel:** Framer + Lenis + Tailwind + lazy charts make it feel fast and polished.

The core insight in your design is the **agentic router with grounded research as primary and OpenRouter free tier as a deep fallback bench** — that's what separates this from a typical "ChatGPT wrapper" app.
