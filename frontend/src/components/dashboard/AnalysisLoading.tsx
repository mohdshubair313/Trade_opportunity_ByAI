"use client";

import { motion } from "framer-motion";
import { Sparkles, Globe, FileText, TrendingUp } from "lucide-react";

const steps = [
  { icon: Globe, label: "Searching market data...", delay: 0 },
  { icon: Sparkles, label: "Analyzing with AI...", delay: 3 },
  { icon: FileText, label: "Generating report...", delay: 7 },
  { icon: TrendingUp, label: "Identifying opportunities...", delay: 10 },
];

interface AnalysisLoadingProps {
  sector: string;
}

export function AnalysisLoading({ sector }: AnalysisLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-8 md:p-12"
    >
      <div className="text-center max-w-lg mx-auto">
        {/* Animated icon */}
        <motion.div
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="h-10 w-10 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">
          Analyzing{" "}
          <span className="text-primary capitalize">{sector}</span>
        </h2>
        <p className="text-muted-foreground mb-8">
          Our AI is gathering and analyzing market data. This usually takes 10-15
          seconds.
        </p>

        {/* Progress steps */}
        <div className="space-y-4 text-left">
          {steps.map((step) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.delay, duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <motion.div
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
                animate={{ backgroundColor: ["hsl(var(--muted))", "hsl(var(--primary) / 0.2)", "hsl(var(--muted))"] }}
                transition={{ delay: step.delay + 0.5, duration: 2, repeat: Infinity }}
              >
                <step.icon className="h-5 w-5 text-primary" />
              </motion.div>
              <div className="flex-1">
                <motion.div
                  className="h-2 rounded-full bg-muted overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: step.delay, duration: 3 }}
                >
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ delay: step.delay, duration: 3 }}
                  />
                </motion.div>
                <p className="text-sm text-muted-foreground mt-1">{step.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-8 p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground mb-1">Did you know?</p>
          <p>
            Our AI analyzes data from multiple sources including news, market
            reports, and industry publications to provide comprehensive insights.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
