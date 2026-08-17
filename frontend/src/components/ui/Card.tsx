"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

const Card = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-md border border-hairline bg-canvas text-ink shadow-none",
        className
      )}
      initial={{ opacity: 0, transform: "translateY(20px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-2xl", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-display-md text-ink-strong", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-body-sm text-mute", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-2xl pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-2xl pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// Glass Card variant (deprecated in Voltagent design, now maps to standard Card)
const GlassCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-md border border-hairline bg-canvas text-ink",
        className
      )}
      initial={{ opacity: 0, transform: "translateY(20px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      {...props}
    />
  )
);
GlassCard.displayName = "GlassCard";

// Stats Card
interface StatsCardProps extends HTMLMotionProps<"div"> {
  title: string;
  value: string | number | React.ReactNode;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  sparkline?: boolean;
}

const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, title, value, change, changeType = "neutral", icon, sparkline = true, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-md border border-hairline bg-canvas p-xl relative overflow-hidden group shadow-none transition-all duration-300",
        className
      )}
      initial={{ opacity: 0, transform: "translateY(20px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      {...props}
    >
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-eyebrow-mono text-mute">{title}</p>
          <div className="mt-2 font-mono text-display-lg text-ink-strong tracking-tight">{value}</div>
          {change && (
            <p
              className={cn(
                "mt-2 font-mono text-code flex items-center gap-1",
                changeType === "positive" && "text-primary",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-mute"
              )}
            >
              {changeType === "positive" && "↑ "}
              {changeType === "negative" && "↓ "}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-sm border border-hairline bg-canvas-soft p-3 text-primary">
            {icon}
          </div>
        )}
      </div>

      {/* Decorative Sparkline SVG */}
      {sparkline && (
        <div className="mt-3 h-6 w-full opacity-40">
          <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
            <path
              d={changeType === "negative" ? "M 0 4 Q 25 18 50 10 T 100 22" : "M 0 20 Q 25 15 50 8 T 100 2"}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={changeType === "negative" ? "text-destructive" : "text-primary"}
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
);
StatsCard.displayName = "StatsCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, GlassCard, StatsCard };
