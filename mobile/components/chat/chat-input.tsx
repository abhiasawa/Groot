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
        placeholderTextColor="#B6B0A6"
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
      />
      <Pressable
        onPress={handleSend}
        disabled={!value.trim() || disabled}
        style={[
          styles.sendButton,
          (!value.trim() || disabled) && styles.sendButtonDisabled,
        ]}
        hitSlop={8}
      >
        <Send size={18} color="#FFFFFF" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#1E1E1E",
    backgroundColor: "#F0EFEB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
