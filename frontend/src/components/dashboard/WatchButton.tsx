"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Bell, BellOff, Loader2, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    createWatchlist,
    deleteWatchlist,
    listWatchlists,
    WatchlistCadence,
    WatchlistChannel,
    WatchlistItem,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/api";

interface Props {
    sector: string;
}

export function WatchButton({ sector }: Props) {
    const [loading, setLoading] = useState(true);
    const [existing, setExisting] = useState<WatchlistItem | null>(null);
    const [slots, setSlots] = useState<{ used: number; limit: number }>({ used: 0, limit: 1 });
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cadence, setCadence] = useState<WatchlistCadence>("daily");
    const [channels, setChannels] = useState<WatchlistChannel[]>(["in_app"]);

    useEffect(() => {
        if (!isAuthenticated()) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        listWatchlists()
            .then((res) => {
                if (cancelled) return;
                setSlots({ used: res.slots_used, limit: res.slot_limit });
                const match = res.items.find((w) => w.sector.toLowerCase() === sector.toLowerCase());
                setExisting(match ?? null);
            })
            .catch(() => { })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [sector]);

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            const created = await createWatchlist({ sector, cadence, channels });
            setExisting(created);
            setSlots((s) => ({ ...s, used: s.used + 1 }));
            setOpen(false);
            toast.success(`Watching ${sector}. First analysis on the way.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not create watchlist.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async () => {
        if (!existing) return;
        setSubmitting(true);
        try {
            await deleteWatchlist(existing.id);
            setExisting(null);
            setSlots((s) => ({ ...s, used: Math.max(0, s.used - 1) }));
            toast.success(`Stopped watching ${sector}.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove watchlist.");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleChannel = (c: WatchlistChannel) => {
        setChannels((cur) => {
            if (cur.includes(c)) return cur.filter((x) => x !== c) as WatchlistChannel[];
            return [...cur, c];
        });
    };

    if (!isAuthenticated()) {
        return null;
    }

    if (loading) {
        return (
            <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        );
    }

    if (existing) {
        return (
            <Button variant="outline" size="sm" onClick={handleRemove} isLoading={submitting}>
                <BellOff className="h-4 w-4" />
                Stop watching
            </Button>
        );
    }

    const slotsFull = slots.used >= slots.limit;

    return (
        <>
            <Button
                size="sm"
                onClick={() => setOpen(true)}
                disabled={slotsFull}
                title={slotsFull ? `Free tier allows ${slots.limit} watchlist. Upgrade for more.` : undefined}
            >
                <Bell className="h-4 w-4" />
                Watch sector
            </Button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                        onClick={() => !submitting && setOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Watch {sector}</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        We&apos;ll re-analyze this sector on your chosen schedule and alert you on material changes.
                                    </p>
                                </div>
                                <button
                                    onClick={() => !submitting && setOpen(false)}
                                    className="text-muted-foreground hover:text-foreground p-1"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Cadence</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["hourly", "daily", "weekly"] as WatchlistCadence[]).map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCadence(c)}
                                                className={`h-10 rounded-lg border text-sm font-medium capitalize transition-colors ${cadence === c
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border text-muted-foreground hover:text-foreground"
                                                    }`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Channels</label>
                                    <div className="space-y-2">
                                        <ChannelToggle
                                            label="In-app"
                                            description="Shows up in the bell menu and on /alerts."
                                            icon={Bell}
                                            active={channels.includes("in_app")}
                                            onClick={() => toggleChannel("in_app")}
                                        />
                                        <ChannelToggle
                                            label="Email"
                                            description="Sent to your account email (coming soon — currently logs only)."
                                            icon={Mail}
                                            active={channels.includes("email")}
                                            onClick={() => toggleChannel("email")}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                        Slots used: {slots.used}/{slots.limit}
                                    </span>
                                    <span>Cancel anytime.</span>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreate} isLoading={submitting} disabled={channels.length === 0}>
                                        Start watching
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function ChannelToggle({
    label,
    description,
    icon: Icon,
    active,
    onClick,
}: {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${active ? "border-primary bg-primary" : "border-border"
                }`}>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
            </div>
        </button>
    );
}
