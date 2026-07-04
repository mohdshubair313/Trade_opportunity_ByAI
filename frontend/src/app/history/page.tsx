"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    ArrowRight,
    Clock,
    FileText,
    Loader2,
    Trash2,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    getAnalysisHistory,
    deleteAnalysis,
    AnalysisHistoryItem,
    AnalysisHistoryResponse,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

const PER_PAGE = 20;

export default function HistoryPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
    const [meta, setMeta] = useState<Omit<AnalysisHistoryResponse, "items"> | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const refresh = useCallback(
        async (targetPage: number) => {
            setLoading(true);
            try {
                const res = await getAnalysisHistory(targetPage, PER_PAGE);
                setItems(res.items);
                setMeta({
                    total: res.total,
                    page: res.page,
                    per_page: res.per_page,
                    pages: res.pages,
                });
                setPage(res.page);
            } catch {
                toast.error("Could not load your history.");
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        refresh(1);
    }, [authLoading, isAuthenticated, refresh, router]);

    const handleOpen = (item: AnalysisHistoryItem) => {
        router.push(
            `/results?id=${item.id}&sector=${encodeURIComponent(item.sector)}`,
        );
    };

    const handleDelete = async (item: AnalysisHistoryItem) => {
        const ok = window.confirm(
            `Delete the ${item.sector} analysis from ${formatDate(item.created_at)}?`,
        );
        if (!ok) return;
        setDeletingId(item.id);
        try {
            await deleteAnalysis(item.id);
            setItems((prev) => {
                const next = prev.filter((i) => i.id !== item.id);
                // If the last item on this page was removed and there are more pages,
                // shift to the previous page so the user isn't stuck on an empty view.
                if (prev.length === 1 && page > 1) {
                    // Use a microtask to allow state to update first
                    queueMicrotask(() => refresh(page - 1));
                } else if (meta) {
                    setMeta({ ...meta, total: Math.max(0, meta.total - 1) });
                }
                return next;
            });
            toast.success("Analysis deleted.");
        } catch {
            toast.error("Could not delete this analysis.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Clock className="h-7 w-7 text-primary" />
                    Analysis History
                </h1>
                <p className="text-muted-foreground">
                    Every report you&apos;ve saved — reopen any of them instantly without re-running research.
                </p>
                {meta && (
                    <p className="text-xs text-muted-foreground mt-2">
                        {meta.total} total report{meta.total === 1 ? "" : "s"}
                        {meta.pages > 1 ? ` · page ${meta.page} of ${meta.pages}` : ""}
                    </p>
                )}
            </motion.div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your reports…</p>
                </div>
            ) : items.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-12 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold mb-1">No reports yet</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                        Run your first analysis from the dashboard and it will show up here.
                    </p>
                    <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
                </div>
            ) : (
                <>
                    <ul className="space-y-3">
                        {items.map((item, idx) => (
                            <motion.li
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                className="group flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleOpen(item)}
                                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                                >
                                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold capitalize truncate">{item.sector}</h3>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(item.created_at)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Globe className="h-3 w-3" />
                                                {item.sources_analyzed} source{item.sources_analyzed === 1 ? "" : "s"}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(item)}
                                    disabled={deletingId === item.id}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                                    title="Delete this analysis"
                                >
                                    {deletingId === item.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </motion.li>
                        ))}
                    </ul>

                    {meta && meta.pages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refresh(page - 1)}
                                disabled={page <= 1 || loading}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {meta.page} of {meta.pages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refresh(page + 1)}
                                disabled={page >= meta.pages || loading}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
