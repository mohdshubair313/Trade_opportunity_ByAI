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
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { SectorSearch } from "@/components/dashboard/SectorSearch";
import { StatsCard } from "@/components/ui/Card";
import { MagicCard } from "@/components/animations/AnimatedCard";
import { GradientText, NumberTicker } from "@/components/animations/AnimatedText";
import { POPULAR_SECTORS, getAvailableSectors, SectorInfo, getCurrentUser, isAuthenticated, getAnalysisHistory, AnalysisHistoryItem } from "@/lib/api";
import { useFavorites } from "@/hooks/useFavorites";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Indian Equity & Trade Feeds • Active</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Market <GradientText>Intelligence Studio</GradientText>
                </h1>
              </div>

              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-4 py-2 text-xs font-medium shadow-sm">
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span>NSE / BSE Realtime AI Engine</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              AI-powered fundamental & regulatory analysis tailored for your portfolio. Type any sector name below to generate an executive briefing.
            </p>
          </motion.div>

          {needsPersona && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between gap-4 p-4 rounded-xl border border-primary/40 bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Tell us who you are — reports will be written for you.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    An investor sees entry/exit zones; an exporter sees HS codes and tariffs. 30 seconds.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNeedsPersona(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  Later
                </button>
                <button
                  onClick={() => router.push("/settings")}
                  className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Analyses
                </h2>
                <button
                  onClick={() => router.push("/history")}
                  className="text-xs text-primary hover:underline font-medium"
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
                    <MagicCard
                      className="cursor-pointer"
                      onClick={() => openStored(item.id, item.sector)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        {isFavorite(item.sector) && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <h3 className="font-semibold capitalize mb-1">
                        {item.sector}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {item.sources_analyzed} sources analyzed
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(item.created_at)}</span>
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
              {sectors.slice(0, 10).map((sector, index) => (
                <motion.button
                  key={sector.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnalyze(sector.name)}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  title={sector.description || undefined}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    {sector.icon && sector.icon !== "✨" ? (
                      <span className="text-base leading-none">{sector.icon}</span>
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{sector.name}</span>
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
