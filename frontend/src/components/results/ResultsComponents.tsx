"use client";

import { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// --- Mock Data Generators ---
const generateVitalData = (sector: string) => {
    const hash = sector.length;
    return [
        { name: "Nifty " + sector, change: hash * 1.2, trend: "up" },
        { name: "Top Gainer", change: hash * 0.8, trend: "up" },
        { name: "Top Loser", change: -hash * 0.3, trend: "down" },
        { name: "Volume (M)", change: 10 + hash, trend: "neutral" },
    ];
};

const generateFlowData = (sector: string) => [
    { name: "Institutional", value: 60 + (sector.length % 20) },
    { name: "Retail", value: 30 - (sector.length % 10) },
];

const generateTrendData = () =>
    Array.from({ length: 12 }, (_, i) => ({
        month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
        value: 50 + Math.random() * 50 + i * 2,
    }));

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"];

// --- Components ---

export function SectorVitals({ sector }: { sector: string }) {
    const data = useMemo(() => generateVitalData(sector), [sector]);

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 text-foreground/90">Sector Vitals</h3>
            <div className="space-y-4">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <div className={`flex items-center gap-1 text-sm font-medium ${item.trend === "up" ? "text-green-500" : item.trend === "down" ? "text-red-500" : "text-yellow-500"
                            }`}>
                            {item.change.toFixed(2)}%
                            {item.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> :
                                item.trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CapitalFlowChart({ sector }: { sector: string }) {
    const data = useMemo(() => generateFlowData(sector), [sector]);

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-2 text-foreground/90">Capital Flow</h3>
            <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1e1e1e", border: "none", borderRadius: "8px" }}
                            itemStyle={{ color: "#fff" }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-2xl font-bold">{data[0].value}%</div>
                        <div className="text-xs text-muted-foreground">Inst. Flow</div>
                    </div>
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-2">
                {data.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TrendProjection({ sector }: { sector: string }) {
    const data = useMemo(() => generateTrendData(), [sector]);

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 text-foreground/90">Trend Projection</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1e1e1e", border: "none", borderRadius: "8px" }}
                            itemStyle={{ color: "#fff" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function CorrelationHeatmap() {
    // Simple CSS grid heatmap for Demo
    const items = ["Tech", "Pharma", "Bank", "Auto", "FMCG"];

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 text-foreground/90">Correlation Matrix</h3>
            <div className="grid grid-cols-6 gap-1 text-xs">
                <div />
                {items.map(t => <div key={t} className="text-center font-medium text-muted-foreground">{t}</div>)}

                {items.map((row, i) => (
                    <>
                        <div className="font-medium text-muted-foreground self-center">{row}</div>
                        {items.map((col, j) => {
                            const val = i === j ? 1 : Math.abs(Math.sin(i * j + 1));
                            return (
                                <motion.div
                                    key={`${row}-${col}`}
                                    className="aspect-square rounded flex items-center justify-center font-mono"
                                    style={{
                                        backgroundColor: `rgba(59, 130, 246, ${val})`,
                                        color: val > 0.5 ? "white" : "#888"
                                    }}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    {val.toFixed(1).replace("1.0", "1")}
                                </motion.div>
                            );
                        })}
                    </>
                ))}
            </div>
        </div>
    );
}

export function SentimentBubbles() {
    // Simple Mock Bubbles
    const bubbles = [
        { text: "Bullish", size: 80, color: "bg-green-500/20 text-green-500", x: "20%", y: "30%" },
        { text: "Growth", size: 60, color: "bg-blue-500/20 text-blue-500", x: "60%", y: "20%" },
        { text: "Risk", size: 50, color: "bg-red-500/20 text-red-500", x: "40%", y: "60%" },
        { text: "Neutral", size: 40, color: "bg-yellow-500/20 text-yellow-500", x: "80%", y: "50%" },
        { text: "Innovation", size: 55, color: "bg-purple-500/20 text-purple-500", x: "30%", y: "70%" },
    ];

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full relative overflow-hidden">
            <h3 className="text-lg font-semibold mb-4 text-foreground/90">Social Sentiment</h3>
            <div className="h-[200px] relative">
                {bubbles.map((b, i) => (
                    <motion.div
                        key={i}
                        className={`absolute rounded-full flex items-center justify-center font-medium border border-current ${b.color}`}
                        style={{
                            width: b.size,
                            height: b.size,
                            left: b.x,
                            top: b.y,
                            fontSize: b.size / 5
                        }}
                        animate={{
                            y: [0, -10, 0],
                            scale: [1, 1.05, 1]
                        }}
                        transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        {b.text}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
