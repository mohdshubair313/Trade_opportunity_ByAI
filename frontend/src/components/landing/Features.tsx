"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  FileText,
  Bell,
  Users,
} from "lucide-react";
import { MagicCard, TiltCard } from "@/components/animations/AnimatedCard";
import { GradientText } from "@/components/animations/AnimatedText";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Analysis",
    description:
      "Advanced Gemini AI analyzes market data, news, and trends to provide actionable insights for your sector.",
    color: "green",
  },
  {
    icon: Globe,
    title: "Real-Time Data",
    description:
      "Access up-to-date market information from multiple sources, ensuring you never miss an opportunity.",
    color: "blue",
  },
  {
    icon: TrendingUp,
    title: "Trade Opportunities",
    description:
      "Identify export, import, and domestic trade opportunities with comprehensive market analysis.",
    color: "purple",
  },
  {
    icon: FileText,
    title: "Detailed Reports",
    description:
      "Generate professional markdown reports covering market overview, opportunities, risks, and recommendations.",
    color: "orange",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Enterprise-grade security with JWT authentication and rate limiting to protect your data.",
    color: "red",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Get comprehensive sector analysis in under 15 seconds with our optimized processing pipeline.",
    color: "yellow",
  },
  {
    icon: Bell,
    title: "Custom Alerts",
    description:
      "Set up notifications for market changes, new opportunities, and sector-specific updates.",
    color: "cyan",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share insights and reports with your team, enabling collaborative decision-making.",
    color: "pink",
  },
];

const colorClasses: Record<string, string> = {
  green: "text-green-500 bg-green-500/10",
  blue: "text-blue-500 bg-blue-500/10",
  purple: "text-purple-500 bg-purple-500/10",
  orange: "text-orange-500 bg-orange-500/10",
  red: "text-red-500 bg-red-500/10",
  yellow: "text-yellow-500 bg-yellow-500/10",
  cyan: "text-cyan-500 bg-cyan-500/10",
  pink: "text-pink-500 bg-pink-500/10",
};

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-4 relative overflow-hidden" ref={ref}>
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-5" />
      <motion.div
        className="absolute top-0 left-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </motion.div>

      <div className="container mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.span 
            className="text-primary text-sm font-semibold tracking-wider uppercase"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Features
          </motion.span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            Everything you need for{" "}
            <GradientText>Market Intelligence</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Our platform combines AI analysis, real-time data, and intuitive
            design to deliver actionable trade insights.
          </p>
        </motion.div>

        {/* Features Grid with Tilt Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.12,
                type: "spring",
                stiffness: 100
              }}
            >
              <TiltCard className="h-full">
                <MagicCard 
                  className="h-full border border-border/50"
                  gradientSize={250}
                  gradientColor={feature.color === 'green' ? 'rgba(34, 197, 94, 0.4)' : 
                                  feature.color === 'blue' ? 'rgba(59, 130, 246, 0.4)' : 
                                  feature.color === 'purple' ? 'rgba(168, 85, 247, 0.4)' : 
                                  feature.color === 'orange' ? 'rgba(249, 115, 22, 0.4)' : 
                                  feature.color === 'red' ? 'rgba(239, 68, 68, 0.4)' : 
                                  feature.color === 'yellow' ? 'rgba(250, 204, 21, 0.4)' : 
                                  feature.color === 'cyan' ? 'rgba(6, 182, 212, 0.4)' : 
                                  'rgba(236, 72, 153, 0.4)'}
                >
                  <motion.div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                      colorClasses[feature.color]
                    }`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <feature.icon className="h-7 w-7" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Hover effect indicator */}
                  <motion.div 
                    className="mt-4 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </MagicCard>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
