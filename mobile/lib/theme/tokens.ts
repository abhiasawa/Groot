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

/** Semantic color aliases for specific UI contexts. */
export const colors = {
  /** Page-level background (slightly lighter than `background` token) */
  pageBg: "#FEFEFE",
  /** Icon button resting background */
  iconButtonBg: "#F5F4F2",
  /** Subdued text (captions, timestamps, metadata) */
  textSubdued: "#8F887E",
  /** Faded text (secondary labels, counts) */
  textFaded: "#A6A29B",
  /** Placeholder text */
  placeholder: "#B6B0A6",
  /** Search bar default background */
  searchBg: "#F0EFED",
  /** Capture hero tint */
  heroTint: "#6D72E6",
  /** Capture hero subtitle text */
  heroSubtitle: "#6E6A86",
  /** Chat bubble — assistant */
  chatAssistant: "#F0EFEB",
  /** Chat bubble — user */
  chatUser: "#1E1E1E",
  /** Typing indicator dot */
  typingDot: "#C0BDB8",
} as const;

/** Spacing scale — use these instead of arbitrary values. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

/** Border radius scale. */
export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

/** Standard icon button size (meets 44pt minimum touch target). */
export const ICON_BUTTON_SIZE = 44;

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
