"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, Sparkles, FileText, TrendingUp } from "lucide-react";
import { GradientText } from "@/components/animations/AnimatedText";
import { NeonCard } from "@/components/animations/AnimatedCard";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Choose Your Sector",
    description:
      "Select from 20+ sectors including Technology, Pharmaceuticals, Fintech, Agriculture, and more.",
    color: "green" as const,
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Analysis",
    description:
      "Our AI scans multiple data sources, news articles, and market reports to gather comprehensive insights.",
    color: "blue" as const,
  },
  {
    number: "03",
    icon: FileText,
    title: "Generate Report",
    description:
      "Receive a detailed report with executive summary, opportunities, risks, and strategic recommendations.",
    color: "purple" as const,
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Take Action",
    description:
      "Use insights to identify trade opportunities, make informed decisions, and grow your business.",
    color: "gold" as const,
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-4 bg-muted/20" ref={ref}>
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            How It Works
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            From Sector Selection to{" "}
            <GradientText>Actionable Insights</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Get comprehensive market analysis in four simple steps
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <NeonCard color={step.color} className="h-full text-center">
                <div className="text-5xl font-bold text-muted-foreground/20 mb-4">
                  {step.number}
                </div>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
