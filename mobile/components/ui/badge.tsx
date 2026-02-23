import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";
import type { ThemeColors } from "../../lib/theme/tokens";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getVariantStyles(
  variant: BadgeVariant,
  colors: ThemeColors,
): { container: ViewStyle; textColor: string } {
  switch (variant) {
    case "secondary":
      return {
        container: { backgroundColor: colors.secondary },
        textColor: colors.secondaryForeground,
      };
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: colors.border,
        },
        textColor: colors.foreground,
      };
    case "destructive":
      return {
        container: { backgroundColor: colors.destructive },
        textColor: "#FFFFFF",
      };
    case "default":
    default:
      return {
        container: { backgroundColor: colors.primary },
        textColor: colors.primaryForeground,
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Badge                                                              */
/* ------------------------------------------------------------------ */

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const { colors } = useTheme();
  const { container, textColor } = getVariantStyles(variant, colors);

  return (
    <View style={[styles.badge, container, style]}>
      <Text style={[styles.label, { color: textColor }]}>{children}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
});
