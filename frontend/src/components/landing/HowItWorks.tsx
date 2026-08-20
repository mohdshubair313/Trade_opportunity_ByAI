"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, Sparkles, FileText, TrendingUp } from "lucide-react";
import { SectionHeader } from "./Features";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Pick a sector",
    description:
      "Choose from 20+ mapped NSE sectors — pharma, tech, renewables, fintech and more.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI reads everything",
    description:
      "Our agentic AI pipeline scans news, filings and the tape with grounded web search.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Get a real report",
    description:
      "Structured sections with cited sources — opportunities, risks, recommendations.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Act with conviction",
    description:
      "Export to the format your team expects, or pin the sector for watchlist alerts.",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-28 px-4 bg-transparent border-y border-white/[0.06]">
      <div className="container mx-auto">
        <SectionHeader
          eyebrow="How it works"
          title={
            <>
              From sector to{" "}
              <span className="font-display italic text-violet-300">
                decision
              </span>{" "}
              in four steps.
            </>
          }
          subtitle="No drag-and-drop nodes. No chat transcripts to scroll. Just answers, structured."
        />

        <div className="relative mt-16">
          {/* Horizontal dashed line through the middle (desktop only) */}
          <div
            className="hidden lg:block absolute top-[36px] left-8 right-8 h-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, rgba(255,255,255,0.14) 0 6px, transparent 6px 14px)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((s, i) => (
              <motion.div
                key={s.number}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative"
              >
                {/* Step marker */}
                <div className="relative flex items-start gap-4 mb-8">
                  <div className="relative flex-shrink-0 flex h-[72px] w-[72px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.05] backdrop-blur-md transition-all shadow-[0_0_18px_rgba(139,92,246,0.1)] group-hover:border-violet-400/40 group-hover:shadow-[0_0_28px_rgba(139,92,246,0.3)]">
                    <s.icon className="h-6 w-6 text-violet-300" />
                    <span className="absolute -top-3 -right-3 inline-flex h-7 min-w-[28px] px-2 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[10px] font-mono font-bold text-white shadow-lg shadow-violet-500/40">
                      § 0{i + 1}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <div className="pl-6 border-l-2 border-white/10 group-hover:border-violet-400/50 transition-colors mt-2 space-y-3">
                  <h3 className="text-xl font-display font-semibold text-white tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}