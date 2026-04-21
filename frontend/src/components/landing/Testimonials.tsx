"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote } from "lucide-react";
import { SectionHeader } from "./Features";

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
              Trusted by analysts who <span className="font-display italic text-primary/95">used to hate</span> AI.
            </>
          }
          subtitle="Built for the people who'd rather be wrong themselves than read another generic AI executive summary."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-16 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-2xl border border-border bg-card p-7"
            >
              <Quote className="h-5 w-5 text-primary/30 mb-4" />
              <p className="text-[15px] leading-relaxed text-foreground/90 mb-6">
                {t.content}
              </p>
              <footer className="flex items-center gap-3 border-t border-border/60 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground/90">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.role} · {t.company}
                  </div>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
