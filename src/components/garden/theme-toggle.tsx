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
      {OPTIONS.map((option) => {
        const isSelected = theme === option.value;
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            variant="outline"
            className={cn(
              "w-full justify-between px-4 py-3 h-auto",
              isSelected && "border-primary bg-secondary"
            )}
            onClick={() => setTheme(option.value)}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </div>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </Button>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Currently: {resolvedTheme} mode{theme === "system" ? " (following system)" : ""}
      </p>
    </div>
  );
}
