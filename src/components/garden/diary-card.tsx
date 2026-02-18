"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DiaryCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "paper" | "elevated";
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function DiaryCard({ children, className = "", variant = "default", onClick, style }: DiaryCardProps) {
  return (
    <Card
      className={cn(
        "p-5 transition-all duration-150 overflow-hidden",
        variant === "elevated" && "shadow-lg",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      style={style}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}
