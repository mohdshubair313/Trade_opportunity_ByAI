"use client";

import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";
import {
  Sparkles,
  Globe,
  FileText,
  Shield,
  Bell,
  Zap,
} from "lucide-react";
import { TextReveal } from "@/components/animations/TextReveal";

// Bento layout:
//   Row 1: [big AI-Powered Analysis]   [Real-Time Data]
//   Row 2: [Detailed Reports]           [big Lightning Fast]
//   Row 3: [Alerts] [Secure]          (a clean 2-col bottom row)
// Every tile is dark glass with violet/fuchsia/cyan gradient accents.

export function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-28 px-4">
      <div className="container mx-auto">
        <SectionHeader
          eyebrow="Platform"
          title={
            <>
              The research desk,{" "}
              <span className="font-display italic text-violet-300">
                condensed
              </span>{" "}
              into seconds.
            </>
          }
          subtitle="Every feature exists for one reason: to get you from question to decision without the boring middle."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          {/* Row 1: big + small */}
          <BentoTile
            index={1}
            className="md:col-span-2"
            icon={<Sparkles className="h-5 w-5" />}
            title="AI-Powered Analysis"
            description="A cascade of specialised AI models reads filings, news and the tape — then writes a structured report with cited sources, tailored to your persona and capital."
            visual={<AnalysisVisual />}
            inView={inView}
            delay={0}
          />
          <BentoTile
            index={2}
            icon={<Globe className="h-5 w-5" />}
            title="Real-Time Data"
            description="NSE sector indices, benchmark deltas and news sentiment — continuously refreshed."
            visual={<PulseVisual />}
            inView={inView}
            delay={0.05}
          />
          {/* Row 2: small + big */}
          <BentoTile
            index={3}
            icon={<FileText className="h-5 w-5" />}
            title="Detailed Reports"
            description="Executive summary, opportunities, risks, recommendations. Export to PDF, PPTX, XLSX or Markdown."
            visual={<ReportVisual />}
            inView={inView}
            delay={0.1}
          />
          <BentoTile
            index={4}
            className="md:col-span-2"
            icon={<Zap className="h-5 w-5" />}
            title="Lightning Fast"
            description="A tuned model router falls through free-tier LLMs before it blinks. Median end-to-end analysis: under fifteen seconds."
            visual={<LatencyVisual />}
            inView={inView}
            delay={0.15}
          />
          {/* Row 3: two small */}
          <BentoTile
            index={5}
            icon={<Bell className="h-5 w-5" />}
            title="Watchlist Alerts"
            description="Pin sectors. We re-analyse on your cadence and ping you only when something material changes."
            inView={inView}
            delay={0.2}
          />
          <BentoTile
            index={6}
            icon={<Shield className="h-5 w-5" />}
            title="Private by Default"
            description="JWT scoped per user. Your reports, watchlists and favourites never surface to another account."
            className="md:col-span-2"
            inView={inView}
            delay={0.25}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section header — reusable across landing sections
// ---------------------------------------------------------------------------

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200 mb-8 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
        <Sparkles className="h-3 w-3" />
        {eyebrow}
      </div>
      <TextReveal
        as="h2"
        stagger={0.05}
        className="text-3xl md:text-5xl tracking-tight leading-[1.1] font-semibold text-white block [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]"
      >
        {title}
      </TextReveal>
      <p className="mt-4 text-base md:text-lg text-white/65 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bento tile — dark glass with violet gradient accents
// ---------------------------------------------------------------------------

interface TileProps {
  index: number;
  icon: ReactNode;
  title: string;
  description: string;
  visual?: ReactNode;
  className?: string;
  inView: boolean;
  delay: number;
}

function BentoTile({ index, icon, title, description, visual, className = "", inView, delay }: TileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      className={`group relative h-full ${className}`}
    >
      {/* Glass tile */}
      <div className="relative h-full rounded-[2rem] border border-white/10 bg-[#0d0c17]/70 backdrop-blur-xl p-8 overflow-hidden transition-all duration-300 group-hover:border-violet-400/30 group-hover:bg-[#12101f]/80 group-hover:shadow-[0_0_50px_rgba(139,92,246,0.12)]">
        {/* Hover spotlight */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Top gradient hairline */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-violet-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-6 right-8 text-[10px] font-mono font-bold text-white/25 group-hover:text-violet-300/60 transition-colors z-10">
          § 0{index}
        </div>

        <div className="relative flex flex-col h-full z-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-300 mb-6 group-hover:scale-110 transition-transform shadow-[0_0_18px_rgba(168,85,247,0.2)]">
            {icon}
          </div>
          <div className="pl-6 border-l-2 border-white/10 group-hover:border-violet-400/50 transition-colors space-y-3">
            <h3 className="text-xl font-display font-bold text-white tracking-tight">{title}</h3>
            <p className="text-sm text-white/70 leading-relaxed max-w-lg">
              {description}
            </p>
          </div>
          {visual && <div className="mt-8 flex-1">{visual}</div>}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mini visuals — CSS-only, no deps, no loops
// ---------------------------------------------------------------------------

function AnalysisVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4 space-y-2">
      {[
        { w: "80%", muted: false },
        { w: "60%", muted: true },
        { w: "92%", muted: true },
        { w: "45%", muted: true },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 flex-shrink-0" />
          <div
            className={`h-2 rounded-sm ${row.muted ? "bg-white/15" : "bg-white/40"}`}
            style={{ width: row.w }}
          />
        </div>
      ))}
      <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2 text-[10px] text-white/55">
        <Sparkles className="h-3 w-3 text-violet-300" />
        <span>3 citations · 1.2s</span>
      </div>
    </div>
  );
}

function PulseVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-violet-400 to-fuchsia-400" />
        </span>
        <span className="text-[10px] font-mono text-white/60">NSE · LIVE</span>
      </div>
      <div className="flex items-end gap-1 h-12">
        {[30, 45, 38, 55, 42, 60, 48, 68, 55, 75].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-violet-500/30 to-fuchsia-400/50"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-3 flex items-center gap-2 flex-wrap">
      {["PDF", "PPTX", "XLSX", "MD"].map((fmt) => (
        <span
          key={fmt}
          className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg border border-white/10 text-white/70 bg-white/[0.05]"
        >
          {fmt}
        </span>
      ))}
    </div>
  );
}

function LatencyVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
          Latency
        </span>
        <span className="text-[11px] font-mono text-violet-300">p50 · 9.4s</span>
      </div>
      <div className="space-y-2">
        {[
          { label: "News collection", pct: 25 },
          { label: "Market fetch", pct: 15 },
          { label: "LLM synthesis", pct: 55 },
          { label: "Render", pct: 5 },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-24 text-[10px] text-white/55 truncate">{row.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                style={{ width: `${row.pct * 2}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}