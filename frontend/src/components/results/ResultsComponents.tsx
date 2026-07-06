"use client";

import React, { useEffect, useState, useRef } from "react";
import {
    AreaChart,
    Area,
    LineChart as RCLineChart,
    Line,
    Legend,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    LineChart,
    BarChart3,
    Network,
    MessageSquare,
    ExternalLink,
} from "lucide-react";
import {
    getMarketData,
    getSectorNews,
    getRelativeStrength,
    getCorrelationMatrix,
    MarketDataResponse,
    NewsItem,
    RelativeStrengthResponse,
    CorrelationMatrix,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared chrome for every chart card on /results
// ---------------------------------------------------------------------------

export function CardShell({
    title,
    icon: Icon,
    badge,
    children,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | null>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        if (cardRef.current) {
            rectRef.current = cardRef.current.getBoundingClientRect();
        }
        setIsHovered(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rectRef.current) return;
        setCoords({
            x: e.clientX - rectRef.current.left,
            y: e.clientY - rectRef.current.top,
        });
    };

    const handleMouseLeave = () => {
        rectRef.current = null;
        setIsHovered(false);
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-zinc-950/50 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 h-full flex flex-col shadow-[0_8px_32px_rgb(0,0,0,0.6)] hover:border-primary/25 hover:shadow-[0_12px_40px_rgba(34,197,94,0.06)] transition-all duration-500 relative overflow-hidden group"
        >
            {/* Top accent gradient bar */}
            <div className="card-accent-bar" />

            {/* Interactive Spotlight Radial Background */}
            <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(280px circle at ${coords.x}px ${coords.y}px, rgba(34, 197, 94, 0.06), rgba(6, 182, 212, 0.03) 50%, transparent 80%)`,
                    opacity: isHovered ? 1 : 0,
                }}
            />
            {/* Interactive Spotlight Radial Border overlay */}
            <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500"
                style={{
                    background: `radial-gradient(160px circle at ${coords.x}px ${coords.y}px, rgba(34, 197, 94, 0.2), rgba(6, 182, 212, 0.1) 40%, transparent 60%)`,
                    opacity: isHovered ? 1 : 0,
                    maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                    WebkitMaskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                    maskComposite: "exclude",
                    WebkitMaskComposite: "destination-out",
                    border: "1px solid transparent",
                }}
            />

            {/* Subtle noise texture */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.015]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22/%3E%3C/filter%3E%3Crect width=%22256%22 height=%22256%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')" }} />

            <div className="flex items-center justify-between gap-3 mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center icon-pulse-ring shadow-[0_0_12px_rgba(34,197,94,0.1)]">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-foreground/95 tracking-tight font-display">{title}</h3>
                    </div>
                </div>
                {badge && (
                    <div className="shrink-0">
                        {badge}
                    </div>
                )}
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
                {children}
            </div>
        </motion.div>
    );
}

export function ShimmerCard({
    title,
    icon: Icon,
    heightClass = "min-h-[160px]"
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    heightClass?: string;
}) {
    return (
        <div className="bg-zinc-950/45 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 h-full flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.5)] relative overflow-hidden group">
            {/* Shimmer element */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent bg-[length:200%_100%] animate-shimmer" />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white/20 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-foreground/40">{title}</h3>
            </div>
            
            <div className={cn("flex-grow flex flex-col justify-center space-y-3 relative z-10", heightClass)}>
                <div className="h-3 bg-white/[0.05] rounded w-11/12 animate-pulse" />
                <div className="h-3 bg-white/[0.04] rounded w-5/6 animate-pulse" />
                <div className="h-3 bg-white/[0.04] rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-white/[0.03] rounded w-2/3 animate-pulse" />
            </div>
        </div>
    );
}

interface TooltipPayloadItem {
    name: string;
    value: number | string;
    stroke?: string;
    fill?: string;
}

interface PremiumChartTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string | number;
}

const PremiumChartTooltip = ({ active, payload, label }: PremiumChartTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950/85 backdrop-blur-md border border-white/[0.08] rounded-xl p-3 shadow-xl text-[11px] font-sans">
                <p className="text-zinc-500 font-mono mb-1.5 uppercase tracking-wider">{label}</p>
                <div className="space-y-1.5 min-w-[120px]">
                    {payload.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stroke || item.fill }} />
                                <span className="text-zinc-300 font-medium">{item.name}</span>
                            </div>
                            <span className="font-mono font-bold text-white">
                                {typeof item.value === 'number' ? item.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// ---------------------------------------------------------------------------
// Hooks — centralise the fetch logic so each chart component stays small
// ---------------------------------------------------------------------------

function useMarketData(sector: string) {
    const [data, setData] = useState<MarketDataResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getMarketData(sector)
            .then((res) => !cancelled && setData(res))
            .catch(() => !cancelled && setData({ status: "unavailable", sector, ticker: null, reason: "Network error" }))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [sector]);

    return { data, loading };
}

function useSectorNews(sector: string, limit = 10) {
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getSectorNews(sector, limit)
            .then((res) => !cancelled && setItems(res.items))
            .catch(() => !cancelled && setItems([]))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [sector, limit]);

    return { items, loading };
}

// ---------------------------------------------------------------------------
// SectorVitals — live index close, day change, 52-week range, volume
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)} K`;
    return n.toLocaleString();
}

function ChangeBadge({ value }: { value: number }) {
    const positive = value > 0;
    const neutral = Math.abs(value) < 0.01;
    const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
    const color = neutral ? "text-yellow-500" : positive ? "text-green-500" : "text-red-500";
    return (
        <div className={`flex items-center gap-1 text-sm font-medium ${color}`}>
            <Icon className="h-3.5 w-3.5" />
            {value.toFixed(2)}%
        </div>
    );
}

export function SectorVitals({ sector }: { sector: string }) {
    const { data, loading } = useMarketData(sector);

    const badge = data?.ticker ? (
        <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/50 border border-border">
            {data.ticker}
        </span>
    ) : null;

    if (loading) {
        return <ShimmerCard title="Sector Vitals" icon={Activity} heightClass="min-h-[160px]" />;
    }

    if (!data || data.status !== "ok" || !data.vitals) {
        return (
            <CardShell title="Sector Vitals" icon={Activity}>
                <p className="text-sm text-muted-foreground flex-1">
                    Live data for <span className="text-foreground">{sector}</span> is not available yet.
                    {data?.reason ? ` (${data.reason})` : ""}
                </p>
            </CardShell>
        );
    }

    const rows: [string, React.ReactNode][] = [
        ["Last close", data.vitals.close.toLocaleString()],
        ["Day change", <ChangeBadge key="dc" value={data.vitals.change_pct} />],
        ["Day range", `${data.vitals.day_low.toLocaleString()} – ${data.vitals.day_high.toLocaleString()}`],
        ["Volume", formatNumber(data.vitals.volume)],
    ];
    if (data.fifty_two_week) {
        rows.push([
            "52-week range",
            `${data.fifty_two_week.low.toLocaleString()} – ${data.fifty_two_week.high.toLocaleString()}`,
        ]);
    }
    if (data.benchmark) {
        rows.push(["Nifty 50", <ChangeBadge key="n50" value={data.benchmark.change_pct} />]);
    }

    return (
        <CardShell title="Sector Vitals" icon={Activity} badge={badge}>
            <div className="space-y-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground font-medium">{value}</span>
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

// ---------------------------------------------------------------------------
// TrendProjection — 12-month monthly closes (real yfinance data)
// ---------------------------------------------------------------------------

export function TrendProjection({ sector }: { sector: string }) {
    const { data, loading } = useMarketData(sector);

    if (loading) {
        return <ShimmerCard title="12-month Trend" icon={LineChart} heightClass="min-h-[200px]" />;
    }

    if (!data || data.status !== "ok" || !data.trend || data.trend.length < 2) {
        return (
            <CardShell title="12-month Trend" icon={LineChart}>
                <p className="text-sm text-muted-foreground">
                    Not enough history for <span className="text-foreground">{sector}</span> yet.
                </p>
            </CardShell>
        );
    }

    const chartData = data.trend.map((p) => ({ label: p.month, close: p.close }));
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    const totalChange = ((last / first - 1) * 100).toFixed(1);
    const up = last >= first;
    const stroke = up ? "#22c55e" : "#ef4444";

    const closes = chartData.map((p) => p.close);
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);
    const closePadding = (maxClose - minClose) * 0.05 || 1;
    const yDomain = [minClose - closePadding, maxClose + closePadding];

    return (
        <CardShell
            title="12-month Trend"
            icon={LineChart}
            badge={
                <span className={`text-xs font-medium ${up ? "text-green-500" : "text-red-500"}`}>
                    {up ? "▲" : "▼"} {totalChange}%
                </span>
            }
        >
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 15, right: 15, bottom: 10, left: 10 }}>
                        <defs>
                            <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={stroke} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="label" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                            stroke="#666"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            domain={yDomain}
                            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                        />
                        <Tooltip content={<PremiumChartTooltip />} cursor={{ stroke: "rgba(34, 197, 94, 0.15)", strokeWidth: 1.5 }} />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke={stroke}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#trend-gradient)"
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
                Source: Yahoo Finance • {data.ticker}
            </p>
        </CardShell>
    );
}

// ---------------------------------------------------------------------------
// SentimentBubbles — real news items with VADER sentiment badges
// ---------------------------------------------------------------------------

export function SentimentBubbles({ sector = "" }: { sector?: string }) {
    const { items, loading } = useSectorNews(sector, 6);

    if (loading) {
        return <ShimmerCard title="Social Sentiment" icon={MessageSquare} heightClass="min-h-[200px]" />;
    }

    if (!items.length) {
        return (
            <CardShell title="Social Sentiment" icon={MessageSquare}>
                <p className="text-sm text-muted-foreground">No recent news for this sector.</p>
            </CardShell>
        );
    }

    const avg = items.reduce((s, i) => s + i.sentiment_score, 0) / items.length;
    const avgLabel = avg >= 0.25 ? "Bullish" : avg <= -0.25 ? "Bearish" : "Neutral";
    const avgBg = avg >= 0.25 ? "bg-green-500" : avg <= -0.25 ? "bg-red-500" : "bg-yellow-500";
    const avgColor = avg >= 0.25 ? "text-green-400" : avg <= -0.25 ? "text-red-400" : "text-yellow-400";
    const avgBgFaded = avg >= 0.25 ? "bg-green-500/15" : avg <= -0.25 ? "bg-red-500/15" : "bg-yellow-500/15";
    const bullishCount = items.filter(i => i.sentiment_label === "bullish").length;
    const bearishCount = items.filter(i => i.sentiment_label === "bearish").length;
    // Gauge: 0 = all bearish, 100 = all bullish
    const gaugePercent = items.length > 0 ? Math.round(((avg + 1) / 2) * 100) : 50;

    return (
        <CardShell
            title="Social Sentiment"
            icon={MessageSquare}
            badge={
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${avgBgFaded} ${avgColor} border border-current/10`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${avgBg}`} />
                    {avgLabel}
                </span>
            }
        >
            {/* Sentiment gauge bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Bearish</span>
                    <span className={`font-bold text-[11px] ${avgColor}`}>{avg.toFixed(2)} avg</span>
                    <span>Bullish</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                        className={`h-full rounded-full gauge-fill-animate ${avgBg}`}
                        style={{ width: `${gaugePercent}%`, opacity: 0.7 }}
                    />
                </div>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[180px] pr-1 scrollbar-thin">
                {items.slice(0, 6).map((item) => {
                    const sentColor = item.sentiment_label === "bullish" ? "border-green-500/30 hover:border-green-500/60" : item.sentiment_label === "bearish" ? "border-red-500/30 hover:border-red-500/60" : "border-yellow-500/30 hover:border-yellow-500/60";
                    const dotColor = item.sentiment_label === "bullish" ? "bg-green-500" : item.sentiment_label === "bearish" ? "bg-red-500" : "bg-yellow-500";
                    return (
                        <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block p-2.5 rounded-xl border ${sentColor} bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200`}
                        >
                            <div className="flex items-start gap-2.5">
                                <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0 shadow-[0_0_6px_currentColor]`} style={{ color: item.sentiment_label === "bullish" ? "#22c55e" : item.sentiment_label === "bearish" ? "#ef4444" : "#eab308" }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed font-medium">
                                        {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span
                                            className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-bold ${
                                                item.sentiment_label === "bullish"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : item.sentiment_label === "bearish"
                                                        ? "bg-red-500/10 text-red-400"
                                                        : "bg-yellow-500/10 text-yellow-400"
                                            }`}
                                        >
                                            {item.sentiment_score.toFixed(2)}
                                        </span>
                                        {item.source && (
                                            <span className="text-[10px] text-muted-foreground/60 truncate">
                                                {item.source}
                                            </span>
                                        )}
                                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/40 flex-shrink-0 ml-auto" />
                                    </div>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>

            {/* Stats summary row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-[10px] text-muted-foreground">
                <span>{items.length} articles</span>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{bullishCount} bullish</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{bearishCount} bearish</span>
                </div>
            </div>
        </CardShell>
    );
}

// ---------------------------------------------------------------------------
// CapitalFlowChart — sector index vs Nifty 50, normalised to 100 at start.
// This is the honest proxy for "where is capital flowing": outperforming
// sectors attract capital. Labelled "Relative Strength" for accuracy.
// ---------------------------------------------------------------------------

function useRelativeStrength(sector: string) {
    const [data, setData] = useState<RelativeStrengthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getRelativeStrength(sector)
            .then((res) => !cancelled && setData(res))
            .catch(() => !cancelled && setData({ status: "unavailable", sector, reason: "Network error" }))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [sector]);
    return { data, loading };
}

export function CapitalFlowChart({ sector }: { sector: string }) {
    const { data, loading } = useRelativeStrength(sector);

    if (loading) {
        return <ShimmerCard title="Relative Strength" icon={BarChart3} heightClass="min-h-[180px]" />;
    }

    if (!data || data.status !== "ok" || !data.sector_series || !data.benchmark_series) {
        return (
            <CardShell title="Relative Strength" icon={BarChart3}>
                <p className="text-sm text-muted-foreground">
                    No benchmark data available for <span className="text-foreground">{sector}</span>.
                    {data?.reason ? ` (${data.reason})` : ""}
                </p>
            </CardShell>
        );
    }

    // Merge the two series into one recharts dataset keyed by date.
    const merged = data.sector_series.map((p, i) => ({
        date: p.date,
        sector: p.value,
        nifty: data.benchmark_series?.[i]?.value ?? null,
    }));
    const outperform = data.outperformance_pct ?? 0;
    const winning = outperform >= 0;

    const values = merged.flatMap(d => [d.sector, d.nifty].filter((v): v is number => v !== null));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valPadding = (maxVal - minVal) * 0.05 || 1;
    const yDomain = [minVal - valPadding, maxVal + valPadding];

    const sectorReturn = (data.sector_total_return_pct ?? 0);
    const benchReturn = (data.benchmark_total_return_pct ?? 0);

    return (
        <CardShell
            title="Relative Strength"
            icon={BarChart3}
            badge={
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${winning ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                    {winning ? "▲" : "▼"} {Math.abs(outperform).toFixed(2)} pts
                </span>
            }
        >
            <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RCLineChart data={merged} margin={{ top: 15, right: 15, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                        <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} tick={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} domain={yDomain} />
                        <Tooltip content={<PremiumChartTooltip />} cursor={{ stroke: "rgba(34, 197, 94, 0.12)", strokeWidth: 1 }} />
                        <Legend wrapperStyle={{ fontSize: 10, opacity: 0.7 }} />
                        <Line
                            type="monotone"
                            dataKey="sector"
                            stroke="#22c55e"
                            strokeWidth={2.5}
                            dot={false}
                            name={sector}
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        />
                        <Line
                            type="monotone"
                            dataKey="nifty"
                            stroke="#555"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            dot={false}
                            name="Nifty 50"
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        />
                    </RCLineChart>
                </ResponsiveContainer>
            </div>

            {/* Stat row */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
                <div className="flex-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] text-muted-foreground">Sector</span>
                    <span className={`text-[11px] font-bold ${sectorReturn >= 0 ? "text-green-400" : "text-red-400"}`}>{sectorReturn >= 0 ? "+" : ""}{sectorReturn.toFixed(1)}%</span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-500" />
                    <span className="text-[10px] text-muted-foreground">Nifty 50</span>
                    <span className={`text-[11px] font-bold ${benchReturn >= 0 ? "text-green-400" : "text-red-400"}`}>{benchReturn >= 0 ? "+" : ""}{benchReturn.toFixed(1)}%</span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Alpha</span>
                    <span className={`text-[11px] font-bold ${winning ? "text-green-400" : "text-red-400"}`}>{winning ? "+" : ""}{outperform.toFixed(1)} pts</span>
                </div>
            </div>
        </CardShell>
    );
}


// ---------------------------------------------------------------------------
// CorrelationHeatmap — 90-day pairwise correlation across NSE sector indices.
// ---------------------------------------------------------------------------

function correlationColor(v: number): string {
    // Red for negative, green for positive, alpha scales with magnitude.
    const abs = Math.min(1, Math.abs(v));
    if (v >= 0) {
        return `rgba(34, 197, 94, ${abs})`;
    }
    return `rgba(239, 68, 68, ${abs})`;
}

export function CorrelationHeatmap() {
    const [matrix, setMatrix] = useState<CorrelationMatrix | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getCorrelationMatrix()
            .then((res) => !cancelled && setMatrix(res))
            .catch(() => !cancelled && setMatrix(null))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return <ShimmerCard title="Sector Correlations" icon={Network} heightClass="min-h-[200px]" />;
    }

    if (!matrix || !matrix.labels.length) {
        return (
            <CardShell title="Sector Correlations" icon={Network}>
                <p className="text-sm text-muted-foreground">Correlation data unavailable right now.</p>
            </CardShell>
        );
    }

    const n = matrix.labels.length;
    return (
        <CardShell
            title="Sector Correlations"
            icon={Network}
            badge={
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    90-day returns
                </span>
            }
        >
            <div className="overflow-auto">
                <div
                    className="grid gap-[3px]"
                    style={{
                        gridTemplateColumns: `minmax(52px, auto) repeat(${n}, minmax(30px, 1fr))`,
                    }}
                >
                    <div />
                    {matrix.labels.map((label) => (
                        <div key={`col-${label}`} className="text-[10px] text-muted-foreground/80 text-center font-semibold py-1.5 tracking-tight">
                            {label}
                        </div>
                    ))}

                    {matrix.labels.map((rowLabel, i) => (
                        <React.Fragment key={`row-${rowLabel}`}>
                            <div className="text-[10px] text-muted-foreground/80 text-right pr-2.5 py-0.5 font-semibold self-center tracking-tight">
                                {rowLabel}
                            </div>
                            {matrix.matrix[i].map((value, j) => (
                                <div
                                    key={`cell-${i}-${j}`}
                                    className="corr-cell aspect-square rounded-lg flex items-center justify-center text-[9px] font-mono font-bold border border-white/[0.04] cursor-default relative"
                                    style={{
                                        backgroundColor: correlationColor(value),
                                        color: Math.abs(value) > 0.5 ? "white" : "#999",
                                    }}
                                    title={`${rowLabel} ↔ ${matrix.labels[j]}: ${value.toFixed(3)}`}
                                >
                                    {i === j ? <span className="opacity-40">—</span> : value.toFixed(1)}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Color legend gradient bar */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-red-400 font-medium">−1</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.8), rgba(239,68,68,0.2) 30%, rgba(255,255,255,0.05) 50%, rgba(34,197,94,0.2) 70%, rgba(34,197,94,0.8))" }} />
                    <span className="text-[9px] text-green-400 font-medium">+1</span>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground/50 text-center">
                    Red = inverse · Green = correlated · Hover for detail
                </p>
            </div>
        </CardShell>
    );
}
