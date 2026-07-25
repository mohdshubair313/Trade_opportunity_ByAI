"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

const Card = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// Glass Card variant
const GlassCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-xl glass-card text-card-foreground",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
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
        "rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 relative overflow-hidden group shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {/* Background glow on hover */}
      <div className="pointer-events-none absolute -right-10 -top-10 w-28 h-28 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-500" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-1.5 text-xs font-medium flex items-center gap-1",
                changeType === "positive" && "text-emerald-500 dark:text-emerald-400",
                changeType === "negative" && "text-red-500 dark:text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {changeType === "positive" && "↑ "}
              {changeType === "negative" && "↓ "}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-xl bg-primary/10 p-3 text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner">
            {icon}
          </div>
        )}
      </div>

      {/* Decorative Sparkline SVG */}
      {sparkline && (
        <div className="mt-3 h-6 w-full opacity-40 group-hover:opacity-80 transition-opacity duration-300">
          <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
            <path
              d={changeType === "negative" ? "M 0 4 Q 25 18 50 10 T 100 22" : "M 0 20 Q 25 15 50 8 T 100 2"}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={changeType === "negative" ? "text-red-500/70" : "text-emerald-500/70"}
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
);
StatsCard.displayName = "StatsCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, GlassCard, StatsCard };
