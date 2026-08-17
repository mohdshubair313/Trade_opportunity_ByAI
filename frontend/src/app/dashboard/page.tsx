"use client";

import { useEffect, Suspense, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  Sparkles,
  Clock,
  Star,
  FileText,
  ArrowRight,
  Activity,
} from "lucide-react";
import { SectorSearch } from "@/components/dashboard/SectorSearch";
import { StatsCard } from "@/components/ui/Card";
import { NumberTicker } from "@/components/animations/AnimatedText";
import { POPULAR_SECTORS, getAvailableSectors, SectorInfo, getCurrentUser, isAuthenticated, getAnalysisHistory, AnalysisHistoryItem } from "@/lib/api";
import { useFavorites } from "@/hooks/useFavorites";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { favorites, isFavorite } = useFavorites();
  const [sectors, setSectors] = useState<SectorInfo[]>(() =>
    POPULAR_SECTORS.map((name) => ({ name, icon: "✨", description: "" }))
  );
  const [needsPersona, setNeedsPersona] = useState(false);
  // Server-truth history for Recent Analyses. Pulled from /api/v1/history so
  // clicking a card opens the stored report instead of triggering a fresh run.
  const [remoteHistory, setRemoteHistory] = useState<AnalysisHistoryItem[]>([]);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  const handleAnalyze = useCallback((sector: string) => {
    router.push(`/results?sector=${encodeURIComponent(sector)}`);
  }, [router]);

  // Route by stored id when we know it — that path hits /api/v1/history/{id}
  // and renders the saved report instead of re-running analysis.
  const openStored = useCallback((id: number, sector: string) => {
    router.push(`/results?id=${id}&sector=${encodeURIComponent(sector)}`);
  }, [router]);

  // Load live sector catalog from the backend; fall back to hardcoded list on error.
  useEffect(() => {
    let cancelled = false;
    getAvailableSectors()
      .then((res) => {
        if (!cancelled && res?.sectors?.length) setSectors(res.sectors);
      })
      .catch((err) => {
        console.warn("Failed to load sectors, using fallback:", err);
        toast.error("Could not load sector catalog. Showing defaults.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prompt authenticated users without a persona to complete onboarding.
  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;
    getCurrentUser()
      .then((p) => {
        if (!cancelled && !p.persona) setNeedsPersona(true);
      })
      .catch((err) => {
        console.warn("Failed to fetch current user:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull the real history from the backend so Recent Analyses reflects the
  // current user's saved reports — not the zustand/localStorage cache which
  // can be stale or mixed between accounts on shared browsers.
  useEffect(() => {
    if (!isAuthenticated()) {
      setRemoteHistory([]);
      setTotalAnalyses(0);
      return;
    }
    let cancelled = false;
    getAnalysisHistory(1, 12)
      .then((res) => {
        if (cancelled) return;
        setRemoteHistory(res.items);
        setTotalAnalyses(res.total);
      })
      .catch((err) => {
        console.warn("Failed to load analysis history:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Check for sector in URL params
  useEffect(() => {
    const sector = searchParams.get("sector");
    if (sector) {
      handleAnalyze(sector);
    }
  }, [searchParams, handleAnalyze]);

  return (
    <div className="space-y-8">
          {/* Header & Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-2">
              <div>
                <div className="inline-flex items-center gap-2 px-sm py-xxs rounded-xs border border-hairline bg-canvas-soft text-primary text-eyebrow-mono mb-3">
                  <span className="w-2 h-2 rounded-xs bg-primary animate-ping" />
                  <span>Trade Feeds • Active</span>
                </div>
                <h1 className="text-display-lg text-ink-strong tracking-tight">
                  Market Intelligence Studio
                </h1>
                <p className="text-body-md text-mute mt-3 max-w-2xl">
                  AI-powered fundamental & regulatory analysis tailored for your portfolio. Type any sector name below to generate an executive briefing.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-canvas-soft border border-hairline rounded-xs px-md py-sm text-code-strong text-ink shadow-none">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
                <span>NSE / BSE Realtime AI Engine</span>
              </div>
            </div>
          </motion.div>

          {needsPersona && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between gap-4 p-xl rounded-md border border-hairline bg-canvas-soft"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-canvas border border-hairline flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-body-sm-strong text-ink">Tell us who you are — reports will be written for you.</p>
                  <p className="text-body-sm text-mute mt-0.5">
                    An investor sees entry/exit zones; an exporter sees HS codes and tariffs. 30 seconds.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNeedsPersona(false)}
                  className="text-body-sm text-mute hover:text-ink px-2"
                >
                  Later
                </button>
                <button
                  onClick={() => router.push("/settings")}
                  className="text-button-md bg-primary text-on-primary px-lg py-sm rounded-sm hover:bg-primary-soft transition-colors"
                >
                  Set up
                </button>
              </div>
            </motion.div>
          )}

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <SectorSearch onSearch={handleAnalyze} />
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <StatsCard
              title="Total Analyses"
              value={<NumberTicker value={totalAnalyses} />}
              icon={<FileText className="h-5 w-5" />}
            />
            <StatsCard
              title="Favorite Sectors"
              value={<NumberTicker value={favorites.length} />}
              icon={<Star className="h-5 w-5" />}
            />
            <StatsCard
              title="Sectors Available"
              value={<NumberTicker value={sectors.length} />}
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

          {/* Recent Analyses — strictly server-truth. We intentionally do NOT
              fall back to the local zustand history here for authenticated
              users: that array is per-browser, not per-account, and reading
              it as a backup leaked one user's sectors into the next user's
              dashboard when both signed in on the same browser. */}
          {remoteHistory.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 border-b border-hairline pb-3">
                <h2 className="text-display-sm text-ink-strong flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Analyses
                </h2>
                <button
                  onClick={() => router.push("/history")}
                  className="text-body-sm-strong text-primary hover:underline"
                >
                  View all →
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {remoteHistory.slice(0, 6).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      className="cursor-pointer border border-hairline rounded-md bg-canvas p-xl hover:bg-canvas-soft transition-colors shadow-none"
                      onClick={() => openStored(item.id, item.sector)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        {isFavorite(item.sector) && (
                          <Star className="h-4 w-4 text-primary fill-primary" />
                        )}
                      </div>
                      <h3 className="text-display-sm capitalize mb-1 text-ink-strong">
                        {item.sector}
                      </h3>
                      <p className="text-body-sm text-body mb-3">
                        {item.sources_analyzed} sources analyzed
                      </p>
                      <div className="flex items-center justify-between text-caption font-mono text-mute">
                        <span>{formatDate(item.created_at)}</span>
                        <ArrowRight className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4 border-b border-hairline pb-3">
              <h2 className="text-display-sm text-ink-strong flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Popular Sectors
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sectors.slice(0, 10).map((sector, index) => (
                <motion.button
                  key={sector.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnalyze(sector.name)}
                  className="p-xl rounded-md border border-hairline bg-canvas hover:bg-canvas-soft transition-all text-left group"
                  title={sector.description || undefined}
                >
                  <div className="w-8 h-8 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center mb-2 group-hover:bg-canvas transition-colors">
                    {sector.icon && sector.icon !== "✨" ? (
                      <span className="text-body-md leading-none">{sector.icon}</span>
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-body-sm-strong text-ink">{sector.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
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
