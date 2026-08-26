"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Clock } from "lucide-react";
import {
  SectorScannerIcon,
  PipelineClusterIcon,
  SynthesizerIcon,
  OmnichannelIcon,
} from "@/components/icons/CustomIcons";

const LIFECYCLE_STEPS = [
  {
    timestamp: "07:00:00",
    step: "STEP 01",
    title: "Query Received",
    description:
      "Natural-language question parsed for equity sector focus, risk parameters, and active user persona.",
    badge: "INTENT: PARSED",
    icon: SectorScannerIcon,
  },
  {
    timestamp: "07:00:03",
    step: "STEP 02",
    title: "Research & Score",
    description:
      "6 real-time market pipelines queried concurrently across live NSE filings, macroeconomic releases, and tape flow.",
    badge: "6 SERVICES / 41 APIS",
    icon: PipelineClusterIcon,
  },
  {
    timestamp: "07:00:11",
    step: "STEP 03",
    title: "Narrate & Tone",
    description:
      "Specialized AI cascade synthesizes cited sector opportunities, primary risks, and tone-specific takeaways.",
    badge: "VERIFIED & CITED",
    icon: SynthesizerIcon,
  },
  {
    timestamp: "07:00:15",
    step: "STEP 04",
    title: "Delivered Everywhere",
    description:
      "Instantaneous broadcast to interactive web report, hands-free voice stream, and exportable PDF/XLSX decks.",
    badge: "WEB · VOICE · DOC",
    icon: OmnichannelIcon,
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="product"
      ref={ref}
      className="relative py-24 md:py-32 px-4 border-t border-border bg-background"
    >
      <div className="main-container mx-auto">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-primary text-xs font-mono font-semibold uppercase tracking-[0.18em] mb-4">
            <Clock className="h-3.5 w-3.5" />
            // FLIGHT RECORDER LOG
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            7 AM. One question.{" "}
            <span className="font-kalam text-primary block sm:inline">
              Answered in 15 seconds.
            </span>
          </h2>
          
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-kalam">
            A deterministic agent pipeline designed for institutional speed and verifiable accuracy.
            <span className="block font-kalam text-primary text-sm mt-2">
              (zero manual searching, audited citations)
            </span>
          </p>
        </div>

        {/* Flight Recorder Timeline */}
        <div className="relative">
          
          {/* Glowing horizontal connection line on Desktop */}
          <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {LIFECYCLE_STEPS.map((s, i) => (
              <motion.div
                key={s.timestamp}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative h-full flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-md"
              >
                <div>
                  {/* Timestamp & Step Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary shadow-sm" />
                      <span className="font-mono text-xs font-bold text-primary tracking-wider">
                        {s.timestamp}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                      {s.step}
                    </span>
                  </div>

                  {/* Step Title with Custom Icon */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-primary group-hover:border-primary/40 transition-colors">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {s.title}
                    </h3>
                  </div>

                  {/* Step Description */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-kalam mt-2">
                    {s.description}
                  </p>
                </div>

                {/* Status Telemetry Tag at Card Bottom */}
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {s.badge}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}