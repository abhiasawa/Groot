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

/** Reusable shadow presets for consistent elevation across screens. */
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
