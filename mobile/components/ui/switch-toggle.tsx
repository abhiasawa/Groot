import React from "react";
import {
  Pressable,
  View,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../lib/theme/provider";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const THUMB_MARGIN = 3;

/* ------------------------------------------------------------------ */
/*  SwitchToggle                                                       */
/* ------------------------------------------------------------------ */

export function SwitchToggle({
  value,
  onValueChange,
  disabled = false,
  style,
}: SwitchProps) {
  const { colors } = useTheme();

  const trackColor = value ? colors.primary : colors.muted;
  const thumbTranslateX = value
    ? TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN * 2
    : 0;

  return (
    <Pressable
      onPress={() => {
        if (!disabled) onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[style, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: trackColor },
        ]}
      >
        <View
          style={[
            styles.thumb,
            { transform: [{ translateX: thumbTranslateX }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_MARGIN,
    justifyContent: "center",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#FFFFFF",
    // Subtle thumb shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
