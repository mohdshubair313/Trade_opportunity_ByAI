"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAnalysis } from "@/hooks/useAnalysis";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WatchButton } from "@/components/dashboard/WatchButton";

const SectorVitals = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.SectorVitals })), { ssr: false });
const CapitalFlowChart = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.CapitalFlowChart })), { ssr: false });
const TrendProjection = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.TrendProjection })), { ssr: false });
const CorrelationHeatmap = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.CorrelationHeatmap })), { ssr: false });
const SentimentBubbles = dynamic(() => import("@/components/results/ResultsComponents").then(m => ({ default: m.SentimentBubbles })), { ssr: false });
const AnalysisReport = dynamic(() => import("@/components/dashboard/AnalysisReport").then(m => ({ default: m.AnalysisReport })), { ssr: false });
const AIOperatorStudio = dynamic(() => import("@/components/results/AIOperatorStudio").then(m => ({ default: m.AIOperatorStudio })), { ssr: false });

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
    }, [sector, idParam]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight flex items-center gap-2">
                            {displaySector || "Loading…"} <span className="text-primary/60 text-xl font-normal">Analysis</span>
                        </h1>
                        <p className="text-muted-foreground text-sm tracking-wide uppercase font-mono opacity-60">AI-Powered Market Intelligence • v2.1</p>
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
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground animate-pulse font-display text-xl italic">
                        {idParam ? "Restoring intelligence from archive…" : "Synthesizing market report from live sources..."}
                    </p>
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
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-[2rem] p-8 min-h-[200px] shadow-inner relative overflow-hidden group">
                                <div className="absolute top-4 right-6 text-[10px] font-mono font-bold text-primary/40">§ EXECUTIVE</div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" /> AI Intelligence
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none line-clamp-6 text-foreground/80 leading-relaxed italic font-display text-lg">
                                    {analysis?.report ? analysis.report.split('\n').filter(line => !line.startsWith('#')).slice(0, 5).join(' ') + "..." : "Generating insights..."}
                                </div>
                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] text-muted-foreground leading-snug">
                                        Voice Briefing Studio now turns this report into a premium spoken memo.
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] text-muted-foreground leading-snug">
                                        Vision Lab can inspect charts, receipts, and screenshots with structured output.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            {displaySector && <CapitalFlowChart sector={displaySector} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[300px]">
                        {displaySector && <SentimentBubbles sector={displaySector} />}
                        <CorrelationHeatmap />
                        {displaySector && <TrendProjection sector={displaySector} />}
                    </div>

                    {analysis?.report && displaySector && (
                        <AIOperatorStudio sector={displaySector} report={analysis.report} />
                    )}

                    <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-2xl shadow-black/20 relative overflow-hidden">
                        <div className="absolute top-6 right-8 text-[10px] font-mono font-bold text-muted-foreground/30">§ COMPLETE REPORT</div>
                        <h2 className="text-2xl md:text-3xl font-display font-semibold mb-8">Comprehensive Report</h2>
                        {analysis && <AnalysisReport analysis={analysis} />}
                    </div>
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
