"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/animations/AnimatedText";
import { RippleBackground } from "@/components/animations/AnimatedBackground";
import Link from "next/link";

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-4 relative overflow-hidden" ref={ref}>
      <RippleBackground className="opacity-30" />

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-teal-500/20" />
          <div className="absolute inset-0 glass" />

          {/* Content */}
          <div className="relative p-12 md:p-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-6" />
            </motion.div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Discover{" "}
              <GradientText>Trade Opportunities?</GradientText>
            </h2>

            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-lg">
              Join thousands of businesses using AI-powered market intelligence
              to identify opportunities and make data-driven decisions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="xl" variant="glow" className="group">
                  Start Free Analysis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="xl" variant="outline">
                  See Pricing Plans
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • Free tier available • Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
