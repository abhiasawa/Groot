/**
 * Noto theme tokens — light-mode only, white canvas design.
 * Replaces the previous "Living Earth" biophilic theme.
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  shadowColor: string;
}

export const notoTheme: ThemeColors = {
  background: "#FEFEFE",
  foreground: "#1A1A1A",
  card: "#FFFFFF",
  cardForeground: "#1A1A1A",
  primary: "#1A1A1A",
  primaryForeground: "#FFFFFF",
  secondary: "#F5F4F2",
  secondaryForeground: "#666666",
  muted: "#F0EFED",
  mutedForeground: "#999999",
  accent: "#A5B4FC",
  accentForeground: "#1A1A1A",
  destructive: "#E25555",
  border: "rgba(0, 0, 0, 0.06)",
  input: "rgba(0, 0, 0, 0.04)",
  ring: "#1A1A1A",
  shadowColor: "rgba(0, 0, 0, 0.08)",
};
