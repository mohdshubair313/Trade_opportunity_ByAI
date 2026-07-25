"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode;
  showRadialGradient?: boolean;
}

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-500 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Aurora Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            `
            [--white-gradient:radial-gradient(at_50%_0%,rgba(255,255,255,0.8)_0px,transparent_50%)]
            [--dark-gradient:radial-gradient(at_50%_0%,rgba(16,185,129,0.25)_0px,transparent_50%)]
            [--aurora:radial-gradient(ellipse_at_100%_0%,rgba(16,185,129,0.35)_0%,rgba(6,182,212,0.3)_25%,rgba(139,92,246,0.25)_50%,rgba(99,102,241,0.2)_75%,transparent_100%)]
            [background-image:var(--dark-gradient),var(--aurora)]
            dark:[background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%_200%,200%_100%]
            [background-position:50%_50%,50%_50%]
            filter blur-[24px] opacity-70 dark:opacity-60
            absolute -inset-[10px] pointer-events-none
            animate-aurora
            will-change-transform
          `,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_30%,transparent_80%)]`
          )}
        />
        
        {/* Additional shifting glow orb for depth */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/15 blur-[120px] animate-pulse delay-1000" />
      </div>

      {children}
    </div>
  );
}
