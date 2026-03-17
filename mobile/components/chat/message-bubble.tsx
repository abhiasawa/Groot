import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { fonts, typography } from "../../constants/typography";
import { colors, spacing, radii } from "../../lib/theme/tokens";

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

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
}: MessageBubbleProps) {
  const isUser = role === "user";

  if (!content) {
    return (
      <View style={styles.assistantRow}>
        <View
          style={styles.assistantBubble}
          accessibilityLabel="Groot is typing"
          accessibilityRole="text"
        >
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
      <View
        style={isUser ? styles.userBubble : styles.assistantBubble}
        accessibilityRole="text"
        accessibilityLabel={isUser ? content : `Groot: ${cleanWhatsAppMarkdown(content)}`}
      >
        <Text style={isUser ? styles.userText : styles.assistantText}>
          {isUser ? content : cleanWhatsAppMarkdown(content)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  assistantRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: colors.chatUser,
    borderRadius: radii.lg,
    borderTopRightRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  assistantBubble: {
    maxWidth: "80%",
    backgroundColor: colors.chatAssistant,
    borderRadius: radii.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: spacing.lg,
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
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.typingDot,
  },
});
