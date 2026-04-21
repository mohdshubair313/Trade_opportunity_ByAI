# TradeInsight AI — Product Roadmap & Gap Analysis

> A prioritized map of what's built, what's broken, what's worth building next, and how to actually ship it.

---

## 1. Executive summary

TradeInsight AI is a FastAPI + Next.js app that turns a sector name into a Gemini-generated markdown report, backed by DuckDuckGo news scraping. The core pipeline works end-to-end. The product **looks** polished but has two credibility holes and no monetizable "moat" — every LLM wrapper looks like this from the outside.

**The strategic problem:** "Type sector, get essay" is a weekend project in buyers' eyes. To make people pay, the product needs (a) verifiable real data, (b) automation that runs without the user, and (c) personalization per persona.

This doc is organized by priority — fix the broken trust signals first, then build the paid-tier hooks, then the wow features.

---

## 2. What's already built and working


| Area | Status | Notes |
|------|--------|-------|
| Auth (register / login / refresh / logout) | ✅ Working | JWT with refresh tokens, rate-limited |
| Sector analysis pipeline | ✅ Upgraded (grounded) | Gemini 2.5 Flash with `google_search` grounding tool fetches full articles; DDG path kept as fallback. 7-section report with stock picks + now-vs-future timing + cross-sector impact |
| History (list, get by id, delete) | ✅ Working | Paginated, user-scoped |
| Favorites CRUD | ✅ Working | Local-first, syncs when authenticated |
| Guest mode | ✅ Working | Hardcoded to "technology" & "pharmaceuticals" |
| Tier-based monthly limits | ✅ Working | free=5, pro=100, enterprise=∞ |
| Rate limiting | ✅ Working | SlowAPI, configurable |
| Landing page (Hero, Features, Testimonials, CTA, Footer) | ✅ Working | Display-only |
| Dashboard | ✅ Working | SectorSearch, stats cards, recent analyses, live sector catalog from `/api/v1/sectors` |
| Results page | ✅ Working | All 5 cards render real data: SectorVitals, TrendProjection, SentimentBubbles, Relative Strength (vs Nifty), Sector Correlations heatmap |
| Settings `/settings` | ✅ Working | Profile + password + subscription summary; wired to `/users/me` endpoints |
| Contact `/contact` | ✅ Working | Split-screen form → `POST /api/v1/contact` persists to `contact_messages` |
| Citations in reports | ✅ Working | Gemini emits `[N]`; frontend renders citation chips + numbered Sources block |
| Market data layer | ✅ Working | `/sectors/{s}/market-data` + `/sectors/{s}/news` (yfinance + VADER), 5-min cache |
| Watchlists + alerts | ✅ Working (in-app + email) | CRUD endpoints, tier slot limits, APScheduler worker, Gemini diff, Resend email delivery. WhatsApp still an open slot |
| Background worker | ✅ Working | Separate `worker` service in docker-compose, scans every 120s in prod (10s in dev) |
| Multi-sector compare | ✅ Working | `/compare` page with parallel fetches; scored by routed LLM chain (Qwen3 Next 80B / Nemotron 30B / Llama 70B / Gemini), 2-5 sectors, racing bars |
| Agentic LLM router | ✅ Working | `app/llm_router.py` — per-task fallback chains across OpenRouter (Qwen3 Next 80B, Nemotron 120B/30B, Llama 70B, Hermes 405B) + Gemini Flash. DiffAgent & CompareAgent route through it |
| Exports (PDF / XLSX / PPTX / MD) | ✅ Working | `/history/{id}/export`, pure-Python render. PPTX is Pro-gated |
| Personas | ✅ Working | 5 personas in /settings, Gemini prompt branches per reader context |
| In-memory analysis cache | ✅ Working | TTL-based, stats endpoint |
| Report save to disk | ✅ Working | `reports/{sector}_{timestamp}.md` |
| Database | ✅ Supabase Postgres | Migrated from SQLite; 5 tables live via `psycopg` v3 pooler connection |
| Docker compose (backend + frontend) | ✅ Working | `docker compose up` brings both up; uvicorn runs with `--loop asyncio` |

---

## 3. Critical gaps — fix these first (credibility killers)

These don't add features; they stop the product from looking dishonest.

### 3.1 Fake charts on `/results`  ✅ RESOLVED (Sprint 1 + 2)
**File:** `frontend/src/components/results/ResultsComponents.tsx`

`SectorVitals`, `CapitalFlowChart`, `TrendProjection`, `CorrelationHeatmap`, `SentimentBubbles` all render data seeded from `sector.length` / `Math.sin()`. Every refresh shows the same fake numbers. A trader will spot this in 10 seconds.

**Fix:** Either (a) wire each component to a real data endpoint, or (b) remove them from the page until they're real. Option (a) is covered in §4.1.

**What was implemented:**
- Sprint 1 replaced all five mock-seeded components with a shared `ComingSoonCard` that describes what each card will show once its data source lands. No fake numbers ship to the user.
- Sprint 2 upgraded three of the five to real data:
  - `SectorVitals` → live NSE index close, day change, day range, 52-week high/low, volume, and Nifty 50 benchmark, pulled from `GET /api/v1/sectors/{sector}/market-data` (yfinance-backed).
  - `TrendProjection` → recharts area chart of 12 months of monthly closes with a computed total-change badge (green when up, red when down).
  - `SentimentBubbles` → real news articles with VADER sentiment chips and a card-level average score; each item links to the source.
- `CapitalFlowChart` (needs NSE bhavcopy FII/DII ingestion) and `CorrelationHeatmap` (needs multi-sector returns matrix) stay as honest "coming soon" cards until their data pipelines are built.

### 3.2 Dead `/contact` route  ✅ RESOLVED (Sprint 1)
**File:** `frontend/src/app/pricing/page.tsx` (Enterprise CTA)

Enterprise "Contact Sales" links to `/contact`, which returns 404.

**Fix:** Create `frontend/src/app/contact/page.tsx` with a simple form POSTing to a `/api/v1/contact` endpoint (or a `mailto:`). Backend endpoint can just log + email via SendGrid/Resend.

