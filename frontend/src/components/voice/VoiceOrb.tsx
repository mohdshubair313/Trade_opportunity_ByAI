"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import { Mic, MicOff, Volume2, Sparkles, Radio } from "lucide-react";

import { cn } from "@/lib/utils";
import { Orb, type OrbState } from "@/components/voice/Orb";

export type VoiceOrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted";

interface VoiceOrbProps {
  state: VoiceOrbState;
  /** 0..1 live RMS while listening, or playback amplitude while speaking. */
  level?: number;
  size?: number;
  className?: string;
  onClick?: () => void;
  showGlyph?: boolean;
}

/**
 * Enhanced VoiceOrb Surface:
 * Powered by ReactBits-inspired 3D OGL WebGL Orb shader with Fresnel aura,
 * real-time harmonic displacement, dynamic state morphing, and HUD overlays.
 */
export function VoiceOrb({
  state,
  level = 0,
  size = 280,
  className,
  onClick,
  showGlyph = true,
}: VoiceOrbProps) {
  const [hovered, setHovered] = useState(false);
  const orbState: OrbState = state;

  return (
    <div
      className={cn(
        "relative grid place-items-center cursor-pointer select-none group",
        className
      )}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Voice agent state: ${state}`}
    >
      {/* 3D WebGL Aura Orb Core */}
      <Orb
        state={orbState}
        audioLevel={level}
        size={size}
        speed={state === "thinking" ? 2.0 : state === "speaking" ? 1.4 : 1.0}
        complexity={state === "listening" ? 1.8 : state === "thinking" ? 2.4 : 1.2}
        displacement={state === "listening" || state === "speaking" ? 0.22 : 0.12}
        interactive={true}
      />

      {/* Speaking harmonic acoustic ripples */}
      {state === "speaking" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {[0, 0.7, 1.4].map((delay) => (
            <motion.span
              key={delay}
              className="absolute rounded-full border border-cyan-400/40"
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{
                scale: [0.85, 1.45 + level * 0.4],
                opacity: [0.65, 0],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay,
                ease: "easeOut",
              }}
              style={{ width: size * 0.82, height: size * 0.82 }}
            />
          ))}
        </div>
      )}

      {/* Listening acoustic sensor ring */}
      {state === "listening" && (
        <motion.div
          className="pointer-events-none absolute rounded-full border border-emerald-400/30"
          animate={{
            scale: [1, 1.08 + level * 0.35, 1],
            opacity: [0.3, 0.7 + level * 0.3, 0.3],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: size * 0.9, height: size * 0.9 }}
        />
      )}

      {/* Center HUD status badge */}
      {showGlyph && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: hovered ? 1.08 : 1,
              opacity: state === "idle" && !hovered ? 0.45 : 0.95,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/15 p-3 shadow-lg"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={state}
                initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                transition={{ duration: 0.2 }}
              >
                <StateGlyph state={state} size={size * 0.09} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StateGlyph({ state, size }: { state: VoiceOrbState; size: number }) {
  const iconSize = Math.max(18, Math.round(size));

  if (state === "muted") {
    return <MicOff className="text-slate-400" style={{ width: iconSize, height: iconSize }} />;
  }
  if (state === "listening") {
    return <Mic className="text-emerald-400 animate-pulse" style={{ width: iconSize, height: iconSize }} />;
  }
  if (state === "thinking") {
    return <Sparkles className="text-cyan-300 animate-spin" style={{ width: iconSize, height: iconSize }} />;
  }
  if (state === "speaking") {
    return <Volume2 className="text-cyan-400" style={{ width: iconSize, height: iconSize }} />;
  }
  return <Radio className="text-emerald-300/80" style={{ width: iconSize, height: iconSize }} />;
}
