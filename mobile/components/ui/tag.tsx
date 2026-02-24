import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface TagProps {
  label: string;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Tag({ label, color, textColor, style }: TagProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: color ?? colors.muted },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor ?? colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
