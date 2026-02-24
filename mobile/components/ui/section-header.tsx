import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../lib/theme/provider";

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.title,
          { color: colors.foreground },
        ]}
      >
        {title}
      </Text>
      {action && onAction && (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {action}
          </Text>
          <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    letterSpacing: 0,
  },
});
