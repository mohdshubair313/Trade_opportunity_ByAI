"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote, Star } from "lucide-react";
import { SectionHeader } from "./Features";
import { MagicCard } from "@/components/animations";

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Import/Export Manager",
    company: "GlobalTrade India",
    content:
      "TradeInsight cut our pre-call prep from two hours to ten minutes. The cited sources are what finally made our legal team comfortable.",
  },
  {
    name: "Priya Sharma",
    role: "Business Analyst",
    company: "TechVentures",
    content:
      "The pharma CDMO opportunity we acted on last quarter came straight out of a TradeInsight report. That one recommendation paid for three years of the subscription.",
  },
  {
    name: "Amit Patel",
    role: "Director of Strategy",
    company: "InnovateCorp",
    content:
      "The PDF exports are board-ready. I've stopped reformatting anything — I hit export and paste it straight into the deck.",
  },
  {
    name: "Sneha Reddy",
    role: "Market Research Lead",
    company: "AgriTech Solutions",
    content:
      "We tried two other ‘AI market intelligence’ products. TradeInsight is the only one that doesn't confidently hallucinate ticker symbols.",
  },
];

export function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-28 px-4">
      <div className="container mx-auto">
        <SectionHeader
          eyebrow="Customers"
          title={
            <>
              Trusted by analysts who{" "}
              <span className="font-display italic text-violet-300">
                used to hate
              </span>{" "}
              AI.
            </>
          }
          subtitle="Built for the people who'd rather be wrong themselves than read another generic AI executive summary."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="h-full"
            >
              <MagicCard
                gradientColor="rgba(139, 92, 246, 0.18)"
                className="group h-full rounded-[2rem] border-white/10 bg-[#0d0c17]/70 p-10 backdrop-blur-xl transition-all hover:border-violet-400/35 hover:shadow-[0_0_50px_rgba(139,92,246,0.15)]"
              >
                <div className="absolute top-8 right-10 text-[10px] font-mono font-bold text-white/25 group-hover:text-violet-300/60 transition-colors">
                  § 0{i + 1}
                </div>
                <div className="flex items-center justify-between mb-6">
                  <Quote className="h-6 w-6 text-violet-400/40" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    ))}
                  </div>
                </div>
                <div className="pl-6 border-l-2 border-white/10 group-hover:border-violet-400/40 transition-colors">
                  <p className="text-base md:text-lg leading-relaxed text-white/90 mb-8 font-medium italic">
                    &quot;{t.content}&quot;
                  </p>
                </div>
                <footer className="flex items-center gap-4 border-t border-white/10 pt-6 mt-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white ring-2 ring-violet-400/30 shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-base font-display font-bold text-white tracking-tight">{t.name}</div>
                    <div className="text-xs text-white/55 font-medium uppercase tracking-wider">
                      {t.role} · {t.company}
                    </div>
                  </div>
                </footer>
              </MagicCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}