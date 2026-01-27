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
    <section className="py-24 px-4 bg-muted/20 relative overflow-hidden" ref={ref}>
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-5" />
      
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
            How It Works
          </motion.span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            From Sector Selection to{" "}
            <GradientText>Actionable Insights</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Get comprehensive market analysis in four simple steps
          </p>
        </motion.div>

        {/* Steps with Animated Connectors */}
        <div className="relative">
          {/* Horizontal connector line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          {/* Steps grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 80
                }}
                className="relative"
              >
                {/* Animated connector dots */}
                {index < steps.length - 1 && (
                  <motion.div 
                    className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-primary"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.5, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.5,
                        }}
                      />
                      <div className="w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                    </div>
                  </motion.div>
                )}

                <NeonCard color={step.color} className="h-full text-center relative overflow-hidden">
                  {/* Step number with animation */}
                  <motion.div 
                    className="text-5xl font-bold text-muted-foreground/20 mb-4"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
                  >
                    {step.number}
                  </motion.div>

                  {/* Icon with floating animation */}
                  <motion.div 
                    className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.15 + 0.3,
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3
                      }
                    }}
                  >
                    <step.icon className="h-8 w-8 text-primary" />
                  </motion.div>

                  {/* Title with fade-in */}
                  <motion.h3 
                    className="text-xl font-semibold mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
                  >
                    {step.title}
                  </motion.h3>

                  {/* Description with fade-in */}
                  <motion.p 
                    className="text-muted-foreground text-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.5 }}
                  >
                    {step.description}
                  </motion.p>

                  {/* Decorative background effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.6 }}
                  />
                </NeonCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
