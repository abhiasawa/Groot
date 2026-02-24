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
  background: "#F3EFE6",
  foreground: "#241F1B",
  // Card
  card: "#FCFAF5",
  cardForeground: "#241F1B",
  // Primary
  primary: "#3F5E52",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#E6DFD1",
  secondaryForeground: "#4D443B",
  // Muted
  muted: "#E9E1D4",
  mutedForeground: "#74665B",
  // Accent
  accent: "#C47A4A",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#B84C45",
  // Borders & inputs
  border: "rgba(82, 67, 54, 0.16)",
  input: "rgba(82, 67, 54, 0.16)",
  ring: "#3F5E52",
  // Mood colors
  moodGreat: "#00A675",
  moodGood: "#2EBA8B",
  moodOkay: "#EEB03B",
  moodLow: "#F98836",
  moodBad: "#B84C45",
  moodNone: "#DFD4CA",
  // Chart colors
  chart1: "#3F5E52",
  chart2: "#C47A4A",
  chart3: "#00A675",
  chart4: "#7D6E63",
  chart5: "#4A7899",
  // Glassmorphic
  glassSurface: "rgba(252, 250, 245, 0.95)",
  glassBorder: "rgba(120, 102, 87, 0.18)",
  glassHighlight: "rgba(255, 255, 255, 0.80)",
  // Gradients
  gradientStart: "#F4EFE6",
  gradientMid: "#F1EBE1",
  gradientEnd: "#EEE6DA",
  // Elevated shadows
  shadowColor: "rgba(34, 24, 19, 0.08)",
  elevatedShadowColor: "rgba(34, 24, 19, 0.16)",
  // Ambient accent overlays
  auraPrimary: "rgba(63, 94, 82, 0.08)",
  auraSecondary: "rgba(196, 122, 74, 0.06)",
  auraTertiary: "rgba(125, 110, 99, 0.05)",
};

export const darkTheme: ThemeColors = {
  // Core
  background: "#171412",
  foreground: "#F1ECE4",
  // Card
  card: "#211B17",
  cardForeground: "#F1ECE4",
  // Primary
  primary: "#8AB29E",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#352D28",
  secondaryForeground: "#E2D6C8",
  // Muted
  muted: "#2A231F",
  mutedForeground: "#B7A89D",
  // Accent
  accent: "#D69A67",
  accentForeground: "#2B1E14",
  // Destructive
  destructive: "#D46C63",
  // Borders & inputs
  border: "rgba(197, 173, 152, 0.24)",
  input: "rgba(197, 173, 152, 0.24)",
  ring: "#8AB29E",
  // Mood colors
  moodGreat: "#31D6A2",
  moodGood: "#5EE2BC",
  moodOkay: "#F8C469",
  moodLow: "#FFAD5C",
  moodBad: "#D46C63",
  moodNone: "#4A3A34",
  // Chart colors
  chart1: "#8AB29E",
  chart2: "#D69A67",
  chart3: "#31D6A2",
  chart4: "#B89D8C",
  chart5: "#7EA5C2",
  // Glassmorphic
  glassSurface: "rgba(40, 32, 27, 0.86)",
  glassBorder: "rgba(205, 186, 169, 0.18)",
  glassHighlight: "rgba(255, 255, 255, 0.08)",
  // Gradients
  gradientStart: "#181411",
  gradientMid: "#201916",
  gradientEnd: "#291F1A",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.30)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.48)",
  // Ambient accent overlays
  auraPrimary: "rgba(138, 178, 158, 0.15)",
  auraSecondary: "rgba(214, 154, 103, 0.10)",
  auraTertiary: "rgba(184, 157, 140, 0.08)",
};