**What was implemented:**
- Added `ContactMessage` SQLAlchemy model + `ContactCRUD` (fields: name, email, company, plan_interest, message, created_at).
- Added `ContactRequest` / `ContactResponse` Pydantic schemas with email validation and 10–2000 char message bounds.
- New rate-limited endpoint `POST /api/v1/contact` (5/min) that persists to Supabase and logs the inbound email for ops.
- New `/contact` page — split-screen layout matching `/login`, plan selector (free / pro / enterprise), client-side validation, success state showing the email we'll reply to, and a `mailto:` fallback link.
- New `submitContact()` helper in `frontend/src/lib/api.ts`.
- Enterprise CTA on `pricing/page.tsx` now resolves to a working route. End-to-end verified — submission created row id=1 in `contact_messages`.

### 3.3 PDF / Excel export is promised, not built  ✅ RESOLVED (Sprint 4, together with §4.4)
**File:** `frontend/src/components/dashboard/AnalysisReport.tsx:42–54`

`handleDownload` only emits a `.md` Blob. Pricing page advertises PDF + Excel.

**Fix:** See §4.4 for implementation.

**Status:** Resolved together with §4.4 — see that section for implementation details.

### 3.4 Settings / profile UI missing  ✅ RESOLVED (Sprint 1)
Backend endpoints exist (`PUT /api/v1/users/me`, `POST /api/v1/users/me/change-password`) but no UI.

**Fix:** Create `frontend/src/app/settings/page.tsx` with a simple form using existing `updateProfile()` and `changePassword()` from `lib/api.ts`.

**What was implemented:**
- New `/settings` route with its own layout (sidebar + main pane) matching the results page chrome.
- Four section cards: **Account** (edit full name + email, username read-only), **Password** (current + new + confirm with strength rules matching backend validators), **Subscription** (plan, status, member-since, "Contact Sales" button that routes to `/contact`), **Session** (sign out via `useAuth().logout`).
- Redirects to `/login` if the user is not authenticated; shows a centred spinner while the profile loads.
- Inline error messages from backend validation are surfaced next to each form.
- Sidebar "Settings" nav entry repointed from `/dashboard?view=settings` to `/settings`.

### 3.5 Frontend hardcodes sectors list  ✅ RESOLVED (Sprint 1)

**File:** `frontend/src/lib/api.ts:342–363`

`POPULAR_SECTORS` is a hardcoded array; the backend already has `GET /api/v1/sectors` with icons + descriptions.

**Fix:** Replace hardcoded constant with a call to `getAvailableSectors()` in the dashboard's popular-sectors grid. 5-minute change.

**What was implemented:**
- Dashboard now fetches `GET /api/v1/sectors` on mount and stores the richer `SectorInfo[]` (name + icon + description) in local state.
- Popular-sectors grid renders each sector's real emoji icon (e.g. 💻 for Technology, 💊 for Pharmaceuticals) and uses the description as a hover tooltip.
- "Sectors Available" stat card reflects the live count from the API.
- `POPULAR_SECTORS` constant kept only as a seeded fallback — if the API call fails, the UI still renders with the old list instead of breaking.

---

## 4. Feature opportunities — ranked by revenue impact

### 4.1 Real market data layer 🔴 **critical**  ✅ RESOLVED (Sprints 2 + 5)

**Why it matters:** Without real data, every chart is a liability. With real data, the charts become evidence and the report becomes actionable.

**What to build:**
- New module `app/market_data.py` that fetches:
  - NSE/BSE sector indices (use `nsepython` or `jugaad-data` — free, no API key)
  - Top gainers / losers per sector
  - FII/DII flows (daily, from NSE bhavcopy)
  - Sector-level P/E, P/B from screener.in scrape or `yfinance`
- New endpoint: `GET /api/v1/sectors/{sector}/market-data` → JSON for charts
- New endpoint: `GET /api/v1/sectors/{sector}/news` → list of `{title, url, published_at, sentiment_score}` with real timestamps
- Store in a new SQLite table `market_snapshots` with `sector`, `captured_at`, `data (JSON)` so charts have history
- Add a sentiment scorer (VADER or a cheap Gemini call per headline batched) so `SentimentBubbles` shows real topics from recent news
- Frontend: replace mock generators in `ResultsComponents.tsx` with `useQuery` (or SWR) calls to the new endpoints

**Effort:** 3–5 days. **Biggest credibility unlock in the product.**

**What was implemented:**
- New module `app/market_data.py` — maps user-facing sector names to NSE tickers (`^CNXIT`, `^CNXPHARMA`, `^NSEBANK`, `^CNXAUTO`, `^CNXFMCG`, `^CNXMETAL`, `^CNXENERGY`, `^CNXINFRA`, `^CNXREALTY`, `^CNXMEDIA`, `^CNXFIN`, `^CNXPSUBANK`) and pulls live OHLCV from yfinance 1.3.0.
  - Returns `status: ok | unavailable` payload with `vitals` (close / change / range / volume), `benchmark` (Nifty 50 same-day), `fifty_two_week` (52w high/low), `trend` (12 monthly closes), `captured_at`, and a human-readable `reason` on failures.
  - 5-minute in-process TTL cache keyed by normalised sector name to keep yfinance latency off the user.
- New module `app/sentiment.py` — lazy VADER analyzer wrapped in `score_text()` / `score_many()` + a coarse `label_for()` bucket (bullish ≥ +0.25, bearish ≤ −0.25, neutral otherwise). No network calls; VADER lexicon only.
- Extended `app/data_collector.py` with `search_news_articles()` that calls DDGS `news()` (more reliable than the `text()` endpoint) and scores each item before returning `{title, body, url, source, published_at, sentiment_score, sentiment_label}`.
- Also added a `ddgs.news()` fallback path inside the existing `search_sector_news()` used by the analyze pipeline — DDG text search was returning 0 results for some queries; news fallback fills the gap.
- Two new rate-limited endpoints in `main.py`:
  - `GET /api/v1/sectors/{sector}/market-data` (30/min)
  - `GET /api/v1/sectors/{sector}/news?limit=` (30/min, 1–25)
