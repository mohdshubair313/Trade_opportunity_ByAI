"use client";

import { motion } from "framer-motion";
import { Coins, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { getCacheStats, type VoiceCacheStats } from "@/lib/voice-client";
import { cn } from "@/lib/utils";

interface CostSavingsBadgeProps {
  /** ms between background polls. 0 disables polling. */
  refreshInterval?: number;
  className?: string;
  variant?: "compact" | "full";
}

/**
 * Live "money saved" widget — pulls /api/v1/voice/cache/stats on a timer.
 *
 * The interesting metric isn't entries count, it's *the rupees you would
 * have spent if the cache wasn't there*. The backend keeps a running total
 * of cached chars and converts to INR via a configurable cost-per-million
 * constant. We surface the same number here so engineers and finance see
 * the same delta.
 */
export function CostSavingsBadge({
  refreshInterval = 12000,
  className,
  variant = "compact",
}: CostSavingsBadgeProps) {
  const [stats, setStats] = useState<VoiceCacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const data = await getCacheStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "stats unavailable");
      }
    };
    void fetchStats();
    if (refreshInterval > 0) {
      const id = window.setInterval(() => void fetchStats(), refreshInterval);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [refreshInterval]);

  if (error && !stats) {
    return null;
  }

  if (!stats) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400",
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        Warming up the cache…
      </div>
    );
  }

  const hitPct = Math.round((stats.hit_ratio || 0) * 100);
  const savedInr = stats.estimated_inr_saved.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "inline-flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 backdrop-blur",
          className
        )}
      >
        <Coins className="h-3.5 w-3.5 text-emerald-300" />
        <span className="font-medium">
          ₹{savedInr} saved
        </span>
        <span className="hidden text-emerald-200/70 sm:inline">
          • {stats.hits} cache hits • {hitPct}% hit rate
        </span>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-3xl border border-emerald-400/25 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_55%),linear-gradient(180deg,rgba(7,12,18,0.96),rgba(8,16,22,0.96))] p-5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="success">
              <Zap className="mr-1 h-3 w-3" />
              Cost Optimisation
            </Badge>
            {stats.arbitrage_enabled && (
              <Badge variant="info">
                <TrendingUp className="mr-1 h-3 w-3" />
                Regional arbitrage on
              </Badge>
            )}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
            Voice cost saved
          </p>
          <h3 className="mt-1 text-3xl font-semibold text-white">₹{savedInr}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <Coins className="h-6 w-6 text-emerald-300" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cache hits" value={stats.hits.toLocaleString()} />
        <Stat label="Hit rate" value={`${hitPct}%`} />
        <Stat label="Chars served free" value={stats.chars_saved.toLocaleString()} />
      </div>
      {Object.values(stats.provider_health || {}).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
            Provider health
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.values(stats.provider_health).map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      p.healthy ? "bg-emerald-400" : "bg-amber-400"
                    )}
                  />
                  {p.name}
                </span>
                <span>{p.avg_latency_ms || "—"} ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
