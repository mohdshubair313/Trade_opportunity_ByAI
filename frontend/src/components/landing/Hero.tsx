"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  GradientText,
  TypewriterText,
  BlurIn,
} from "@/components/animations/AnimatedText";
import {
  GridBackground,
  Spotlight,
  Meteors,
} from "@/components/animations/AnimatedBackground";
import Link from "next/link";

const sectors = [
  "Technology",
  "Pharmaceuticals",
  "Fintech",
  "E-commerce",
  "Healthcare",
  "Renewable Energy",
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Backgrounds */}
      <GridBackground className="opacity-50" />
      <Spotlight className="-top-40 left-0 md:left-60" fill="#22c55e" />
      <Meteors number={15} />

      <div className="container relative z-10 px-4 py-32 mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-primary">AI-Powered Market Intelligence</span>
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
        >
          <BlurIn delay={0.2}>Discover</BlurIn>{" "}
          <GradientText>Trade Opportunities</GradientText>
          <br />
          <span className="text-muted-foreground">in Indian Markets</span>
        </motion.h1>

        {/* Typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xl md:text-2xl text-muted-foreground mb-8"
        >
          Real-time AI analysis for{" "}
          <span className="text-primary font-semibold">
            <TypewriterText words={sectors} />
          </span>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-2xl mx-auto text-muted-foreground mb-12 text-lg"
        >
          Get comprehensive market analysis, export-import opportunities, and
          strategic recommendations powered by advanced AI and real-time data.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/dashboard">
            <Button size="xl" variant="glow" className="group">
              Start Analyzing
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="xl" variant="outline">
              View Pricing
            </Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: "20+", label: "Sectors Covered", icon: TrendingUp },
            { value: "10K+", label: "Analyses Generated", icon: Sparkles },
            { value: "50+", label: "Data Sources", icon: Globe },
            { value: "<15s", label: "Analysis Time", icon: Zap },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-2">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl md:text-4xl font-bold gradient-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