- Frontend `api.ts` got `MarketDataResponse` / `NewsResponse` types and `getMarketData()` / `getSectorNews()` helpers.
- Rebuilt `ResultsComponents.tsx` with two shared hooks (`useMarketData`, `useSectorNews`) and real recharts-driven visuals for three of the five cards. Each card has loading / unavailable / success states instead of always-pretending-to-work.
- Verified live: Technology = close 31,809.85 / day change -0.02%; Pharmaceuticals = close 22,497.25 / day change +0.14%; news endpoint returned real MSN / Economic Times articles with VADER scores in the ±0.7 range.

**Sprint 5 closed the remaining gaps:**
- **`CorrelationHeatmap`** now renders real data. New endpoint `GET /api/v1/sectors/correlations` fetches 3 months of daily closes for all 10 mapped NSE sector indices, computes pct returns, and returns a Pearson correlation matrix. Result is cached server-side for 6 hours (matrix barely moves intraday). Frontend renders a 10×10 grid with green/red intensity-scaled cells and a hover tooltip showing the exact coefficient. Verified live: IT/Bank 0.281, IT/Pharma 0.315 — realistic spread.
- **`CapitalFlowChart`** replaced with an honest **Relative Strength** chart. The original goal (FII/DII split) requires NSE bhavcopy access which is brittle and frequently blocks non-browser scrapers. The real question the card was meant to answer is *"is capital flowing into this sector?"* — which is identical to *"is this sector outperforming the benchmark?"*. New endpoint `GET /api/v1/sectors/{sector}/relative-strength` returns 6 months of sector-index and Nifty-50 closes both normalised to 100 at the start, plus a headline outperformance number. Frontend renders a dual-line recharts chart with a green "▲ X pts vs Nifty" badge (or red ▼). Verified: banking returned +3.29 pts outperformance with 121 daily data points.
- `market_snapshots` persistence table — still deferred. yfinance gives us live history on demand and no current feature needs our own stored baseline.

### 4.2 Watchlist + scheduled re-analysis + alerts 🟢 **paid-tier hook**  ✅ RESOLVED (Sprints 3 + 5)

**Why it matters:** One-shot reports are a free feature. "Tell me when something changes" is a recurring-revenue feature. This is the single most important thing to convert free → paid.

**What to build:**

Backend:
- New table `watchlists`: `id`, `user_id`, `sector`, `cadence` (hourly/daily/weekly), `channels` (email/whatsapp/in-app), `created_at`.
- New table `alert_events`: `id`, `user_id`, `sector`, `summary`, `delta_score`, `triggered_at`, `seen_at`.
- Background worker: add `apscheduler` or a separate `worker` service in `docker-compose.yml`. Runs every 15min, picks watchlists whose `next_run_at` has passed, re-runs analysis, diffs against previous report.
- Diff logic: a second Gemini call — "Given yesterday's report and today's report, flag material changes. Return JSON: {changed: bool, headline: str, direction: up/down/neutral, confidence: 0-1}." Only trigger an alert if `changed && confidence > 0.6`.
- Delivery: email via Resend/SendGrid, WhatsApp via Gupshup (cheap in India) or Twilio, in-app via a `GET /api/v1/alerts` endpoint.

Frontend:
- "Watch this sector" button on results page → opens modal for cadence + channel.
- `/dashboard/alerts` page listing unseen alerts.
- Settings → notification preferences.

**Effort:** 1 week. **This is the monetization engine.**

**What was implemented:**
- Two new Supabase tables: `watchlists` (id, user_id, sector, cadence, channels, last_run_at, next_run_at, is_active, created_at) and `alert_events` (id, user_id, watchlist_id, sector, headline, direction, confidence, summary, analysis_id, triggered_at, acknowledged_at). Full SQLAlchemy models + `WatchlistCRUD` / `AlertCRUD` helpers in `app/database.py`.
- Five new rate-limit-aware endpoints in `main.py`: `POST/GET/DELETE /api/v1/watchlists`, `GET /api/v1/alerts`, `POST /api/v1/alerts/{id}/acknowledge`. Tier-based slot enforcement (`free=1, pro=20, enterprise=∞`), duplicate-sector prevention, sector-name sanitisation matching the analyze endpoint.
- New `app/diff_engine.py` — Gemini-based material-change detector. Calls Gemini 3 Flash with `response_mime_type: application/json` + `thinking_level: minimal` + 2048 max output tokens to force valid structured JSON. Returns `DiffVerdict(changed, headline, direction, confidence, summary)`. Keyword-heuristic fallback kicks in when Gemini is in mock mode / rate-limited / returns bad JSON, so alerts never stall on upstream hiccups.
- New `app/worker.py` — APScheduler `BlockingScheduler` that scans for due watchlists every `WORKER_SCAN_INTERVAL` seconds (120s by default, 10s in dev). Per due item: re-runs the full analysis pipeline, writes a fresh `Analysis` row, refreshes the shared cache, calls `diff_reports()`, and writes an `AlertEvent` when `changed && confidence ≥ WORKER_ALERT_THRESHOLD` (default 0.6). Advances `last_run_at` / `next_run_at` regardless of outcome so a bad row can't busy-loop. Graceful SIGTERM/SIGINT handling.
- New `worker` service in `docker-compose.yml` — reuses the backend image with `command: python -m app.worker`, depends on backend being healthy, loads the same `.env`, env-configurable scan interval + alert threshold.
- Frontend `lib/api.ts`: added `WatchlistItem`, `WatchlistsResponse`, `AlertItem`, `AlertsResponse` types + `listWatchlists()`, `createWatchlist()`, `deleteWatchlist()`, `listAlerts()`, `acknowledgeAlert()` helpers.
- New `WatchButton.tsx` on the results page header: toggles between "Watch sector" (with cadence + channel modal) and "Stop watching", checks slot availability, handles auth gating, shows tier-limit tooltip when slots are full.
- New `/alerts` route with its own sidebar layout: two sections — **Your watchlists** (list with cadence, next-run time, open/remove actions, slot counter) and **Alerts** (unread-only by default, toggleable to "Show all", with direction icon + confidence pill + "Mark seen" action).
- Sidebar now has an "Alerts" nav item with a live unread badge (polls `/api/v1/alerts?limit=1` every 60s). Badge shows the number (capped at "9+") in both expanded and collapsed sidebar states.

