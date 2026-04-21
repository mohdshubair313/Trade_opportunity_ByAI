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
    <section ref={ref} className="relative py-28 px-4 bg-muted/20 border-y border-border/60">
      <div className="container mx-auto">
        <SectionHeader
          eyebrow="How it works"
          title={
            <>
              From sector to <span className="font-display italic text-primary/95">decision</span> in four steps.
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
                "repeating-linear-gradient(to right, hsl(var(--border)) 0 6px, transparent 6px 14px)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((s, i) => (
              <motion.div
                key={s.number}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative"
              >
                {/* Step marker */}
                <div className="relative flex items-start gap-4 mb-5">
                  <div className="relative flex-shrink-0 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-border bg-card">
                    <s.icon className="h-5 w-5 text-primary" />
                    <span className="absolute -top-2 -right-2 inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-primary text-[11px] font-mono font-semibold text-primary-foreground">
                      {s.number}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
