/**
 * Noto theme tokens — warm cream canvas, amber accent.
 * Based on Journal Mobile App Figma template.
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
  background: "#F0EFEB",
  foreground: "#1E1E1E",
  card: "#FFFFFF",
  cardForeground: "#1E1E1E",
  primary: "#1E1E1E",
  primaryForeground: "#FFFFFF",
  secondary: "#F0EFEB",
  secondaryForeground: "#555555",
  muted: "#F0EFEB",
  mutedForeground: "rgba(30,30,30,0.6)",
  accent: "#FFBB2C",
  accentForeground: "#1E1E1E",
  destructive: "#EE2336",
  border: "#EAEAEA",
  input: "rgba(0, 0, 0, 0.04)",
  ring: "#FFBB2C",
  shadowColor: "rgba(0, 0, 0, 0.06)",
};
