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
import { MagicCard } from "@/components/animations/AnimatedCard";
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
    <section className="py-24 px-4" ref={ref}>
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Features
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            Everything you need for{" "}
            <GradientText>Market Intelligence</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Our platform combines AI analysis, real-time data, and intuitive
            design to deliver actionable trade insights.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <MagicCard className="h-full">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    colorClasses[feature.color]
                  }`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </MagicCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
