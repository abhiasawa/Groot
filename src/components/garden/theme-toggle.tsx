"use client";

import { useTheme } from "@/contexts/theme-context";

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: "\u2600\uFE0F" },
  { value: "dark" as const, label: "Dark", icon: "\uD83C\uDF19" },
  { value: "system" as const, label: "System", icon: "\uD83D\uDCBB" },
];

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-3">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: theme === option.value ? "var(--color-surface)" : "transparent",
            color: "var(--color-text)",
            border: theme === option.value ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <span>{option.icon}</span>
            <span>{option.label}</span>
          </div>
          {theme === option.value && (
            <span style={{ color: "var(--color-primary)" }}>{"\u2713"}</span>
          )}
        </button>
      ))}
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Currently: {resolvedTheme} mode{theme === "system" ? " (following system)" : ""}
      </p>
    </div>
  );
}
