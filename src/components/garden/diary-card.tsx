"use client";

interface DiaryCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "paper" | "elevated";
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function DiaryCard({ children, className = "", variant = "default", onClick, style }: DiaryCardProps) {
  const shadow = variant === "elevated" ? "var(--shadow-elevated)" : "none";

  return (
    <div
      className={`p-5 transition-all duration-150 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: shadow,
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
