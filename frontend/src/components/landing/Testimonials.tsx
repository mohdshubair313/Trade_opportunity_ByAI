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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative rounded-[2rem] border border-border bg-card p-10 transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
            >
              <div className="absolute top-8 right-10 text-[10px] font-mono font-bold text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
                § 0{i + 1}
              </div>
              <Quote className="h-6 w-6 text-primary/30 mb-6" />
              <div className="pl-6 border-l-2 border-primary/10 group-hover:border-primary/40 transition-colors">
                <p className="text-base md:text-lg leading-relaxed text-foreground/90 mb-8 font-medium italic">
                  "{t.content}"
                </p>
              </div>
              <footer className="flex items-center gap-4 border-t border-border/60 pt-6 mt-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/20">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-base font-display font-semibold text-foreground tracking-tight">{t.name}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider opacity-70">
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
