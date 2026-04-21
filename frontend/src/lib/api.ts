import axios, { AxiosError, AxiosInstance } from "axios";

// API base URL — configurable via NEXT_PUBLIC_API_URL. We strip any trailing
// slash defensively so that `https://api.example.com/` and `https://api.example.com`
// both produce correct URLs when the route path starts with `/api/v1/…`.
// Without this, axios would happily produce double-slash URLs that some proxies
// reject (or silently redirect, which then fails CORS preflight).
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

// Create axios instance with default config
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60 second timeout for long-running operations
});

// Token management
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

// Error shape returned by the backend
interface ApiErrorBody {
  error: string;
  message: string;
  code?: string;
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors and token refresh
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !isRefreshing) {
      const refreshTokenValue = getRefreshToken();

      if (refreshTokenValue && !originalRequest.url?.includes("/auth/refresh")) {
        isRefreshing = true;
        try {
          const response = await axios.post<TokenResponse>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refresh_token: refreshTokenValue }
          );

          setTokens(response.data.access_token, response.data.refresh_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          }
          return api(originalRequest);
        } catch {
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        } finally {
          isRefreshing = false;
        }
      } else {
        clearTokens();
      }
    }

    // Extract meaningful error message from API response
    const apiError = error.response?.data;
    const message = apiError?.message || apiError?.error || error.message;
    return Promise.reject(new Error(message));
  }
);

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

// ==================== Authentication API ====================

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/api/v1/auth/register", data);
  setTokens(response.data.access_token, response.data.refresh_token);
  return response.data;
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/api/v1/auth/login", data);
  setTokens(response.data.access_token, response.data.refresh_token);
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/v1/auth/logout");
  } finally {
    clearTokens();
  }
}

export async function refreshToken(): Promise<TokenResponse> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    throw new Error("No refresh token available");
  }
  const response = await api.post<TokenResponse>("/api/v1/auth/refresh", {
    refresh_token: refreshTokenValue,
  });
  setTokens(response.data.access_token, response.data.refresh_token);
  return response.data;
}

// ==================== User API ====================

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await api.get<UserProfile>("/api/v1/users/me");
  return response.data;
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const response = await api.put<UserProfile>("/api/v1/users/me", data);
  return response.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.post("/api/v1/users/me/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function getUserStats(): Promise<UserStats> {
  const response = await api.get<UserStats>("/api/v1/users/me/stats");
  return response.data;
}

// ==================== Analysis API ====================

export async function analyzeSector(
  sector: string,
  saveReport: boolean = false,
  useCache: boolean = true
): Promise<AnalysisResponse> {
  const response = await api.get<AnalysisResponse>(
    `/api/v1/analyze/${encodeURIComponent(sector)}`,
    {
      params: { save_report: saveReport, use_cache: useCache },
    }
  );
  return response.data;
}

export async function getAnalysisHistory(
  page: number = 1,
  perPage: number = 20
): Promise<AnalysisHistoryResponse> {
  const response = await api.get<AnalysisHistoryResponse>("/api/v1/history", {
    params: { page, per_page: perPage },
  });
  return response.data;
}

export async function getAnalysisById(analysisId: number): Promise<AnalysisResponse> {
  const response = await api.get<AnalysisResponse>(`/api/v1/history/${analysisId}`);
  return response.data;
}

export async function deleteAnalysis(analysisId: number): Promise<void> {
  await api.delete(`/api/v1/history/${analysisId}`);
}

// ==================== Favorites API ====================

export async function getFavorites(): Promise<FavoritesResponse> {
  const response = await api.get<FavoritesResponse>("/api/v1/favorites");
  return response.data;
}

export async function addFavorite(sector: string): Promise<void> {
  await api.post("/api/v1/favorites", { sector });
}

export async function removeFavorite(sector: string): Promise<void> {
  await api.delete(`/api/v1/favorites/${encodeURIComponent(sector)}`);
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
  const response = await api.post<CompareResponse>("/api/v1/analyze/compare", { sectors });
  return response.data;
}

// ==================== Export API (§3.3 / §4.4) ====================

export type ExportFormat = "pdf" | "xlsx" | "pptx" | "md";

/**
 * Download a previously-saved analysis as PDF / Excel / PowerPoint / Markdown.
 * Returns a Blob; caller is responsible for triggering the download.
 */
export async function exportAnalysis(analysisId: number, format: ExportFormat): Promise<Blob> {
  const response = await api.get(`/api/v1/history/${analysisId}/export`, {
    params: { format },
    responseType: "blob",
  });
  return response.data as Blob;
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
  const response = await api.get<WatchlistsResponse>("/api/v1/watchlists");
  return response.data;
}

export async function createWatchlist(data: WatchlistCreateRequest): Promise<WatchlistItem> {
  const response = await api.post<WatchlistItem>("/api/v1/watchlists", data);
  return response.data;
}

export async function deleteWatchlist(id: number): Promise<void> {
  await api.delete(`/api/v1/watchlists/${id}`);
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
  const response = await api.get<AlertsResponse>("/api/v1/alerts", {
    params: { include_seen: includeSeen, limit },
  });
  return response.data;
}

export async function acknowledgeAlert(id: number): Promise<AlertItem> {
  const response = await api.post<AlertItem>(`/api/v1/alerts/${id}/acknowledge`);
  return response.data;
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
  const response = await api.get<MarketDataResponse>(
    `/api/v1/sectors/${encodeURIComponent(sector)}/market-data`
  );
  return response.data;
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
  const response = await api.get<RelativeStrengthResponse>(
    `/api/v1/sectors/${encodeURIComponent(sector)}/relative-strength`
  );
  return response.data;
}

export interface CorrelationMatrix {
  labels: string[];
  matrix: number[][];
  window_days: number;
  skipped: string[];
  captured_at: string;
}

export async function getCorrelationMatrix(): Promise<CorrelationMatrix> {
  const response = await api.get<CorrelationMatrix>("/api/v1/sectors/correlations");
  return response.data;
}

export async function getSectorNews(sector: string, limit = 10): Promise<NewsResponse> {
  const response = await api.get<NewsResponse>(
    `/api/v1/sectors/${encodeURIComponent(sector)}/news`,
    { params: { limit } }
  );
  return response.data;
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
  const response = await api.post<ContactResponse>("/api/v1/contact", data);
  return response.data;
}

// ==================== Info API ====================

export async function healthCheck(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
}

export async function getApiInfo(): Promise<{
  message: string;
  version: string;
  environment: string;
  endpoints: Record<string, unknown>;
}> {
  const response = await api.get("/");
  return response.data;
}

export async function getAvailableSectors(): Promise<SectorsResponse> {
  const response = await api.get<SectorsResponse>("/api/v1/sectors");
  return response.data;
}

// ==================== Constants ====================

// Popular sectors list (fallback if API call fails)
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
