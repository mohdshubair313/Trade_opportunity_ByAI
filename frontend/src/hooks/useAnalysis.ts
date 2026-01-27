"use client";

import { useState, useCallback } from "react";
import {
  analyzeSector,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
  AnalysisResponse,
  AnalysisHistoryResponse,
} from "@/lib/api";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToHistory } = useStore();

  const analyze = useCallback(
    async (sector: string, saveReport: boolean = true, useCache: boolean = true) => {
      setIsLoading(true);
      setError(null);
      setAnalysis(null);

      try {
        const result = await analyzeSector(sector, saveReport, useCache);
        setAnalysis(result);

        // Add to local history
        addToHistory({
          id: result.id?.toString() || Date.now().toString(),
          sector: result.sector,
          timestamp: result.timestamp,
          report: result.report,
          sources: result.sources_analyzed,
          saved: !!result.saved_to,
        });

        const cacheMessage = result.cached ? " (from cache)" : "";
        toast.success(`Analysis complete for ${sector}!${cacheMessage}`);
        return result;
      } catch (err) {
        let errorMessage = "Failed to analyze sector";

        if (err instanceof Error) {
          // Parse error from API response
          const message = err.message.toLowerCase();
          if (message.includes("api key") || message.includes("permission")) {
            errorMessage = "API configuration error. Please contact support.";
          } else if (message.includes("not found")) {
            errorMessage = "No market data found for this sector.";
          } else if (message.includes("rate limit")) {
            errorMessage = "Too many requests. Please wait a moment.";
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory]
  );

  const fetchHistory = useCallback(async (page: number = 1, perPage: number = 20) => {
    setIsLoadingHistory(true);
    try {
      const result = await getAnalysisHistory(page, perPage);
      setHistory(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load history";
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchAnalysisById = useCallback(async (analysisId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAnalysisById(analysisId);
      setAnalysis(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load analysis";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeAnalysis = useCallback(async (analysisId: number) => {
    try {
      await deleteAnalysis(analysisId);
      toast.success("Analysis deleted successfully");
      // Refresh history if loaded
      if (history) {
        await fetchHistory(history.page, history.per_page);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete analysis";
      toast.error(errorMessage);
      throw err;
    }
  }, [history, fetchHistory]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    analysis,
    history,
    isLoading,
    isLoadingHistory,
    error,
    analyze,
    fetchHistory,
    fetchAnalysisById,
    removeAnalysis,
    reset,
  };
}
