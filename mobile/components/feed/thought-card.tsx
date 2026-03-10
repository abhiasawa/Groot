import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Mic } from "lucide-react-native";

import { getCardColor } from "../../constants/card-colors";
import { typography } from "../../constants/typography";
import type { Memory } from "../../../shared/types/api";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ThoughtCardProps {
  memory: Memory;
  onPress?: () => void;
}

export function ThoughtCard({ memory, onPress }: ThoughtCardProps) {
  const color = getCardColor((memory as Record<string, unknown>).card_category as string | undefined);
  const isVoice = memory.message_type === "audio";
  const isImage = memory.message_type === "image";
  const displayText = memory.content || memory.media_description;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <View style={[styles.card, { backgroundColor: color.bg }]}>
        {isVoice && (
          <View style={styles.voiceRow}>
            <View style={styles.voiceIcon}>
              <Mic size={12} color="#FFF" strokeWidth={2.2} />
            </View>
            <View style={styles.voiceBars}>
              {[5, 10, 14, 8, 12, 6, 9, 13, 7, 4].map((h, i) => (
                <View key={i} style={[styles.voiceBar, { height: h }]} />
              ))}
            </View>
          </View>
        )}

        {isImage && !displayText && (
          <View style={styles.imagePlaceholder} />
        )}

        {displayText ? (
          <Text
            style={[styles.content, isVoice || isImage ? styles.contentWithMedia : null]}
            numberOfLines={6}
          >
            {displayText}
          </Text>
        ) : null}

        <Text style={[styles.meta, { color: color.meta }]}>
          {relativeTime(memory.created_at)}
          {isVoice ? " \u00B7 Voice" : isImage ? " \u00B7 Photo" : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  voiceIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 16,
  },
  voiceBar: {
    width: 2.5,
    borderRadius: 1.5,
    backgroundColor: "#DDD",
  },
  imagePlaceholder: {
    height: 80,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginBottom: 8,
  },
  content: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    color: "#333",
    lineHeight: 20,
  },
  contentWithMedia: {
    marginTop: 0,
  },
  meta: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    marginTop: 8,
  },
});
