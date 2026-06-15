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
            className="bg-zinc-950/45 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 h-full flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:border-primary/20 hover:shadow-primary/[0.02] transition-all duration-300 relative overflow-hidden group"
        >
            {/* Interactive Spotlight Radial Background */}
            <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(250px circle at ${coords.x}px ${coords.y}px, rgba(34, 197, 94, 0.07), transparent 80%)`,
                    opacity: isHovered ? 1 : 0,
                }}
            />
            {/* Interactive Spotlight Radial Border overlay */}
            <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(150px circle at ${coords.x}px ${coords.y}px, rgba(34, 197, 94, 0.25), transparent 60%)`,
                    opacity: isHovered ? 1 : 0,
                    maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                    WebkitMaskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                    maskComposite: "exclude",
                    WebkitMaskComposite: "destination-out",
                    border: "1px solid transparent",
                }}
            />

            <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground/90">{title}</h3>
                </div>
                {badge}
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
    const avgColor = avg >= 0.25 ? "text-green-500" : avg <= -0.25 ? "text-red-500" : "text-yellow-500";

    return (
        <CardShell
            title="Social Sentiment"
            icon={MessageSquare}
            badge={
                <span className={`text-xs font-medium ${avgColor}`}>
                    {avgLabel} ({avg.toFixed(2)})
                </span>
            }
        >
            <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                {items.slice(0, 6).map((item) => (
                    <a
                        key={item.url}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2.5 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-foreground/90 line-clamp-2 flex-1">
                                {item.title}
                            </p>
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium ${item.sentiment_label === "bullish"
                                    ? "bg-green-500/10 text-green-500"
                                    : item.sentiment_label === "bearish"
                                        ? "bg-red-500/10 text-red-500"
                                        : "bg-yellow-500/10 text-yellow-500"
                                    }`}
                            >
                                {item.sentiment_label} {item.sentiment_score.toFixed(2)}
                            </span>
                            {item.source && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                    {item.source}
                                </span>
                            )}
                        </div>
                    </a>
                ))}
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

    return (
        <CardShell
            title="Relative Strength"
            icon={BarChart3}
            badge={
                <span className={`text-xs font-medium ${winning ? "text-green-500" : "text-red-500"}`}>
                    {winning ? "▲" : "▼"} {Math.abs(outperform).toFixed(2)} pts vs Nifty
                </span>
            }
        >
            <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RCLineChart data={merged} margin={{ top: 15, right: 15, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} tick={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} domain={yDomain} />
                        <Tooltip content={<PremiumChartTooltip />} cursor={{ stroke: "rgba(34, 197, 94, 0.15)", strokeWidth: 1.5 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                            type="monotone"
                            dataKey="sector"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name={sector}
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        />
                        <Line
                            type="monotone"
                            dataKey="nifty"
                            stroke="#666"
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
            <p className="mt-1 text-[11px] text-muted-foreground">
                6-month total return: sector {(data.sector_total_return_pct ?? 0).toFixed(1)}% · Nifty {(data.benchmark_total_return_pct ?? 0).toFixed(1)}%
            </p>
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
            badge={<span className="text-[11px] text-muted-foreground">90-day daily returns</span>}
        >
            <div className="overflow-auto">
                <div
                    className="grid gap-[2px]"
                    style={{
                        gridTemplateColumns: `minmax(48px, auto) repeat(${n}, minmax(28px, 1fr))`,
                    }}
                >
                    <div />
                    {matrix.labels.map((label) => (
                        <div key={`col-${label}`} className="text-[10px] text-muted-foreground text-center font-medium py-1">
                            {label}
                        </div>
                    ))}

                    {matrix.labels.map((rowLabel, i) => (
                        <React.Fragment key={`row-${rowLabel}`}>
                            <div className="text-[10px] text-muted-foreground text-right pr-2 py-0.5 font-medium self-center">
                                {rowLabel}
                            </div>
                            {matrix.matrix[i].map((value, j) => (
                                <div
                                    key={`cell-${i}-${j}`}
                                    className="aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono font-medium"
                                    style={{
                                        backgroundColor: correlationColor(value),
                                        color: Math.abs(value) > 0.5 ? "white" : "#aaa",
                                    }}
                                    title={`${rowLabel} ↔ ${matrix.labels[j]}: ${value.toFixed(3)}`}
                                >
                                    {value.toFixed(1).replace("1.0", "1")}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
                Green = move together · Red = move opposite · intensity scales with strength
            </p>
        </CardShell>
    );
}
