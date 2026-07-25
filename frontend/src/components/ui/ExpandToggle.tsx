"use client";

import { useTheme } from "@/components/ui/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Expand Theme Toggle Component
 * Inspired by https://toggles.dev/toggles/expand
 *
 * Smoothly expands rays/crescent with spring physics when toggling
 * between Dark (Moon) and Light (Sun) themes.
 */
export function ExpandToggle({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const dimensionClasses = {
    sm: "h-8 w-8 p-1.5",
    md: "h-10 w-10 p-2",
    lg: "h-12 w-12 p-2.5",
  }[size];

  const iconSize = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative flex items-center justify-center rounded-full border border-border/80 bg-card/80 backdrop-blur-md text-foreground shadow-sm transition-all duration-300 hover:bg-accent hover:border-primary/50 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        dimensionClasses,
        className
      )}
    >
      <div className={cn("relative flex items-center justify-center overflow-hidden", iconSize)}>
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            /* Moon - Dark Mode Icon with Expand Morph */
            <motion.svg
              key="dark-moon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ scale: 0.2, rotate: 90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.2, rotate: -90, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={cn(iconSize, "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]")}
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </motion.svg>
          ) : (
            /* Sun - Light Mode Icon with Expanding Rays */
            <motion.svg
              key="light-sun"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ scale: 0.2, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.2, rotate: 90, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={cn(iconSize, "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]")}
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Expand Pulse Effect */}
      <span className="absolute inset-0 rounded-full bg-primary/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
    </button>
  );
}
