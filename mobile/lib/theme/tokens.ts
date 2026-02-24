/**
 * Theme color tokens for the Groot mobile app.
 * Translated from the web portal's Notion-inspired CSS color system.
 */

export interface ThemeColors {
  // Core
  background: string;
  foreground: string;
  // Card
  card: string;
  cardForeground: string;
  // Primary
  primary: string;
  primaryForeground: string;
  // Secondary
  secondary: string;
  secondaryForeground: string;
  // Muted
  muted: string;
  mutedForeground: string;
  // Accent
  accent: string;
  accentForeground: string;
  // Destructive
  destructive: string;
  // Borders & inputs
  border: string;
  input: string;
  ring: string;
  // Mood colors
  moodGreat: string;
  moodGood: string;
  moodOkay: string;
  moodLow: string;
  moodBad: string;
  moodNone: string;
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Glassmorphic
  glassSurface: string;
  glassBorder: string;
  glassHighlight: string;
  // Gradients
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  // Elevated shadows
  shadowColor: string;
  elevatedShadowColor: string;
  // Ambient accent overlays
  auraPrimary: string;
  auraSecondary: string;
  auraTertiary: string;
}

export const lightTheme: ThemeColors = {
  // Core
  background: "#F6F3EE",
  foreground: "#1F1A1A",
  // Card
  card: "#FFFFFF",
  cardForeground: "#1F1A1A",
  // Primary
  primary: "#E74F4F",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#EFE6DE",
  secondaryForeground: "#8B3A3A",
  // Muted
  muted: "#EDE6DF",
  mutedForeground: "#7A6864",
  // Accent
  accent: "#F29D38",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#D64545",
  // Borders & inputs
  border: "rgba(88, 58, 46, 0.16)",
  input: "rgba(88, 58, 46, 0.16)",
  ring: "#E74F4F",
  // Mood colors
  moodGreat: "#00A675",
  moodGood: "#2EBA8B",
  moodOkay: "#EEB03B",
  moodLow: "#F98836",
  moodBad: "#D64545",
  moodNone: "#DFD4CA",
  // Chart colors
  chart1: "#E74F4F",
  chart2: "#F29D38",
  chart3: "#00A675",
  chart4: "#7A69E7",
  chart5: "#3F86E8",
  // Glassmorphic
  glassSurface: "rgba(255, 255, 255, 0.86)",
  glassBorder: "rgba(128, 102, 90, 0.16)",
  glassHighlight: "rgba(255, 255, 255, 0.90)",
  // Gradients
  gradientStart: "#F6F1EA",
  gradientMid: "#F3ECE5",
  gradientEnd: "#EFE7DF",
  // Elevated shadows
  shadowColor: "rgba(40, 22, 17, 0.08)",
  elevatedShadowColor: "rgba(40, 22, 17, 0.18)",
  // Ambient accent overlays
  auraPrimary: "rgba(231, 79, 79, 0.10)",
  auraSecondary: "rgba(242, 157, 56, 0.08)",
  auraTertiary: "rgba(122, 105, 231, 0.06)",
};

export const darkTheme: ThemeColors = {
  // Core
  background: "#14110F",
  foreground: "#F5F0EA",
  // Card
  card: "#201A17",
  cardForeground: "#F5F0EA",
  // Primary
  primary: "#FF6B5E",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#352824",
  secondaryForeground: "#F6C9C3",
  // Muted
  muted: "#2A211E",
  mutedForeground: "#B7A39A",
  // Accent
  accent: "#FFB347",
  accentForeground: "#2E1F11",
  // Destructive
  destructive: "#FF746A",
  // Borders & inputs
  border: "rgba(255, 196, 180, 0.22)",
  input: "rgba(255, 196, 180, 0.22)",
  ring: "#FF6B5E",
  // Mood colors
  moodGreat: "#31D6A2",
  moodGood: "#5EE2BC",
  moodOkay: "#F8C469",
  moodLow: "#FFAD5C",
  moodBad: "#FF746A",
  moodNone: "#4A3A34",
  // Chart colors
  chart1: "#FF6B5E",
  chart2: "#FFB347",
  chart3: "#31D6A2",
  chart4: "#9A85FF",
  chart5: "#5D9EFF",
  // Glassmorphic
  glassSurface: "rgba(43, 31, 27, 0.82)",
  glassBorder: "rgba(233, 199, 186, 0.20)",
  glassHighlight: "rgba(255, 255, 255, 0.08)",
  // Gradients
  gradientStart: "#171310",
  gradientMid: "#211815",
  gradientEnd: "#2A201C",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.30)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.48)",
  // Ambient accent overlays
  auraPrimary: "rgba(255, 107, 94, 0.18)",
  auraSecondary: "rgba(255, 179, 71, 0.12)",
  auraTertiary: "rgba(154, 133, 255, 0.08)",
};