**Verified end-to-end:** Registered fresh user `s3_watcher` → created watchlist on "automotive" → forced `next_run_at` due → worker picked it up within one 10s tick → Gemini diff returned clean JSON → alert row fired: *"Indian Automotive Sector Hits Record 2.83 Crore Units in FY26 Amid Surge in PE Investment"*, direction=up, confidence=1.0. `GET /api/v1/alerts` returned it with `unread=1`.

**Sprint 5 closed the remaining gaps:**
- **Email delivery** is shipped. New `app/notifications.py` defines a `Notifier` protocol and a `ResendEmailNotifier` that posts to `https://api.resend.com/emails` over `httpx` (no extra SDK). Worker builds the notifier registry at startup via `build_notifiers()` — if `RESEND_API_KEY` + `ALERT_FROM_EMAIL` are set, the `email` channel delivers outbound; otherwise it's a logged no-op so no watchlist ever stalls on missing credentials. The email template is a mobile-friendly HTML card with the headline, direction badge, confidence %, summary, and a CTA back to `/alerts` (link auto-built from `PUBLIC_APP_URL`).
- `_dispatch_alert()` in `app/worker.py` fans each fired AlertEvent out to every channel the watchlist opted into, skipping `in_app` (already covered by the DB write) and gracefully catching per-channel failures so one broken transport can't take down a tick.
- `.env` gained commented-out `RESEND_API_KEY` / `ALERT_FROM_EMAIL` / `PUBLIC_APP_URL` examples; docker-compose's `worker` service now forwards those same vars through.
- **WhatsApp** (Gupshup / Twilio) — still deferred; it's an additional `Notifier` subclass implementing the same protocol, trivial to add once an account is created.
- **Global notification preferences in `/settings`** — still deferred. The per-watchlist channel picker covers the core flow. A global "always-on" preferences panel is nice-to-have UX but not required.

### 4.3 Personalized playbooks (persona-aware reports) 🟡 **differentiation**  ✅ RESOLVED (Sprint 4)

**Why it matters:** A generic Gemini report is commodity. The same data filtered through "I am an exporter with ₹50L capital looking at EU markets" is bespoke-feeling and much stickier.

**What to build:**
- Extend `users` table: `persona` (enum: investor / exporter / sme_owner / student / consultant), `capital_range`, `region`, `risk_appetite`.
- Onboarding flow after first login: 3 questions, 30 seconds.
- `ai_analyzer.py`: branch system prompt by persona. Exporters see HS codes, port logistics, FX hedging; investors see entry/exit levels, P/E vs. peers; students see citation-heavy case-study framing.
- Same Gemini call cost, radically different feel.

**Effort:** 2–3 days. Very high ROI for the effort.

**What was implemented:**
- Four new nullable columns added to `users`: `persona`, `capital_range`, `region`, `risk_appetite`. Forward-only migration added to `init_db()` runs idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on Postgres so existing Supabase rows upgrade cleanly.
- `UserUpdate` / `UserResponse` schemas extended with the new fields + strict enum validators (`PERSONA_VALUES`, `CAPITAL_VALUES`, `RISK_VALUES`).
- `AIAnalyzer.analyze_sector()` now accepts an optional `persona` dict and prepends a `READER CONTEXT:` framing block before the main prompt. Five persona frames are defined:
  - **Investor** — entry/exit zones, P/E vs peers, stop-loss framing, tickers in recommendations.
  - **Exporter** — HS codes, target countries, tariffs / FTA, port logistics, FX, RoDTEP / PLI hooks.
  - **SME owner** — capital, break-even, local demand, supplier ecosystem, 0-6-12 month checklist.
  - **Student** — market sizing methodology, Porter's five forces, citation-heavy, academic tone.
  - **Consultant** — executive framing, 2x2 matrices, slide-ready structure, three strategic pillars.
- `main.py` analyze endpoint threads `current_user`'s persona fields into the analyzer when they're set.
- Frontend: added a "Your analysis lens" section card on `/settings` — 5-button persona picker + capital range select + region text field + risk-appetite select. A soft onboarding banner appears on `/dashboard` when an authenticated user has no persona set yet, with "Set up" (→ /settings) and "Later" actions.
- Verified: `PUT /api/v1/users/me` with `persona=investor, capital_range=5L_50L, region=Maharashtra, risk_appetite=medium` persists and round-trips on `GET /users/me`.

### 4.4 Real PDF / Excel / PPT export 🟡 **pricing-page promise**  ✅ RESOLVED (Sprint 4)

**Why it matters:** Pricing advertises these. Delivering it closes the honesty gap and is a common B2B buying criterion.

**What to build:**
- PDF: `weasyprint` or `reportlab` in backend; new endpoint `GET /api/v1/analyze/{sector}/export?format=pdf`. Render report markdown → styled HTML → PDF.
- Excel: `openpyxl` — dump sector metrics, news table, recommendations into sheets. Only unlocks for pro tier.
- PPT: `python-pptx` — template-driven deck with branded title slide, one slide per report section. This is the killer for consultant persona.
- Frontend: replace `handleDownload` with a format picker (MD / PDF / Excel / PPT).

**Effort:** 3 days. **The PPT export is a unique selling point for the consultant persona.**

