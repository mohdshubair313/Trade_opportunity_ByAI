"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Loader2,
    Star,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";

export default function FavoritesPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { favorites, isLoading, removeFavorite, syncFavorites } = useFavorites();

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        // Always force a fresh sync when the page opens — the sidebar's sync
        // may be stale if the user added/removed favourites in another tab.
        syncFavorites();
    }, [authLoading, isAuthenticated, router, syncFavorites]);

    const handleOpen = (sector: string) => {
        router.push(`/results?sector=${encodeURIComponent(sector)}`);
    };

    const handleRemove = async (sector: string) => {
        await removeFavorite(sector);
    };

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
                    Favorite Sectors
                </h1>
                <p className="text-muted-foreground">
                    Sectors you&apos;ve starred. One click re-runs the latest analysis.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    {favorites.length} favourite{favorites.length === 1 ? "" : "s"}
                </p>
            </motion.div>

            {isLoading && favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Loading favourites…</p>
                </div>
            ) : favorites.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-12 text-center">
                    <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold mb-1">No favourites yet</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                        Tap the star icon on any analysis to pin it here for quick access.
                    </p>
                    <Button onClick={() => router.push("/dashboard")}>Browse sectors</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((sector, idx) => (
                        <motion.div
                            key={sector}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                            className="group relative p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
                        >
                            <button
                                type="button"
                                onClick={() => handleOpen(sector)}
                                className="text-left w-full"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-11 h-11 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    </div>
                                    <h3 className="font-semibold capitalize flex-1 truncate">{sector}</h3>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" /> Run fresh analysis
                                    </span>
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(sector);
                                }}
                                className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove from favourites"
                            >
                                <Star className="h-3.5 w-3.5 fill-current" />
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
