"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Plus,
    X,
    Trophy,
    Sparkles,
    Loader2,
    ArrowRight,
    AlertTriangle,
    TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { compareSectors, CompareResponse, POPULAR_SECTORS } from "@/lib/api";
import { GradientText } from "@/components/animations/AnimatedText";

const DEFAULT_SECTORS = ["Technology", "Pharmaceuticals", "Banking"];

export default function ComparePage() {
    const router = useRouter();
    const [sectors, setSectors] = useState<string[]>(DEFAULT_SECTORS);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CompareResponse | null>(null);

    const canAdd = sectors.length < 5;

    const addSector = (name: string) => {
        const cleaned = name.trim();
        if (!cleaned) return;
        if (sectors.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
            toast.error(`${cleaned} is already in the comparison.`);
            return;
        }
        if (!canAdd) {
            toast.error("Up to 5 sectors per comparison.");
            return;
        }
        setSectors((prev) => [...prev, cleaned]);
        setInput("");
    };

    const removeSector = (name: string) => {
        setSectors((prev) => prev.filter((s) => s !== name));
    };

    const handleCompare = async () => {
        if (sectors.length < 2) {
            toast.error("Add at least two sectors.");
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await compareSectors(sectors);
            setResult(res);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Comparison failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold">
                    Compare <GradientText>Sectors</GradientText>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Rank 2-5 sectors on opportunity, risk, capital and time-to-ROI in a single call.
                </p>
            </motion.div>

            {/* Sector picker */}
            <section className="bg-card border border-border/60 rounded-2xl p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                    {sectors.map((s) => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                        >
                            {s}
                            <button
                                onClick={() => removeSector(s)}
                                className="text-primary/70 hover:text-primary"
                                aria-label={`Remove ${s}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder={canAdd ? "Add a sector (e.g. Automotive)" : "Max 5 sectors"}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addSector(input);
                                }
                            }}
                            disabled={!canAdd}
                        />
                    </div>
                    <Button variant="outline" onClick={() => addSector(input)} disabled={!canAdd || !input.trim()}>
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>
                    <Button onClick={handleCompare} isLoading={loading} disabled={sectors.length < 2}>
                        <Sparkles className="h-4 w-4" />
                        Compare
                    </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1 py-1">Quick add:</span>
                    {POPULAR_SECTORS.slice(0, 10)
                        .filter((s) => !sectors.some((p) => p.toLowerCase() === s.toLowerCase()))
                        .slice(0, 8)
                        .map((s) => (
                            <button
                                key={s}
                                onClick={() => addSector(s)}
                                disabled={!canAdd}
                                className="text-xs px-2 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-40"
                            >
                                + {s}
                            </button>
                        ))}
                </div>
            </section>

            {/* Loading / results */}
            {loading && (
                <div className="bg-card border border-border/60 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">
                        Running parallel analyses for {sectors.length} sectors — news, market data and agentic AI scoring…
                    </p>
                </div>
            )}

            {result && !loading && <ResultPanel result={result} onOpen={(s) => router.push(`/results?sector=${encodeURIComponent(s)}`)} />}
        </div>
    );
}

function ResultPanel({ result, onOpen }: { result: CompareResponse; onOpen: (sector: string) => void }) {
    // Sort by opportunity - risk/2 for the leaderboard.
    const sorted = [...result.scores].sort(
        (a, b) => (b.opportunity_score - (b.risk_score / 2)) - (a.opportunity_score - (a.risk_score / 2))
    );
    const maxOpp = Math.max(...sorted.map((s) => s.opportunity_score), 1);
    const maxRisk = Math.max(...sorted.map((s) => s.risk_score), 1);

    return (
        <div className="space-y-6">
            {/* Winner banner */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs uppercase tracking-wide text-primary font-semibold">Leader</p>
                        <h2 className="text-2xl font-bold capitalize mt-0.5">{result.winner}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{result.headline}</p>
                    </div>
                    <Button variant="outline" onClick={() => onOpen(result.winner)}>
                        Full analysis <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
            </motion.div>

            {/* Opportunity racing bars */}
            <div className="bg-card border border-border/60 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Opportunity score
                </h3>
                <div className="space-y-3">
                    {sorted.map((s, i) => (
                        <motion.div
                            key={s.sector}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="capitalize font-medium">{s.sector}</span>
                                <span className="text-muted-foreground font-mono">{s.opportunity_score.toFixed(1)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(s.opportunity_score / maxOpp) * 100}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Risk racing bars */}
            <div className="bg-card border border-border/60 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Risk score (lower is better)
                </h3>
                <div className="space-y-3">
                    {sorted.map((s, i) => (
                        <motion.div
                            key={s.sector}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                        >
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="capitalize font-medium">{s.sector}</span>
                                <span className="text-muted-foreground font-mono">{s.risk_score.toFixed(1)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(s.risk_score / maxRisk) * 100}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Per-sector insight cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sorted.map((s, i) => (
                    <motion.div
                        key={s.sector}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.08 }}
                        className="bg-card border border-border/60 rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => onOpen(s.sector)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold capitalize">{s.sector}</h4>
                            <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${s.capital_required === "low" ? "bg-green-500/15 text-green-500" :
                                    s.capital_required === "medium" ? "bg-yellow-500/15 text-yellow-500" :
                                        "bg-red-500/15 text-red-500"
                                    }`}>
                                    {s.capital_required} cap
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-medium bg-primary/15 text-primary">
                                    {s.time_to_roi} ROI
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-green-500 font-semibold">Opportunity</p>
                                <p className="text-xs text-foreground/90 mt-0.5 line-clamp-2">{s.top_opportunity}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-red-500 font-semibold">Risk</p>
                                <p className="text-xs text-foreground/90 mt-0.5 line-clamp-2">{s.top_risk}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/40 flex justify-between text-[11px] text-muted-foreground">
                            <span>Sentiment {s.sentiment_score.toFixed(2)}</span>
                            <span className="text-primary flex items-center gap-0.5">
                                Open <ArrowRight className="h-3 w-3" />
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
