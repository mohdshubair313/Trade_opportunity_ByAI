"use client";

import { ArrowLeft, BookOpen, Cpu, Layers, Mic, Sparkles, Waves, Zap } from "lucide-react";
import Link from "next/link";

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
    <div className="space-y-8">
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
                  <Badge variant="default" className="bg-primary text-on-primary">
                    <Mic className="mr-1 h-3 w-3" />
                    Voice Agent
                  </Badge>
                  <Badge variant="outline" className="border-hairline text-ink">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Cost-aware · Cached · Arbitraged
                  </Badge>
                </div>
                <h1 className="text-display-lg text-ink-strong">
                  Speak with your market intelligence
                </h1>
                <p className="max-w-2xl text-body-md text-body">
                  A real-time conversational agent for Indian equity sectors. Engineered to be fast,
                  to be premium, and most of all — to never leak money on silence, repeats, or the
                  wrong region.
                </p>
              </div>
            </header>

            <VoiceAgentClient />

            <section className="grid gap-4 rounded-md border border-hairline bg-canvas p-xl mt-8">
              <header className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-display-sm text-ink-strong">
                  Five places where voice agents leak money — and how we plug them
                </h2>
              </header>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PILLARS.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="group rounded-sm border border-hairline bg-canvas-soft p-lg transition hover:bg-canvas hover:border-primary/50"
                  >
                    <div className="mb-3 inline-flex items-center gap-2 rounded-xs border border-hairline bg-canvas px-xs py-xxs text-eyebrow-mono text-primary">
                      <pillar.icon className="h-3.5 w-3.5" />
                      {pillar.title}
                    </div>
                    <p className="text-body-sm text-body">{pillar.blurb}</p>
                  </article>
                ))}
              </div>
            </section>
    </div>
  );
}
