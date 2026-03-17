import React, { useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInput as TextInputType,
} from "react-native";
import { Send } from "lucide-react-native";
import { fonts } from "../../constants/typography";
import { notoTheme, colors, spacing, radii, ICON_BUTTON_SIZE } from "../../lib/theme/tokens";

interface ChatInputProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const inputRef = useRef<TextInputType>(null);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend();
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Message Groot..."
        placeholderTextColor={colors.placeholder}
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
        accessibilityLabel="Message input"
        accessibilityHint="Type a message to send to Groot"
      />
      <Pressable
        onPress={handleSend}
        disabled={!value.trim() || disabled}
        style={[
          styles.sendButton,
          (!value.trim() || disabled) && styles.sendButtonDisabled,
        ]}
        hitSlop={spacing.sm}
        accessibilityLabel="Send message"
        accessibilityRole="button"
        accessibilityState={{ disabled: !value.trim() || disabled }}
      >
        <Send size={18} color={notoTheme.primaryForeground} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: notoTheme.border,
    backgroundColor: notoTheme.card,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: notoTheme.foreground,
    backgroundColor: notoTheme.secondary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
  },
  sendButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: ICON_BUTTON_SIZE / 2,
    backgroundColor: notoTheme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
