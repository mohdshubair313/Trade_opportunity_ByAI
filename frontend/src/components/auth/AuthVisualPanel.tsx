"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Activity,
  Bot,
  CheckCircle2,
  ArrowUpRight,
  Zap,
} from "lucide-react";

const CHART_BARS = [42, 58, 47, 70, 62, 84, 74, 96, 80, 100, 88, 64];

const SECTORS = [
  { name: "IT Services", value: "+2.4%", color: "from-violet-400 to-fuchsia-400" },
  { name: "Banking", value: "+1.8%", color: "from-cyan-400 to-sky-400" },
  { name: "Pharma", value: "+0.9%", color: "from-emerald-400 to-teal-400" },
];

const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-400 to-blue-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
];

export function AuthVisualPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="relative hidden w-1/2 items-center lg:flex"
    >
      <div className="relative flex h-full w-full flex-col justify-between gap-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group w-fit">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.45)]">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-400/40 blur-md -z-10" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            TradeInsight
          </span>
        </Link>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80 font-semibold mb-5 flex items-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-cyan-400 to-transparent" />
            AI Market Intelligence
          </p>
          <h2 className="text-5xl xl:text-6xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            Every market signal.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              One clear answer.
            </span>
          </h2>
          <p className="text-lg text-white/60 max-w-md font-light leading-relaxed">
            Agentic AI scans Indian markets, finds trade opportunities, and writes
            you a cited, persona-tuned report in under 15 seconds.
          </p>
        </motion.div>

        {/* Glass preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-violet-500/25 via-transparent to-cyan-400/20 blur-2xl" />
          <div className="auth-gradient-border relative rounded-[1.75rem] p-px">
            <div className="relative rounded-[calc(1.75rem-1px)] bg-[#0d0d1a]/80 backdrop-blur-2xl p-6 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-400/25 border border-white/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">AI Market Monitor</p>
                    <p className="text-[11px] text-white/45">Agentic analysis engine</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-auth-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  LIVE
                </span>
              </div>

              {/* Sector rows */}
              <div className="space-y-2.5 mb-6">
                {SECTORS.map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.15, duration: 0.5 }}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${s.color}`} />
                      <span className="text-[13px] text-white/75">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-300">
                      {s.value}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                    Opportunity Index
                  </p>
                  <p className="text-[11px] text-cyan-300/80 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Last 12 weeks
                  </p>
                </div>
                <div className="flex items-end gap-1.5 h-24">
                  {CHART_BARS.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 1 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                      style={{ height: `${h}%` }}
                      className={`flex-1 origin-bottom rounded-t-md ${
                        i === 9
                          ? "bg-gradient-to-t from-violet-600 to-fuchsia-400 shadow-[0_0_16px_rgba(217,70,239,0.35)]"
                          : "bg-gradient-to-t from-violet-500/30 to-cyan-400/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer stats */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Reports", value: "1,248" },
                  { label: "Win Rate", value: "78%" },
                  { label: "Sectors", value: "42" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 + i * 0.12, duration: 0.5 }}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center"
                  >
                    <p className="text-base font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.7, duration: 0.5 }}
                className="absolute -right-4 -top-6 rounded-2xl border border-emerald-400/25 bg-[#0d1a15]/90 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(16,185,129,0.25)] flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-[11px] font-semibold text-emerald-300">Analysis ready</p>
                  <p className="text-[10px] text-white/45">12 sec</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.9, duration: 0.5 }}
                className="absolute -left-5 bottom-14 rounded-2xl border border-violet-400/25 bg-[#151026]/90 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(139,92,246,0.25)] flex items-center gap-2"
              >
                <Zap className="h-4 w-4 text-violet-300" />
                <div>
                  <p className="text-[11px] font-semibold text-violet-200">3 new signals</p>
                  <p className="text-[10px] text-white/45">updated just now</p>
                </div>
              </motion.div>

              {/* Avatar stack */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.1, duration: 0.5 }}
                className="absolute -bottom-5 right-8 flex items-center"
              >
                <div className="flex -space-x-2">
                  {AVATAR_GRADIENTS.map((g, i) => (
                    <div
                      key={i}
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} border-2 border-[#0d0d1a] flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {"ABCD"[i]}
                    </div>
                  ))}
                </div>
                <span className="ml-2.5 text-[11px] text-white/50">12 analysts online</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Bottom trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3, duration: 0.6 }}
          className="text-[11px] text-white/35 flex items-center gap-2"
        >
          <span className="h-1 w-1 rounded-full bg-cyan-400" />
          Powered by agentic AI · NSE &amp; global data sources
        </motion.p>
      </div>
    </motion.div>
  );
}