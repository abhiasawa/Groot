"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function BackgroundGradient({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0 50%", "100% 50%", "0 50%"],
    },
  };

  return (
    <div className={cn("group relative p-[4px]", containerClassName)}>
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
        className={cn(
          "absolute inset-0 rounded-xl opacity-60 blur-xl transition duration-500 group-hover:opacity-100",
          "bg-[radial-gradient(circle_farthest-side_at_0_100%,var(--primary),transparent),radial-gradient(circle_farthest-side_at_100%_0,var(--accent),transparent),radial-gradient(circle_farthest-side_at_100%_100%,var(--chart-2),transparent),radial-gradient(circle_farthest-side_at_0_0,var(--primary),var(--accent))]",
        )}
      />
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
        className={cn(
          "absolute inset-0 rounded-xl",
          "bg-[radial-gradient(circle_farthest-side_at_0_100%,var(--primary),transparent),radial-gradient(circle_farthest-side_at_100%_0,var(--accent),transparent),radial-gradient(circle_farthest-side_at_100%_100%,var(--chart-2),transparent),radial-gradient(circle_farthest-side_at_0_0,var(--primary),var(--accent))]",
        )}
      />
      <div className={cn("relative", className)}>{children}</div>
    </div>
  );
}
