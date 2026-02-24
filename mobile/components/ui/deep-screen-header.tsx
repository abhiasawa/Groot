import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { PressScale } from "./press-scale";

interface DeepScreenHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  tags?: string[];
}

export function DeepScreenHeader({
  title,
  subtitle,
  onBack,
  tags,
}: DeepScreenHeaderProps) {
  const { colors } = useTheme();
  void tags;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <PressScale onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={1.6} />
        </PressScale>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
});
