"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { TerminalPromptIcon, LogoGlyph } from "@/components/icons/CustomIcons";
import { Button } from "@/components/ui/Button";

// Sample live queries and persona-tuned streaming answers
const SAMPLE_QUERIES = [
  {
    prompt: "what's happening in the auto sector today",
    sector: "Automotive & EV",
    persona: "TRADER-ALPHA",
    tag: "LIVE TAPE",
    output:
      "Auto sales up 12% MoM. TATAMOTORS & M&M leading institutional inflows (+₹420Cr). Premium SUV order backlog extends to 18 weeks. Immediate pivot support at 24,180.",
    citations: [
      { label: "NSE Filings", id: "NSE-AUTO" },
      { label: "RBI Credit Bull.", id: "RBI-24" },
      { label: "SIAM Dispatch", id: "SIAM-MoM" },
    ],
    metrics: [
      { label: "MoM Vol", val: "+12.4%" },
      { label: "Inst. Flow", val: "₹420 Cr" },
      { label: "SLA", val: "11.2s" },
    ],
  },
  {
    prompt: "pharma cdmo margin outlook for next quarter",
    sector: "Pharma & CDMO",
    persona: "INVEST-LONG",
    tag: "FUNDAMENTALS",
    output:
      "US FDA clearance across 4 major Telangana API facilities unlocks $180M export pipeline. CDMO gross margins projected to expand 140 bps YoY as input chemical costs normalize.",
    citations: [
      { label: "US FDA EIR", id: "FDA-483" },
      { label: "Q1 Consensus", id: "BSE-PHARMA" },
      { label: "Customs DGCIS", id: "DGCIS-EXP" },
    ],
    metrics: [
      { label: "Margin Exp.", val: "+140 bps" },
      { label: "Pipeline", val: "$180M" },
      { label: "SLA", val: "13.4s" },
    ],
  },
  {
    prompt: "renewable energy capex cycles and grid tariffs",
    sector: "Renewable Energy",
    persona: "STRAT-CONSULT",
    tag: "MACRO SHIFT",
    output:
      "Inter-state transmission waivers extended till FY28. Utility-scale solar module auction tariffs stabilized at ₹2.48/kWh. Green hydrogen pilot capex subsidies triggered under SIGHT scheme.",
    citations: [
      { label: "MNRE Order", id: "MNRE-FY28" },
      { label: "SECI Auction", id: "SECI-2026" },
      { label: "PIB Release", id: "PIB-SIGHT" },
    ],
    metrics: [
      { label: "Tariff Level", val: "₹2.48/kWh" },
      { label: "Waiver", val: "Till FY28" },
      { label: "SLA", val: "10.8s" },
    ],
  },
];

