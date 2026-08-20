"use client";

import { cn } from "@/lib/utils";

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-md", className)}>
      {/* Glow behind card */}
      <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-2xl" />

      {/* Gradient border wrapper */}
      <div className="auth-gradient-border relative rounded-[1.75rem] p-px shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="relative rounded-[calc(1.75rem-1px)] bg-[#0c0c17]/85 backdrop-blur-2xl px-7 py-8 sm:px-9 sm:py-10 overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}