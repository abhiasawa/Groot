"use client";

import { cn } from "@/lib/utils";

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  delay = 0,
  colorFrom = "var(--primary)",
  colorTo = "var(--accent)",
}: {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className,
      )}
      style={
        {
          "--border-beam-size": `${size}px`,
          "--border-beam-duration": `${duration}s`,
          "--border-beam-delay": `${delay}s`,
          "--border-beam-color-from": colorFrom,
          "--border-beam-color-to": colorTo,
        } as React.CSSProperties
      }
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      >
        <div
          className="absolute inset-[-200%] animate-border-beam"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, transparent 25%, var(--border-beam-color-from) 50%, var(--border-beam-color-to) 75%, transparent 100%)`,
            animationDuration: "var(--border-beam-duration)",
            animationDelay: "var(--border-beam-delay)",
          }}
        />
      </div>
    </div>
  );
}
