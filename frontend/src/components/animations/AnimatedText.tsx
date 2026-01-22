"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Shiny Text Effect
export function ShinyText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex animate-shine bg-[linear-gradient(110deg,transparent,45%,rgba(255,255,255,0.5),55%,transparent)] bg-[length:200%_100%] bg-clip-text",
        className
      )}
    >
      {children}
    </span>
  );
}

// Gradient Text Effect
export function GradientText({
  children,
  className,
  colors = ["#22c55e", "#10b981", "#059669"],
}: {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}) {
  return (
    <span
      className={cn("font-bold bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: `linear-gradient(135deg, ${colors.join(", ")})`,
        backgroundSize: "200% 200%",
        animation: "gradient 4s ease infinite",
      }}
    >
      {children}
    </span>
  );
}

// Typewriter Effect
export function TypewriterText({
  words,
  className,
  typingSpeed = 100,
  deletingSpeed = 50,
  delayBetweenWords = 2000,
}: {
  words: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBetweenWords?: number;
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentText.length < word.length) {
            setCurrentText(word.slice(0, currentText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), delayBetweenWords);
          }
        } else {
          if (currentText.length > 0) {
            setCurrentText(currentText.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentWordIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [
    currentText,
    currentWordIndex,
    isDeleting,
    words,
    typingSpeed,
    deletingSpeed,
    delayBetweenWords,
  ]);

  return (
    <span className={cn("inline-block", className)}>
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Word Rotate Effect
export function WordRotate({
  words,
  className,
  duration = 3000,
}: {
  words: string[];
  className?: string;
  duration?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[index]}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={cn("inline-block", className)}
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}

// Letter Pull Up Animation
export function LetterPullUp({
  children,
  className,
  delay = 0.05,
}: {
  children: string;
  className?: string;
  delay?: number;
}) {
  const letters = children.split("");

  return (
    <span className={cn("inline-flex", className)}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: i * delay,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
}

// Blur In Text Animation
export function BlurIn({
  children,
  className,
  duration = 0.5,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration, delay }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.span>
  );
}

// Number Counter Animation
export function NumberTicker({
  value,
  className,
  duration = 2,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  const lastValue = useRef(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = lastValue.current;
    const diff = value - startValue;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + diff * easeOut);

      setDisplayValue(currentValue);
      lastValue.current = currentValue;

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}
