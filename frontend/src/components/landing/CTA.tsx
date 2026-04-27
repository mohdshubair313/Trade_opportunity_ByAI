"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { TextReveal } from "@/components/animations/TextReveal";

export function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-28 px-4 overflow-hidden">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-5xl rounded-[3rem] border border-border bg-card overflow-hidden shadow-2xl shadow-primary/5"
        >
          {/* Subtle emerald wash */}
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background:
                "radial-gradient(60% 120% at 50% 0%, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, hsl(var(--primary) / 0.4), transparent)",
            }}
          />

          <div className="relative px-8 md:px-16 py-16 md:py-24 text-center">
            <TextReveal
              as="h2"
              stagger={0.05}
              className="text-4xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05] block mb-2"
            >
              Ready to see your sector, <span className="italic text-primary/95 underline decoration-primary/20 underline-offset-8">properly analysed?</span>
            </TextReveal>
            <p className="mt-8 mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
              Sign in, pick a sector, hit analyze. The first report is free — no
              credit card, no sales call.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button variant="glow" size="xl" className="group h-14 px-10 text-base font-bold tracking-wide">
                  Start analyzing
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="xl" variant="outline" className="h-14 px-10 text-base font-bold tracking-wide backdrop-blur-sm bg-background/30 hover:bg-background/50 transition-all">
                  See pricing
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Free tier · Cancel any time · Data stays yours
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
