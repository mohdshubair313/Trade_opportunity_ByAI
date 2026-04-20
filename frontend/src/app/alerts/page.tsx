"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Bell,
    BellOff,
    CheckCircle2,
    Clock,
    Loader2,
    TrendingDown,
    TrendingUp,
    Minus,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    acknowledgeAlert,
    deleteWatchlist,
    listAlerts,
    listWatchlists,
    AlertItem,
    WatchlistItem,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

export default function AlertsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
    const [slotInfo, setSlotInfo] = useState<{ used: number; limit: number }>({ used: 0, limit: 1 });
    const [loading, setLoading] = useState(true);
    const [showSeen, setShowSeen] = useState(false);

    const refresh = useCallback(async () => {
        const [alertsRes, watchlistsRes] = await Promise.all([
            listAlerts(showSeen, 100),
            listWatchlists(),
        ]);
        setAlerts(alertsRes.items);
        setWatchlists(watchlistsRes.items);
        setSlotInfo({ used: watchlistsRes.slots_used, limit: watchlistsRes.slot_limit });
    }, [showSeen]);

    useEffect(() => {
        if (isAuthenticated === false) {
            router.push("/login");
            return;
        }
        if (isAuthenticated === undefined) return;

        let cancelled = false;
        setLoading(true);
        refresh()
            .catch(() => !cancelled && toast.error("Could not load alerts."))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, refresh, router]);

    const handleAck = async (alert: AlertItem) => {
        try {
            await acknowledgeAlert(alert.id);
            setAlerts((prev) =>
                showSeen
                    ? prev.map((a) => (a.id === alert.id ? { ...a, acknowledged_at: new Date().toISOString() } : a))
                    : prev.filter((a) => a.id !== alert.id)
            );
        } catch {
            toast.error("Could not mark alert seen.");
        }
    };

    const handleRemoveWatch = async (wl: WatchlistItem) => {
        try {
            await deleteWatchlist(wl.id);
            setWatchlists((prev) => prev.filter((w) => w.id !== wl.id));
            setSlotInfo((s) => ({ ...s, used: Math.max(0, s.used - 1) }));
            toast.success(`Stopped watching ${wl.sector}.`);
        } catch {
            toast.error("Could not remove watchlist.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Bell className="h-7 w-7 text-primary" />
                    Alerts
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    We re-analyze each watched sector on your chosen cadence and flag material changes.
                </p>
            </motion.div>

            {/* Watchlists */}
            <section className="bg-card border border-border/60 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Your watchlists</h2>
                    <span className="text-xs text-muted-foreground">
                        {slotInfo.used}/{slotInfo.limit} slots used
                    </span>
                </div>

                {watchlists.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        You&apos;re not watching any sectors yet. Open any sector and hit <strong className="text-foreground">Watch sector</strong> on the results page.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {watchlists.map((wl) => (
                            <div key={wl.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                                <div>
                                    <p className="font-medium capitalize">{wl.sector}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                                        <span className="capitalize">{wl.cadence}</span>
                                        <span>•</span>
                                        <span>Channels: {wl.channels.join(", ")}</span>
                                        {wl.next_run_at && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Next run {formatDate(wl.next_run_at)}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/results?sector=${encodeURIComponent(wl.sector)}`)}>
                                        Open <ArrowRight className="h-3 w-3" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleRemoveWatch(wl)}>
                                        <BellOff className="h-3.5 w-3.5" />
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Alerts */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                        {showSeen ? "All alerts" : "Unread alerts"}
                    </h2>
                    <button
                        onClick={() => setShowSeen((s) => !s)}
                        className="text-xs text-primary hover:underline"
                    >
                        {showSeen ? "Show unread only" : "Show all"}
                    </button>
                </div>

                {alerts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/60 rounded-2xl">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        {showSeen ? "No alerts yet." : "You&apos;re all caught up."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map((alert) => (
                            <AlertCard key={alert.id} alert={alert} onAck={() => handleAck(alert)} onOpen={() => router.push(`/results?sector=${encodeURIComponent(alert.sector)}`)} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function AlertCard({
    alert,
    onAck,
    onOpen,
}: {
    alert: AlertItem;
    onAck: () => void;
    onOpen: () => void;
}) {
    const DirectionIcon =
        alert.direction === "up" ? TrendingUp :
            alert.direction === "down" ? TrendingDown : Minus;
    const directionColor =
        alert.direction === "up" ? "text-green-500" :
            alert.direction === "down" ? "text-red-500" : "text-yellow-500";

    const unread = !alert.acknowledged_at;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border bg-card transition-all ${unread ? "border-primary/40 shadow-sm shadow-primary/10" : "border-border/60 opacity-75"
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50 ${directionColor}`}>
                    <DirectionIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
                            {alert.sector}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            {(alert.confidence * 100).toFixed(0)}% confidence
                        </span>
                        {unread && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium uppercase">
                                New
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{alert.headline}</p>
                    {alert.summary && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{alert.summary}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(alert.triggered_at)}
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="sm" onClick={onOpen}>
                        Open <ArrowRight className="h-3 w-3" />
                    </Button>
                    {unread && (
                        <Button variant="outline" size="sm" onClick={onAck}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark seen
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
