"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { BlurIn } from "@/components/animations";

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
          className="relative mx-auto max-w-5xl rounded-[3rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        >
          {/* Gradient border wrapper */}
          <div className="relative rounded-[3rem] p-px bg-gradient-to-b from-violet-400/50 via-fuchsia-500/25 to-cyan-400/40">
            <div className="relative rounded-[calc(3rem-1px)] bg-[#0c0b16] overflow-hidden">
              {/* Aurora blobs */}
              <div className="pointer-events-none absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-violet-600/25 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-fuchsia-600/20 blur-[100px]" />
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] rounded-full bg-cyan-500/15 blur-[90px]" />
              <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />

              {/* Bottom gradient hairline */}
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent" />

              <div className="relative px-8 md:px-16 py-16 md:py-24 text-center">
                <BlurIn
                  duration={0.8}
                  className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-[1.05] block mb-4 text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]"
                >
                  Ready to see your sector,{" "}
                  <span className="italic bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent underline decoration-fuchsia-400/30 underline-offset-8">
                    properly analysed?
                  </span>
                </BlurIn>
                <p className="mt-8 mx-auto max-w-xl text-lg text-white/75 leading-relaxed">
                  Sign in, pick a sector, hit analyze. The first report is free — no
                  credit card, no sales call.
                </p>
                <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dashboard">
                    <Button
                      size="xl"
                      className="group relative h-14 px-10 text-base font-bold tracking-wide bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 text-white border-none overflow-hidden hover:shadow-[0_0_50px_rgba(168,85,247,0.55)] transition-all"
                    >
                      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                        <span className="animate-auth-shine absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      </span>
                      Start analyzing
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="xl" variant="outline" className="h-14 px-10 text-base font-bold tracking-wide backdrop-blur-xl bg-white/[0.06] hover:bg-white/[0.12] transition-all border-white/15 text-white hover:border-white/30">
                      See pricing
                    </Button>
                  </Link>
                </div>
                <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                  Free tier · Cancel any time · Data stays yours
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}