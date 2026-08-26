"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, CheckCircle2 } from "lucide-react";
import {
  DayTraderIcon,
  LongInvestorIcon,
  SmeExporterIcon,
  StratConsultantIcon,
} from "@/components/icons/CustomIcons";

const PERSONAS = [
  {
    id: "trader",
    name: "Day Trader",
    callsign: "TRADER-ALPHA",
    tone: "Sharp / Terse",
    icon: DayTraderIcon,
    description:
      "Entry signals, volume breakouts, pivot levels, and volatility triggers. Zero fluff — pure momentum and immediate risk/reward.",
    sampleOutput:
      "TATAMOTORS 15m breakout above ₹982. Institutional buying +₹420Cr. Key pivot support at ₹974. Immediate target ₹1,010. [source: NSE Tape]",
    focusMetrics: ["Momentum Score: 92/100", "Volume Delta: +240%", "SLA: 9.8s"],
  },
  {
    id: "investor",
    name: "Equity Investor",
    callsign: "INVEST-LONG",
    tone: "Analytical / Macro",
    icon: LongInvestorIcon,
    description:
      "Fundamental health, MoM/YoY growth triggers, competitive moat, and structural 5-year industry shifts.",
    sampleOutput:
      "Pharma CDMO order books up 18% YoY driven by US supply-chain reshoring. Gross margin projected to expand 140 bps on chemical input normalization. [source: BSE, FDA EIR]",
    focusMetrics: ["Moat Rating: High", "ROIC Trend: +3.2%", "SLA: 12.4s"],
  },
  {
    id: "sme",
    name: "SME & Exporter",
    callsign: "SME-FOUNDER",
    tone: "Practical / Risk",
    icon: SmeExporterIcon,
    description:
      "Input raw material costs, FX hedging windows, supply chain bottlenecks, and government incentive schemes.",
    sampleOutput:
      "Container freight rates down 8% on European routes. Hedging window for USD/INR narrows at 86.40. Working capital cycle stands at 62 days. [source: RBI, DGCIS]",
    focusMetrics: ["FX Sensitivity: Med", "Input Cost: -4.1%", "SLA: 11.0s"],
  },
  {
    id: "consultant",
    name: "Strategy Consultant",
    callsign: "STRAT-CONSULT",
    tone: "Thorough / Cited",
    icon: StratConsultantIcon,
    description:
      "Deep-dive competitive market share shifts, regulatory frameworks, and board-ready synthesis with full audit citations.",
    sampleOutput:
      "Tier-2 fintech consolidation accelerating as compliance overhead rises 22% under revised digital lending guidelines. Market share concentrated in top 3 players. [source: RBI, MCA]",
    focusMetrics: ["Audit Trail: 100%", "Source Count: 5", "SLA: 14.1s"],
  },
];

export function Personas() {
  const [selectedPersona, setSelectedPersona] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const active = PERSONAS[selectedPersona];

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 px-4 border-t border-border bg-background"
    >
      <div className="main-container mx-auto">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-primary text-xs font-mono font-semibold uppercase tracking-[0.18em] mb-4">
            <Users className="h-3.5 w-3.5" />
            {"// PERSONA ADAPTIVE PIPELINE"}
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Same data.{" "}
            <span className="font-kalam text-primary block sm:inline">
              Persona-tuned.
            </span>
          </h2>
          
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-kalam">
            A day trader and a 10-year investor shouldn&apos;t read the same report. TradeInsight tunes vocabulary, tone, and risk metrics to your exact mandate.
            <span className="block font-kalam text-primary text-sm mt-1">
              ✍️ Click any persona below to preview tone differences
            </span>
          </p>
        </div>

        {/* 4 Boarding-Pass ID Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-10">
          {PERSONAS.map((p, i) => {
            const isSelected = selectedPersona === i;
            const IconComp = p.icon;
            return (
              <motion.button
                key={p.id}
                onClick={() => setSelectedPersona(i)}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`text-left relative flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-card border-primary/50 shadow-lg ring-1 ring-primary/40"
                    : "bg-card/70 border-border hover:border-border hover:bg-card"
                }`}
              >
                <div>
                  {/* Top Bar: Custom Icon + Callsign */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-primary">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
                      {p.callsign}
                    </span>
                  </div>

                  {/* Persona Title with Kalam font */}
                  <h3 className="text-xl font-kalam-bold text-foreground mb-1">
                    {p.name}
                  </h3>

                  <div className="font-mono text-[11px] text-muted-foreground mb-4">
                    Tone: {p.tone}
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-kalam">
                    {p.description}
                  </p>
                </div>

                {/* Accent Underline */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div
                    className={`h-0.5 w-full rounded-full transition-all ${
                      isSelected ? "bg-primary" : "bg-border"
                    }`}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Live Narrative Sample Box based on selected Persona */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-mono text-xs font-bold text-foreground">
                SYNTHESIS SAMPLE: {active.callsign}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Tone: {active.tone}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {active.focusMetrics.map((m) => (
                <span
                  key={m}
                  className="font-mono text-[10px] px-2 py-0.5 rounded bg-background text-primary border border-border"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <p className="font-kalam text-sm sm:text-base text-foreground leading-relaxed mb-4">
            &quot;{active.sampleOutput}&quot;
          </p>

          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2">
            <span>AUDIT: 100% CITED · ZERO SPECULATION</span>
            <span className="text-primary flex items-center gap-1 font-kalam text-sm">
              active tuned voice <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
