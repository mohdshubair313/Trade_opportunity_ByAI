"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye } from "lucide-react";

// ─── Avatar gradient palette ────────────────────────────────────────────────
// Curated gradient pairs that look stunning on dark backgrounds. Each viewer
// gets one at random so the stack always feels colourful.
const AVATAR_GRADIENTS = [
  "from-emerald-400 to-cyan-500",
  "from-violet-400 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-sky-400 to-indigo-500",
  "from-lime-400 to-green-500",
  "from-teal-400 to-emerald-500",
  "from-purple-400 to-violet-500",
];

// Random first-name initials to make avatar bubbles feel human.
const FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Ananya", "Karthik", "Meera",
  "Arjun", "Divya", "Rahul", "Kavya", "Nikhil", "Isha", "Siddharth", "Tanvi",
  "Aditya", "Riya", "Varun", "Pooja", "Manish", "Shreya", "Gaurav", "Nisha",
  "Akash", "Swati", "Deepak", "Pallavi", "Rajat", "Neha", "Kunal", "Simran",
];

interface Viewer {
  id: string;
  initials: string;
  name: string;
  gradientIndex: number;
}

// ─── Simulation hook ────────────────────────────────────────────────────────
// Generates a realistic-looking viewer count that fluctuates over time.
function useVisitorSimulation() {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const nextIdRef = useRef(0);
  const isInitialised = useRef(false);

  // Create a random viewer
  const createViewer = useCallback((): Viewer => {
    const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const id = `v-${nextIdRef.current++}`;
    return {
      id,
      initials: name.charAt(0).toUpperCase(),
      name,
      gradientIndex: Math.floor(Math.random() * AVATAR_GRADIENTS.length),
    };
  }, []);

  // Seed initial viewers on mount
  useEffect(() => {
    if (isInitialised.current) return;
    isInitialised.current = true;

    const initialCount = Math.floor(Math.random() * 17) + 8; // 8–24
    const initial: Viewer[] = [];
    for (let i = 0; i < Math.min(initialCount, 5); i++) {
      initial.push(createViewer());
    }
    setViewers(initial);
    setTotalCount(initialCount);
  }, [createViewer]);

  // Fluctuate count periodically
  useEffect(() => {
    const tick = () => {
      setTotalCount((prev) => {
        const delta = Math.random() < 0.55 ? 1 : -1; // slight upward bias
        const magnitude = Math.floor(Math.random() * 3) + 1; // 1–3
        const next = prev + delta * magnitude;
        // Clamp between 5 and 40
        return Math.max(5, Math.min(40, next));
      });

      // Randomly add or remove a visible avatar
      setViewers((prev) => {
        const shouldAdd = Math.random() < 0.55;
        if (shouldAdd && prev.length < 5) {
          return [...prev, createViewer()];
        } else if (!shouldAdd && prev.length > 2) {
          // Remove a random viewer
          const idx = Math.floor(Math.random() * prev.length);
          return prev.filter((_, i) => i !== idx);
        }
        return prev;
      });
    };

    // Fluctuate every 4–8 seconds
    let timeout: NodeJS.Timeout;
    const schedule = () => {
      const delay = 4000 + Math.random() * 4000;
      timeout = setTimeout(() => {
        tick();
        schedule();
      }, delay);
    };
    schedule();

    return () => clearTimeout(timeout);
  }, [createViewer]);

  return { viewers, totalCount };
}

// ─── Animated counter digit ─────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 12, opacity: 0, filter: "blur(4px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: -12, opacity: 0, filter: "blur(4px)" }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="inline-block tabular-nums font-bold"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function LiveVisitors() {
  const { viewers, totalCount } = useVisitorSimulation();
  const [hasEntered, setHasEntered] = useState(false);

  // Delay the entrance so the page loads first
  useEffect(() => {
    const t = setTimeout(() => setHasEntered(true), 1800);
    return () => clearTimeout(t);
  }, []);

  // Memoize the visible stack (max 5)
  const visibleViewers = useMemo(() => viewers.slice(-5), [viewers]);

  if (!hasEntered) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.1 }}
      className="fixed bottom-6 left-6 z-45 pointer-events-none"
      style={{ zIndex: 45 }}
    >
      {/* Glow halo behind the pill */}
      <div
        className="absolute -inset-4 rounded-full opacity-40 blur-2xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
        }}
      />

      {/* The pill */}
      <div className="viewer-pill relative flex items-center gap-3 rounded-full px-4 py-2.5 pointer-events-auto">
        {/* Pulsing live dot */}
        <div className="relative flex items-center justify-center">
          <span className="absolute h-3 w-3 rounded-full bg-violet-400/40 viewer-pulse-ring" />
          <span className="relative h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 shadow-[0_0_8px_2px_rgba(168,85,247,0.5)]" />
        </div>

        {/* Avatar stack */}
        <div className="flex items-center -space-x-2">
          <AnimatePresence mode="popLayout">
            {visibleViewers.map((v, i) => (
              <motion.div
                key={v.id}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[v.gradientIndex]} text-[10px] font-bold text-white ring-2 ring-background/80`}
                style={{ zIndex: visibleViewers.length - i }}
                title={v.name}
              >
                {v.initials}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Count + label */}
        <div className="flex items-center gap-1.5 text-sm">
          <AnimatedNumber value={totalCount} />
          <span className="viewer-shimmer-text text-white/65 text-xs font-medium whitespace-nowrap">
            viewing now
          </span>
        </div>

        {/* Eye icon */}
        <Eye className="h-3.5 w-3.5 text-violet-400/70" />
      </div>
    </motion.div>
  );
}
