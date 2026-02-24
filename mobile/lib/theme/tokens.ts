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
  background: "#F2F6F4",
  foreground: "#1A1E1C",
  // Card
  card: "#FFFFFF",
  cardForeground: "#1A1E1C",
  // Primary
  primary: "#176B5A",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#E6F1EC",
  secondaryForeground: "#1F6A58",
  // Muted
  muted: "#EDF3F0",
  mutedForeground: "#66746E",
  // Accent
  accent: "#F07B53",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#C9554D",
  // Borders & inputs
  border: "rgba(33, 101, 84, 0.16)",
  input: "rgba(33, 101, 84, 0.16)",
  ring: "#176B5A",
  // Mood colors
  moodGreat: "#1FA67A",
  moodGood: "#37BD8D",
  moodOkay: "#E5A53D",
  moodLow: "#EB8C45",
  moodBad: "#CB5A53",
  moodNone: "#D8DFDA",
  // Chart colors
  chart1: "#176B5A",
  chart2: "#F07B53",
  chart3: "#4E7BDF",
  chart4: "#A37F52",
  chart5: "#8B66D0",
  // Glassmorphic
  glassSurface: "#FFFFFF",
  glassBorder: "rgba(61, 106, 92, 0.18)",
  glassHighlight: "rgba(255, 255, 255, 0.92)",
  // Gradients
  gradientStart: "#F8FCFA",
  gradientMid: "#F1F8F5",
  gradientEnd: "#EAF3F0",
  // Elevated shadows
  shadowColor: "rgba(20, 28, 24, 0.08)",
  elevatedShadowColor: "rgba(18, 24, 22, 0.16)",
  // Ambient accent overlays
  auraPrimary: "rgba(23, 107, 90, 0.16)",
  auraSecondary: "rgba(240, 123, 83, 0.11)",
  auraTertiary: "rgba(78, 123, 223, 0.12)",
};

export const darkTheme: ThemeColors = {
  // Core
  background: "#111615",
  foreground: "#EAF0ED",
  // Card
  card: "#1A2320",
  cardForeground: "#EAF0ED",
  // Primary
  primary: "#75C8AC",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#24322D",
  secondaryForeground: "#CDE5DC",
  // Muted
  muted: "#1E2724",
  mutedForeground: "#A8B7B1",
  // Accent
  accent: "#F49A76",
  accentForeground: "#2A1E18",
  // Destructive
  destructive: "#DF7A6F",
  // Borders & inputs
  border: "rgba(145, 188, 172, 0.26)",
  input: "rgba(145, 188, 172, 0.26)",
  ring: "#75C8AC",
  // Mood colors
  moodGreat: "#49D19F",
  moodGood: "#6BE1B6",
  moodOkay: "#F0C36D",
  moodLow: "#F3AA69",
  moodBad: "#DF7A6F",
  moodNone: "#40514A",
  // Chart colors
  chart1: "#75C8AC",
  chart2: "#F49A76",
  chart3: "#6D9AF4",
  chart4: "#C6B296",
  chart5: "#A493E8",
  // Glassmorphic
  glassSurface: "rgba(29, 39, 35, 0.94)",
  glassBorder: "rgba(170, 206, 192, 0.20)",
  glassHighlight: "rgba(255, 255, 255, 0.07)",
  // Gradients
  gradientStart: "#0F1513",
  gradientMid: "#16201D",
  gradientEnd: "#1B2723",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.30)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.48)",
  // Ambient accent overlays
  auraPrimary: "rgba(117, 200, 172, 0.16)",
  auraSecondary: "rgba(244, 154, 118, 0.12)",
  auraTertiary: "rgba(109, 154, 244, 0.11)",
};
