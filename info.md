<![CDATA[<div align="center">

# 🧠 **TradeInsight AI**

### _Market intelligence, written for you — in under 15 seconds._

---

> **One sentence to rule them all:**
> TradeInsight AI is a full-stack, agentic-AI-powered market intelligence platform that researches, analyzes, scores, and narrates Indian equity sector opportunities — delivering persona-tuned, citation-backed reports via web, voice, and exportable documents — all orchestrated through a self-healing LLM cascade, a background watchlist engine, and a cost-aware multimodal pipeline.

---

</div>

## 📖 The Story

Imagine you're a retail investor in India. It's 7 AM. You open your phone and ask — _"What's happening in the auto sector today?"_ — and within 15 seconds, a cited, data-driven, persona-framed report lands on your screen. Not a wall of jargon. A story. Your story — tailored to whether you're a day-trader, an exporter, an SME founder, or a strategy consultant.

Behind that 15-second experience sits a machine built from **7 AI models**, **6 external services**, **4 containers**, **3 programming languages**, **2 databases**, and **1 philosophy**: _intelligence should be accessible, not gatekept._

That machine is **TradeInsight AI**.

---

## 🏗️ What This Project Is

TradeInsight AI is an **end-to-end market intelligence SaaS** for Indian equity sectors. It combines:

| Capability | What It Does |
|---|---|
| 🔬 **AI Sector Analysis** | Generates grounded, real-time research reports for 20+ Indian market sectors |
| 🗣️ **Voice Agent** | Talk to the market — ask questions, get spoken answers with full STT→LLM→TTS pipeline |
| 📊 **Live Market Data** | Real-time NSE sector indices, relative strength, correlations, and news with sentiment |
| ⚔️ **Multi-Sector Compare** | Rank 2–5 sectors head-to-head with AI-powered scoring and heuristic fallbacks |
| 👁️ **Vision Analysis** | Upload a trading chart or receipt — the AI reads and interprets it |
| 🔔 **Smart Watchlists** | Background workers re-analyze watched sectors and alert you when something materially changes |
| 💰 **Payment Integration** | Razorpay-powered tiered subscriptions (Free → Pro → Enterprise) |
| 📤 **Multi-Format Export** | Download reports as PDF, Excel, PowerPoint, or Markdown |
| 📧 **Email Alerts** | Get notified via email when your watchlist detects a material shift |

---

## 🛠️ The Technology Stack

### Backend — _The Brain_

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | **FastAPI 0.115** (Python 3.14) | Async-first REST API with auto OpenAPI docs |
| **Validation** | **Pydantic v2** + `pydantic-settings` | Schema-driven request/response + env config |
| **ORM** | **SQLAlchemy 2** | Declarative models with async session support |
| **Database** | **SQLite** (dev) / **PostgreSQL via Neon** (prod) | Dual-mode with automatic dialect switching |
| **Auth** | **python-jose** + **bcrypt** + **passlib** | JWT access/refresh tokens with HMAC-SHA256 |
| **Rate Limiting** | **SlowAPI** | IP-scoped rate limiting across all endpoints |
| **Background Jobs** | **APScheduler** (BlockingScheduler) | Watchlist re-analysis worker with configurable cadence |
| **HTTP Client** | **httpx** | Async HTTP for all outbound API calls |
| **Retry Logic** | **tenacity** | Exponential backoff for transient failures |

### AI & LLM Layer — _The Intelligence_

| Component | Technology | Purpose |
|---|---|---|
| **Primary LLM** | **Google Gemini 2.5 Flash** (`google-genai` SDK) | Grounded research with built-in `google_search` tool |
| **Agentic Router** | **OpenRouter** (free-tier multi-model) | Model-per-task specialization with automatic failover |
| **Model Catalogue** | Gemma 4 31B, Gemma 4 26B MoE, Qwen3 Next 80B, Nemotron 30B, Llama 3.3 70B, Hermes 405B | Prioritized chains per agent task |
| **Sentiment** | **VADER** (`vaderSentiment`) | Rule-based sentiment scoring for news headlines |
| **Data Collection** | **DuckDuckGo Search** (`ddgs`) | Fallback news search when Gemini grounding is unavailable |
| **Market Data** | **yfinance** | NSE sector indices, price history, 52-week stats |

### Frontend — _The Face_

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | **Next.js 14** (App Router) | Server-side rendering + file-based routing |
| **Language** | **TypeScript 5.6** | Type-safe component development |
| **Styling** | **Tailwind CSS 3.4** + `tailwind-merge` + `clsx` | Utility-first responsive design |
| **UI Primitives** | **Radix UI** (Dialog, Dropdown, Tabs, Select, Switch, Tooltip, Avatar, Progress) | Accessible, headless component library |
| **Animations** | **Framer Motion 11** + **Lenis** (smooth scrolling) | Micro-animations, page transitions, scroll effects |
| **State** | **Zustand 5** | Lightweight, hook-based global state management |
| **Charts** | **Recharts 2.15** | Interactive market data visualizations |
| **Icons** | **Lucide React** | Consistent, tree-shakeable icon system |
| **Markdown** | **react-markdown** | Renders AI reports with inline citation chips |
| **Toasts** | **react-hot-toast** | User-facing notifications |
| **Date Utils** | **date-fns 4** | Date formatting and manipulation |
| **Fonts** | **Inter** (body) + **Instrument Serif** (display) | Premium typography via Google Fonts |
| **Analytics** | **Vercel Analytics** | Usage tracking and performance monitoring |
| **Variant System** | **class-variance-authority** (CVA) | Type-safe component variant management |

### Infrastructure — _The Skeleton_

| Component | Technology | Purpose |
|---|---|---|
| **Containerization** | **Docker** + **Docker Compose** | 4-service orchestration (backend, worker, frontend, nginx) |
| **Reverse Proxy** | **Nginx** (Alpine) | SSL termination, load balancing (production profile) |
| **Backend Runtime** | `python:3.11-slim` | Lightweight container with non-root user security |
| **Frontend Runtime** | Node.js container | Build-time `NEXT_PUBLIC_*` injection |
| **Hosting** | **Render** (backend) + **Vercel** (frontend) | Serverless deployment with edge optimization |

---

## 🏛️ Architecture — A Bird's-Eye View

```
                    ┌─────────────────────────────────────────────────┐
                    │              INTERNET / CLIENT                   │
                    └────────────────────┬────────────────────────────┘
                                        │
                        ┌───────────────┼───────────────┐
                        ▼                               ▼
              ┌──────────────────┐            ┌──────────────────┐
              │   Next.js 14     │            │   Nginx (prod)   │
              │   (Vercel Edge)  │            │   SSL + Proxy    │
              │   Port 3000      │            │   Port 80/443    │
              └────────┬─────────┘            └────────┬─────────┘
                       │                               │
                       └───────────────┬───────────────┘
                                       ▼
                            ┌──────────────────────┐
                            │   FastAPI Backend     │
                            │   (Uvicorn + asyncio) │
                            │   Port 8000           │
                            │                       │
                            │  ┌─────────────────┐  │
                            │  │  41 REST APIs   │  │
                            │  │  + WebSocket    │  │
                            │  └─────────────────┘  │
                            └──────────┬───────────┘
                                       │
                   ┌───────────────────┼───────────────────┐
                   ▼                   ▼                   ▼
          ┌─────────────┐    ┌─────────────────┐    ┌────────────┐
          │  SQLAlchemy  │    │   LLM Router    │    │  Worker    │
          │  ORM Layer   │    │   (7 Models)    │    │ APScheduler│
          │              │    │                 │    │            │
          │  SQLite/     │    │  Gemini Flash   │    │ Watchlist  │
          │  PostgreSQL  │    │  Gemma 4 31B    │    │ Scan Loop  │
          │  (Neon)      │    │  Qwen3 Next     │    │ Diff Agent │
          └──────────────┘    │  Llama 3.3 70B  │    │ Alerting   │
                              │  Nemotron 30B   │    └────────────┘
                              │  Hermes 405B    │
                              └─────────────────┘
```

---

## 🔄 The Analysis Pipeline — _How a Report Is Born_

When you hit `/api/v1/analyze/{sector}`, the system executes a **4-layer graceful degradation cascade**. No single point of failure can kill a report:

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    USER REQUEST                                   │
  │              "Analyze the Automotive sector"                      │
  └──────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
  ╔══════════════════════════════════════════════════════════════════╗
  ║  LAYER 1 — Grounded Gemini Research                             ║
  ║  ─────────────────────────────────────────────────────          ║
  ║  Gemini 2.5 Flash + built-in google_search tool.               ║
  ║  The model picks its own queries, fetches articles,            ║
  ║  and writes a grounded report with citation markers.           ║
  ║  Retry with exponential backoff (2s → 4s → 8s) on 429/503.    ║
  ╚══════════════════════════════════════════════════════════════════╝
                             │
                        FAILS? ──────┐
                             │       │
                             ▼       ▼
  ╔══════════════════════════════════════════════════════════════════╗
  ║  LAYER 2 — DuckDuckGo + Gemini                                 ║
  ║  ─────────────────────────────────────────────────────          ║
  ║  DataCollector scrapes 10 news articles via DDG.                ║
  ║  VADER scores each headline for sentiment.                     ║
  ║  AIAnalyzer feeds formatted results to Gemini for narrative.   ║
  ╚══════════════════════════════════════════════════════════════════╝
                             │
                        FAILS? ──────┐
                             │       │
                             ▼       ▼
  ╔══════════════════════════════════════════════════════════════════╗
  ║  LAYER 3 — OpenRouter Offline                                   ║
  ║  ─────────────────────────────────────────────────────          ║
  ║  LLM Router tries 7 free-tier models in priority order.        ║
  ║  Gemma 4 → Qwen3 → Nemotron → Llama → Hermes → Gemini Flash.  ║
  ║  Web search plugin available via OpenRouter's Exa integration. ║
  ╚══════════════════════════════════════════════════════════════════╝
                             │
                        FAILS? ──────┐
                             │       │
                             ▼       ▼
  ╔══════════════════════════════════════════════════════════════════╗
  ║  LAYER 4 — Mock Report (Last Resort)                            ║
  ║  ─────────────────────────────────────────────────────          ║
  ║  Pre-built template with general market knowledge.             ║
  ║  Ensures the user ALWAYS gets something. Never a blank screen. ║
  ╚══════════════════════════════════════════════════════════════════╝
                             │
                             ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  POST-PROCESSING                                                 │
  │  • Citation markers [N] injected via grounding_supports          │
  │  • Report metadata appended (sector, timestamp, source count)    │
  │  • Cached in-memory keyed by (sector, user_id)                   │
  │  • Optionally saved to Supabase Storage / local disk             │
  │  • Persona framing applied based on user profile                 │
  └──────────────────────────────────────────────────────────────────┘
```

> **The philosophy:** _Every user must get an answer. The quality varies — the availability never does._

---

## 🗣️ Voice Agent Pipeline — _Talk to the Market_

The voice agent is a full-duplex conversational AI that lets users speak natural language questions and receive spoken answers:

```
  🎙️ User speaks           Audio bytes (WAV/WebM)
       │                          │
       ▼                          ▼
  ┌─────────────┐          ┌──────────────┐
  │ VAD Trim    │───────── │ Silence      │ ← Pure-Python energy-based
  │ (save cost) │          │ detection    │    No native deps
  └─────────────┘          └──────────────┘
       │
       ▼
  ┌─────────────────────────────────┐
  │  STT (Speech-to-Text)           │
  │  Provider: Deepgram / Gemini    │
  │  Output: transcript text        │
  └────────────────┬────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────┐
  │  LLM Reasoning                  │
  │  Sector-aware prompt + history  │
  │  Model: OpenRouter chain        │
  │  Response capped at max tokens  │
  └────────────────┬────────────────┘
                   │
                   ▼
  ┌─────────────────────────────────┐
  │  TTS (Text-to-Speech)           │
  │  Provider: OpenAI via OpenRouter│
  │  Fallback: Gemini TTS           │
  │  8 voices (Aoede→Zephyr)        │
  │                                 │
  │  💰 TTS Cache (disk + memory)   │
  │  Hash: (text, voice, speed,     │
  │         format, instructions)   │
  │  Atomic writes (tmp + rename)   │
  │  30-day TTL, 2000 max entries   │
  └────────────────┬────────────────┘
                   │
                   ▼
  🔊 Audio streamed back to client
     (base64 or streaming response)
```

### Cost-Awareness Built In

The voice agent isn't just smart — it's **cheap-by-design**:

- **VAD trimming** → Strips silence before sending to STT (STT bills per-frame)
- **TTS caching** → Common phrases like "Hello" or "Sure, let me check" are cached on disk
- **Response length caps** → LLM replies are truncated before TTS synthesis
- **Prompt caching** → System prompts use `cache_control` markers for OpenRouter/Anthropic
- **Provider routing** → Rolling latency average prefers fastest healthy provider

---

## 🌐 External Services — _The Allies_

TradeInsight AI doesn't do everything alone. Here's every external service it relies on, and why:

### 🤖 AI & LLM Providers

| Service | Role | How It's Used |
|---|---|---|
| **Google Gemini** (`google-genai` SDK) | Primary LLM | Grounded research via `google_search` tool, vision fallback, TTS fallback |
| **OpenRouter** (free tier) | Multi-model router | Access to 6+ free-tier models (Gemma, Qwen, Llama, Nemotron, Hermes) with web search plugin |
| **Deepgram** | Speech services | STT (speech-to-text) and TTS (text-to-speech) for the voice agent |

### 💰 Payments & Monetization

| Service | Role | How It's Used |
|---|---|---|
| **Razorpay** | Payment gateway | Order creation, payment verification via HMAC-SHA256, webhooks for server-side state, tiered subscriptions (INR currency) |

### 📧 Communications

| Service | Role | How It's Used |
|---|---|---|
| **Resend** | Transactional email | Alert delivery when watchlists detect material changes — beautiful HTML emails with dashboard deep-links |

### ☁️ Storage & Hosting

| Service | Role | How It's Used |
|---|---|---|
| **Supabase Storage** | Cloud file storage | Persists generated report files (Markdown/PDF) to survive ephemeral filesystem redeployments on Render |
| **Neon** | Serverless Postgres | Production database with PgBouncer pooling, 5min idle drop, psycopg v3 driver |
| **Render** | Backend hosting | FastAPI + Worker deployment with health checks |
| **Vercel** | Frontend hosting | Next.js edge deployment with analytics, OG image generation, preview URLs via CORS regex |

### 📈 Market Data

| Service | Role | How It's Used |
|---|---|---|
| **Yahoo Finance** (via `yfinance`) | NSE market data | Sector indices, price history, 52-week highs/lows, volume, benchmark comparison |
| **DuckDuckGo** (via `ddgs`) | News aggregation | Fallback news search when Gemini's grounding is unavailable |

### 📊 Analytics

| Service | Role | How It's Used |
|---|---|---|
| **Vercel Analytics** | Frontend metrics | Page views, web vitals, user engagement tracking |

---

## 🧱 System Design — Deep Dive

### 1. Modular Backend Architecture

The backend follows a **layered architecture** with strict separation of concerns:

```
app/
├── core/               ← Cross-cutting concerns
│   ├── config.py       ← Pydantic BaseSettings (auto-loads .env)
│   ├── auth.py         ← JWT auth, registration, password management
│   ├── cache.py        ← In-memory cache keyed by (sector, user_id)
│   ├── rate_limiter.py ← SlowAPI IP-scoped rate limiting
│   └── schemas.py      ← ALL Pydantic request/response models
│
├── services/           ← Business logic (pure, no HTTP concerns)
│   ├── research_agent.py   ← Gemini grounded research + citation extraction
│   ├── ai_analyzer.py      ← Sector analysis orchestration
│   ├── data_collector.py    ← DuckDuckGo search + formatting
│   ├── sentiment.py         ← VADER sentiment scoring
│   ├── market_data.py       ← yfinance NSE data + caching
│   ├── compare_service.py   ← Multi-sector ranking via LLM router
│   ├── diff_engine.py       ← Material-change detection between reports
│   ├── export_service.py    ← PDF/Excel/PPTX/Markdown generation
│   └── report_generator.py  ← Report metadata + formatting
│
├── llm/                ← AI model orchestration
│   ├── llm_router.py       ← Agentic multi-model router with failover
│   └── ai_harness/         ← Model registry, telemetry, validators, context
│       ├── registry.py      ← Model profile registry
│       ├── telemetry.py     ← Structured event logging + observability
│       ├── validators.py    ← Output validation utilities
│       └── context.py       ← Conversation context management
│
├── integrations/       ← External service adapters
│   ├── payment_service.py       ← Razorpay orders, verification, webhooks
│   ├── notifications.py         ← Resend email delivery
│   ├── storage.py               ← Supabase/local file storage facade
│   ├── multimodal_ai.py         ← Vision analysis + TTS synthesis
│   ├── voice_agent.py           ← Full STT→LLM→TTS pipeline + cost optimization
│   ├── voice_agent_config.py    ← Voice agent configuration
│   ├── voice_agent_server.py    ← WebSocket server for real-time voice
│   └── trade_functions.py       ← Trading utility functions
│
├── main.py             ← FastAPI app factory + all 41 route definitions
├── database.py         ← SQLAlchemy models + CRUD classes
└── worker.py           ← APScheduler watchlist background worker
```

### 2. The LLM Router — _The Smart Brain Switcher_

The LLM router is the most sophisticated piece of the system. Instead of hardcoding one model, it uses **task profiles** that map different workloads to different model chains:

```python
# Each "agent" in the system declares a task profile:
TaskProfile(
    name="diff",           # DiffAgent — change detection
    chain=("gemma_4_26b_moe", "qwen3_next_80b", "nemotron_30b", "gemini_flash"),
    json_mode=True,        # Structured JSON output required
    max_output_tokens=1024,
    temperature=0.1,       # Low creativity — we want precision
)
```

**How it works:**
1. An agent (e.g., DiffAgent for watchlist diffs) calls `router.run()` with its task profile
2. The router walks the model chain in priority order
3. Each model gets 1 attempt. If it returns valid output, done.
4. If the model 429s, 503s, or returns invalid JSON → next model in the chain
5. Every attempt is logged with structured telemetry (agent name + model + latency + outcome)
6. If ALL models fail → deterministic heuristic fallback (no AI needed)

**Why 7 models?**
- **Gemma 4 31B** → Best free-tier reasoning + JSON
- **Gemma 4 26B MoE** → Fast structured output (4B active params)
- **Qwen3 Next 80B** → Long-context reasoning
- **Nemotron 30B** → Cheap reasoning
- **Llama 3.3 70B** → Best prose generation
- **Hermes 405B** → Agentic capabilities
- **Gemini Flash** → 1M token context, native grounding (backstop)

### 3. Database Design

The system uses a **single-database, multi-table** design with SQLAlchemy declarative models:

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│    User      │────▶│    Analysis      │     │   Favorite    │
│              │     │                  │     │               │
│ id           │     │ id               │     │ user_id (FK)  │
│ username     │     │ user_id (FK)     │     │ sector        │
│ email        │     │ sector           │     └───────────────┘
│ password_hash│     │ report (TEXT)    │
│ is_premium   │     │ sources_analyzed │     ┌───────────────┐
│ tier         │     │ timestamp        │     │   Watchlist    │
│ persona      │     └──────────────────┘     │               │
│ capital_range│                               │ user_id (FK)  │
│ region       │     ┌──────────────────┐     │ sector        │
│ risk_appetite│     │   Contact        │     │ cadence       │
└──────────────┘     │                  │     │ channels      │
                     │ name, email      │     │ next_run_at   │
                     │ message          │     │ last_run_at   │
                     │ company          │     └───────────────┘
                     └──────────────────┘
                                              ┌───────────────┐
┌──────────────────┐  ┌───────────────────┐   │  AlertEvent   │
│     Order        │  │ PaymentTransaction│   │               │
│                  │  │                   │   │ user_id (FK)  │
│ user_id (FK)     │  │ order_id (FK)     │   │ watchlist_id  │
│ razorpay_order_id│  │ razorpay_payment  │   │ headline      │
│ amount_paise     │  │ amount            │   │ direction     │
│ currency         │  │ status            │   │ confidence    │
│ status           │  │ verified_at       │   │ seen          │
│ line_items (JSON)│  └───────────────────┘   └───────────────┘
└──────────────────┘
                     ┌───────────────────┐
                     │  InventoryItem    │
                     │                   │
                     │ sku               │
                     │ name              │
                     │ price_paise       │
                     │ stock_quantity    │
                     └───────────────────┘
```

**Dual-mode database:**
- **Development:** SQLite (zero setup, `trade_opportunities_v2.db` file)
- **Production:** PostgreSQL via Neon (serverless, PgBouncer pooling, 5-min idle drop, `psycopg` v3)

### 4. The Worker — _The Night Watch_

A standalone APScheduler process runs alongside the API. Every configurable interval (default: 60s):

```
  TICK                                          TICK
   │                                             │
   ▼                                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  1. Find watchlists whose next_run_at has passed     │
  │  2. Re-run fresh analysis (bypasses in-memory cache) │
  │  3. Feed old report + new report to DiffAgent        │
  │  4. DiffAgent returns:                               │
  │     {changed, headline, direction, confidence}       │
  │  5. If confidence > threshold (0.6):                 │
  │     → Write AlertEvent to database                   │
  │     → Fan out to enabled channels (email, in_app)    │
  │  6. Advance last_run_at / next_run_at                │
  └──────────────────────────────────────────────────────┘
```

The DiffAgent uses the LLM router's `diff` task profile to compare reports. If all models fail, a **deterministic heuristic** (text similarity ratio) ensures the tick never stalls.

### 5. Authentication & Authorization

```
  ┌─────────────────────────────────────────────────────┐
  │  JWT Token Flow                                      │
  │                                                      │
  │  Register/Login → access_token (30min)               │
  │                 + refresh_token (7 days)              │
  │                                                      │
  │  Every request → Bearer token in Authorization header│
  │  Expired? → /auth/refresh with refresh_token         │
  │  Logout? → All refresh tokens revoked                │
  └─────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────┐
  │  Tier-Based Access Control                           │
  │                                                      │
  │  Guest  → Only Technology + Pharmaceuticals sectors  │
  │  Free   → 5 analyses/month, 1 watchlist slot         │
  │  Pro    → 100 analyses/month, 20 watchlist slots,    │
  │           PPTX export                                │
  │  Enterprise → Unlimited everything                   │
  └─────────────────────────────────────────────────────┘
```

### 6. Frontend Architecture

```
frontend/src/
├── app/                        ← Next.js 14 App Router
│   ├── page.tsx                ← Landing page (Hero, Features, CTA)
│   ├── layout.tsx              ← Root layout (fonts, Toaster, Analytics)
│   ├── dashboard/              ← Main dashboard (sector grid)
│   ├── results/                ← Analysis report display
│   ├── compare/                ← Multi-sector comparison
│   ├── voice/                  ← Voice agent interface
│   ├── pricing/                ← Razorpay checkout grid
│   ├── settings/               ← User profile + preferences
│   ├── login/                  ← Authentication
│   ├── favorites/              ← Saved sectors
│   ├── history/                ← Past analyses
│   ├── alerts/                 ← Watchlist notifications
│   └── contact/                ← Contact form
│
├── components/
│   ├── landing/    ← Hero, Features, CTA, Footer, Header, HowItWorks,
│   │                 Testimonials, LiveVisitors
│   ├── dashboard/  ← Sidebar, AnalysisReport, WatchButton, SectorCard
│   ├── voice/      ← VoiceOrb, VoiceAgentClient, VoiceAgentStream,
│   │                 LiveWaveform, ConversationPanel, CostSavingsBadge
│   ├── results/    ← ResultsComponents, AIOperatorStudio
│   ├── payments/   ← PricingCheckoutGrid
│   ├── ui/         ← Button, Card, Input, Badge, Skeleton (shared primitives)
│   └── animations/ ← BorderBeam, AnimatedText, Marquee, SmoothScroll,
│                     ScrollProgress
│
├── hooks/          ← useAuth, useFavorites, useAnalysis
├── lib/            ← api.ts (centralized client), utils.ts, voice-client.ts
├── store/          ← useStore.ts (Zustand global state)
└── types/          ← razorpay.d.ts (TypeScript type declarations)
```

---

## 🐳 Deployment Architecture

```
docker-compose.yml orchestrates 4 services:

  ┌───────────────────────────────────────────────────────┐
  │                Docker Compose Network                  │
  │              (tradeinsight-network, bridge)             │
  │                                                        │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
  │  │   Backend     │  │   Worker     │  │  Frontend    │ │
  │  │   :8000       │  │  APScheduler │  │   :3000      │ │
  │  │  FastAPI      │  │  Watchlists  │  │  Next.js     │ │
  │  │  + Uvicorn    │  │  + Alerting  │  │  + SSR       │ │
  │  │              ◄┼──┤ depends_on   │  │              │ │
  │  │  healthcheck  │  │  (healthy)   │  │              │ │
  │  └──────────────┘  └──────────────┘  └──────────────┘ │
  │                                                        │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │   Nginx (production profile only)                │  │
  │  │   :80 / :443                                     │  │
  │  │   SSL termination + reverse proxy                │  │
  │  └──────────────────────────────────────────────────┘  │
  └───────────────────────────────────────────────────────┘
```

**Security hardening:**
- Non-root user (`appuser`) in backend container
- Health checks with 30s interval + 3 retries
- `PYTHONDONTWRITEBYTECODE=1` + `PYTHONUNBUFFERED=1` for clean container logs
- CORS regex for Vercel preview URLs

---

## 📦 Export Pipeline

Reports can be downloaded in 4 formats — all generated server-side with **pure Python** (no system dependencies):

| Format | Library | Notes |
|---|---|---|
| **PDF** | `reportlab` | A4 pages with styled paragraphs, lists, headers |
| **Excel** (.xlsx) | `openpyxl` | Formatted cells with custom fonts, colors, alignment |
| **PowerPoint** (.pptx) | `python-pptx` | Slide deck with title + content slides, Pro tier only |
| **Markdown** (.md) | Built-in | Raw report text with metadata |

---

## 🔮 What We're Expecting Next — _The Roadmap_

The architecture is deliberately designed to support these upcoming features without major rewrites:

### Near-Term (Designed For)
| Feature | How It Fits |
|---|---|
| **WhatsApp Alerts** | `notifications.py` already has a `Notifier` protocol — drop in a Gupshup/Twilio adapter |
| **WebSocket Voice Streaming** | `voice_agent_server.py` is already built; `voice-client.ts` has the WebSocket client ready |
| **Persona-Tuned Reports** | `research_agent.py` already has `_PERSONA_FRAMES` — user profile drives report framing |
| **Magazine-Quality PDFs** | `export_service.py` can swap `reportlab` → `weasyprint` when deployed on fuller containers |
| **Gemini Batch Sentiment** | `sentiment.py` is pluggable — swap VADER for batch Gemini scoring without changing call sites |

### Medium-Term (Architecture Supports)
| Feature | Why It's Easy |
|---|---|
| **Real-time WebSocket Push** | FastAPI natively supports WebSocket; alerts can push instead of poll |
| **Multi-language Reports** | LLM router can add a translation chain; voice agent already supports language param |
| **Portfolio Tracking** | Database schema is extensible; watchlists + market data provide the data layer |
| **Custom AI Models** | LLM router's `CATALOGUE` dict is hot-swappable; add any OpenRouter or Gemini model |
| **Team/Organization Accounts** | User model has tier scaffolding; add org-level scoping to cache + watchlists |

### Long-Term (Vision)
| Feature | The Dream |
|---|---|
| **Real-time Streaming Analysis** | SSE/WebSocket stream reports as they're generated token-by-token |
| **Mobile App** | React Native frontend consuming the same API |
| **Algorithmic Signal Generation** | Market data + sentiment + AI analysis → automated buy/sell signals |
| **Regulatory Compliance Engine** | Track SEBI/RBI regulatory changes affecting sectors |
| **Community Intelligence** | Aggregate anonymized user watchlist data for crowd sentiment |

---

## 📏 By The Numbers

| Metric | Value |
|---|---|
| **Total API Endpoints** | 41 (including legacy) |
| **Supported Sectors** | 20+ Indian equity sectors |
| **AI Models Available** | 7 (across 2 providers) |
| **Export Formats** | 4 (PDF, XLSX, PPTX, MD) |
| **Container Services** | 4 (backend, worker, frontend, nginx) |
| **External Services** | 8 (Gemini, OpenRouter, Deepgram, Razorpay, Resend, Supabase, Neon, Yahoo Finance) |
| **Frontend Components** | 25+ (across 7 component groups) |
| **Analysis Fallback Layers** | 4 (grounded → DDG → OpenRouter → mock) |
| **Auth Token Expiry** | 30min access / 7-day refresh |
| **Report Generation Time** | ~15s (cached: ~2s) |
| **Rate Limit Tiers** | 5–30 req/min per endpoint |

---

<div align="center">

### _Built with obsessive attention to graceful degradation._
### _Because the market never sleeps — and neither should your intelligence platform._

---

**TradeInsight AI** · Made in India 🇮🇳 · Powered by Agentic AI

</div>
]]>
