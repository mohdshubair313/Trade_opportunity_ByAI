# Trade Opportunities API — Endpoints Documentation

**Base URL**: `http://localhost:8000` (dev) · `https://tradeinsight-api.onrender.com` (prod)
**Version**: 2.0.0 · **Environment**: development

---

## Table of Contents
1. [Info & Health](#1-info--health)
2. [Authentication](#2-authentication)
3. [Users](#3-users)
4. [Sectors](#4-sectors)
5. [Analysis](#5-analysis)
6. [Compare](#6-compare)
7. [Favorites](#7-favorites)
8. [History & Export](#8-history--export)
9. [Market Data](#9-market-data)
10. [Watchlists](#10-watchlists)
11. [Alerts](#11-alerts)
12. [Payments](#12-payments)
13. [AI Multimodal](#13-ai-multimodal)
14. [Voice Agent](#14-voice-agent)
15. [Contact](#15-contact)
16. [Cache / Admin](#16-cache--admin)
17. [Rate Limits Summary](#17-rate-limits-summary)
18. [Error Codes](#18-error-codes)

---

## 1. Info & Health

### `GET /`
- **Tags**: `Info`
- **Auth**: None
- **Rate Limit**: None
- **Response**: `APIInfoResponse`
- **Description**: Root endpoint listing all available endpoint links.
- **Status**: ✅ 200 OK (0.003s)

### `GET /health`
- **Tags**: `Info`
- **Auth**: None
- **Rate Limit**: None
- **Response**: `HealthResponse`
- **Description**: Health check — DB status + cache stats.
- **Status**: ✅ 200 OK (0.003s)
- **Sample**:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "cache": { "size": 1, "max_size": 500, "default_ttl": 600 }
  }
  ```

---

## 2. Authentication

### `POST /api/v1/auth/register`
- **Rate Limit**: 5/min
- **Request**: `UserCreate` (username, email, password, full_name?)
  - Password: ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit
- **Response**: `Token` (access_token, refresh_token, token_type, expires_in)
- **Status**: ✅ 200 OK / ❌ 400 (duplicate username/email)
- **Edge Cases**:
  - `422` if password < 8 chars or missing complexity requirements
  - `400` if username already exists
  - `400` if email already in use

### `POST /api/v1/auth/login`
- **Rate Limit**: 10/min
- **Request**: `UserLogin` (username, password)
  - Accepts username **or** email
- **Response**: `Token`
- **Status**: ✅ 200 OK / ❌ 401 Unauthorized
- **Demo Credentials**: `demo_user` / `Demo@123`
- **Edge Cases**:
  - Wrong password (< 6 chars) → `422` (Pydantic validation)
  - Wrong password (≥ 6 chars) → `401` with `"Incorrect username or password"`
  - Non-existent user → `401`

### `POST /login` (Legacy)
- **Hidden from OpenAPI docs** (`include_in_schema=False`)
- **Rate Limit**: 10/min
- **Description**: Legacy alias for `/api/v1/auth/login`
- **Status**: ✅ 200 OK

### `POST /api/v1/auth/refresh`
- **Rate Limit**: 10/min
- **Request**: `TokenRefresh` (refresh_token)
- **Response**: `Token` (new token pair)
- **Status**: ✅ 200 OK

### `POST /api/v1/auth/logout`
- **Auth**: Required
- **Request**: None
- **Response**: `{"message": "Logged out successfully"}`
- **Description**: Revokes all refresh tokens for the user.
- **Status**: ✅ 200 OK

---

## 3. Users

### `GET /api/v1/users/me`
- **Auth**: Required
- **Response**: `UserResponse` (id, username, email, full_name, is_active, is_premium, tier, persona, capital_range, region, risk_appetite, created_at, last_login)
- **Status**: ✅ 200 OK / ❌ 401

### `PUT /api/v1/users/me`
- **Auth**: Required
- **Request**: `UserUpdate` (partial — full_name, email, persona, capital_range, region, risk_appetite)
- **Response**: `UserResponse`
- **Status**: ✅ 200 OK / ❌ 400 (email in use)

### `POST /api/v1/users/me/change-password`
- **Auth**: Required
- **Request**: `PasswordChange` (current_password, new_password)
- **Response**: `{"message": "Password changed successfully"}`
- **Status**: ✅ 200 OK

### `GET /api/v1/users/me/stats`
- **Auth**: Required
- **Response**: `UserStats` (total_analyses, favorite_sectors, last_analysis, member_since, is_premium)
- **Status**: ✅ 200 OK

---

## 4. Sectors

### `GET /api/v1/sectors`
- **Auth**: None
- **Rate Limit**: None
- **Response**: `SectorsResponse` — 20 sectors with icon + description
- **Status**: ✅ 200 OK (2.0s)
- **Sample**:
  ```json
  {
    "sectors": [
      {"name": "Technology", "icon": "💻", "description": "IT, Software, Hardware"},
      ...
    ],
    "count": 20
  }
  ```

---

## 5. Analysis

### `GET /api/v1/analyze/{sector}`
- **Rate Limit**: 10/min (configurable via `RATE_LIMIT_PER_MINUTE`)
- **Auth**: Optional
  - **Guest**: Only `Technology` and `Pharmaceuticals` allowed
  - **Authenticated**: Tier-based monthly limit (free=5, pro=100, enterprise=unlimited)
- **Query Params**: `save_report` (bool), `use_cache` (bool, default=true)
- **Response**: `AnalysisResponse` (sector, report, sources_analyzed, sources[], timestamp, cached, id, saved_to, saved_url)
- **Status**: ✅ 200 OK (cached: ~2s, fresh: ~15-40s)
- **LLM Pipeline**:
  1. Gemini grounded research (primary)
  2. DuckDuckGo + Gemini (fallback)
  3. OpenRouter offline (fallback)
  4. Mock report (last resort)
- **Edge Cases**:
  - `400` — sector name < 2 chars or > 100 chars
  - `403` — guest accessing restricted sector
  - `403` — monthly analysis limit reached
  - `403` — tier limit exceeded

### `GET /analyze/{sector}` (Legacy)
- **Hidden from OpenAPI docs**
- **Description**: Legacy alias, defaults `use_cache=true`, `save_report=false`

---

## 6. Compare

### `POST /api/v1/analyze/compare`
- **Rate Limit**: 10/min
- **Auth**: Optional (guest limited to Technology + Pharmaceuticals)
- **Request**: `CompareRequest` (sectors array, 2-5 items)
- **Response**: `CompareResponse` (winner, headline, scores[], generated_at)
- **Status**: ✅ 200 OK (~39s)
- **Safety Net**: 3-layer fallback (LLM → heuristic → last-resort defaults)
- **Edge Cases**:
  - `400` — < 2 valid sectors
  - `403` — guest comparing restricted sectors

---

## 7. Favorites

### `GET /api/v1/favorites`
- **Auth**: Required
- **Response**: `FavoritesListResponse` (favorites[], count)
- **Status**: ✅ 200 OK

### `POST /api/v1/favorites`
- **Auth**: Required
- **Request**: `FavoriteAdd` (sector)
- **Response**: `{"message": "Added {sector} to favorites"}`
- **Status**: ✅ 200 OK

### `DELETE /api/v1/favorites/{sector}`
- **Auth**: Required
- **Response**: `{"message": "Removed {sector} from favorites"}`
- **Status**: ✅ 200 OK / ❌ 404 (not in favorites)
- **Edge Cases**: Case-sensitive sector name

---

## 8. History & Export

### `GET /api/v1/history`
- **Auth**: Required
- **Query Params**: `page` (default 1), `per_page` (default 20, max 100)
- **Response**: `AnalysisHistoryResponse` (items[], total, page, per_page, pages)
- **Status**: ✅ 200 OK

### `GET /api/v1/history/{analysis_id}`
- **Auth**: Required
- **Response**: `AnalysisResponse`
- **Status**: ✅ 200 OK / ❌ 404

### `DELETE /api/v1/history/{analysis_id}`
- **Auth**: Required
- **Response**: `{"message": "Analysis deleted successfully"}`
- **Status**: ✅ 200 OK / ❌ 404

### `GET /api/v1/history/{analysis_id}/export`
- **Rate Limit**: 20/min
- **Auth**: Required
- **Query Params**: `format` — `pdf`, `xlsx`, `pptx`, `md`
- **Response**: Binary file download
- **Status**: ✅ 200 OK
- **Edge Cases**:
  - `400` — unsupported format
  - `402` — PPTX export requires Pro tier
  - `404` — analysis not found

---

## 9. Market Data

### `GET /api/v1/sectors/{sector}/market-data`
- **Rate Limit**: 30/min
- **Auth**: None
- **Response**: `MarketDataResponse` (status, sector, ticker, vitals, benchmark, fifty_two_week, trend[], captured_at)
- **Status**: ✅ 200 OK (~2s)
- **Note**: Returns `status: "unavailable"` for sectors without yfinance ticker mapping

### `GET /api/v1/sectors/{sector}/relative-strength`
- **Rate Limit**: 30/min
- **Auth**: None
- **Response**: `RelativeStrengthResponse` (sector_series[], benchmark_series[], outperformance_pct, sector_total_return_pct, benchmark_total_return_pct)
- **Status**: ✅ 200 OK (~2s)

### `GET /api/v1/sectors/correlations`
- **Rate Limit**: 10/min
- **Auth**: None
- **Response**: `CorrelationMatrix` (labels[], matrix[][], window_days, skipped[], captured_at)
- **Status**: ✅ 200 OK (~2s)

### `GET /api/v1/sectors/{sector}/news`
- **Rate Limit**: 30/min
- **Auth**: None
- **Query Params**: `limit` (default 10, max 25)
- **Response**: `NewsResponse` (sector, count, items[] with sentiment)
- **Status**: ✅ 200 OK (~4s)

---

## 10. Watchlists

### `GET /api/v1/watchlists`
- **Auth**: Required
- **Response**: `WatchlistsResponse` (items[], count, slot_limit, slots_used)
- **Status**: ✅ 200 OK (~2.4s)
- **Slots**: free=1, pro=20, enterprise=unlimited

### `POST /api/v1/watchlists`
- **Auth**: Required
- **Request**: `WatchlistCreate` (sector, cadence: hourly|daily|weekly, channels: in_app|email[])
- **Response**: `WatchlistItem`
- **Status**: ✅ 200 OK
- **Edge Cases**:
  - `400` — invalid sector name
  - `403` — slot limit reached
  - `409` — duplicate sector

### `DELETE /api/v1/watchlists/{watchlist_id}`
- **Auth**: Required
- **Response**: `{"message": "Watchlist removed"}`
- **Status**: ✅ 200 OK / ❌ 404

---

## 11. Alerts

### `GET /api/v1/alerts`
- **Auth**: Required
- **Query Params**: `include_seen` (bool), `limit` (default 50, max 200)
- **Response**: `AlertsResponse` (items[], unread)
- **Status**: ✅ 200 OK (~2.4s)

### `POST /api/v1/alerts/{alert_id}/acknowledge`
- **Auth**: Required
- **Response**: `AlertItem`
- **Status**: ✅ 200 OK / ❌ 404

---

## 12. Payments

### `GET /api/v1/payments/catalog`
- **Auth**: Required
- **Response**: `PaymentCatalogItem[]` (sku, name, description, price_paise, currency, stock_quantity)
- **Status**: ✅ 200 OK (~2.3s)

### `POST /api/v1/payments/create-order`
- **Rate Limit**: 10/min
- **Auth**: Required
- **Request**: `CreateOrderRequest` (items[{sku, quantity}], currency?, receipt?, notes?)
- **Response**: `CreateOrderResponse` (extends OrderResponse with key_id)
- **Status**: ✅ (depends on Razorpay config)
- **Edge Cases**:
  - `401` — unauthenticated
  - `409` — inventory unavailable
  - `502` — Razorpay upstream error
  - `503` — payment service not configured

### `POST /api/v1/payments/verify`
- **Rate Limit**: 20/min
- **Auth**: None (uses Razorpay signature)
- **Request**: `RazorpayPaymentVerificationRequest` (local_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature)
- **Response**: `OrderResponse`
- **Status**: ✅ (depends on Razorpay)

### `GET /api/v1/payments/orders/{local_order_id}`
- **Auth**: Required
- **Response**: `OrderResponse`
- **Status**: ✅ / ❌ 401, 403, 404

### `POST /api/v1/payments/razorpay-webhook`
- **Auth**: None (uses HMAC SHA256 signature)
- **Headers**: `X-Razorpay-Signature`, `X-Razorpay-Event-Id`
- **Response**: Varies (`200` processed, `202` orphaned)
- **Edge Cases**:
  - `400` — missing signature header
  - `401` — signature mismatch
  - `500` — processing failure (dead letter persisted)
  - `503` — database failure

---

## 13. AI Multimodal

### `POST /api/v1/ai/vision/analyze`
- **Rate Limit**: 10/min
- **Auth**: None
- **Request**: `multipart/form-data` — image (file), task (trade_chart|receipt|generic), question? (string)
- **Response**: `VisionAnalysisResponse` (task, provider, model, analysis, warnings, created_at)
- **Status**: ✅ (depends on Gemini)
- **Edge Cases**:
  - `400` — invalid task, invalid image
  - `415` — non-image upload
  - `503` — provider unavailable

### `POST /api/v1/ai/tts`
- **Rate Limit**: 20/min
- **Auth**: None
- **Request**: `TTSRequest` (text, voice?, speed?, response_format?, instructions?)
- **Response**: Streaming audio with headers: `X-AI-Provider`, `X-AI-Model`, `X-Cache-Hit`, `X-Latency-Ms`, `X-Char-Count`
- **Status**: ✅ (depends on Deepgram)
- **Edge Cases**:
  - `400` — invalid request
  - `503` — provider unavailable

---

## 14. Voice Agent

### `GET /api/v1/voice/voices`
- **Auth**: None
- **Response**: `VoiceVoiceOption[]` — available TTS voices
- **Status**: ✅ 200 OK (~2s)

### `GET /api/v1/voice/cache/stats`
- **Auth**: None
- **Response**: `VoiceCacheStats` — TTS cache metrics
- **Status**: ✅ 200 OK (~2s)

### `POST /api/v1/ai/stt`
- **Rate Limit**: 20/min
- **Auth**: None
- **Request**: `multipart/form-data` — audio (file), language? (string)
- **Response**: `{transcript, is_speech, debug}`
- **Status**: ✅ (depends on Deepgram)

### `POST /api/v1/voice/query`
- **Rate Limit**: 15/min
- **Auth**: None
- **Request**: `VoiceQueryRequest` (prompt, sector?, mode?, voice?, response_format?, speed?, history?, instructions?)
- **Response**: JSON with `transcript`, `audio_base64`, `audio_format`, `cache_hit`, `latency_ms`, `synth_latency_ms`, `provider`, `model`, `llm_debug`
- **Status**: ✅ (depends on LLM + TTS)

### `POST /api/v1/voice/agent`
- **Rate Limit**: 12/min
- **Auth**: None
- **Request**: `multipart/form-data` — audio (file), sector?, mode, voice?, response_format?, speed?, history_json?, language?
- **Response**: Full STT → LLM → TTS pipeline with `audio_base64`
- **Status**: ✅ (depends on Deepgram + LLM + TTS)
- **Edge Cases**:
  - Empty/no speech → `200` with `is_speech: false`
  - `400` — empty audio payload

---

## 15. Contact

### `POST /api/v1/contact`
- **Rate Limit**: 5/min
- **Auth**: None
- **Request**: `ContactRequest` (name, email, message, company?, plan_interest?)
  - Validation: name (min 2), email (valid), message (min 10)
- **Response**: `ContactResponse` (id, message)
- **Status**: ✅ 200 OK (2.6s)
- **Edge Cases**:
  - `422` — message too short (< 10 chars)

---

## 16. Cache / Admin

### `GET /api/v1/cache/stats`
- **Auth**: Required
- **Response**: `{size, max_size, default_ttl, ...}`
- **Status**: ✅ 200 OK (~2.3s)

### `DELETE /api/v1/cache/clear`
- **Auth**: Required
- **Response**: `{"message": "Cache cleared successfully"}`
- **Status**: ✅ 200 OK

---

## 17. Rate Limits Summary

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `/api/v1/auth/register` | 5/min | IP |
| `/api/v1/auth/login` | 10/min | IP |
| `/api/v1/auth/refresh` | 10/min | IP |
| `/api/v1/analyze/{sector}` | 10/min | IP |
| `/api/v1/analyze/compare` | 10/min | IP |
| `/api/v1/history/{id}/export` | 20/min | IP |
| `/api/v1/sectors/{sector}/market-data` | 30/min | IP |
| `/api/v1/sectors/{sector}/relative-strength` | 30/min | IP |
| `/api/v1/sectors/correlations` | 10/min | IP |
| `/api/v1/sectors/{sector}/news` | 30/min | IP |
| `/api/v1/payments/create-order` | 10/min | IP |
| `/api/v1/payments/verify` | 20/min | IP |
| `/api/v1/ai/vision/analyze` | 10/min | IP |
| `/api/v1/ai/tts` | 20/min | IP |
| `/api/v1/ai/stt` | 20/min | IP |
| `/api/v1/voice/query` | 15/min | IP |
| `/api/v1/voice/agent` | 12/min | IP |
| `/api/v1/contact` | 5/min | IP |

---

## 18. Error Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request — invalid input, validation error |
| `401` | Unauthorized — missing/invalid credentials |
| `402` | Payment Required — Pro feature (PPTX export) |
| `403` | Forbidden — guest limit, tier limit, monthly cap |
| `404` | Not Found — analysis, watchlist, alert, order |
| `409` | Conflict — duplicate watchlist, inventory unavailable |
| `415` | Unsupported Media Type — non-image upload to vision |
| `422` | Validation Error — Pydantic schema validation |
| `500` | Internal Server Error |
| `502` | Bad Gateway — Razorpay upstream error |
| `503` | Service Unavailable — provider down, payment not configured |

### Error Response Format
```json
{
  "error": "Human-readable error",
  "message": "Human-readable message",
  "code": "HTTP_{status_code}"
}
```

---

## Test Results Summary

| Category | Endpoints | Status | Avg Time |
|----------|-----------|--------|----------|
| Info/Health | 2 | ✅ All Pass | 0.003s |
| Authentication | 5 | ✅ All Pass | 2-3s |
| Users | 4 | ✅ All Pass | 2-5s |
| Sectors | 1 | ✅ Pass | 2s |
| Analysis | 1 (+1 legacy) | ✅ All Pass | 2-40s |
| Compare | 1 | ✅ Pass | 39s |
| Favorites | 3 | ✅ All Pass | 2-3s |
| History/Export | 4 | ✅ All Pass | 2-3s |
| Market Data | 4 | ✅ All Pass | 2-4s |
| Watchlists | 3 | ✅ All Pass | 2-3s |
| Alerts | 2 | ✅ All Pass | 2-3s |
| Payments | 5 | ✅ Pass | 2s |
| AI/Voice | 3 | ✅ Pass | 2s |
| Contact | 1 | ✅ Pass | 2.6s |
| Cache/Admin | 2 | ✅ All Pass | 2-3s |

**Total Endpoints Tested**: 41 (including legacy)
**All Pass**: ✅
