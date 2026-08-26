"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Server } from "lucide-react";
import {
  CascadeNetworkIcon,
  VectorCacheIcon,
  LatencyMatrixIcon,
  CitationShieldIcon,
} from "@/components/icons/CustomIcons";

const INFRA_CARDS = [
  {
    title: "Self-Healing Model Cascade",
    statusTag: "4-LAYER FALLBACK",
    icon: CascadeNetworkIcon,
    description:
      "If a primary reasoning model suffers latency spikes or rate limits, the cascade dynamically re-routes tasks mid-flight without dropping context or breaching our 15s SLA.",
    telemetry: "UPTIME: 99.98% · AUTO-REROUTE",
  },
  {
    title: "Continuous Sector Watchlist",
    statusTag: "CACHE: 2s",
    icon: VectorCacheIcon,
    description:
      "Background worker agents monitor 5,000+ Indian tickers and NSE indices 24/7, keeping pre-computed sector embeddings warm before the user even asks.",
    telemetry: "COVERAGE: 5,000+ TICKERS · LIVE",
  },
  {
    title: "Cost-Aware Model Router",
    statusTag: "LATENCY: 40ms",
    icon: LatencyMatrixIcon,
    description:
      "Intelligent token routing matches each synthesis step with optimal models — balancing deep macro reasoning with sub-second extraction speeds.",
    telemetry: "DISPATCH: ADAPTIVE · ZERO DELAY",
  },
  {
    title: "Citation-Backed Grounding",
    statusTag: "ACCURACY: 99.8%",
    icon: CitationShieldIcon,
    description:
      "Every claim, estimate, and market forecast is strictly tied to verifiable primary sources: NSE filings, RBI releases, and corporate earnings transcripts.",
    telemetry: "GROUNDING: PRIMARY SOURCES ONLY",
  },
];

export function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 px-4 border-t border-border bg-background"
    >
      <div className="main-container mx-auto">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-primary text-xs font-mono font-semibold uppercase tracking-[0.18em] mb-4">
            <Server className="h-3.5 w-3.5" />
            {"// BUILT FOR RESILIENCE"}
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Engineered like a terminal.{" "}
            <span className="font-kalam text-primary block sm:inline">
              Resilient by design.
            </span>
          </h2>
          
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-kalam">
            Every layer of the TradeInsight architecture is built to eliminate hallucinations and guarantee sub-15 second report generation.
          </p>

          {/* Telemetry Status Strip with Kalam handwriting badge */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2.5 rounded-lg border border-border bg-card text-[11px] font-mono text-muted-foreground">
              <span className="text-foreground font-semibold">CORE ENGINE v2.4.0</span>
              <span className="opacity-30">|</span>
              <span className="text-primary font-bold">4-LAYER FALLBACK</span>
              <span className="opacity-30">|</span>
              <span>CACHE: 2s</span>
              <span className="opacity-30">|</span>
              <span>LATENCY: 40ms</span>
              <span className="opacity-30">|</span>
              <span className="text-foreground font-semibold">ACCURACY: 99.8%</span>
            </div>
            <span className="font-kalam text-xs text-primary font-medium">
              * benchmarked on NSE 500
            </span>
          </div>
        </div>

        {/* 4 System-Status Panel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {INFRA_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative flex flex-col justify-between p-7 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-md"
            >
              <div>
                {/* Header: Bespoke Custom Icon + Monospace Status Tag */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary group-hover:border-primary/40 transition-all">
                    <card.icon className="h-5 w-5" />
                  </div>
                  
                  <span className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                    {card.statusTag}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-lg font-bold text-foreground tracking-tight mb-2.5 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>

                {/* Card Description */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-kalam">
                  {card.description}
                </p>
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>{card.telemetry}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}