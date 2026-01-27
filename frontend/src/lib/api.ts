import axios, { AxiosError, AxiosInstance } from "axios";

// API Base URL - configurable via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      const refreshToken = getRefreshToken();

      if (refreshToken && !originalRequest.url?.includes("/auth/refresh")) {
        try {
          // Try to refresh the token
          const response = await axios.post<TokenResponse>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refresh_token: refreshToken }
          );

          setTokens(response.data.access_token, response.data.refresh_token);

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } else {
        clearTokens();
      }
    }
    return Promise.reject(error);
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

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_premium: boolean;
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

export interface AnalysisResponse {
  id?: number;
  sector: string;
  report: string;
  sources_analyzed: number;
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