**What was implemented:**
- New `app/export_service.py` — pure-Python generator for all three formats so the Dockerfile stays on `python:3.11-slim` without extra apt packages. Picked `reportlab` over `weasyprint` to avoid cairo / pango system deps.
- Shared markdown parser extracts sections (H2 heads, H3 subs, bullets, paragraphs), strips `[N]` citations and markdown emphasis so exports stay clean.
- **PDF** (reportlab): A4 pages with brand-green title, metadata line, per-section styling, bulleted lists, and a final `Sources` page listing every cited URL.
- **XLSX** (openpyxl): four sheets — Overview (metadata), Summary (one row per H2 with joined key points), Sources (numbered with snippets), Raw Markdown (full fidelity dump).
- **PPTX** (python-pptx): 16:9 deck with branded title slide, one slide per H2 section (up to 12 to keep decks skimmable), plus a Sources slide with clickable URLs.
- New endpoint `GET /api/v1/history/{analysis_id}/export?format=pdf|xlsx|pptx|md`. Rate-limited 20/min. Sources for the current analysis are pulled from the warm cache when available.
- **Tier gating:** PPTX returns 402 for `free` tier users with a "PPTX is a Pro feature" message — it's the deliberate upsell hook for the consultant persona.
- Frontend `lib/api.ts`: `exportAnalysis(analysisId, format)` returns a Blob.
- `AnalysisReport.tsx`: single Download button replaced with a dropdown showing all four formats, individual per-format spinners, a "Pro" badge on PPTX, and toast confirmation.
- Verified end-to-end: PDF=7277 bytes, XLSX=11271 bytes both `HTTP 200`; PPTX returned `HTTP 402` on free tier with the upsell message.

### 4.5 Multi-sector comparison mode 🟡 **demo-friendly**  ✅ RESOLVED (Sprint 4)

**Why it matters:** Shows AI capability visually. Great for screenshots on Twitter/LinkedIn.

**What to build:**
- Endpoint: `POST /api/v1/analyze/compare` with body `{sectors: ["tech", "pharma", "fintech"]}`.
- Backend uses `asyncio.gather` to run the three analyses in parallel, then a final Gemini call produces a leaderboard: opportunity_score, risk_score, capital_required, time_to_ROI.
- Frontend: a `/compare` page with 3 search boxes → animated racing-bar chart of scores + a merged insights card.

**Effort:** 2 days.

**What was implemented:**
- New `app/compare_service.py` — async `compare_sectors()` that fans out per-sector fetches via `asyncio.gather(loop.run_in_executor(...))` so 3-5 sectors are scored in roughly the time of the slowest one. Each payload carries average news sentiment, top headlines, live yfinance day change, 12-month trend %, and volume.
- Gemini call uses `response_mime_type: application/json` + `thinking_level: minimal` to return a strict leaderboard shape `{scores, winner, headline}`. Deterministic heuristic fallback (sentiment + 1y return + day change) keeps the endpoint useful when Gemini is unavailable or returns bad JSON.
- New endpoint `POST /api/v1/analyze/compare` (rate-limited 10/min). Accepts 2-5 sectors; sanitises names the same way `analyze_sector` does. Guest mode restricted to Technology + Pharmaceuticals only, authenticated users can compare anything.
- `CompareRequest` / `CompareResponse` / `CompareSectorScore` schemas added.
- Frontend `lib/api.ts`: `compareSectors()` helper + types.
- New `/compare` route: 5-slot sector picker (chip UI with keyboard Enter support + quick-add suggestions), runs the comparison, shows a winner banner, two racing-bar leaderboards (opportunity + risk), and per-sector insight cards with top opportunity / top risk pulled from the Gemini output. Each card links through to the full `/results` view.
- Sidebar now has a "Compare" nav item.
- Verified: banking vs automotive vs pharmaceuticals — banking won with opp=74.3 / risk=32.5 vs pharma at opp=52.7 / risk=50.0.

### 4.6 Citations with clickable sources 🟡 **trust signal**  ✅ RESOLVED (Sprint 2)

**Why it matters:** Right now the report is a wall of text with no provable provenance. Adding `[1]`, `[2]` style inline citations that link back to the news article elevates perceived rigor 10x.

**What to build:**
- In `ai_analyzer.py`, pass numbered sources to Gemini and prompt it to cite: "When you make a claim, cite with [N]. At the end, list sources."
- Frontend: parse `[N]` in markdown and render as hover tooltips showing headline + link.

**Effort:** 1 day.

**What was implemented:**
- Updated Gemini prompt in `ai_analyzer.py` with strict citation rules: each numbered item in the passed-in market data is a source, and claims derived from a source must cite with `[N]`. Prompt explicitly forbids invented numbers and a duplicate "References" section (the renderer generates that from the same numbered list).
- New `AnalysisSource` Pydantic schema: `{n, title, url, snippet}`. `AnalysisResponse.sources` is a list of these, built in `main.py` from the raw search results (1-indexed, only items with a URL).
- Source list is cached alongside the report and re-served on cache hits.
- Frontend `api.ts` got `AnalysisSource` type; `AnalysisReport.tsx` now:
  - Pre-processes the report string with a regex that rewrites each `[N]` into a markdown link to `#src-N` when the source exists.
  - Renders those links as styled citation chips (small pill, `align-super`, opens source URL in a new tab with the source title as the tooltip).
  - Appends a numbered "Sources (N)" block at the bottom of the report with anchor ids matching the chip targets.
- Verified live: pharmaceuticals analysis produced 10 sources and 41 inline `[N]` tags covering all 10 source numbers. Example context: *"...to a global hub for innovation, biologics, and biosimilars [1][10]"*.

---

## 5. "Wow" features for demos / marketing

Pick one or two for the demo, not all.

### 5.1 "Explain this move" (Gemini Vision)
Upload a chart screenshot or paste a date range. Backend pulls news from that window + sector prices, sends to Gemini Vision along with the image. Output: 3 bullets of causal explanation.

Why it demos well: everyone has wondered why a stock moved. Instant answer with citations is magical.

### 5.2 Voice briefs (90-sec audio)
Generate a short audio summary of any report using ElevenLabs or Gemini TTS. Users listen during commutes. Highly shareable on WhatsApp/Twitter.

### 5.3 Auto-generated shareable cards (OG image endpoint)
`GET /api/v1/share/{analysis_id}/og.png` renders a branded card (sector, top insight, logo) via `playwright` or `@vercel/og`. Every share becomes distribution.

### 5.4 WhatsApp bot
Let users message a number with `/analyze pharma` and receive the summary in-chat. India-specific. High retention. Twilio or Gupshup.

