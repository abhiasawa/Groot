import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";

interface ChatBubbleProps {
  direction: "inbound" | "outbound";
  content: string | null;
  mediaDescription?: string | null;
  messageType: string;
  timestamp: string;
  isFirst?: boolean; // first in a group from same direction
}

export function ChatBubble({
  direction,
  content,
  mediaDescription,
  messageType,
  timestamp,
  isFirst = true,
}: ChatBubbleProps) {
  const { colors } = useTheme();
  const isGroot = direction === "outbound"; // outbound = Groot's reply

  const displayText =
    content ||
    mediaDescription ||
    (messageType === "audio" ? "Voice note" : messageType === "image" ? "Photo" : "");

  const time = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <View
      style={[
        styles.row,
        isGroot ? styles.rowLeft : styles.rowRight,
        !isFirst && styles.grouped,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isGroot
            ? [
                styles.bubbleLeft,
                {
                  backgroundColor: colors.glassSurface,
                  borderColor: colors.glassBorder,
                },
              ]
            : [
                styles.bubbleRight,
                { backgroundColor: colors.primary },
              ],
        ]}
      >
        {messageType === "audio" && !content && (
          <Text
            style={[
              styles.mediaLabel,
              { color: isGroot ? colors.mutedForeground : `${colors.primaryForeground}90` },
            ]}
          >
            🎙️ Voice note
          </Text>
        )}
        {messageType === "image" && !content && (
          <Text
            style={[
              styles.mediaLabel,
              { color: isGroot ? colors.mutedForeground : `${colors.primaryForeground}90` },
            ]}
          >
            📷 Photo
          </Text>
        )}
        <Text
          style={[
            styles.text,
            {
              color: isGroot ? colors.foreground : colors.primaryForeground,
            },
          ]}
        >
          {displayText}
        </Text>
        <Text
          style={[
            styles.time,
            {
              color: isGroot
                ? colors.mutedForeground
                : `${colors.primaryForeground}70`,
            },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

export function DateSeparator({ date }: { date: string }) {
  const { colors } = useTheme();

  const label = formatDateLabel(date);

  return (
    <View style={styles.dateRow}>
      <View style={[styles.datePill, { backgroundColor: `${colors.mutedForeground}15` }]}>
        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TypingIndicator() {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          styles.bubbleLeft,
          styles.typingBubble,
          { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder },
        ]}
      >
        <View style={styles.typingDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.typingDot,
                { backgroundColor: colors.mutedForeground, opacity: 0.4 + i * 0.2 },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  rowLeft: {
    alignItems: "flex-start",
  },
  rowRight: {
    alignItems: "flex-end",
  },
  grouped: {
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleLeft: {
    borderTopLeftRadius: 6,
    borderWidth: 1,
  },
  bubbleRight: {
    borderTopRightRadius: 6,
  },
  text: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 21,
  },
  mediaLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    marginBottom: 4,
  },
  time: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  dateRow: {
    alignItems: "center",
    marginVertical: 14,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  typingDots: {
    flexDirection: "row",
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
