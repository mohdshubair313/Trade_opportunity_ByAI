"use client";

import { useState, useCallback } from "react";
import { analyzeSector, AnalysisResponse } from "@/lib/api";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToHistory } = useStore();

  const analyze = useCallback(
    async (sector: string, saveReport: boolean = true) => {
      setIsLoading(true);
      setError(null);
      setAnalysis(null);

      try {
        const result = await analyzeSector(sector, saveReport);
        setAnalysis(result);

        // Add to history
        addToHistory({
          id: Date.now().toString(),
          sector: result.sector,
          timestamp: result.timestamp,
          report: result.report,
          sources: result.sources_analyzed,
          saved: !!result.saved_to,
        });

        toast.success(`Analysis complete for ${sector}!`);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to analyze sector";
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory]
  );

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyze,
    reset,
  };
}
