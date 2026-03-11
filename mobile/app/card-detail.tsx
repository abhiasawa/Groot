import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Mic, Image as ImageIcon } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { useMemories } from "../lib/api/queries";
import { getCardColor } from "../constants/card-colors";
import type { Memory } from "../../shared/types/api";

const { width: SCREEN_W } = Dimensions.get("window");

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
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function categoryLabel(cat?: string | null): string | null {
  if (!cat || cat === "default") return null;
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function CardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useMemories({ limit: 100 });

  // Card expand animation — simulates shared element transition
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(40);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    // Card expands in with spring physics
    cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    cardOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    cardTranslateY.value = withSpring(0, { damping: 16, stiffness: 160 });
    // Content fades in slightly after card settles
    contentOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const memory = useMemo(() => {
    if (!data?.memories || !id) return null;
    return data.memories.find((m: Memory) => m.id === id) ?? null;
  }, [data?.memories, id]);

  if (!memory) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={20} color="#1A1A1A" strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.emptyText}>Thought not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const category = memory.card_category;
  const color = getCardColor(category, memory.id, memory.content, memory.message_type);
  const label = categoryLabel(category);
  const isVoice = memory.message_type === "audio";
  const isImage = memory.message_type === "image";
  const displayText = memory.content || memory.media_description;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <Animated.View style={[styles.topBar, contentAnimStyle]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color="#1A1A1A" strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.timestamp}>{relativeTime(memory.created_at)}</Text>
        <View style={styles.backBtn} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Card surface — expand animation */}
        <Animated.View
          style={[styles.card, { backgroundColor: color.bg }, cardAnimStyle]}
        >
          {/* Category + type badge */}
          <View style={styles.badges}>
            {label && (
              <View style={[styles.pill, { backgroundColor: `${color.meta}18` }]}>
                <Text style={[styles.pillText, { color: color.meta }]}>{label}</Text>
              </View>
            )}
            {isVoice && (
              <View style={[styles.pill, { backgroundColor: `${color.meta}18` }]}>
                <Mic size={10} color={color.meta} strokeWidth={2.4} />
                <Text style={[styles.pillText, { color: color.meta }]}>Voice</Text>
              </View>
            )}
            {isImage && (
              <View style={[styles.pill, { backgroundColor: `${color.meta}18` }]}>
                <ImageIcon size={10} color={color.meta} strokeWidth={2} />
                <Text style={[styles.pillText, { color: color.meta }]}>Photo</Text>
              </View>
            )}
          </View>

          {/* Image */}
          {isImage && memory.media_url && (
            <Image
              source={{ uri: memory.media_url }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          )}

          {/* Content */}
          {displayText ? (
            <Animated.Text
              style={[styles.content, contentAnimStyle]}
            >
              {displayText}
            </Animated.Text>
          ) : (
            <Text style={styles.noContent}>No text content</Text>
          )}
        </Animated.View>

        {/* Metadata */}
        <Animated.View style={[styles.meta, contentAnimStyle]}>
          <Text style={styles.metaLabel}>
            {new Date(memory.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text style={styles.metaTime}>
            {new Date(memory.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FEFEFE",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  timestamp: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "#C0BDB8",
    letterSpacing: 0.2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    minHeight: 200,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  content: {
    fontFamily: "Manrope_400Regular",
    fontSize: 17,
    color: "#2A2A2A",
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  noContent: {
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    color: "#BBB",
    fontStyle: "italic",
  },
  meta: {
    paddingTop: 24,
    paddingHorizontal: 4,
  },
  metaLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#C0BDB8",
  },
  metaTime: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    color: "#D0CDC8",
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },
});
