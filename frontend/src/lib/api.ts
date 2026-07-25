// API base URL — configurable via NEXT_PUBLIC_API_URL. We strip any trailing
// slash defensively so that `https://api.example.com/` and `https://api.example.com`
// both produce correct URLs when the route path starts with `/api/v1/…`.
export const API_BASE_URL = (
  (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000") ?? ""
).replace(/\/+$/, "");

// ==================== Token Management ====================

const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
};

const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refresh_token");
  }
  return null;
};

const setTokens = (accessToken: string, refreshToken: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  }
};

const clearTokens = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
  }
};

// ==================== Error Handling ====================

class ApiFetchError extends Error {
  status: number;
  body: Record<string, unknown> | null;

  constructor(message: string, status: number, body: Record<string, unknown> | null = null) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
    this.body = body;
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.message || body.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ==================== HTTP Client ====================

const DEFAULT_TIMEOUT = 120000;

let refreshPromise: Promise<TokenResponse> | null = null;

async function doRefresh(): Promise<TokenResponse> {
  if (refreshPromise) return refreshPromise;
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) throw new Error("No refresh token");
  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });
    if (!res.ok) {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Session expired");
    }
    const data: TokenResponse = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return data;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

interface FetchOptions {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  responseType?: "json" | "blob";
  timeout?: number;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const base = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  if (!params) return base;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${base}?${qs}` : base;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: FetchOptions
): Promise<T> {
  const url = buildUrl(path, options?.params);
  const headers: Record<string, string> = {
    ...(options?.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchInit: RequestInit = { method };
  const isFormData = body instanceof FormData;

  if (body !== undefined && method !== "GET") {
    if (isFormData) {
      fetchInit.body = body as FormData;
    } else if (typeof body === "object") {
      headers["Content-Type"] = "application/json";
      fetchInit.body = JSON.stringify(body);
    } else {
      fetchInit.body = body as BodyInit;
    }
  }

  // Only set headers for non-FormData; browser auto-sets Content-Type + boundary for FormData.
  fetchInit.headers = headers;

  // Timeout
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchInit.signal = controller.signal;

  try {
    let response = await fetch(url, fetchInit);
    clearTimeout(timeoutId);

    // 401 → try token refresh, then retry once
    if (response.status === 401 && !path.includes("/auth/refresh")) {
      const refreshTokenValue = getRefreshToken();
      if (refreshTokenValue) {
        try {
          const refreshData = await doRefresh();
          headers["Authorization"] = `Bearer ${refreshData.access_token}`;
          fetchInit.headers = headers;
          response = await fetch(url, fetchInit);
        } catch (err) {
          if (err instanceof Error && err.message === "Session expired") throw err;
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw new Error("Session expired");
        }
      }
    }

    if (!response.ok) {
      const message = await parseErrorBody(response);
      throw new ApiFetchError(message, response.status);
    }

    if (options?.responseType === "blob") {
      return (await response.blob()) as unknown as T;
    }

    // Handle 204 No Content
    if (response.status === 204) return undefined as unknown as T;

    return (await response.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiFetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")) {
      throw new Error(`Unable to connect to backend server (${API_BASE_URL}). Please verify backend service is running.`);
    }
    throw new Error(msg || "Network error");
  }
}

// ==================== HTTP Verb Helpers ====================

function get<T>(path: string, options?: FetchOptions): Promise<T> {
  return request<T>("GET", path, undefined, options);
}

function post<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
  return request<T>("POST", path, body, options);
}

function put<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
  return request<T>("PUT", path, body, options);
}

function del<T = void>(path: string, options?: FetchOptions): Promise<T> {
  return request<T>("DELETE", path, undefined, options);
}

// ==================== API Types ====================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type Persona = "investor" | "exporter" | "sme_owner" | "student" | "consultant";
export type CapitalRange = "under_5L" | "5L_50L" | "50L_5Cr" | "5Cr_plus";
export type RiskAppetite = "low" | "medium" | "high";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_premium: boolean;
  tier?: string;
  analysis_count_month?: number;
  persona?: Persona | null;
  capital_range?: CapitalRange | null;
  region?: string | null;
  risk_appetite?: RiskAppetite | null;
  created_at: string;
  last_login: string | null;
}

export interface UserStats {
  total_analyses: number;
  favorite_sectors: number;
  last_analysis: string | null;
  member_since: string;
  is_premium: boolean;
}

export interface AnalysisSource {
  n: number;
  title: string;
  url: string;
  snippet?: string | null;
}

export interface AnalysisResponse {
  id?: number;
  sector: string;
  report: string;
  sources_analyzed: number;
  sources?: AnalysisSource[];
  saved_to?: string;
  saved_url?: string | null;
  timestamp: string;
  cached: boolean;
}

export interface AnalysisHistoryItem {
  id: number;
  sector: string;
  sources_analyzed: number;
  created_at: string;
}

export interface AnalysisHistoryResponse {
  items: AnalysisHistoryItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface FavoritesResponse {
  favorites: string[];
  count: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: string;
  cache: {
    size: number;
    max_size: number;
    default_ttl: number;
  };
}

export interface SectorInfo {
  name: string;
  icon: string;
  description: string;
}

export interface SectorsResponse {
  sectors: SectorInfo[];
  count: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ==================== Payments API ====================

export interface PaymentCatalogItem {
  sku: string;
  name: string;
  description?: string | null;
  price_paise: number;
  currency: string;
  stock_quantity: number;
}

export interface CreateOrderItemRequest {
  sku: string;
  quantity: number;
}

export interface OrderLineItem {
  sku: string;
  item_name: string;
  quantity: number;
  unit_amount_paise: number;
  total_amount_paise: number;
}

export interface OrderResponse {
  local_order_id: number;
  receipt: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  status: string;
  amount_paise: number;
  currency: string;
  inventory_applied: boolean;
  payment_verified: boolean;
  items: OrderLineItem[];
  created_at: string;
  paid_at?: string | null;
  failure_reason?: string | null;
}

export interface CreateOrderResponse extends OrderResponse {
  key_id: string;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentVerificationRequest {
  local_order_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function listPaymentCatalog(): Promise<PaymentCatalogItem[]> {
  return get<PaymentCatalogItem[]>("/api/v1/payments/catalog");
}

export async function createPaymentOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  return post<CreateOrderResponse>("/api/v1/payments/create-order", data);
}

export async function verifyPaymentOrder(
  data: RazorpayPaymentVerificationRequest
): Promise<OrderResponse> {
  return post<OrderResponse>("/api/v1/payments/verify", data);
}

export async function getPaymentOrder(localOrderId: number): Promise<OrderResponse> {
  return get<OrderResponse>(`/api/v1/payments/orders/${localOrderId}`);
}

// ==================== Multimodal AI API ====================

export interface VisionAnalysisResponse {
  task: "trade_chart" | "receipt" | "generic" | string;
  provider: string;
  model: string;
  analysis: Record<string, unknown>;
  warnings: string[];
  created_at: string;
}

export async function analyzeVisionImage(
  file: File,
  task: "trade_chart" | "receipt" | "generic",
  question?: string
): Promise<VisionAnalysisResponse> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("task", task);
  if (question?.trim()) {
    formData.append("question", question.trim());
  }

  return post<VisionAnalysisResponse>("/api/v1/ai/vision/analyze", formData);
}

// ==================== Authentication API ====================

export interface OTPSendResponse {
  message: string;
  email: string;
  expires_in_minutes: number;
}

export interface OTPVerifyResponse {
  verified: boolean;
  message: string;
}

export async function sendOtp(email: string): Promise<OTPSendResponse> {
  return post<OTPSendResponse>("/api/v1/auth/send-otp", { email });
}

export async function verifyOtp(email: string, code: string): Promise<OTPVerifyResponse> {
  return post<OTPVerifyResponse>("/api/v1/auth/verify-otp", { email, code });
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const result = await post<TokenResponse>("/api/v1/auth/register", data);
  setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const result = await post<TokenResponse>("/api/v1/auth/login", data);
  setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await post("/api/v1/auth/logout");
  } finally {
    clearTokens();
  }
}

export async function refreshToken(): Promise<TokenResponse> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    throw new Error("No refresh token available");
  }
  const result = await post<TokenResponse>("/api/v1/auth/refresh", {
    refresh_token: refreshTokenValue,
  });
  setTokens(result.access_token, result.refresh_token);
  return result;
}

// ==================== User API ====================

export async function getCurrentUser(): Promise<UserProfile> {
  return get<UserProfile>("/api/v1/users/me");
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return put<UserProfile>("/api/v1/users/me", data);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await post("/api/v1/users/me/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function getUserStats(): Promise<UserStats> {
  return get<UserStats>("/api/v1/users/me/stats");
}

// ==================== Analysis API ====================

export async function analyzeSector(
  sector: string,
  saveReport: boolean = false,
  useCache: boolean = true
): Promise<AnalysisResponse> {
  return get<AnalysisResponse>(`/api/v1/analyze/${encodeURIComponent(sector)}`, {
    params: { save_report: saveReport, use_cache: useCache },
  });
}

export async function getAnalysisHistory(
  page: number = 1,
  perPage: number = 20
): Promise<AnalysisHistoryResponse> {
  return get<AnalysisHistoryResponse>("/api/v1/history", {
    params: { page, per_page: perPage },
  });
}

export async function getAnalysisById(analysisId: number): Promise<AnalysisResponse> {
  return get<AnalysisResponse>(`/api/v1/history/${analysisId}`);
}

export async function deleteAnalysis(analysisId: number): Promise<void> {
  await del(`/api/v1/history/${analysisId}`);
}

// ==================== Favorites API ====================

export async function getFavorites(): Promise<FavoritesResponse> {
  return get<FavoritesResponse>("/api/v1/favorites");
}

export async function addFavorite(sector: string): Promise<void> {
  await post("/api/v1/favorites", { sector });
}

export async function removeFavorite(sector: string): Promise<void> {
  await del(`/api/v1/favorites/${encodeURIComponent(sector)}`);
}

// ==================== Compare API (§4.5) ====================

export interface CompareSectorScore {
  sector: string;
  opportunity_score: number;
  risk_score: number;
  capital_required: "low" | "medium" | "high";
  time_to_roi: "short" | "medium" | "long";
  sentiment_score: number;
  top_opportunity: string;
  top_risk: string;
}

export interface CompareResponse {
  winner: string;
  headline: string;
  scores: CompareSectorScore[];
  generated_at: string;
}

export async function compareSectors(sectors: string[]): Promise<CompareResponse> {
  return post<CompareResponse>("/api/v1/analyze/compare", { sectors });
}

// ==================== Export API (§3.3 / §4.4) ====================

export type ExportFormat = "pdf" | "xlsx" | "pptx" | "md";

export async function exportAnalysis(analysisId: number, format: ExportFormat): Promise<Blob> {
  return get<Blob>(`/api/v1/history/${analysisId}/export`, {
    params: { format },
    responseType: "blob",
  });
}

// ==================== Watchlists + Alerts API (§4.2) ====================

export type WatchlistCadence = "hourly" | "daily" | "weekly";
export type WatchlistChannel = "in_app" | "email";

export interface WatchlistItem {
  id: number;
  sector: string;
  cadence: WatchlistCadence;
  channels: WatchlistChannel[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface WatchlistsResponse {
  items: WatchlistItem[];
  count: number;
  slot_limit: number;
  slots_used: number;
}

export interface WatchlistCreateRequest {
  sector: string;
  cadence: WatchlistCadence;
  channels: WatchlistChannel[];
}

export async function listWatchlists(): Promise<WatchlistsResponse> {
  return get<WatchlistsResponse>("/api/v1/watchlists");
}

export async function createWatchlist(data: WatchlistCreateRequest): Promise<WatchlistItem> {
  return post<WatchlistItem>("/api/v1/watchlists", data);
}

export async function deleteWatchlist(id: number): Promise<void> {
  await del(`/api/v1/watchlists/${id}`);
}

export interface AlertItem {
  id: number;
  sector: string;
  headline: string;
  direction: "up" | "down" | "neutral";
  confidence: number;
  summary: string | null;
  analysis_id: number | null;
  triggered_at: string;
  acknowledged_at: string | null;
}

export interface AlertsResponse {
  items: AlertItem[];
  unread: number;
}

export async function listAlerts(includeSeen = false, limit = 50): Promise<AlertsResponse> {
  return get<AlertsResponse>("/api/v1/alerts", {
    params: { include_seen: includeSeen, limit },
  });
}

export async function acknowledgeAlert(id: number): Promise<AlertItem> {
  return post<AlertItem>(`/api/v1/alerts/${id}/acknowledge`);
}

// ==================== Market Data API (§4.1) ====================

export interface MarketVitals {
  close: number;
  change_pct: number;
  volume: number;
  day_high: number;
  day_low: number;
}

export interface TrendPoint {
  month: string;
  year: number;
  close: number;
}

export interface MarketDataResponse {
  status: "ok" | "unavailable";
  sector: string;
  ticker: string | null;
  vitals?: MarketVitals;
  benchmark?: { close: number; change_pct: number } | null;
  fifty_two_week?: { high: number; low: number } | null;
  trend?: TrendPoint[];
  captured_at?: string;
  reason?: string;
}

export interface NewsItem {
  title: string;
  body: string;
  url: string;
  source: string | null;
  published_at: string | null;
  sentiment_score: number;
  sentiment_label: "bullish" | "bearish" | "neutral";
}

export interface NewsResponse {
  sector: string;
  count: number;
  items: NewsItem[];
}

export async function getMarketData(sector: string): Promise<MarketDataResponse> {
  return get<MarketDataResponse>(`/api/v1/sectors/${encodeURIComponent(sector)}/market-data`);
}

export interface RelativeStrengthPoint {
  date: string;
  value: number;
}

export interface RelativeStrengthResponse {
  status: "ok" | "unavailable";
  sector: string;
  ticker?: string | null;
  benchmark_ticker?: string;
  sector_series?: RelativeStrengthPoint[];
  benchmark_series?: RelativeStrengthPoint[];
  outperformance_pct?: number;
  sector_total_return_pct?: number;
  benchmark_total_return_pct?: number;
  captured_at?: string;
  reason?: string;
}

export async function getRelativeStrength(sector: string): Promise<RelativeStrengthResponse> {
  return get<RelativeStrengthResponse>(
    `/api/v1/sectors/${encodeURIComponent(sector)}/relative-strength`
  );
}

export interface CorrelationMatrix {
  labels: string[];
  matrix: number[][];
  window_days: number;
  skipped: string[];
  captured_at: string;
}

export async function getCorrelationMatrix(): Promise<CorrelationMatrix> {
  return get<CorrelationMatrix>("/api/v1/sectors/correlations");
}

export async function getSectorNews(sector: string, limit = 10): Promise<NewsResponse> {
  return get<NewsResponse>(`/api/v1/sectors/${encodeURIComponent(sector)}/news`, {
    params: { limit },
  });
}

// ==================== Contact API ====================

export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  company?: string;
  plan_interest?: string;
}

export interface ContactResponse {
  id: number;
  message: string;
}

export async function submitContact(data: ContactRequest): Promise<ContactResponse> {
  return post<ContactResponse>("/api/v1/contact", data);
}

// ==================== Info API ====================

export async function healthCheck(): Promise<HealthResponse> {
  return get<HealthResponse>("/health");
}

export async function getApiInfo(): Promise<{
  message: string;
  version: string;
  environment: string;
  endpoints: Record<string, unknown>;
}> {
  return get("/");
}

export async function getAvailableSectors(): Promise<SectorsResponse> {
  return get<SectorsResponse>("/api/v1/sectors");
}

// ==================== Constants ====================

export const POPULAR_SECTORS = [
  "Technology",
  "Pharmaceuticals",
  "Healthcare",
  "Fintech",
  "E-commerce",
  "Renewable Energy",
  "Agriculture",
  "Automotive",
  "Manufacturing",
  "Textile",
  "Real Estate",
  "Banking",
  "Insurance",
  "Telecom",
  "Media",
  "Education",
  "Food Processing",
  "Chemicals",
  "Metals & Mining",
  "Infrastructure",
];

// ==================== Utility Functions ====================

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getAccessToken(): string | null {
  return getToken();
}

export { clearTokens, setTokens };
