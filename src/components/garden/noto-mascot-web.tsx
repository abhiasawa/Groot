"use client";

import { cn } from "@/lib/utils";

interface NotoMascotWebProps {
  className?: string;
  compact?: boolean;
}

export default function NotoMascotWeb({
  className,
  compact = false,
}: NotoMascotWebProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-[18rem] motion-safe:animate-[noto-float_5.5s_ease-in-out_infinite]",
        className,
      )}
    >
      <svg
        viewBox={compact ? "0 0 320 180" : "0 0 320 240"}
        className="h-auto w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="noto-cloud-grad"
            x1="160"
            y1="18"
            x2="160"
            y2="140"
          >
            <stop offset="0" stopColor="#FFD66E" />
            <stop offset="0.55" stopColor="#FFBB2C" />
            <stop offset="1" stopColor="#E9A911" />
          </linearGradient>
        </defs>

        <circle cx="160" cy="90" r="100" fill="#FFBB2C" opacity="0.12" />
        <circle cx="160" cy="90" r="76" fill="#FFBB2C" opacity="0.08" />

        <g className="origin-center motion-safe:animate-[noto-wobble_8s_ease-in-out_infinite]">
          <path
            d="M130 140 C95 140 70 120 70 100 C70 82 82 68 98 65 C96 50 108 35 125 35 C132 25 145 18 160 18 C175 18 185 25 195 35 C212 35 224 50 222 65 C238 68 250 82 250 100 C250 120 225 140 190 140 Z"
            fill="url(#noto-cloud-grad)"
          />

          <ellipse
            cx="160"
            cy="52"
            rx="40"
            ry="22"
            fill="#FFF8E6"
            opacity="0.28"
          />

          <ellipse
            cx="138"
            cy="95"
            rx="8"
            ry="4.5"
            fill="#F59FB0"
            opacity="0.45"
            className="motion-safe:animate-[noto-cheek_3.8s_ease-in-out_infinite]"
          />
          <ellipse
            cx="182"
            cy="95"
            rx="8"
            ry="4.5"
            fill="#F59FB0"
            opacity="0.45"
            className="motion-safe:animate-[noto-cheek_3.8s_ease-in-out_infinite]"
          />

          <g className="origin-center motion-safe:animate-[noto-blink_4.8s_ease-in-out_infinite]">
            <path
              d="M142 82 Q150 74 158 82"
              stroke="#6C4A08"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M162 82 Q170 74 178 82"
              stroke="#6C4A08"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          <path
            d="M150 105 Q160 113 170 105"
            stroke="#6C4A08"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {!compact && (
          <g className="motion-safe:animate-[noto-rain_3.4s_ease-in-out_infinite]">
            <circle cx="130" cy="165" r="2.5" fill="#FFBB2C" opacity="0.35" />
            <circle cx="160" cy="170" r="2.5" fill="#FFBB2C" opacity="0.3" />
            <circle cx="190" cy="165" r="2.5" fill="#FFBB2C" opacity="0.35" />
            <circle cx="145" cy="180" r="2.5" fill="#FFBB2C" opacity="0.25" />
            <circle cx="175" cy="180" r="2.5" fill="#FFBB2C" opacity="0.25" />
          </g>
        )}
      </svg>
    </div>
  );
}
