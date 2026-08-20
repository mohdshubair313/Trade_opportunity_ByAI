"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

export function AuthInput({
  label,
  icon,
  error,
  className,
  type,
  id,
  ...props
}: AuthInputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasValue = typeof props.value === "string" ? props.value.length > 0 : false;
  const isActive = focused || hasValue;
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="relative">
      <div
        className={cn(
          "group relative flex items-center rounded-2xl border bg-white/[0.03] transition-all duration-200",
          focused
            ? "border-violet-400/60 shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_24px_rgba(139,92,246,0.15)] bg-white/[0.05]"
            : "border-white/10 hover:border-white/20",
          error && "border-rose-400/60 shadow-[0_0_0_3px_rgba(244,63,94,0.1)]"
        )}
      >
        {icon && (
          <span
            className={cn(
              "absolute left-4 transition-colors duration-200 z-10",
              isActive ? "text-violet-300" : "text-white/35",
              error && "text-rose-400"
            )}
          >
            {icon}
          </span>
        )}

        <input
          id={inputId}
          type={inputType}
          className={cn(
            "w-full bg-transparent pb-2.5 pt-5 text-sm text-white placeholder-transparent focus:outline-none",
            icon ? "pl-12 pr-11" : "pl-4 pr-11",
            className
          )}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />

        {/* Floating label */}
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-4 text-sm transition-all duration-200 z-10",
            icon && "left-12",
            isActive
              ? "-top-2 text-[10px] font-medium uppercase tracking-wider text-violet-300 bg-[#0c0c17] px-1.5 rounded"
              : "top-1/2 -translate-y-1/2 text-white/40",
            error && "text-rose-400"
          )}
        >
          {label}
        </label>

        {type === "password" && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 text-white/35 hover:text-white transition-colors z-10"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 pl-1 text-xs text-rose-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}