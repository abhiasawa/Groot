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
  // Core — Biophilic Daylight
  background: "#F6F1E7",
  foreground: "#1F2B23",
  // Card
  card: "#FFFDF8",
  cardForeground: "#1F2B23",
  // Primary
  primary: "#2E483A",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#ECE3D4",
  secondaryForeground: "#4E5E54",
  // Muted
  muted: "#E4DCCF",
  mutedForeground: "#7A867E",
  // Accent
  accent: "#B98C52",
  accentForeground: "#FFF9F0",
  // Destructive
  destructive: "#B65458",
  // Borders & inputs
  border: "rgba(31, 43, 35, 0.09)",
  input: "rgba(31, 43, 35, 0.08)",
  ring: "#2E483A",
  // Mood colors (organic tones)
  moodGreat: "#3F7F5E",
  moodGood: "#597B63",
  moodOkay: "#C8A05E",
  moodLow: "#BF7758",
  moodBad: "#B65458",
  moodNone: "#D5CCBE",
  // Chart colors
  chart1: "#2E483A",
  chart2: "#B98C52",
  chart3: "#5C8F90",
  chart4: "#8A6A4D",
  chart5: "#6B8A62",
  // Glassmorphic
  glassSurface: "#FFFDF8",
  glassBorder: "rgba(31, 43, 35, 0.07)",
  glassHighlight: "rgba(255, 255, 255, 0.9)",
  // Gradients
  gradientStart: "#F6F1E7",
  gradientMid: "#F2EBDD",
  gradientEnd: "#E8DECF",
  // Elevated shadows
  shadowColor: "rgba(31, 43, 35, 0.04)",
  elevatedShadowColor: "rgba(31, 43, 35, 0.12)",
  // Ambient accent overlays
  auraPrimary: "rgba(46, 72, 58, 0.12)",
  auraSecondary: "rgba(185, 140, 82, 0.1)",
  auraTertiary: "rgba(92, 143, 144, 0.08)",
};

export const darkTheme: ThemeColors = {
  // Core — Deep Soil Night
  background: "#171B19",
  foreground: "rgba(250, 245, 236, 0.94)",
  // Card
  card: "#202622",
  cardForeground: "rgba(250, 245, 236, 0.94)",
  // Primary
  primary: "#8EBAA0",
  primaryForeground: "#112019",
  // Secondary
  secondary: "#252B27",
  secondaryForeground: "rgba(236, 230, 219, 0.72)",
  // Muted
  muted: "#222824",
  mutedForeground: "rgba(236, 230, 219, 0.48)",
  // Accent
  accent: "#D9B47A",
  accentForeground: "#1A211C",
  // Destructive
  destructive: "#E27A7E",
  // Borders & inputs
  border: "rgba(255, 244, 228, 0.07)",
  input: "rgba(255, 244, 228, 0.06)",
  ring: "#8EBAA0",
  // Mood colors (lighter for dark backgrounds)
  moodGreat: "#56C28B",
  moodGood: "#8EBAA0",
  moodOkay: "#E4C07F",
  moodLow: "#D28C65",
  moodBad: "#E27A7E",
  moodNone: "#344039",
  // Chart colors
  chart1: "#8EBAA0",
  chart2: "#D9B47A",
  chart3: "#7FAFB5",
  chart4: "#A88A68",
  chart5: "#7DA171",
  // Glassmorphic
  glassSurface: "rgba(32, 38, 34, 0.96)",
  glassBorder: "rgba(255, 244, 228, 0.06)",
  glassHighlight: "rgba(255, 255, 255, 0.04)",
  // Gradients
  gradientStart: "#171B19",
  gradientMid: "#1B211E",
  gradientEnd: "#222924",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.24)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.5)",
  // Ambient accent overlays
  auraPrimary: "rgba(142, 186, 160, 0.09)",
  auraSecondary: "rgba(217, 180, 122, 0.07)",
  auraTertiary: "rgba(127, 175, 181, 0.06)",
};
