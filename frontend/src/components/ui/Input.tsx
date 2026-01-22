"use client";

import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Search } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = type === "password" && showPassword ? "text" : type;

    return (
      <div className="relative w-full">
        <div
          className={cn(
            "relative flex items-center rounded-lg border bg-background transition-all duration-200",
            isFocused
              ? "border-primary ring-2 ring-primary/20"
              : "border-border",
            error && "border-destructive ring-2 ring-destructive/20"
          )}
        >
          {icon && (
            <div className="absolute left-3 text-muted-foreground">{icon}</div>
          )}

          <input
            type={inputType}
            className={cn(
              "flex h-11 w-full rounded-lg bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              type === "password" && "pr-10",
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {type === "password" && (
            <button
              type="button"
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-1.5 text-xs text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
Input.displayName = "Input";

// Search Input with animation
export function SearchInput({
  className,
  onSearch,
  ...props
}: InputProps & { onSearch?: (value: string) => void }) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <motion.div
        className={cn(
          "relative flex items-center rounded-full border bg-card transition-all duration-300",
          isFocused
            ? "border-primary shadow-lg shadow-primary/20"
            : "border-border"
        )}
        animate={{ width: isFocused ? "100%" : "100%" }}
      >
        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex h-12 w-full rounded-full bg-transparent px-12 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="submit"
              className="absolute right-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Search
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </form>
  );
}

export { Input };
