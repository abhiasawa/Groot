/**
 * Theme color tokens for the Groot mobile app.
 * "Living Earth" design language — warm, organic, nature-inspired.
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
  // Core — Living Earth Light
  background: "#FAF8F3",              // Warm Linen
  foreground: "#2C2C2A",              // Deep Charcoal
  // Card
  card: "#FFFFFF",
  cardForeground: "#2C2C2A",
  // Primary
  primary: "#6B8F71",                 // Sage Green
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#F0EDE6",               // Light Linen
  secondaryForeground: "#5A5A58",
  // Muted
  muted: "#E8E4DC",
  mutedForeground: "#8A8A86",
  // Accent
  accent: "#D4A054",                  // Warm Amber
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#C1484B",             // Muted Crimson
  // Borders & inputs
  border: "rgba(44, 44, 42, 0.08)",
  input: "rgba(44, 44, 42, 0.08)",
  ring: "#6B8F71",
  // Mood colors (organic tones)
  moodGreat: "#2A9D8F",               // Deep Teal
  moodGood: "#6B8F71",                // Sage
  moodOkay: "#E9C46A",                // Warm Gold
  moodLow: "#E76F51",                 // Burnt Sienna
  moodBad: "#C1484B",                 // Muted Crimson
  moodNone: "#D5D3CB",
  // Chart colors
  chart1: "#6B8F71",                   // Sage
  chart2: "#D4A054",                   // Amber
  chart3: "#5B9BD5",                   // Water blue
  chart4: "#8B7355",                   // Earth brown
  chart5: "#2A9D8F",                   // Teal
  // Glassmorphic
  glassSurface: "#FFFFFF",
  glassBorder: "rgba(44, 44, 42, 0.06)",
  glassHighlight: "rgba(255, 255, 255, 0.95)",
  // Gradients
  gradientStart: "#FAF8F3",
  gradientMid: "#F5F1EA",
  gradientEnd: "#EDE9E0",
  // Elevated shadows
  shadowColor: "rgba(44, 44, 42, 0.04)",
  elevatedShadowColor: "rgba(44, 44, 42, 0.08)",
  // Ambient accent overlays
  auraPrimary: "rgba(107, 143, 113, 0.10)",
  auraSecondary: "rgba(212, 160, 84, 0.08)",
  auraTertiary: "rgba(91, 155, 213, 0.08)",
};

export const darkTheme: ThemeColors = {
  // Core — Living Earth Dark
  background: "#1A1C19",              // Deep Soil
  foreground: "rgba(255, 255, 255, 0.87)",
  // Card
  card: "#222420",
  cardForeground: "rgba(255, 255, 255, 0.87)",
  // Primary
  primary: "#8BC4A0",                 // Light Sage
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#2A2C28",
  secondaryForeground: "rgba(255, 255, 255, 0.65)",
  // Muted
  muted: "#252723",
  mutedForeground: "rgba(255, 255, 255, 0.45)",
  // Accent
  accent: "#E8C07A",                  // Light Amber
  accentForeground: "#1A1C19",
  // Destructive
  destructive: "#E07070",
  // Borders & inputs
  border: "rgba(255, 255, 255, 0.06)",
  input: "rgba(255, 255, 255, 0.06)",
  ring: "#8BC4A0",
  // Mood colors (lighter for dark backgrounds)
  moodGreat: "#3DBFAE",               // Light Teal
  moodGood: "#8BC4A0",                // Light Sage
  moodOkay: "#F4D68C",                // Light Gold
  moodLow: "#F09070",                 // Light Sienna
  moodBad: "#E07070",                 // Light Crimson
  moodNone: "#3A3C38",
  // Chart colors
  chart1: "#8BC4A0",
  chart2: "#E8C07A",
  chart3: "#7DB8E8",
  chart4: "#B09A78",
  chart5: "#3DBFAE",
  // Glassmorphic
  glassSurface: "rgba(34, 36, 32, 0.95)",
  glassBorder: "rgba(255, 255, 255, 0.06)",
  glassHighlight: "rgba(255, 255, 255, 0.04)",
  // Gradients
  gradientStart: "#161814",
  gradientMid: "#1A1C19",
  gradientEnd: "#1E201C",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.20)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.40)",
  // Ambient accent overlays
  auraPrimary: "rgba(139, 196, 160, 0.08)",
  auraSecondary: "rgba(232, 192, 122, 0.06)",
  auraTertiary: "rgba(125, 184, 232, 0.06)",
};
