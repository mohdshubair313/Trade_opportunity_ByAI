"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

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
}

/**
 * The signature voice agent surface — a layered, breathing sphere.
 *
 * - Idle: slow ambient pulse on the outer halo only.
 * - Listening: inner core scales with the user's RMS, halo locks in green.
 * - Thinking: rotating gradient ring while we wait on the LLM.
 * - Speaking: outer rings ripple outward in time with playback amplitude.
 *
 * Built with three stacked elements (halo → ring → core) plus a canvas
 * "particle field" for the thinking state. Pure CSS for everything except
 * the particle field so the orb remains performant on low-end Android.
 */
export function VoiceOrb({ state, level = 0, size = 240, className }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const particles = Array.from({ length: 40 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: size * 0.32 + Math.random() * size * 0.06,
      speed: 0.002 + Math.random() * 0.004,
      hue: 140 + Math.random() * 80,
    }));

    let alive = true;
    const render = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, size, size);
      const center = size / 2;

      if (state === "thinking") {
        for (const p of particles) {
          p.angle += p.speed;
          const x = center + Math.cos(p.angle) * p.radius;
          const y = center + Math.sin(p.angle) * p.radius;
          ctx.beginPath();
          ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, 0.7)`;
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      rafRef.current = window.requestAnimationFrame(render);
    };
    render();
    return () => {
      alive = false;
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [state, size]);

  const coreScale = state === "listening" || state === "speaking" ? 1 + level * 0.6 : 1;
  const haloOpacity = state === "muted" ? 0.18 : 0.55;
  const isActive = state === "listening" || state === "speaking";

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="status"
      aria-live="polite"
      aria-label={`Voice agent ${state}`}
    >
      {/* Outer halo — slow ambient pulse */}
      <motion.div
        animate={{
          scale: state === "idle" ? [1, 1.08, 1] : isActive ? [1, 1.04, 1] : 1,
          opacity: haloOpacity,
        }}
        transition={{
          duration: state === "idle" ? 4 : 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            state === "muted"
              ? "radial-gradient(circle, rgba(148,163,184,0.45), transparent 70%)"
              : state === "thinking"
              ? "radial-gradient(circle, rgba(56,189,248,0.55), transparent 70%)"
              : state === "speaking"
              ? "radial-gradient(circle, rgba(34,197,94,0.55), transparent 70%)"
              : "radial-gradient(circle, rgba(45,212,191,0.45), transparent 70%)",
        }}
      />

      {/* Speaking ripple rings */}
      {state === "speaking" && (
        <>
          {[0, 0.8, 1.6].map((delay) => (
            <motion.span
              key={delay}
              className="pointer-events-none absolute rounded-full border border-emerald-300/40"
              initial={{ scale: 0.85, opacity: 0.55 }}
              animate={{ scale: 1.55, opacity: 0 }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay,
                ease: "easeOut",
              }}
              style={{ width: size * 0.78, height: size * 0.78 }}
            />
          ))}
        </>
      )}

      {/* Rotating gradient ring (always present, intensifies on thinking) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.82,
          height: size * 0.82,
          background:
            "conic-gradient(from 0deg, rgba(34,197,94,0.95), rgba(56,189,248,0.85), rgba(168,85,247,0.85), rgba(34,197,94,0.95))",
          padding: 1.5,
          opacity: state === "muted" ? 0.25 : 1,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: state === "thinking" ? 4 : 14,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), rgba(7,12,18,0.95) 60%)",
          }}
        />
      </motion.div>

      {/* Particle field for thinking state */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{ opacity: state === "thinking" ? 1 : 0 }}
      />

      {/* Inner core — reactive to RMS */}
      <motion.div
        animate={{ scale: coreScale }}
        transition={{ type: "spring", stiffness: 180, damping: 16, mass: 0.4 }}
        className="relative grid place-items-center rounded-full"
        style={{
          width: size * 0.52,
          height: size * 0.52,
          background:
            state === "muted"
              ? "radial-gradient(circle at 30% 25%, rgba(148,163,184,0.4), rgba(7,12,18,0.95) 70%)"
              : "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45), rgba(34,197,94,0.55) 35%, rgba(7,12,18,0.95) 75%)",
          boxShadow:
            state === "muted"
              ? "inset 0 0 30px rgba(148,163,184,0.25)"
              : "inset 0 0 40px rgba(34,197,94,0.45), 0 0 60px rgba(34,197,94,0.25)",
        }}
      >
        <div className="grid place-items-center">
          <StateGlyph state={state} size={size * 0.22} />
        </div>
      </motion.div>
    </div>
  );
}

function StateGlyph({ state, size }: { state: VoiceOrbState; size: number }) {
  if (state === "muted") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="text-slate-300">
        <path
          fill="currentColor"
          d="M12 2a3 3 0 0 0-3 3v4.18l6 6V5a3 3 0 0 0-3-3Zm7 9a1 1 0 0 0-2 0c0 1.16-.27 2.25-.74 3.21l1.46 1.46A8.94 8.94 0 0 0 19 11Zm-2.18 6.18 1.45 1.45a8.96 8.96 0 0 1-5.27 1.34V22h-2v-2.03a9 9 0 0 1-7-7.97 1 1 0 1 1 2 0 7 7 0 0 0 12.31 4.59ZM3.28 4.22 19.78 20.7l-1.41 1.42-3.69-3.69a9 9 0 0 1-1.68.46V22h-2v-2.03A8.99 8.99 0 0 1 4 12a1 1 0 1 1 2 0 7 7 0 0 0 7 7c.43 0 .85-.04 1.26-.12L1.86 5.64ZM9 9.18l3 3V12a3 3 0 0 1-3 3v-5.82Z"
        />
      </svg>
    );
  }
  if (state === "thinking") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="text-cyan-200">
        <path
          fill="currentColor"
          d="M12 2 9.91 7.36 4 8.27l4.5 4.39L7.18 19 12 15.9 16.82 19l-1.32-6.34L20 8.27l-5.91-.91Z"
        />
      </svg>
    );
  }
  if (state === "speaking") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="text-emerald-100">
        <path
          fill="currentColor"
          d="M3 10v4a1 1 0 0 0 1 1h2l3.29 3.29A1 1 0 0 0 11 17.71V6.29a1 1 0 0 0-1.71-.7L6 8.59 4 9H3a1 1 0 0 0-1 1ZM14.83 7.76a1 1 0 0 0-1.42 1.42 4 4 0 0 1 0 5.65 1 1 0 0 0 1.42 1.42 6 6 0 0 0 0-8.49Zm2.83-2.83a1 1 0 0 0-1.41 1.41 8 8 0 0 1 0 11.32 1 1 0 0 0 1.41 1.42 10 10 0 0 0 0-14.15Z"
        />
      </svg>
    );
  }
  if (state === "listening") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="text-emerald-100">
        <path
          fill="currentColor"
          d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11a1 1 0 1 0-2 0Z"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-slate-100">
      <path
        fill="currentColor"
        d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm7 9a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11Z"
      />
    </svg>
  );
}
