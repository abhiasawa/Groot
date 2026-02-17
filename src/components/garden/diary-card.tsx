"use client";

interface DiaryCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "paper" | "elevated";
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function DiaryCard({ children, className = "", variant = "default", onClick, style }: DiaryCardProps) {
  const bg = variant === "paper" ? "var(--color-paper)" : "var(--color-card)";
  const shadow = variant === "elevated" ? "var(--shadow-elevated)" : variant === "paper" ? "var(--shadow-paper)" : "var(--shadow-card)";
  const texture = variant === "paper" ? "var(--texture-paper)" : undefined;

  return (
    <div
      className={`p-5 transition-all duration-200 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        backgroundColor: bg,
        backgroundImage: texture,
        boxShadow: shadow,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = shadow;
      }}
    >
      {children}
    </div>
  );
}
