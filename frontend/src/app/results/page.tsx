"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAnalysis } from "@/hooks/useAnalysis";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Activity, BarChart3, Network, MessageSquare, LineChart, Mic2, ScanSearch, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WatchButton } from "@/components/dashboard/WatchButton";
const SectorVitals = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.SectorVitals })), { ssr: false });
const CapitalFlowChart = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.CapitalFlowChart })), { ssr: false });
const TrendProjection = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.TrendProjection })), { ssr: false });
const CorrelationHeatmap = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.CorrelationHeatmap })), { ssr: false });
const SentimentBubbles = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.SentimentBubbles })), { ssr: false });
const AnalysisReport = dynamic(() => import("@/components/dashboard/AnalysisReport").then(m => ({ default: m.AnalysisReport })), { ssr: false });
const AIOperatorStudio = dynamic(() => import("@/components/results/AIOperatorStudio").then(m => ({ default: m.AIOperatorStudio })), { ssr: false });
const ShimmerCard = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.ShimmerCard })), { ssr: false });
const BorderBeam = dynamic(() => import("@/components/animations/BorderBeam").then(m => ({ default: m.BorderBeam })), { ssr: false });

function ResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sector = searchParams.get("sector");
    const idParam = searchParams.get("id");

    const { analyze, fetchAnalysisById, analysis, isLoading: isAnalyzing, error } = useAnalysis();

    useEffect(() => {
        const parsedId = idParam ? Number(idParam) : NaN;
        if (!Number.isNaN(parsedId) && parsedId > 0) {
            fetchAnalysisById(parsedId).catch(() => { });
            return;
        }
        if (sector) {
            analyze(sector);
        }
    }, [sector, idParam, analyze, fetchAnalysisById]);

    const displaySector = sector || analysis?.sector || "";

    if (!sector && !idParam) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">No Sector Selected</h2>
                <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            </div>
        );
    }

    const isLoadingView = isAnalyzing || (!!idParam && !analysis && !error);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter leading-none">
                                <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                                    {displaySector || "Loading\u2026"}
                                </span>
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="text-primary/90 text-base md:text-lg font-semibold font-display tracking-tight">
                                    Intelligence Report
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-mono font-bold text-primary/60 tracking-wider">
                                    v2.1
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
                            <p className="text-muted-foreground/50 text-[11px] tracking-[0.2em] uppercase font-mono">
                                AI-Powered Market Intelligence
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    {displaySector && <WatchButton sector={displaySector} />}
                    <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Agentic AI · Live
                    </div>
                </div>
            </div>

            {isLoadingView ? (
                <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-3">
                            <ShimmerCard title="Sector Vitals" icon={Activity} heightClass="min-h-[160px]" />
                        </div>
                        <div className="md:col-span-6">
                            <div className="bg-zinc-950/45 backdrop-blur-md border border-white/[0.06] rounded-[2rem] p-8 min-h-[268px] relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent bg-[length:200%_100%] animate-shimmer" />
                                <div>
                                    <div className="flex items-center gap-2 mb-4 relative z-10">
                                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                            <Sparkles className="h-4.5 w-4.5 text-white/20 animate-pulse" />
                                        </div>
                                        <div className="h-5 w-1/3 bg-white/[0.05] rounded-md animate-pulse" />
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        <div className="h-3.5 bg-white/[0.05] rounded w-full animate-pulse" />
                                        <div className="h-3.5 bg-white/[0.04] rounded w-5/6 animate-pulse" />
                                        <div className="h-3.5 bg-white/[0.03] rounded w-4/6 animate-pulse" />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 mt-6 relative z-10">
                                    <div className="h-12 bg-white/[0.03] rounded-2xl border border-white/5 animate-pulse" />
                                    <div className="h-12 bg-white/[0.03] rounded-2xl border border-white/5 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <ShimmerCard title="Relative Strength" icon={BarChart3} heightClass="min-h-[160px]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-[300px]">
                        <ShimmerCard title="Social Sentiment" icon={MessageSquare} heightClass="min-h-[180px]" />
                        <ShimmerCard title="Sector Correlations" icon={Network} heightClass="min-h-[180px]" />
                        <ShimmerCard title="12-month Trend" icon={LineChart} heightClass="min-h-[180px]" />
                    </div>
                </div>
            ) : error ? (
                <div className="border border-red-500/50 bg-red-500/10 rounded-[2rem] p-8 text-center">
                    <h3 className="text-xl font-bold text-red-500 mb-2">Analysis Failed</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => {
                        const parsedId = idParam ? Number(idParam) : NaN;
                        if (!Number.isNaN(parsedId) && parsedId > 0) fetchAnalysisById(parsedId).catch(() => { });
                        else if (displaySector) analyze(displaySector);
                    }}>Retry</Button>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-3">
                            {displaySector && <SectorVitals sector={displaySector} />}
                        </div>
                        <div className="md:col-span-6 flex flex-col gap-6">
                            <div className="bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] backdrop-blur-lg border border-primary/20 rounded-[2rem] p-8 min-h-[200px] shadow-[0_12px_40px_rgba(0,0,0,0.4)] dark:shadow-primary/[0.03] relative overflow-hidden group transition-all duration-300">
                                <BorderBeam colorFrom="#22c55e" colorTo="#10b981" duration={8} size={250} />
                                <div className="absolute top-4 right-6 text-[10px] font-mono font-bold text-primary/40">§ EXECUTIVE</div>
                                <h3 className="text-xl font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
                                    <span className="p-1 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <Sparkles className="h-4.5 w-4.5 text-primary" />
                                    </span>
                                    <span className="bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">AI Executive Synthesis</span>
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none line-clamp-6 text-foreground/80 leading-relaxed italic font-display text-lg">
                                    {analysis?.report ? analysis.report.split('\n').filter(line => !line.startsWith('#')).slice(0, 5).join(' ') + "..." : "Generating insights..."}
                                </div>
                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-md px-4 py-3 text-[11px] text-muted-foreground leading-snug shadow-md hover:bg-zinc-900/60 transition-colors">
                                        Voice Briefing Studio now turns this report into a premium spoken memo.
                                    </div>
                                    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-md px-4 py-3 text-[11px] text-muted-foreground leading-snug shadow-md hover:bg-zinc-900/60 transition-colors">
                                        Vision Lab can inspect charts, receipts, and screenshots with structured output.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            {displaySector && <CapitalFlowChart sector={displaySector} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-[300px]">
                        {displaySector && <SentimentBubbles sector={displaySector} />}
                        <CorrelationHeatmap />
                        {displaySector && <TrendProjection sector={displaySector} />}
                    </div>

                    <div className="bg-zinc-950/40 backdrop-blur-lg border border-white/[0.06] rounded-[2rem] p-8 shadow-2xl shadow-black/60 relative overflow-hidden transition-all duration-300">
                        <div className="absolute top-6 right-8 text-[10px] font-mono font-bold text-muted-foreground/30">§ COMPLETE REPORT</div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.1)]">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                                Market Intelligence Dossier
                            </h2>
                        </div>
                        <div className="section-divider mb-8" />
                        {analysis && <AnalysisReport analysis={analysis} />}
                    </div>

                    {analysis?.report && displaySector && (
                        <div className="bg-zinc-950/40 backdrop-blur-lg border border-white/[0.06] rounded-[2rem] p-8 shadow-2xl shadow-black/60 relative overflow-hidden transition-all duration-300">
                            <div className="absolute top-6 right-8 text-[10px] font-mono font-bold text-muted-foreground/30">§ VOICE & VISION</div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.1)]">
                                    <Mic2 className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                                        Voice Briefing Studio
                                    </h2>
                                </div>
                                <span className="text-[11px] text-muted-foreground/40 font-mono">&</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/15 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
                                        <ScanSearch className="h-4 w-4 text-cyan-400" />
                                    </div>
                                    <span className="text-xl md:text-2xl font-display font-bold tracking-tight bg-gradient-to-r from-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                                        Vision Lab
                                    </span>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground/50 ml-[52px] mb-2">Transform your report into a premium spoken briefing or analyse charts with AI vision</p>
                            <div className="section-divider mb-6" />
                            <AIOperatorStudio sector={displaySector} report={analysis.report} />
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-display italic">Initializing Workspace...</p>
            </div>
        }>
            <ResultsContent />
        </Suspense>
    );
}
