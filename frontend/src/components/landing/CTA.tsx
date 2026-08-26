"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Terminal } from "lucide-react";
import { LogoGlyph } from "@/components/icons/CustomIcons";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-24 md:py-36 px-4 bg-background">
      <div className="main-container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-5xl rounded-3xl border border-border bg-card p-10 sm:p-16 md:p-20 shadow-xl overflow-hidden text-center"
        >
          {/* Subtle radial spotlight inside the framed poster */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full opacity-15 blur-[100px]"
            style={{
              background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            }}
          />

          {/* Subtle grid inside */}
          <div className="terminal-grid absolute inset-0 opacity-20 pointer-events-none" />

          {/* Kicker with Logo Glyph */}
          <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded border border-border bg-background text-primary text-xs font-mono font-semibold uppercase tracking-[0.18em] mb-8">
            <LogoGlyph className="h-3.5 w-3.5" />
            // DISCOVER SECTOR OPPORTUNITY
          </div>

          {/* Stacked Kalam Headline */}
          <h2 className="relative z-10 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-kalam-bold text-foreground tracking-tight leading-[1.08] max-w-3xl mx-auto">
            <span>Intelligence should be</span>{" "}
            <span className="text-primary block sm:inline">accessible,</span>{" "}
            <span className="block">not gatekept.</span>
          </h2>

          <p className="relative z-10 mt-6 max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed font-kalam">
            Pick an Indian equity sector and get a cited, persona-tuned research dossier before market open. No credit card required.
          </p>

          {/* Primary Action Button + Kalam handwritten note */}
          <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-13 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold tracking-tight shadow-lg transition-all group"
              >
                <span>ASK THE MARKET NOW</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            <Link href="/docs/api">
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-7 rounded-full border-border bg-card/80 hover:bg-muted text-foreground text-sm font-medium transition-colors"
              >
                <Terminal className="mr-2 h-4 w-4 text-primary" />
                <span>Explore REST API</span>
              </Button>
            </Link>
          </div>

          <div className="relative z-10 mt-4">
            <span className="font-kalam text-xs text-primary font-medium">
              ✦ Free tier available — get started in 10 seconds
            </span>
          </div>

          {/* Monospace Trust Line */}
          <div className="relative z-10 mt-8 pt-8 border-t border-border flex items-center justify-center gap-6 text-xs font-mono text-muted-foreground flex-wrap">
            <span>NO CREDIT CARD REQUIRED</span>
            <span>·</span>
            <span>20+ NSE SECTORS</span>
            <span>·</span>
            <span>100% CITED EVIDENCE</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}