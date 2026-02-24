import React from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { useTheme } from "../../lib/theme/provider";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

/* ------------------------------------------------------------------ */
/*  SearchInput                                                        */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChangeText,
  placeholder = "Search...",
  style,
}: SearchInputProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glassSurface,
          borderColor: colors.glassBorder,
        },
        style,
      ]}
    >
      <Search
        size={18}
        color={colors.mutedForeground}
        style={styles.icon}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
          },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          accessibilityLabel="Clear search"
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 0,
  },
});
