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
          className="relative mx-auto max-w-4xl rounded-3xl border border-border bg-card overflow-hidden"
        >
          {/* Subtle emerald wash — no ripples, no glass, no meteors. */}
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

          <div className="relative px-8 md:px-16 py-16 md:py-20 text-center">
            <TextReveal
              as="h2"
              stagger={0.05}
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] block"
            >
              Ready to see your sector, <span className="font-display italic text-primary/95">properly analysed?</span>
            </TextReveal>
            <p className="mt-5 mx-auto max-w-xl text-base text-muted-foreground leading-relaxed">
              Sign in, pick a sector, hit analyze. The first report is free — no
              credit card, no sales call.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="group h-11 px-6 text-sm font-medium">
                  Start analyzing
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-11 px-6 text-sm font-medium">
                  See pricing
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Free tier · Cancel any time · Data stays yours
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