const SECTOR_PILLS = [
  { name: "NIFTY AUTO", delta: "+1.84%", up: true },
  { name: "NIFTY IT", delta: "+2.15%", up: true },
  { name: "NIFTY PHARMA", delta: "+0.92%", up: true },
  { name: "NIFTY BANK", delta: "+0.64%", up: true },
  { name: "RENEWABLES", delta: "+3.20%", up: true },
];

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const activeQuery = SAMPLE_QUERIES[activeQueryIndex];

  // Scroll parallax for slight depth
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.3]);

  // Typing simulator effect
  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    const fullText = activeQuery.output;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [activeQueryIndex, activeQuery.output]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[96vh] flex flex-col justify-center overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28"
    >
      {/* 
        ========================================================================
        FULL-VIEW CRISP HERO IMAGE BACKDROP
        Rendered in full view across the entire hero section with high clarity
        and gentle, non-obtrusive edge transitions.
        ========================================================================
      */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src="/hero.png"
            alt="TradeInsight AI Market Intelligence Terminal"
            fill
            priority
            className="object-cover object-center opacity-65 dark:opacity-75 contrast-110 brightness-95 dark:brightness-100 transition-opacity duration-500"
            sizes="100vw"
          />
        </div>

        {/* Soft, minimal backdrop scrims so the image remains completely visible and not over-blurred */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/50" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        
        {/* Subtle glowing ambient accent */}
        <div
          className="absolute right-1/4 top-1/3 -translate-y-1/2 w-[600px] h-[450px] rounded-full blur-[140px] pointer-events-none opacity-20"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
        
        <div className="terminal-grid absolute inset-0 opacity-20" />
      </div>

      {/* Hero Content Container */}
      <motion.div
        style={{ opacity: heroOpacity }}
        className="main-container relative z-10 mx-auto"
      >
        {/* Top Live Ticker Ribbon to instantly show it's an Indian Market Intelligence Platform */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-8 overflow-x-auto no-scrollbar py-1"
        >
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/90 border border-border backdrop-blur-md text-[11px] font-mono text-primary flex-shrink-0 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-bold">LIVE NSE/BSE FEED</span>
          </div>

          <div className="flex items-center gap-2 flex-nowrap">
            {SECTOR_PILLS.map((pill) => (
              <div
                key={pill.name}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-card/75 border border-border/80 backdrop-blur-md text-[11px] font-mono text-foreground flex-shrink-0 shadow-sm"
              >
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="font-semibold">{pill.name}</span>
                <span className="text-primary font-bold">{pill.delta}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* ================================================================
              LEFT COLUMN: High-Clarity Value Proposition & Headlines
             ================================================================ */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            
            {/* Monospace Kicker + Kalam Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-card/90 backdrop-blur-md shadow-sm">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs font-bold tracking-[0.16em] text-primary uppercase">
                  // AGENTIC MARKET INTELLIGENCE
                </span>
              </div>
              <span className="font-kalam text-sm font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                ⚡ 15-second cited reports
              </span>
            </motion.div>

            {/* Stacked Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-[1.08]"
            >
              <span className="block font-kalam-bold drop-shadow-sm">One question.</span>
              <span className="block font-kalam-bold drop-shadow-sm">Answered in 15 seconds.</span>
              <span className="block font-kalam text-primary text-[1.05em] tracking-normal pt-1">
                Cited, not guessed.
                <span className="inline-block w-2.5 h-[0.8em] bg-primary ml-2 animate-cursor-blink align-baseline" />
              </span>
            </motion.h1>

            {/* Clear, Intuitive Product Explanation */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="max-w-xl text-base sm:text-lg text-foreground/90 font-medium leading-relaxed font-kalam p-4 rounded-2xl bg-card/85 border border-border backdrop-blur-md shadow-sm"
            >
              TradeInsight AI connects directly to live NSE/BSE filings, corporate earnings transcripts, macroeconomic indicators, and the tape — delivering cited, persona-tuned research dossiers before market open.
            </motion.p>

            {/* Dual CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-12 px-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm tracking-tight shadow-lg transition-all group"
                >
                  <Zap className="mr-1.5 h-4 w-4 fill-current" />
                  <span>Ask the market (Free)</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 rounded-full border-border bg-card/90 hover:bg-card text-foreground text-sm font-semibold transition-colors backdrop-blur-md shadow-sm"
                >
                  <span>See pricing &amp; API</span>
                </Button>
              </Link>
            </motion.div>

            {/* Value Guarantees Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="pt-4 border-t border-border/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-kalam text-foreground/80 font-medium"
            >
              <span className="flex items-center gap-1.5 text-foreground font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                20+ NSE SECTORS
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                100% AUDITED CITATIONS
              </span>
              <span className="opacity-40">·</span>
              <span className="text-primary font-bold">~15s SPEED</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 text-foreground font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                MADE FOR INDIA 🇮🇳
              </span>
            </motion.div>
          </div>

          {/* ================================================================
              RIGHT COLUMN: Interactive Live Terminal Report Emulator
             ================================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="lg:col-span-6 xl:col-span-5"
          >
            <div className="relative rounded-3xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden">
              
              {/* Terminal Window Chrome */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/60">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <span className="h-3 w-3 rounded-full bg-green-400/80" />
                  <span className="ml-2 font-mono text-[11px] font-semibold text-foreground/70">
                    terminal://tradeinsight-v2.4
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-[10px] font-mono font-bold text-primary border border-primary/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                    {activeQuery.persona}
                  </span>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 space-y-4">
                
                {/* Prompt Bar with Custom Terminal Prompt Icon */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/90 border border-border shadow-inner">
                  <TerminalPromptIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 font-mono text-xs text-foreground font-medium">
                    <span className="text-muted-foreground mr-1.5">$</span>
                    {activeQuery.prompt}
                    <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-cursor-blink align-middle" />
                  </div>
                </div>

                {/* Sample Query Selectors */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-kalam text-muted-foreground uppercase tracking-wider font-semibold mr-1">
                    Try sample query:
                  </span>
                  {SAMPLE_QUERIES.map((q, idx) => (
                    <button
                      key={q.sector}
                      onClick={() => setActiveQueryIndex(idx)}
                      className={`text-[11px] font-kalam px-3 py-1 rounded-lg transition-all ${
                        activeQueryIndex === idx
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "bg-muted/60 text-foreground hover:bg-muted border border-border font-medium"
                      }`}
                    >
                      {q.sector}
                    </button>
                  ))}
                </div>

                {/* Real-Time Synthesized Narrative Output */}
                <div className="p-4 rounded-2xl bg-background/80 border border-border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] font-kalam text-primary font-bold">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Synthesized Intelligence</span>
                    </div>
                    <span className="font-kalam text-xs text-primary font-bold">
                      ✓ verified live
                    </span>
                  </div>

                  <p className="font-kalam text-xs sm:text-sm text-foreground leading-relaxed min-h-[72px]">
                    {displayedText}
                  </p>

                  {/* Verifiable Primary Citations */}
                  <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        CITATIONS:
                      </span>
                      {activeQuery.citations.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card text-[10px] font-mono text-foreground font-medium border border-border shadow-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Telemetry Metrics Footer */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {activeQuery.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="p-2.5 rounded-xl bg-background/90 border border-border text-center shadow-xs"
                    >
                      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                        {m.label}
                      </div>
                      <div className="font-mono text-xs font-bold text-foreground mt-0.5">
                        {m.val}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}