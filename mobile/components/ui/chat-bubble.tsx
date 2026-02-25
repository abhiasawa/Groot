import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { MediaPlayer } from "./media-player";

interface ChatBubbleProps {
  direction: "inbound" | "outbound";
  content: string | null;
  mediaDescription?: string | null;
  mediaUrl?: string | null;
  localUri?: string | null;
  messageType: string;
  timestamp: string;
  isFirst?: boolean;
}

export function ChatBubble({
  direction,
  content,
  mediaDescription,
  mediaUrl,
  localUri,
  messageType,
  timestamp,
  isFirst = true,
}: ChatBubbleProps) {
  const { colors } = useTheme();
  const isGroot = direction === "outbound";

  const time = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const hasMedia = messageType === "image" || messageType === "audio";
  const hasMediaUrl = !!mediaUrl;
  const hasLocalUri = !!localUri;
  const isTextOnly = messageType === "text" || (!hasMedia);

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
          (messageType === "image" && (hasLocalUri || hasMediaUrl)) && styles.mediaBubble,
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
        {/* Image: local URI for optimistic, MediaPlayer for stored */}
        {messageType === "image" && hasLocalUri && (
          <Image
            source={{ uri: localUri! }}
            style={styles.localImage}
            resizeMode="cover"
          />
        )}
        {messageType === "image" && !hasLocalUri && hasMediaUrl && (
          <View style={styles.mediaWrap}>
            <MediaPlayer mediaUrl={mediaUrl!} messageType="image" />
          </View>
        )}

        {/* Audio: MediaPlayer for stored, placeholder for optimistic */}
        {messageType === "audio" && hasMediaUrl && (
          <View style={styles.mediaWrap}>
            <MediaPlayer mediaUrl={mediaUrl!} messageType="audio" />
          </View>
        )}
        {messageType === "audio" && !hasMediaUrl && !content && (
          <Text
            style={[
              styles.mediaLabel,
              { color: isGroot ? colors.mutedForeground : `${colors.primaryForeground}90` },
            ]}
          >
            Voice note (processing...)
          </Text>
        )}

        {/* Text content */}
        {content ? (
          <Text
            style={[
              styles.text,
              (messageType === "image" && (hasLocalUri || hasMediaUrl)) && styles.captionText,
              {
                color: isGroot ? colors.foreground : colors.primaryForeground,
              },
            ]}
          >
            {content}
          </Text>
        ) : isTextOnly ? (
          <Text
            style={[
              styles.text,
              {
                color: isGroot ? colors.foreground : colors.primaryForeground,
              },
            ]}
          >
            {mediaDescription || ""}
          </Text>
        ) : null}

        {/* Timestamp */}
        <Text
          style={[
            styles.time,
            (messageType === "image" && (hasLocalUri || hasMediaUrl)) && styles.captionTime,
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
    overflow: "hidden",
  },
  mediaBubble: {
    paddingTop: 0,
    paddingHorizontal: 0,
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
  captionText: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  localImage: {
    width: "100%",
    height: 200,
  },
  mediaWrap: {
    marginBottom: -6,
  },
  mediaLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    marginBottom: 4,
  },
  captionTime: {
    paddingHorizontal: 14,
    paddingBottom: 4,
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