### 5.5 "Portfolio mode" for investors
User enters holdings; every report tells them how the sector news affects *their* stocks specifically. This is the investor persona's killer feature.

---

## 6. Positioning — pick ONE persona first

Trying to serve everyone dilutes everything. Pick one and design the next month around them.

| Persona | Pain | Killer feature | Willingness to pay |
|---------|------|---------------|---------------------|
| **MSME exporters** | "Which countries want my product?" | HS-code opportunity finder + tariff data (WTO API free) | ₹1–2k/mo, sticky |
| **Retail investors** | News overload, FOMO | Watchlist + daily brief + portfolio-aware alerts | ₹300–500/mo, huge TAM |
| **B-school / CFA / UPSC students** | Need cited sector reports | PDF/Word export with proper references | ₹200/mo or one-time, small TAM |
| **Indie consultants / analysts** | Bill hourly for sector decks | One-click PPT export, white-label | ₹2–5k/mo, highest ARPU |

**Recommendation:** Start with **retail investors** (biggest TAM, WhatsApp alerts are a natural fit in India) or **consultants** (highest ARPU, PPT export is the sharp tool). Exporters are a legitimate niche but need more data sources to be real.

---

## 7. Step-by-step sprint plan

### Sprint 1 — Earn trust (week 1)  ✅ SHIPPED
Goal: Remove every dishonest/broken surface. Ship a version you can show without caveats.

1. ✅ Replaced mock-seeded charts in `ResultsComponents.tsx` with honest "Live data soon" placeholders (superseded in Sprint 2 for 3 of 5).
2. ✅ `frontend/src/app/contact/page.tsx` + `POST /api/v1/contact` endpoint — writes to `contact_messages` table in Supabase, rate-limited 5/min.
3. ✅ `frontend/src/app/settings/page.tsx` — profile edit, password change, subscription summary, sign out; sidebar link updated.
4. ✅ Dashboard now calls `getAvailableSectors()` for both the stat card count and the popular-sectors grid (with real emoji icons).
5. ⚠️ Error boundaries / empty states: partial — settings redirects unauth'd users, results page has retry on error, chart cards handle unavailable data. Global error boundary not yet added.
6. ⏭️ Demo-seed script not done; deferring until alerts (§4.2) since we'll want to seed historical analyses alongside baseline alert data.

Bonus landed in Sprint 1 (not originally listed):
- Migrated backend from SQLite to Supabase Postgres (via `psycopg[binary]` v3 pooler). 5 tables live: `users`, `analyses`, `favorite_sectors`, `refresh_tokens`, `contact_messages`. `DATABASE_URL` read from `.env`; `app/database.py` auto-picks pooling strategy per dialect.
- Fixed SSR crash on `/results` caused by `Sidebar.tsx` reading `window.location.search` during render.
- Fixed backend Docker boot failure (`duckduckgo-search 4.x` + uvloop conflict) by running uvicorn with `--loop asyncio`.

### Sprint 2 — Real data + citations (week 2)  ✅ SHIPPED
Goal: Charts stop being fake. Report stops being a wall of text.

1. ✅ `app/market_data.py` with yfinance-backed sector indices + 5-min cache + sector→ticker map for 12 NSE indices.
2. ✅ `GET /api/v1/sectors/{sector}/market-data` and `GET /api/v1/sectors/{sector}/news` endpoints shipped, both rate-limited 30/min.
3. ✅ Rebuilt `ResultsComponents.tsx` — `SectorVitals`, `TrendProjection`, `SentimentBubbles` now use real data with recharts. `CapitalFlowChart` + `CorrelationHeatmap` stay as placeholders until their upstream pipelines exist.
4. ✅ `ai_analyzer.py` prompt updated with strict `[N]` citation rules tied to numbered source list.
5. ✅ `AnalysisReport.tsx` renders citations as clickable chips + appends a numbered "Sources" block at the end of every report.
6. ✅ VADER sentiment via new `app/sentiment.py`. Scored per article; aggregate score shown as a card-level badge on `SentimentBubbles`.

**Verified end-to-end:** pharmaceuticals analysis → 10 cited sources → 41 inline `[N]` tags → real news URLs open on click. Technology market-data call returned live NSE IT index at 31,809.85 with -0.02% day change.

### Sprint 3 — Monetization engine (week 3)  ✅ SHIPPED (delivery layer deferred)
Goal: Users can sign up for alerts. Paid tier has a real reason to exist.

1. ✅ New tables `watchlists` + `alert_events` live in Supabase, full CRUD helpers.
2. ✅ `POST/GET/DELETE /api/v1/watchlists`, `GET /api/v1/alerts`, `POST /api/v1/alerts/{id}/acknowledge`.
3. ✅ New `worker` service in `docker-compose.yml` running APScheduler. Verified end-to-end: forced-due watchlist → worker re-analyzed → Gemini diff → alert row created in DB.
4. ⏭️ Email / WhatsApp delivery deferred. Need Resend and/or Gupshup API keys; once provided, one `_dispatch()` call in `worker.py` sends alerts outbound. In-app channel ships today via `/api/v1/alerts`.
5. ✅ "Watch sector" button + cadence/channel modal on `/results`; `/alerts` page with per-watchlist management and per-alert acknowledge; sidebar gets an Alerts item with a live unread badge (polls every 60s).
6. ✅ Slot limits enforced on `POST /watchlists` (free=1, pro=20, enterprise=∞). Duplicate sectors per user also rejected with a 409.

**Verified end-to-end:** fresh user → created automotive watchlist → worker ran → alert fired with headline *"Indian Automotive Sector Hits Record 2.83 Crore Units in FY26 Amid Surge in PE Investment"* at confidence 1.00.

### Sprint 4 — Ship the pricing-page promise + differentiation  ✅ SHIPPED
Instead of picking just one wow feature we shipped three pragmatic wins together:

