import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Mic, Image as ImageIcon } from "lucide-react-native";

import { getCardColor } from "../../constants/card-colors";
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

/** Category label for display */
function categoryLabel(cat?: string | null): string | null {
  if (!cat || cat === "default") return null;
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

interface ThoughtCardProps {
  memory: Memory;
  onPress?: () => void;
}

export function ThoughtCard({ memory, onPress }: ThoughtCardProps) {
  const category = (memory as Record<string, unknown>).card_category as string | undefined;
  const color = getCardColor(category, memory.id);
  const isVoice = memory.message_type === "audio";
  const isImage = memory.message_type === "image";
  const displayText = memory.content || memory.media_description;
  const label = categoryLabel(category);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <View style={[styles.card, { backgroundColor: color.bg }]}>
        {/* Category pill */}
        {label && (
          <View style={[styles.pill, { backgroundColor: `${color.meta}18` }]}>
            <Text style={[styles.pillText, { color: color.meta }]}>{label}</Text>
          </View>
        )}

        {/* Voice indicator */}
        {isVoice && (
          <View style={styles.voiceRow}>
            <View style={[styles.voiceIcon, { backgroundColor: color.meta }]}>
              <Mic size={11} color="#FFF" strokeWidth={2.4} />
            </View>
            <View style={styles.voiceBars}>
              {[4, 8, 14, 10, 16, 7, 12, 15, 9, 5, 11, 13, 6].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.voiceBar,
                    { height: h, backgroundColor: `${color.meta}40` },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Image placeholder */}
        {isImage && !displayText && (
          <View style={[styles.imagePlaceholder, { backgroundColor: `${color.meta}12` }]}>
            <ImageIcon size={20} color={`${color.meta}60`} strokeWidth={1.5} />
          </View>
        )}

        {/* Text content */}
        {displayText ? (
          <Text
            style={[styles.content, (isVoice || isImage) && styles.contentWithMedia]}
            numberOfLines={8}
          >
            {displayText}
          </Text>
        ) : null}

        {/* Timestamp */}
        <Text style={[styles.meta, { color: `${color.meta}90` }]}>
          {relativeTime(memory.created_at)}
          {isVoice ? " · Voice" : isImage ? " · Photo" : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  pillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  voiceIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    height: 18,
  },
  voiceBar: {
    width: 3,
    borderRadius: 2,
  },
  imagePlaceholder: {
    height: 90,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#2A2A2A",
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  contentWithMedia: {
    marginTop: 0,
  },
  meta: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    marginTop: 12,
    letterSpacing: 0.2,
  },
});
