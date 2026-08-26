"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-kalam font-semibold transition-all duration-[160ms] ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary hover:bg-primary-soft shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-hairline bg-canvas hover:bg-canvas-soft text-ink",
        secondary:
          "bg-canvas-soft text-ink hover:bg-canvas",
        ghost: "bg-canvas text-primary-soft hover:bg-canvas-soft",
        link: "text-primary-deep underline-offset-4 hover:underline active:scale-100", // No scale for links usually
        glow: "bg-primary text-on-primary hover:bg-primary-soft shadow-none",
        gradient: "bg-primary text-on-primary hover:bg-primary-soft shadow-none",
        shimmer: "bg-primary text-on-primary hover:bg-primary-soft shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <span className={cn("inline-flex items-center gap-2", isLoading && "opacity-70")}>
          {children}
        </span>
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