1. ✅ §3.3 / §4.4 **Export formats** — PDF / Excel / PowerPoint / Markdown via a dropdown. PPTX gated behind Pro (free-tier users see a clear 402 upsell).
2. ✅ §4.3 **Persona-aware reports** — 5 personas with branched Gemini prompts; onboarding banner on the dashboard; persona picker on /settings.
3. ✅ §4.5 **Multi-sector compare** — `/compare` page with parallel fetches, Gemini-ranked leaderboard, racing bars and per-sector insight cards.

Bonus landed in Sprint 4:
- Removed the unused Supabase JS client from the frontend (it was crashing the docker landing page with *"Your project's URL and Key are required"*). The landing route is now fully static.
- Added idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` migrations inside `init_db()` so schema changes don't require manual SQL on Supabase.

Pick for the next session:
- Consultants → PPT polish + white-label cover slide (§4.4 continuation).
- Investors → portfolio mode (§5.5) or WhatsApp bot (§5.4).
- Everyone → "Explain this move" (§5.1) — the best generic demo.

### Sprint 5 — Close the "mostly done" items + grounded research + agentic routing  ✅ SHIPPED

Goal: turn every "mostly done" from Sprints 2-4 into a confident "done", then upgrade
research quality and start the multi-model agentic layer.

1. ✅ **CorrelationHeatmap** rebuilt on real data (`GET /api/v1/sectors/correlations`) —
   10-sector Pearson matrix over 90 days of daily returns, 6h cache. Frontend renders
   a green/red heatmap with exact-coefficient tooltips.
2. ✅ **CapitalFlowChart → Relative Strength** (`GET /api/v1/sectors/{s}/relative-strength`)
   — 6-month sector vs Nifty 50 dual-line chart normalised to 100, with a "▲ X pts vs Nifty"
   outperformance badge. Honest replacement for the originally-planned (but unreliable)
   FII/DII scraper.
3. ✅ **Email alert delivery via Resend** (`app/notifications.py`). Worker now fires
   `_dispatch_alert()` to every opted-in channel; missing creds degrade to a logged no-op.
4. ✅ **Grounded research pipeline** (`app/research_agent.py`) — Gemini 2.5 Flash with the
   `google_search` tool fetches full articles itself and returns structured grounding
   metadata. Report prompt expanded with **Stock Suggestions**, **What's Happening Now**,
   **What's Coming Next**, and **Cross-Sector Impact** sections. Verified on technology:
   40 real sources, 11 self-picked search queries, 15k-char report in ~30s.
5. ✅ **Agentic LLM router** (`app/llm_router.py`) + per-task fallback chains:
   - **DiffAgent** → Nemotron 120B (1M ctx, reasoning) → Qwen3 Next 80B → Llama 70B → Gemini.
   - **CompareAgent** → Qwen3 Next 80B → Nemotron 30B → Llama 70B → Gemini.
   - **Prose** (reserved for persona rewrites) → Llama 70B → Hermes 405B → Nemotron 120B → Gemini.
   - Pure-JSON validation + deterministic heuristic floor so watchlist/compare ticks
     never stall on a rate-limited free model.
   - Verified: IT sector diff picked up Nemotron 120B, returned `direction=down` /
     `confidence=0.95` with a specific regulatory-probe headline. Compare routed Qwen→
     Nemotron 30B fallback cleanly when Qwen 429'd upstream.
6. ✅ **ARCHITECTURE.md** added — Mermaid flow / sequence / ER diagrams, standout-feature
   table, tech stack rationale.

### Sprint 6+ — Wow features (LangGraph for what's actually a graph)

The agentic router + Gemini grounding handle "one LLM call with fallback" perfectly. The
next batch of features is where we start seeing real multi-step graphs: plan → fetch →
reflect → synthesise → critique. That's where **LangGraph** earns its keep — we'll
build each of these natively in LangGraph from the start rather than retrofitting the
bespoke router.

Pick one per persona, not all. Order below is my recommendation for maximum demo payoff.

#### 6.1 "Explain this move" 🔮 universal demo winner
Given a sector + date range (or chart screenshot): fetch news from that window, pull prices,
run Gemini Vision if an image is attached, synthesise a 3-bullet causal explanation with
inline citations. LangGraph nodes: `plan_queries` → `news_fetch` → `price_fetch` →
`vision (optional)` → `synthesise` → `critique_and_cite` → `maybe_retry`.

**Stack:** LangGraph + Gemini 2.5 Flash (vision + grounded) + market-data module.
**Why first:** best screenshot moment on Twitter/LinkedIn, short to build, no new data sources.

#### 6.2 Portfolio mode 📈 for retail investors
User enters holdings in /settings. Every sector report ends with a "Your exposure" panel:
for each held ticker, surface sector-level catalysts that affect it plus an impact rating.
LangGraph: `fetch_holdings` → (parallel) per-holding: `load_news` + `load_prices` → `score_impact`
→ `rollup`.

**Stack:** LangGraph + existing router for impact scoring + yfinance for quote lookup.
**Why second:** activates the retail investor persona the product is primarily aimed at.

#### 6.3 Voice brief 🎧 distribution + retention
90-sec audio digest of any report via Gemini TTS (fallback ElevenLabs). Embed on /results
with play button, downloadable as MP3, shareable via a public-unlisted URL.

**Stack:** Gemini TTS API (if available) or ElevenLabs, simple no-graph.
**Why third:** pure virality lever; low-effort; great WhatsApp-native content for India.

#### 6.4 "Explain this chart" image upload 🖼️
User uploads a TradingView screenshot. Gemini Vision + news window → 3 bullets of causal
reasoning. Variant of 6.1 with image-first input.

**Why fourth:** only if 6.1 proves people care about the causal-explainer category.

#### 6.5 WhatsApp bot 💬 India-specific retention
Users message a number with `/analyze pharma` → get the summary + "Watch sector?" CTA.
Inbound alerts come as WhatsApp messages (Gupshup or Twilio). Completes the monetisation
loop that §4.2 started.

**Stack:** Gupshup (cheaper in India) or Twilio; reuse existing Notifier protocol.
**Why last:** requires a business-verified WhatsApp number, ops overhead.

#### 6.6 OG share cards 🎨 passive distribution
`GET /api/v1/share/{analysis_id}/og.png` renders a branded card (sector, top insight,
logo) via `@vercel/og` at the Next.js edge. Every share = free marketing.

**Stack:** `@vercel/og` on the frontend side only.
**Why parallel:** can ship alongside any of the above.

### Tooling principle going forward
- **Single LLM call, needs fallback → `app/llm_router.py`.**
- **Multi-step graph (plan → fetch → reflect → retry) → LangGraph, natively.**
- **Needs grounding → Gemini + `google_search`** (only provider that exposes it; wrap in
  a LangGraph node when used inside a larger graph).

---

## 8. Technical appendix

### Libraries in use (installed) + queued for Sprint 6+
| Purpose | Library | Status |
|---------|---------|--------|
| NSE market data | `yfinance==1.3.0` + `curl_cffi==0.15.0` | ✅ installed — sector index OHLCV, relative strength, correlation matrix |
| Sentiment (local) | `vaderSentiment==3.3.2` | ✅ installed — per-article scoring |
| PDF export | `reportlab==4.2.5` | ✅ installed (picked over `weasyprint` to avoid cairo/pango deps) |
| Excel export | `openpyxl==3.1.5` | ✅ installed |
| PPT export | `python-pptx==1.0.2` | ✅ installed |
| Scheduled jobs | `APScheduler==3.10.4` | ✅ installed — worker service |
| Email | Resend via `httpx` | ✅ installed — `app/notifications.py` |
| Agentic LLM routing | `openai==2.32.0` (points at OpenRouter) | ✅ installed — `app/llm_router.py` |
| Grounded search | `google-genai` + `google_search` tool | ✅ installed — `app/research_agent.py` |
| **LangGraph (Sprint 6)** | `langgraph` + `langchain-core` | ⏳ queued for wow features |
| Voice briefs (6.3) | `elevenlabs` or Gemini TTS | ⏳ queued |
| OG images (6.6) | `@vercel/og` | ⏳ queued (frontend-side, edge function) |
| WhatsApp (6.5) | Gupshup HTTP or `twilio` | ⏳ queued — needs BSP account |

### API surface — shipped + queued
Shipped as of Sprint 5:
```
POST   /api/v1/contact                              # ✅ contact form → contact_messages
GET    /api/v1/sectors                              # ✅ live sector catalogue
GET    /api/v1/sectors/{sector}/market-data         # ✅ vitals + 12m trend + 52w + Nifty benchmark
GET    /api/v1/sectors/{sector}/relative-strength   # ✅ 6m sector vs Nifty normalised series
GET    /api/v1/sectors/{sector}/news                # ✅ VADER-scored news list
GET    /api/v1/sectors/correlations                 # ✅ 10-sector Pearson matrix
POST   /api/v1/analyze/{sector}                     # ✅ grounded Gemini + routed fallback
POST   /api/v1/analyze/compare                      # ✅ routed Qwen / Nemotron / Llama / Gemini
GET    /api/v1/history/{analysis_id}/export         # ✅ ?format=pdf|xlsx|pptx|md (pptx gated)
POST   /api/v1/watchlists                           # ✅
GET    /api/v1/watchlists                           # ✅
DELETE /api/v1/watchlists/{id}                      # ✅
GET    /api/v1/alerts                               # ✅
POST   /api/v1/alerts/{id}/acknowledge              # ✅
```

Queued for Sprint 6+:
```
POST   /api/v1/explain-move                         # 6.1 "Explain this move" (LangGraph)
POST   /api/v1/portfolio                            # 6.2 Portfolio holdings CRUD
GET    /api/v1/analyze/{sector}/voice-brief         # 6.3 TTS
GET    /api/v1/share/{analysis_id}/og.png           # 6.6 shareable card
POST   /api/v1/whatsapp/webhook                     # 6.5 Gupshup/Twilio inbound
```

### New frontend pages/components to add
```
src/app/contact/page.tsx
src/app/settings/page.tsx
src/app/compare/page.tsx
src/app/dashboard/alerts/page.tsx
src/components/results/charts/      (real-data versions of the mocks)
src/components/dashboard/WatchlistButton.tsx
src/components/dashboard/AlertsList.tsx
src/components/results/CitationLink.tsx
```

### Docker compose additions
Add a third service for the background worker, sharing the backend image but with a different CMD:
```yaml
worker:
  build:
    context: .
    dockerfile: Dockerfile
  command: python -m app.worker
  env_file: .env
  depends_on:
    backend:
      condition: service_healthy
  networks:
    - tradeinsight-network
