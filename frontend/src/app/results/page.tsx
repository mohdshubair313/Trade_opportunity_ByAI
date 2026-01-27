"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAnalysis } from "@/hooks/useAnalysis";
import { SectorVitals, CapitalFlowChart, TrendProjection, CorrelationHeatmap, SentimentBubbles } from "@/components/results/ResultsComponents";
import { AnalysisReport } from "@/components/dashboard/AnalysisReport";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ResultsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sector = searchParams.get("sector");

    const { analyze, analysis, isLoading: isAnalyzing, error } = useAnalysis();

    // Trigger analysis on mount
    useEffect(() => {
        if (sector) {
            analyze(sector);
        }
    }, [sector]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!sector) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">No Sector Selected</h2>
                <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            {sector} <span className="text-primary/60 text-lg font-normal">Analysis</span>
                        </h1>
                        <p className="text-muted-foreground text-sm">AI-Powered Market Intelligence • v2.1</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center gap-2">
                        <Sparkles className="h-3 w-3" /> Gemini Ultra Enabled
                    </div>
                </div>
            </div>

            {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground animate-pulse">Analyzing market data sources...</p>
                </div>
            ) : error ? (
                <div className="border border-red-500/50 bg-red-500/10 rounded-xl p-8 text-center">
                    <h3 className="text-xl font-bold text-red-500 mb-2">Analysis Failed</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => analyze(sector)}>Retry Analysis</Button>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Top Row: Vitals & Capital Flow & AI Summary Header */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-3">
                            <SectorVitals sector={sector} />
                        </div>
                        <div className="md:col-span-6 flex flex-col gap-6">
                            {/* Main AI Insight Summary Card could go here or the Report */}
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 min-h-[200px]">
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" /> Gemini Intelligence
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none line-clamp-6">
                                    {/* Extract simplified text from report or show simplified view */}
                                    {analysis?.report ? analysis.report.split('\n').filter(line => !line.startsWith('#')).slice(0, 5).join(' ') + "..." : "Generating insights..."}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <CapitalFlowChart sector={sector} />
                        </div>
                    </div>

                    {/* Middle Row: Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[300px]">
                        <SentimentBubbles />
                        <CorrelationHeatmap />
                        <TrendProjection sector={sector} />
                    </div>

                    {/* Bottom: Detailed Report */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6">
                        <h2 className="text-2xl font-bold mb-6">Comprehensive Report</h2>
                        {analysis && <AnalysisReport analysis={analysis} />}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
