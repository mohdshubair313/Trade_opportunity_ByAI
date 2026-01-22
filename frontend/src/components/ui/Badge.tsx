"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-green-500/10 text-green-500 border-green-500/20",
        warning:
          "border-transparent bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        info:
          "border-transparent bg-blue-500/10 text-blue-500 border-blue-500/20",
        glow: "border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  animated?: boolean;
}

function Badge({ className, variant, animated = false, ...props }: BadgeProps) {
  if (animated) {
    return (
      <motion.div
        className={cn(badgeVariants({ variant }), className)}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        {...props}
      />
    );
  }

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Pulse Badge (for notifications, live status, etc.)
function PulseBadge({
  className,
  children,
  color = "green",
}: {
  className?: string;
  children: React.ReactNode;
  color?: "green" | "red" | "yellow" | "blue";
}) {
  const colors = {
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    blue: "bg-blue-500",
  };

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            colors[color]
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            colors[color]
          )}
        />
      </span>
      {children}
    </span>
  );
}

export { Badge, badgeVariants, PulseBadge };
