"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// Magic Card with hover effect
export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "rgba(34, 197, 94, 0.3)",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
} & HTMLMotionProps<"div">) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border border-border p-6",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {/* Gradient spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// 3D Tilt Card
export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    rotateX.set(-(y / rect.height) * 10);
    rotateY.set((x / rect.width) * 10);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn("relative perspective-1000", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}

// Glow Card
export function GlowCard({
  children,
  className,
  glowColor = "rgba(34, 197, 94, 0.5)",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={cn(
        "relative rounded-xl bg-card border border-border p-6 overflow-hidden",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`,
        }}
      />

      {/* Border gradient */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(135deg, ${glowColor}, transparent, ${glowColor})`,
          padding: "1px",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
        }}
      />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Border Beam Card
export function BorderBeamCard({
  children,
  className,
  duration = 8,
  borderWidth = 2,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  borderWidth?: number;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-card p-6 overflow-hidden",
        className
      )}
    >
      {/* Animated border beam */}
      <div
        className="absolute inset-0 rounded-xl"
        style={
          {
            "--duration": duration,
            background: `linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)`,
            backgroundSize: "200% 100%",
            animation: `border-beam ${duration}s linear infinite`,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: "exclude",
            padding: `${borderWidth}px`,
          } as React.CSSProperties
        }
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Neon Card
export function NeonCard({
  children,
  className,
  color = "green",
}: {
  children: React.ReactNode;
  className?: string;
  color?: "green" | "blue" | "purple" | "gold";
}) {
  const colors = {
    green: "rgba(34, 197, 94, 0.6)",
    blue: "rgba(59, 130, 246, 0.6)",
    purple: "rgba(168, 85, 247, 0.6)",
    gold: "rgba(251, 191, 36, 0.6)",
  };

  return (
    <motion.div
      className={cn(
        "relative rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-6",
        className
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      style={{
        boxShadow: `0 0 20px ${colors[color]}, inset 0 0 20px ${colors[color]}20`,
      }}
    >
      {children}
    </motion.div>
  );
}
