"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
}

export function GradientButton({
  isLoading,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 text-white font-semibold text-sm h-12 transition-all duration-300",
        "hover:shadow-[0_8px_40px_rgba(168,85,247,0.45)] hover:brightness-110 active:scale-[0.98]",
        "disabled:opacity-60 disabled:hover:shadow-none disabled:hover:brightness-100 disabled:active:scale-100",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Shine sweep */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="animate-auth-shine absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </span>
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isLoading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}