"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Sparkles, TrendingUp, Globe, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  GradientText,
  TypewriterText,
  BlurIn,
} from "@/components/animations/AnimatedText";
import { useSoundEffects } from "@/components/animations/SoundEffects";
import Link from "next/link";

const sectors = [
  "Technology",
  "Pharmaceuticals",
  "Fintech",
  "E-commerce",
  "Healthcare",
  "Renewable Energy",
];

const floatingElements = [
  { icon: "📊", delay: 0, x: "10%", y: "20%" },
  { icon: "🚀", delay: 0.5, x: "85%", y: "15%" },
  { icon: "💹", delay: 1, x: "5%", y: "70%" },
  { icon: "🌍", delay: 1.5, x: "90%", y: "65%" },
  { icon: "⚡", delay: 2, x: "15%", y: "45%" },
  { icon: "📈", delay: 2.5, x: "80%", y: "40%" },
];

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSoundEffects();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Animated gradient background with mesh effect */}
      <div className="absolute inset-0 mesh-gradient">
        {/* Main gradient orbs with dynamic colors */}
        <motion.div
          className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            x: [-50, 60, -50],
            y: [-30, 40, -30],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [50, -60, 50],
            y: [30, -40, 30],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.4, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Animated grid pattern */}
        <motion.div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
          animate={{
            y: [0, 60, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Floating particles with twinkling effect */}
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-30, 30, -30],
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Meteor effects */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`meteor-${i}`}
            className="absolute w-1 h-1 bg-gradient-to-r from-primary to-transparent rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: "0%",
              transform: "rotate(215deg)",
            }}
            animate={{
              x: [-500, 0],
              y: [0, 500],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Floating emojis/elements with enhanced animations */}
      {floatingElements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl opacity-20 select-none hidden md:block"
          style={{ left: el.x, top: el.y }}
          initial={{ opacity: 0, scale: 0, rotate: -10 }}
          animate={{ opacity: 0.2, scale: 1, rotate: 0 }}
          transition={{ delay: el.delay, duration: 0.5, type: "spring" }}
        >
          <motion.span
            animate={{
              y: [-15, 15, -15],
              rotate: [-8, 8, -8],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="inline-block"
          >
            {el.icon}
          </motion.span>
        </motion.div>
      ))}

      {/* Main content */}
      <motion.div
        style={{ y, opacity }}
        className="container relative z-10 px-4 py-20 md:py-32 mx-auto text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <motion.span
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-sm backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
          >
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </motion.span>
            <span className="text-primary font-medium">AI-Powered Market Intelligence</span>
          </motion.span>
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
          className="max-w-2xl mx-auto text-muted-foreground mb-12 text-lg leading-relaxed"
        >
          Get comprehensive market analysis, export-import opportunities, and
          strategic recommendations powered by{" "}
          <span className="text-primary font-medium">Google Gemini AI</span> and real-time data.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Link href="/dashboard">
            <Button size="xl" variant="glow" className="group w-full sm:w-auto">
              Start Analyzing Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="#demo">
            <Button size="xl" variant="outline" className="w-full sm:w-auto gap-2">
              <Play className="h-5 w-5" />
              Watch Demo
            </Button>
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            No credit card required
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:block">Free tier available</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:block">Instant results</span>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
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
              transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm group cursor-pointer"
              onMouseEnter={() => playSound('hover')}
              onClick={() => playSound('click')}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex justify-center mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-2 rounded-full bg-primary"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
