"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthToggleProps {
  mode: "login" | "register";
  onChange: (mode: "login" | "register") => void;
  className?: string;
}

export function AuthToggle({ mode, onChange, className }: AuthToggleProps) {
  const options = [
    { key: "login" as const, label: "Log In" },
    { key: "register" as const, label: "Sign Up" },
  ];

  return (
    <div
      className={cn(
        "relative mx-auto w-fit rounded-full border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-xl",
        className
      )}
    >
      <div className="relative flex">
        {options.map((opt) => {
          const active = mode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                "relative z-10 rounded-full px-8 py-2.5 text-sm font-semibold transition-colors duration-200",
                active ? "text-white" : "text-white/50 hover:text-white/80"
              )}
            >
              {active && (
                <motion.span
                  layoutId="auth-toggle-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_4px_20px_rgba(139,92,246,0.4)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}