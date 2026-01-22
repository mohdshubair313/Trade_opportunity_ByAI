import axios, { AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }
    }
    return Promise.reject(error);
  }
);

// API Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AnalysisResponse {
  sector: string;
  report: string;
  sources_analyzed: number;
  saved_to?: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

// API Functions
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/login", data);
  return response.data;
}

export async function analyzeSector(
  sector: string,
  saveReport: boolean = false
): Promise<AnalysisResponse> {
  const response = await api.get<AnalysisResponse>(
    `/analyze/${encodeURIComponent(sector)}`,
    {
      params: { save_report: saveReport },
    }
  );
  return response.data;
}

export async function healthCheck(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
}

export async function getApiInfo(): Promise<{ message: string; version: string; endpoints: string[] }> {
  const response = await api.get("/");
  return response.data;
}

// Sector suggestions
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
