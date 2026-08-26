"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogoGlyph } from "@/components/icons/CustomIcons";
import { TrendingUp, ShieldCheck, Activity } from "lucide-react";

interface AuthLeftPanelProps {
  title?: string;
  subtitle?: string;
}

export function AuthLeftPanel({
  title = "Ask the market anything.",
  subtitle = "Synthesized, cited sector research for Indian equities in under 15 seconds.",
}: AuthLeftPanelProps) {
  return (
    <div className="relative flex flex-col justify-between h-full w-full min-h-[580px] lg:min-h-full p-8 sm:p-10 md:p-12 overflow-hidden bg-[#0A1214] text-[#EDEFEF] rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none">
      {/* 
        ========================================================================
        FEATURED ARTWORK: /signup_page.png
        High-impact charging bull with stock charts, candlesticks, and NSE badges
        ========================================================================
      */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Image
          src="/signup_page.png"
          alt="TradeInsight AI Bull Market Analysis Artwork"
          fill
          priority
          className="object-cover object-center opacity-75 contrast-115 brightness-95 scale-105"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {/* Soft atmospheric gradient to merge typography and edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1214] via-[#0A1214]/50 to-[#0A1214]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1214]/60 via-transparent to-[#0A1214]/60" />
        <div className="terminal-grid absolute inset-0 opacity-25" />
      </div>

      {/* Top Header: Logo + Live Market Status */}
      <div className="relative z-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0D1518]/90 border border-white/[0.15] text-[#1FE0A8] group-hover:border-[#1FE0A8]/50 shadow-sm transition-all">
            <LogoGlyph className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-kalam-bold text-lg text-white group-hover:text-[#1FE0A8] transition-colors">
              TradeInsight
            </span>
            <span className="font-kalam text-xs text-[#1FE0A8] font-bold">
              ai
            </span>
          </div>
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D1518]/90 border border-white/[0.12] text-[11px] font-mono text-[#1FE0A8] backdrop-blur-md shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1FE0A8] animate-pulse" />
          <span>NSE/BSE LIVE</span>
        </div>
      </div>

      {/* Middle Text: Big Headline in Kalam & Subcopy */}
      <div className="relative z-10 my-auto py-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0D1518]/85 border border-white/[0.1] text-[11px] font-mono font-semibold tracking-wider text-[#1FE0A8] uppercase backdrop-blur-md">
          <Activity className="h-3.5 w-3.5" />
          // AGENTIC MARKET RESEARCH
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-kalam-bold text-white leading-tight tracking-tight drop-shadow-md">
          {title}
        </h2>

        <p className="max-w-md text-sm sm:text-base text-[#B0BCC5] font-kalam leading-relaxed">
          {subtitle}
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0D1518]/80 border border-white/[0.08] text-[11px] font-kalam text-[#EDEFEF]">
            <TrendingUp className="h-3 w-3 text-[#1FE0A8]" />
            20+ NSE Sectors
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0D1518]/80 border border-white/[0.08] text-[11px] font-kalam text-[#EDEFEF]">
            <ShieldCheck className="h-3 w-3 text-[#1FE0A8]" />
            100% Audited Sources
          </span>
        </div>
      </div>

      {/* Bottom Footer: Scrolling Monospace Ticker */}
      <div className="relative z-10 pt-4 border-t border-white/[0.1]">
        <div className="overflow-hidden whitespace-nowrap">
          <motion.div
            animate={{ x: [0, -320] }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            className="inline-flex items-center gap-4 text-xs font-mono text-[#8B98A0]"
          >
            <span className="text-[#EDEFEF] font-semibold">20+ SECTORS</span>
            <span className="opacity-40">·</span>
            <span className="text-[#1FE0A8]">7 AI CASCADE MODELS</span>
            <span className="opacity-40">·</span>
            <span>41 CONNECTED APIS</span>
            <span className="opacity-40">·</span>
            <span className="text-[#EDEFEF]">~15s SPEED</span>
            <span className="opacity-40">·</span>
            <span className="text-[#1FE0A8]">CITED NSE DATA</span>
            <span className="opacity-40">·</span>
            <span className="text-[#EDEFEF] font-semibold">20+ SECTORS</span>
            <span className="opacity-40">·</span>
            <span className="text-[#1FE0A8]">7 AI CASCADE MODELS</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
