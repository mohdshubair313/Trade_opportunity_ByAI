"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(() => {
    const chars = value.split("").slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] || "");
  });

  useEffect(() => {
    const chars = value.split("").slice(0, length);
    const newDigits = Array.from({ length }, (_, i) => chars[i] || "");
    setDigits(newDigits);
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputVal = e.target.value.replace(/\D/g, "");
    if (!inputVal) {
      // Backspace or clear
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      const combined = updated.join("");
      onChange(combined);
      return;
    }

    const updated = [...digits];
    // Handle single digit input or pasted string
    if (inputVal.length > 1) {
      const pastedDigits = inputVal.slice(0, length - index).split("");
      pastedDigits.forEach((char, i) => {
        if (index + i < length) {
          updated[index + i] = char;
        }
      });
      setDigits(updated);
      const combined = updated.join("");
      onChange(combined);
      const nextFocusIndex = Math.min(index + pastedDigits.length, length - 1);
      inputsRef.current[nextFocusIndex]?.focus();
      if (combined.length === length && onComplete) {
        onComplete(combined);
      }
      return;
    }

    updated[index] = inputVal.slice(-1);
    setDigits(updated);
    const combined = updated.join("");
    onChange(combined);

    if (index < length - 1 && inputVal) {
      inputsRef.current[index + 1]?.focus();
    }

    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    const newDigits = Array.from({ length }, (_, i) => pastedData[i] || "");
    setDigits(newDigits);
    const combined = newDigits.join("");
    onChange(combined);

    const focusIndex = Math.min(pastedData.length, length - 1);
    inputsRef.current[focusIndex]?.focus();

    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled}
          className={cn(
            "h-12 w-11 sm:h-14 sm:w-12 text-center text-xl font-bold font-mono rounded-xl border bg-white/[0.03] text-white outline-none transition-all duration-200 shadow-inner",
            digits[index]
              ? "border-violet-400/70 bg-violet-500/10 shadow-[0_0_14px_rgba(167,139,250,0.25)]"
              : "border-white/10 hover:border-white/25 focus:border-violet-400/60 focus:shadow-[0_0_18px_rgba(167,139,250,0.2)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}
