import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AnalysisResponse } from "@/lib/api";

interface User {
  username: string;
  isGuest: boolean;
}

interface AnalysisHistory {
  id: string;
  sector: string;
  timestamp: string;
  report: string;
  sources: number;
  saved: boolean;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Analysis
  currentAnalysis: AnalysisResponse | null;
  isAnalyzing: boolean;
  analysisHistory: AnalysisHistory[];
  setCurrentAnalysis: (analysis: AnalysisResponse | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  addToHistory: (analysis: AnalysisHistory) => void;
  clearHistory: () => void;

  // UI
  sidebarOpen: boolean;
  theme: "dark" | "light";
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;

  // Favorites
  favoriteSectors: string[];
  addFavorite: (sector: string) => void;
  removeFavorite: (sector: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, _get) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => {
        if (token && typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
        } else if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        set({ token, isAuthenticated: !!token });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Analysis
      currentAnalysis: null,
      isAnalyzing: false,
      analysisHistory: [],
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      addToHistory: (analysis) =>
        set((state) => ({
          analysisHistory: [analysis, ...state.analysisHistory].slice(0, 50),
        })),
      clearHistory: () => set({ analysisHistory: [] }),

      // UI
      sidebarOpen: true,
      theme: "dark",
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      // Favorites
      favoriteSectors: [],
      addFavorite: (sector) =>
        set((state) => ({
          favoriteSectors: Array.from(new Set([...state.favoriteSectors, sector])),
        })),
      removeFavorite: (sector) =>
        set((state) => ({
          favoriteSectors: state.favoriteSectors.filter((s) => s !== sector),
        })),
    }),
    {
      name: "trade-insight-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        theme: state.theme,
        analysisHistory: state.analysisHistory,
        favoriteSectors: state.favoriteSectors,
      }),
    }
  )
);