```

---

## 9. What to stop doing / not build

- Don't chase every item in this doc in parallel. Pick one persona, one sprint.
- Don't add more LLM features without real data backing them — it compounds the "just ChatGPT" critique.
- Don't build team/collaboration features yet. Nobody's asking. Ship for one user first.
- Don't build a mobile app. The website is not yet good enough to deserve one. Revisit after Sprint 4.
- Don't migrate away from SQLite yet. You'll know when the DB starts hurting. Premature Postgres is a time-sink.

---

## 10. Success metrics to watch

Pick 3, not 30.

1. **Analyses per active user per week** — if this isn't growing, the product isn't sticky.
2. **Watchlist → alert-opened rate** — proves the alerts are worth the delivery cost.
3. **Free → paid conversion** — ultimately the only metric that matters.

Everything else (DAU, signups, page views) is vanity until these three work.

---

*Last updated: 2026-04-19 — Sprints 1-5 shipped. Research is grounded (Gemini 2.5 Flash + `google_search`, 40 real sources per report). Agentic router (`app/llm_router.py`) live — DiffAgent and CompareAgent now traverse a task-specific model chain across Qwen3 Next 80B / Nemotron 120B / Nemotron 30B / Llama 3.3 70B / Hermes 405B → Gemini with a heuristic floor. Verified: diff picked Nemotron 120B and returned confidence 0.95 for a regulatory-probe scenario. Next up: Sprint 6 wow features built natively in LangGraph (see §7 for ordered plan — "Explain this move" is the recommended opener).*
