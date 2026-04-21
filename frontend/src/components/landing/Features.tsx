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
// Every tile is monochrome with emerald as the single accent. Motion is
// entrance-only — no infinite loops, no rainbow palette, no tilting.

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
              The research desk, <span className="font-display italic text-primary/95">condensed</span> into seconds.
            </>
          }
          subtitle="Every feature exists for one reason: to get you from question to decision without the boring middle."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
          {/* Row 1: big + small */}
          <BentoTile
            className="md:col-span-2"
            icon={<Sparkles className="h-5 w-5" />}
            title="AI-Powered Analysis"
            description="A cascade of specialised AI models reads filings, news and the tape — then writes a structured report with cited sources, tailored to your persona and capital."
            visual={<AnalysisVisual />}
            inView={inView}
            delay={0}
          />
          <BentoTile
            icon={<Globe className="h-5 w-5" />}
            title="Real-Time Data"
            description="NSE sector indices, benchmark deltas and news sentiment — continuously refreshed."
            visual={<PulseVisual />}
            inView={inView}
            delay={0.05}
          />

          {/* Row 2: small + big */}
          <BentoTile
            icon={<FileText className="h-5 w-5" />}
            title="Detailed Reports"
            description="Executive summary, opportunities, risks, recommendations. Export to PDF, PPTX, XLSX or Markdown."
            visual={<ReportVisual />}
            inView={inView}
            delay={0.1}
          />
          <BentoTile
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
            icon={<Bell className="h-5 w-5" />}
            title="Watchlist Alerts"
            description="Pin sectors. We re-analyse on your cadence and ping you only when something material changes."
            inView={inView}
            delay={0.2}
          />
          <BentoTile
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
      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-5">
        <span className="h-px w-8 bg-border" />
        {eyebrow}
        <span className="h-px w-8 bg-border" />
      </div>
      <TextReveal
        as="h2"
        stagger={0.05}
        className="text-3xl md:text-5xl tracking-tight leading-[1.1] font-semibold block"
      >
        {title}
      </TextReveal>
      <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bento tile
// ---------------------------------------------------------------------------

interface TileProps {
  icon: ReactNode;
  title: string;
  description: string;
  visual?: ReactNode;
  className?: string;
  inView: boolean;
  delay: number;
}

function BentoTile({ icon, title, description, visual, className = "", inView, delay }: TileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30 ${className}`}
    >
      {/* Soft emerald wash on hover — subtle, not decorative */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 80% at 0% 0%, hsl(var(--primary) / 0.06) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative flex flex-col h-full">
        <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background/60 text-foreground/80 mb-5">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
          {description}
        </p>
        {visual && <div className="mt-6 flex-1">{visual}</div>}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mini visuals — CSS-only, no deps, no loops
// ---------------------------------------------------------------------------

function AnalysisVisual() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-2">
      {[
        { w: "80%", muted: false },
        { w: "60%", muted: true },
        { w: "92%", muted: true },
        { w: "45%", muted: true },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-primary/60 flex-shrink-0" />
          <div
            className={`h-2 rounded-sm ${row.muted ? "bg-muted/60" : "bg-foreground/50"}`}
            style={{ width: row.w }}
          />
        </div>
      ))}
      <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>3 citations · 1.2s</span>
      </div>
    </div>
  );
}

function PulseVisual() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">NSE · LIVE</span>
      </div>
      <div className="flex items-end gap-1 h-12">
        {[30, 45, 38, 55, 42, 60, 48, 68, 55, 75].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-primary/40" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/40 p-3 flex items-center gap-2 flex-wrap">
      {["PDF", "PPTX", "XLSX", "MD"].map((fmt) => (
        <span
          key={fmt}
          className="text-[10px] font-mono font-medium px-2 py-1 rounded border border-border/60 text-muted-foreground bg-muted/30"
        >
          {fmt}
        </span>
      ))}
    </div>
  );
}

function LatencyVisual() {
  return (
    <div className="rounded-xl border border-border/80 bg-background/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Latency
        </span>
        <span className="text-[11px] font-mono text-primary">p50 · 9.4s</span>
      </div>
      <div className="space-y-2">
        {[
          { label: "News collection", pct: 25 },
          { label: "Market fetch", pct: 15 },
          { label: "LLM synthesis", pct: 55 },
          { label: "Render", pct: 5 },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-24 text-[10px] text-muted-foreground truncate">{row.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <div className="h-full rounded-full bg-primary/60" style={{ width: `${row.pct * 2}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
