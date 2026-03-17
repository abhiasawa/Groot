import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { fonts, typography } from "../../constants/typography";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

/**
 * Strip WhatsApp-style markdown for plain-text display.
 * (React Native Text doesn't support HTML, so we render clean text.)
 */
function cleanWhatsAppMarkdown(text: string): string {
  return text
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~(.+?)~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^> (.+)$/gm, "$1");
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  if (!content) {
    return (
      <View style={styles.assistantRow}>
        <View style={styles.assistantBubble}>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={isUser ? styles.userRow : styles.assistantRow}>
      <View style={isUser ? styles.userBubble : styles.assistantBubble}>
        <Text style={isUser ? styles.userText : styles.assistantText}>
          {isUser ? content : cleanWhatsAppMarkdown(content)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  assistantRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: "#1E1E1E",
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  assistantBubble: {
    maxWidth: "80%",
    backgroundColor: "#F0EFEB",
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#FFFFFF",
  },
  assistantText: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#1E1E1E",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C0BDB8",
  },
});
