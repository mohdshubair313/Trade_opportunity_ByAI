"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Cpu, Layers, Mic, Sparkles, Waves, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { VoiceAgentClient } from "@/components/voice/VoiceAgentClient";
import { Badge } from "@/components/ui/Badge";

const PILLARS = [
  {
    icon: Zap,
    title: "TTS cache",
    blurb:
      "Repeated phrases — greetings, sector intros, recurring closers — play back from disk. Zero-latency, zero-cost.",
  },
  {
    icon: Waves,
    title: "Voice activity detection",
    blurb:
      "Silence, breath, and dead air get trimmed before transcription so we never pay to think about silence.",
  },
  {
    icon: Layers,
    title: "Tight responses",
    blurb:
      "Voice replies are capped server-side and trimmed at sentence boundaries — short answers, lower bills.",
  },
  {
    icon: BookOpen,
    title: "Prompt caching",
    blurb:
      "The system prompt is static, so upstream providers cache the prefix and only bill us for the new turn.",
  },
  {
    icon: Cpu,
    title: "Regional arbitrage",
    blurb:
      "Latency is sampled per provider every turn. The fastest healthy one wins; degraded ones go on cooldown.",
  },
] as const;

export default function VoicePage() {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.06),_transparent_55%),linear-gradient(180deg,#04070a,#06090d)]">
      <Sidebar />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12">
        <Suspense fallback={null}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-auto flex max-w-7xl flex-col gap-8"
          >
            <header className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 self-start text-sm text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="glow">
                    <Mic className="mr-1 h-3 w-3" />
                    Voice Agent
                  </Badge>
                  <Badge variant="outline">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Cost-aware · Cached · Arbitraged
                  </Badge>
                </div>
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl [font-family:var(--font-display)]">
                  Speak with your market intelligence
                </h1>
                <p className="max-w-2xl text-base text-slate-300">
                  A real-time conversational agent for Indian equity sectors. Engineered to be fast,
                  to be premium, and most of all — to never leak money on silence, repeats, or the
                  wrong region.
                </p>
              </div>
            </header>

            <VoiceAgentClient />

            <section className="grid gap-4 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_45%),linear-gradient(180deg,rgba(7,10,14,0.9),rgba(8,13,18,0.95))] p-6">
              <header className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <h2 className="text-lg font-semibold text-white">
                  Five places where voice agents leak money — and how we plug them
                </h2>
              </header>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PILLARS.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-400/30 hover:bg-white/8"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
                      <pillar.icon className="h-3.5 w-3.5" />
                      {pillar.title}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{pillar.blurb}</p>
                  </article>
                ))}
              </div>
            </section>
          </motion.div>
        </Suspense>
      </main>
    </div>
  );
}
