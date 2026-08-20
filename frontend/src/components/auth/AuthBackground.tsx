"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface Particle {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export function AuthBackground() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 36 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        delay: Math.random() * 6,
        duration: Math.random() * 14 + 10,
        opacity: Math.random() * 0.5 + 0.15,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base canvas */}
      <div className="absolute inset-0 bg-[#070710]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b1a] via-transparent to-[#070710]" />

      {/* Aurora mesh blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full bg-violet-600/25 blur-[130px]"
        animate={{ scale: [1, 1.18, 1], x: [0, 70, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/4 -right-48 h-[38rem] w-[38rem] rounded-full bg-cyan-500/20 blur-[130px]"
        animate={{ scale: [1.15, 1, 1.15], x: [0, -60, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 left-1/3 h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/15 blur-[130px]"
        animate={{ scale: [1, 1.22, 1], x: [0, 50, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 left-[-10%] h-[24rem] w-[24rem] rounded-full bg-indigo-500/20 blur-[110px]"
        animate={{ scale: [1.1, 0.95, 1.1], x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay */}
      <div className="auth-grid absolute inset-0" />

      {/* Drifting particles */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{ y: [-12, 12, -12], opacity: [p.opacity, p.opacity * 0.4, p.opacity] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}