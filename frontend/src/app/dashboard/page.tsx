"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  TrendingUp,
  Sparkles,
  Clock,
  Star,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SectorSearch } from "@/components/dashboard/SectorSearch";
import { AnalysisReport } from "@/components/dashboard/AnalysisReport";
import { AnalysisLoading } from "@/components/dashboard/AnalysisLoading";
import { StatsCard } from "@/components/ui/Card";
import { MagicCard } from "@/components/animations/AnimatedCard";
import { GradientText, NumberTicker } from "@/components/animations/AnimatedText";
import { analyzeSector, AnalysisResponse, POPULAR_SECTORS } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingSector, setAnalyzingSector] = useState("");
  const { analysisHistory, addToHistory, favoriteSectors } = useStore();

  // Wrap handleAnalyze in useCallback to stabilize it
  const handleAnalyze = useCallback(async (sector: string) => {
    setIsAnalyzing(true);
    setAnalyzingSector(sector);
    setCurrentAnalysis(null);

    try {
      const result = await analyzeSector(sector, true);
      setCurrentAnalysis(result);

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze sector";
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingSector("");
    }
  }, [addToHistory]);

  // Check for sector in URL params
  useEffect(() => {
    const sector = searchParams.get("sector");
    if (sector && !isAnalyzing && !currentAnalysis) {
      handleAnalyze(sector);
    }
  }, [searchParams, isAnalyzing, currentAnalysis, handleAnalyze]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">
              Market <GradientText>Intelligence</GradientText>
            </h1>
            <p className="text-muted-foreground">
              Analyze any sector to discover trade opportunities in Indian markets
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <SectorSearch onSearch={handleAnalyze} isLoading={isAnalyzing} />
          </motion.div>

          {/* Quick Stats */}
          {!currentAnalysis && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <StatsCard
                title="Total Analyses"
                value={<NumberTicker value={analysisHistory.length} />}
                icon={<FileText className="h-5 w-5" />}
              />
              <StatsCard
                title="Favorite Sectors"
                value={<NumberTicker value={favoriteSectors.length} />}
                icon={<Star className="h-5 w-5" />}
              />
              <StatsCard
                title="Sectors Available"
                value={<NumberTicker value={POPULAR_SECTORS.length} />}
                change="+5 new"
                changeType="positive"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatsCard
                title="Avg. Analysis Time"
                value="~12s"
                icon={<Clock className="h-5 w-5" />}
              />
            </motion.div>
          )}

          {/* Analysis Content */}
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <AnalysisLoading key="loading" sector={analyzingSector} />
            ) : currentAnalysis ? (
              <AnalysisReport key="report" analysis={currentAnalysis} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Recent History */}
                {analysisHistory.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Recent Analyses
                      </h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysisHistory.slice(0, 6).map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <MagicCard
                            className="cursor-pointer"
                            onClick={() => handleAnalyze(item.sector)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              {favoriteSectors.includes(item.sector) && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <h3 className="font-semibold capitalize mb-1">
                              {item.sector}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {item.sources} sources analyzed
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatDate(item.timestamp)}</span>
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </MagicCard>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Sectors */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Popular Sectors
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {POPULAR_SECTORS.slice(0, 10).map((sector, index) => (
                      <motion.button
                        key={sector}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAnalyze(sector)}
                        className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{sector}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
