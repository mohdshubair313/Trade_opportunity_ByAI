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

  // Per-user reset — used when a new user signs in / signs up on the same
  // browser so nothing from the previous session (history, favorites, the
  // currently-open report) bleeds into the new user's UI.
  resetUserScoped: () => void;

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
  setFavorites: (sectors: string[]) => void;
}

const resetUserScopedSlice = {
  analysisHistory: [] as AnalysisHistory[],
  favoriteSectors: [] as string[],
  currentAnalysis: null as AnalysisResponse | null,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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
      resetUserScoped: () => set({ ...resetUserScopedSlice }),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          ...resetUserScopedSlice,
        });
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
      setFavorites: (sectors) =>
        set({ favoriteSectors: Array.from(new Set(sectors)) }),
    }),
    {
      name: "trade-insight-storage",
      // v2 (2026-04): per-user arrays are no longer persisted. Previously they
      // were written to localStorage, so if User A used the app and User B
      // signed up on the same browser without logging out, User B's dashboard
      // inherited A's history/favorites. Now they live only in memory and
      // are re-hydrated from the backend (scoped by JWT) on every page load.
      version: 2,
      migrate: (persisted: unknown, version) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const state = persisted as Record<string, unknown>;
        if ((version ?? 0) < 2) {
          delete state.analysisHistory;
          delete state.favoriteSectors;
          // Also drop `currentAnalysis` — it was never partialized, but older
          // builds occasionally stored it. Defensive cleanup.
          delete state.currentAnalysis;
        }
        return state;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        theme: state.theme,
        // analysisHistory, favoriteSectors and currentAnalysis are
        // intentionally NOT persisted — see `version: 2` note above.
      }),
    }
  )
);
