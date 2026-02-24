import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.label, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
});
