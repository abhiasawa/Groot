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
  background: "#F5F2EB",
  foreground: "#2D3A2E",
  // Card
  card: "#FFFFFF",
  cardForeground: "#2D3A2E",
  // Primary
  primary: "#4A7C59",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#E8EDDF",
  secondaryForeground: "#3D6B4A",
  // Muted
  muted: "#ECE9E1",
  mutedForeground: "#7D8B7E",
  // Accent
  accent: "#E8845A",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#C76A6A",
  // Borders & inputs
  border: "rgba(74, 124, 89, 0.12)",
  input: "rgba(74, 124, 89, 0.12)",
  ring: "#4A7C59",
  // Mood colors
  moodGreat: "#5BAE7C",
  moodGood: "#7EC8A0",
  moodOkay: "#F0C76E",
  moodLow: "#E8945C",
  moodBad: "#D47B7B",
  moodNone: "#D5D3CB",
  // Chart colors
  chart1: "#4A7C59",
  chart2: "#E8845A",
  chart3: "#5B8FD4",
  chart4: "#B09068",
  chart5: "#9A7DC8",
  // Glassmorphic
  glassSurface: "#FFFFFF",
  glassBorder: "rgba(74, 124, 89, 0.08)",
  glassHighlight: "rgba(255, 255, 255, 0.95)",
  // Gradients
  gradientStart: "#FAF8F3",
  gradientMid: "#F5F2EB",
  gradientEnd: "#EEF0E5",
  // Elevated shadows
  shadowColor: "rgba(45, 58, 46, 0.06)",
  elevatedShadowColor: "rgba(45, 58, 46, 0.12)",
  // Ambient accent overlays
  auraPrimary: "rgba(74, 124, 89, 0.10)",
  auraSecondary: "rgba(232, 132, 90, 0.08)",
  auraTertiary: "rgba(91, 143, 212, 0.08)",
};

export const darkTheme: ThemeColors = {
  // Core
  background: "#141912",
  foreground: "#E5E8E0",
  // Card
  card: "#1C2419",
  cardForeground: "#E5E8E0",
  // Primary
  primary: "#8BC4A0",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#242E22",
  secondaryForeground: "#B8D9C4",
  // Muted
  muted: "#1E2620",
  mutedForeground: "#A0AEA2",
  // Accent
  accent: "#F0A07A",
  accentForeground: "#2A1E18",
  // Destructive
  destructive: "#D98A8A",
  // Borders & inputs
  border: "rgba(139, 196, 160, 0.20)",
  input: "rgba(139, 196, 160, 0.20)",
  ring: "#8BC4A0",
  // Mood colors
  moodGreat: "#6DC98F",
  moodGood: "#96D8B6",
  moodOkay: "#F5D88A",
  moodLow: "#F0AC78",
  moodBad: "#E09A9A",
  moodNone: "#3D4A3C",
  // Chart colors
  chart1: "#8BC4A0",
  chart2: "#F0A07A",
  chart3: "#7DAAE8",
  chart4: "#C6AA82",
  chart5: "#B49ADE",
  // Glassmorphic
  glassSurface: "rgba(28, 36, 25, 0.95)",
  glassBorder: "rgba(139, 196, 160, 0.15)",
  glassHighlight: "rgba(255, 255, 255, 0.05)",
  // Gradients
  gradientStart: "#111710",
  gradientMid: "#171E15",
  gradientEnd: "#1C251A",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.30)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.45)",
  // Ambient accent overlays
  auraPrimary: "rgba(139, 196, 160, 0.12)",
  auraSecondary: "rgba(240, 160, 122, 0.08)",
  auraTertiary: "rgba(125, 170, 232, 0.08)",
};
