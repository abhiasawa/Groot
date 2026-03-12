"use client";

import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-secondary p-1">
        {OPTIONS.map((option) => {
          const isSelected = theme === option.value;
          const Icon = option.icon;
          return (
            <Button
              key={option.value}
              variant="ghost"
              className={cn(
                "h-11 rounded-xl border border-transparent px-3 text-sm shadow-none",
                isSelected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
              onClick={() => setTheme(option.value)}
            >
              <span className="flex items-center justify-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
              </span>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Currently: {resolvedTheme} mode
        {theme === "system" ? " (following system)" : ""}
      </p>
    </div>
  );
}
