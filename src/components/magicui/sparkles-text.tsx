"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useEffect, useState, useCallback } from "react";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
}

const random = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateSparkle = (colors: string[]): Sparkle => ({
  id: crypto.randomUUID(),
  x: `${random(-10, 110)}%`,
  y: `${random(-10, 110)}%`,
  color: colors[random(0, colors.length - 1)] ?? colors[0] ?? "#2383E2",
  delay: random(0, 2),
  scale: random(50, 100) / 100,
});

export function SparklesText({
  children,
  className,
  sparklesCount = 10,
  colors = ["#2383E2", "#D9730D", "#0F7B6C"],
}: {
  children: React.ReactNode;
  className?: string;
  sparklesCount?: number;
  colors?: string[];
}) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const updateSparkles = useCallback(() => {
    setSparkles(
      Array.from({ length: sparklesCount }, () => generateSparkle(colors)),
    );
  }, [sparklesCount, colors]);

  useEffect(() => {
    updateSparkles();
    const interval = setInterval(updateSparkles, 3000);
    return () => clearInterval(interval);
  }, [updateSparkles]);

  return (
    <span className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <motion.svg
          key={sparkle.id}
          className="pointer-events-none absolute z-20"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, sparkle.scale, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
          style={{
            left: sparkle.x,
            top: sparkle.y,
          }}
          width="16"
          height="16"
          viewBox="0 0 160 160"
          fill="none"
        >
          <path
            d="M80 0C80 0 84.2846 41.2925 101.496 58.504C118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496C41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504C75.7154 41.2925 80 0 80 0Z"
            fill={sparkle.color}
          />
        </motion.svg>
      ))}
      <span className="relative z-10">{children}</span>
    </span>
  );
}
