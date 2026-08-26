"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Layers, ArrowRight } from "lucide-react";
import {
  StreamingWebIcon,
  VoiceWaveformIcon,
  DocBundleIcon,
} from "@/components/icons/CustomIcons";
import Link from "next/link";

const FORMATS = [
  {
    title: "Live Web Report",
    tag: "INTERACTIVE DOSSIER",
    icon: StreamingWebIcon,
    description:
      "Interactive streaming workspace with live ticker heatmaps, expandable source citations, and side-by-side sector comparison rankings.",
    preview: (
      <div className="p-4 rounded-xl bg-background border border-border space-y-2.5 font-mono text-[11px]">
        <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-2">
          <span>SECTOR: NIFTY AUTO</span>
          <span className="text-primary font-bold">+1.84%</span>
        </div>
        <div className="space-y-1.5 text-xs text-foreground">
          <div className="flex justify-between">
            <span>TATAMOTORS</span>
            <span className="text-primary font-bold">₹982.40 (+3.2%)</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>M&M</span>
            <span className="text-primary">₹2,840.10 (+2.1%)</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>MARUTI</span>
            <span className="text-muted-foreground">₹12,410.00 (-0.4%)</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Voice Narration",
    tag: "HANDS-FREE AUDIO",
    icon: VoiceWaveformIcon,
    description:
      "Natural speech synthesis in Indian English. Listen to your persona-tuned sector memos hands-free on your commute or morning routine.",
    preview: (
      <div className="p-4 rounded-xl bg-background border border-border flex flex-col justify-center items-center space-y-3">
        <div className="flex items-center justify-center gap-1.5 h-10 w-full">
          {[40, 70, 90, 60, 30, 80, 100, 75, 45, 85, 95, 60, 35, 70, 50].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-primary animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.08}s`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
          <span>INDIAN ENGLISH · 24kHz HD AUDIO</span>
        </div>
      </div>
    ),
  },
  {
    title: "Exportable Docs",
    tag: "BOARDROOM READY",
    icon: DocBundleIcon,
    description:
      "Generate board-ready PDF dossiers, financial model spreadsheets in Excel, presentation slides in PPTX, or clean Markdown files.",
    preview: (
      <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
        <div className="grid grid-cols-2 gap-2 text-center font-mono text-[10px]">
          <div className="p-2 rounded bg-card border border-border text-foreground font-bold">
            📄 PDF Dossier
          </div>
          <div className="p-2 rounded bg-card border border-border text-primary font-bold">
            📊 XLSX Model
          </div>
          <div className="p-2 rounded bg-card border border-border text-foreground font-bold">
            📽️ PPTX Slides
          </div>
          <div className="p-2 rounded bg-card border border-border text-muted-foreground font-bold">
            📝 Markdown
          </div>
        </div>
        <div className="text-center font-mono text-[9px] text-muted-foreground">
          1-CLICK ASYNC EXPORT ENGINE
        </div>
      </div>
    ),
  },
];

export function DeliveryFormats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 px-4 border-t border-border bg-background"
    >
      <div className="main-container mx-auto">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-primary text-xs font-mono font-semibold uppercase tracking-[0.18em] mb-4">
            <Layers className="h-3.5 w-3.5" />
            // MULTI-MODAL DELIVERABLES
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Web. Voice.{" "}
            <span className="font-kalam text-primary block sm:inline">
              Document.
            </span>
          </h2>
          
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-kalam">
            Whether you are analyzing live on your desktop, commuting with audio briefings, or presenting to the board.
            <span className="block font-kalam text-primary text-sm mt-1">
              ⚡ Available across all formats instantly
            </span>
          </p>
        </div>

        {/* 3 Deliverables Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {FORMATS.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-md"
            >
              <div>
                {/* Header: Bespoke Custom Icon + Tag */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary group-hover:border-primary/40 transition-all">
                    <f.icon className="h-5 w-5" />
                  </div>
                  
                  <span className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                    {f.tag}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-xl font-bold text-foreground tracking-tight mb-2 group-hover:text-primary transition-colors font-kalam">
                  {f.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-kalam mb-6">
                  {f.description}
                </p>

                {/* Visual Preview */}
                <div className="mb-6">
                  {f.preview}
                </div>
              </div>

              {/* Action Button at bottom */}
              <div className="pt-4 border-t border-border/50">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-primary hover:underline transition-all group/link"
                >
                  <span>Explore format</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
