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
  background: "#FFF8F7",
  foreground: "#221928",
  // Card
  card: "#FFFFFF",
  cardForeground: "#221928",
  // Primary
  primary: "#E1306C",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#FEE7EF",
  secondaryForeground: "#8A1D46",
  // Muted
  muted: "#FFF0F5",
  mutedForeground: "#87657A",
  // Accent
  accent: "#F77737",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#EB4758",
  // Borders & inputs
  border: "rgba(175, 44, 99, 0.14)",
  input: "rgba(175, 44, 99, 0.14)",
  ring: "#E1306C",
  // Mood colors
  moodGreat: "#00A675",
  moodGood: "#2EBA8B",
  moodOkay: "#EEB03B",
  moodLow: "#F98836",
  moodBad: "#EB4758",
  moodNone: "#EFD9E4",
  // Chart colors
  chart1: "#E1306C",
  chart2: "#F77737",
  chart3: "#00A675",
  chart4: "#CB3EEB",
  chart5: "#3B7BFF",
  // Glassmorphic
  glassSurface: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(177, 42, 99, 0.14)",
  glassHighlight: "rgba(255, 255, 255, 0.92)",
  // Gradients
  gradientStart: "#FFF1E8",
  gradientMid: "#FFEAF3",
  gradientEnd: "#FFF2FA",
  // Elevated shadows
  shadowColor: "rgba(97, 21, 54, 0.12)",
  elevatedShadowColor: "rgba(97, 21, 54, 0.24)",
  // Ambient accent overlays
  auraPrimary: "rgba(225, 48, 108, 0.24)",
  auraSecondary: "rgba(247, 119, 55, 0.2)",
  auraTertiary: "rgba(203, 62, 235, 0.16)",
};

export const darkTheme: ThemeColors = {
  // Core
  background: "#140913",
  foreground: "#FFEFF7",
  // Card
  card: "#271325",
  cardForeground: "#FFEFF7",
  // Primary
  primary: "#FF4D8D",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#3A1A33",
  secondaryForeground: "#FFD8EA",
  // Muted
  muted: "#31172F",
  mutedForeground: "#CE9CB9",
  // Accent
  accent: "#FF9A53",
  accentForeground: "#2A1218",
  // Destructive
  destructive: "#FF6D7B",
  // Borders & inputs
  border: "rgba(255, 139, 193, 0.24)",
  input: "rgba(255, 139, 193, 0.24)",
  ring: "#FF4D8D",
  // Mood colors
  moodGreat: "#31D6A2",
  moodGood: "#5EE2BC",
  moodOkay: "#F8C469",
  moodLow: "#FFAD5C",
  moodBad: "#FF7A88",
  moodNone: "#5A3A58",
  // Chart colors
  chart1: "#FF4D8D",
  chart2: "#FF9A53",
  chart3: "#31D6A2",
  chart4: "#D86BFF",
  chart5: "#7EAAFF",
  // Glassmorphic
  glassSurface: "rgba(50, 20, 45, 0.72)",
  glassBorder: "rgba(255, 145, 196, 0.24)",
  glassHighlight: "rgba(255, 255, 255, 0.08)",
  // Gradients
  gradientStart: "#170813",
  gradientMid: "#3C1435",
  gradientEnd: "#4A2114",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.34)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.56)",
  // Ambient accent overlays
  auraPrimary: "rgba(255, 77, 141, 0.24)",
  auraSecondary: "rgba(255, 154, 83, 0.2)",
  auraTertiary: "rgba(216, 107, 255, 0.14)",
};
