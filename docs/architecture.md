# Architecture & Folder Structure Guide

## 🏗️ Overview

The repository is structured as a clean, production-ready full-stack application with explicit separation between `backend/`, `frontend/`, `docs/`, `scripts/`, and `tests/`.

```
Trade_opportunity_ByAI/
│
├── backend/                       # Backend Application (FastAPI + Python)
│   ├── app/
│   │   ├── api/                   # Modular API route controllers (APIRouter)
│   │   │   ├── auth_routes.py     # OTP, Register, Login, Refresh, Logout
│   │   │   ├── user_routes.py     # User Profile, Password, Usage Stats
│   │   │   ├── analysis_routes.py # AI Sector Analysis, History, Delete
│   │   │   ├── favorites_routes.py# User Favorites (Add, List, Remove)
│   │   │   ├── compare_routes.py  # Multi-sector 2-5 Comparison
│   │   │   ├── export_routes.py   # PDF, XLSX, PPTX, MD export
│   │   │   ├── market_data_routes.py # Live NSE indices, Correlations, News
│   │   │   ├── payment_routes.py  # Razorpay Checkout, Webhook, Orders
│   │   │   ├── ai_routes.py       # Vision Analysis & TTS Speech
│   │   │   ├── voice_routes.py    # STT & Real-time Conversational Voice Agent
│   │   │   ├── watchlist_routes.py# Scheduled Watchlists
│   │   │   ├── alert_routes.py    # Market Change Triggered Alerts
│   │   │   ├── contact_routes.py  # Sales & Support Inquiry
│   │   │   ├── admin_routes.py    # Cache management & stats
│   │   │   └── info_routes.py     # Root API info, Health, Sectors catalogue
│   │   │
│   │   ├── core/                  # Core infrastructure (Config, Auth, Schemas, Cache)
│   │   ├── crud/                  # Dedicated CRUD operations per entity
│   │   ├── models/                # SQLAlchemy ORM database models
│   │   ├── services/              # Pure business logic (Analysis, Collectors, Export)
│   │   ├── integrations/          # External services (Supabase/Cloudinary, Razorpay, Multimodal AI)
│   │   │   ├── speech_to_speech.py    # HF Speech-to-Speech cascaded pipeline (VAD + STT + LLM + TTS)
│   │   │   ├── voice_agent_server.py  # Deepgram & Realtime WebSocket voice server
│   │   │   ├── voice_agent_config.py  # Voice system instructions & Hinglish financial lexicons
│   │   │   ├── voice_agent.py         # Voice caching, synthesis, and cost telemetry
│   │   │   ├── multimodal_ai.py       # Vision analysis, audio analysis, & TTS streaming
│   │   │   ├── trade_functions.py     # Live market execution tools & portfolio checks
│   │   │   └── storage.py             # Cloud storage uploads (Supabase / Cloudinary)
│   │   ├── llm/                   # LLM Router & Agent Harness
│   │   ├── templates/             # HTML Email templates
│   │   ├── main.py                # Slim FastAPI app initialization & middleware
│   │   ├── database.py            # DB engine & session dependency
│   │   └── worker.py              # Background watchlist cron worker
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Python dependencies
│   └── .env.example               # Backend environment template
│
├── frontend/                      # Frontend Application (Next.js 14 + TypeScript)
│   ├── src/
│   │   ├── app/                   # Next.js App Router (31 pages/routes)
│   │   ├── components/            # Reusable UI component modules
│   │   │   └── voice/             # 3D WebGL Aura Orb, Live Audio visualizer, Voice Agent UI
│   │   ├── hooks/                 # Custom React hooks (useAuth, useAnalysis, useFavorites)
│   │   ├── lib/                   # API client, Audio streamer, Utils
│   │   ├── store/                 # Zustand state management
│   │   └── types/                 # TypeScript interfaces
│   ├── public/                    # Frontend static assets
│   ├── Dockerfile                 # Frontend container definition
│   └── package.json               # Node.js dependencies
│
├── tests/                         # Automated Pytest Test Suite
│   ├── unit/                      # Isolated unit tests (Schemas, Auth, CRUD)
│   ├── integration/               # API route integration tests with SQLite
│   ├── conftest.py                # Test fixtures & test DB session
│   └── pytest.ini                 # Pytest configuration
│
├── docs/                          # Project Documentation
│   ├── endpoints.md               # API endpoint reference
│   ├── info.md                    # Project context & background
│   └── architecture.md            # Architecture & structure guide (this file)
│
├── scripts/                       # Utility scripts (e.g. check_db.py)
├── reports/                       # Local development cache/reports (gitignored)
├── docker-compose.yml             # Orchestration for Backend, Frontend, Worker, Nginx
└── README.md                      # Project root documentation
```

---

## 💾 Storage & Reports Architecture (Cloud vs Local vs Database)

### 1. `reports/` Directory
- **Local Fallback Only**: In production (Docker, Render, Railway, Vercel), local container disks are **ephemeral** and get wiped on every redeploy.
- The `reports/` folder is strictly used as a local fallback during development when cloud credentials are not supplied.

### 2. Cloud Storage (Supabase Storage / Cloudinary / AWS S3)
- When cloud storage is configured via `app/integrations/storage.py`, generated report files are uploaded to cloud storage buckets.
- The user receives a secure download URL to download the raw markdown or exported documents (PDF, DOCX, PPTX).

### 3. Database (`analyses` table) vs Cloud Storage
- **Why keep `report` text in the Database?**
  - **Instant Rendering**: When a user opens their History or Dashboard, the report text is loaded instantly in **1 query (10ms)** from the database.
  - **Zero External Latency / Failure Risk**: If the report text were only in cloud storage, every history click would require a slow HTTP roundtrip to Cloudinary/Supabase (1-2s delay) and would fail if the storage provider experiences rate-limiting or network hiccup.
  - **Minimal DB Size**: 1,000 markdown reports consume only **~10 MB** of database storage (less than 2% of free 500MB PostgreSQL tier on Neon/Supabase).
- **Best Practice Standard**:
  - Store the report markdown text in the database for instant UI rendering.
  - Store the static file in Cloud storage for shareable download links and offline export.
