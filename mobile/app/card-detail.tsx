import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Pencil,
  Bookmark,
  Trash2,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import { useMemories } from "../lib/api/queries";
import { apiFetch } from "../lib/api/client";
import { fonts, typography } from "../constants/typography";
import { AudioPlayer } from "../components/detail/audio-player";
import type { Memory } from "../../shared/types/api";

function categoryLabel(cat?: string | null): string | null {
  if (!cat || cat === "default") return null;
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function CardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, refetch } = useMemories({ limit: 100 });

  const memory = useMemo(() => {
    if (!data?.memories || !id) return null;
    return data.memories.find((m: Memory) => m.id === id) ?? null;
  }, [data?.memories, id]);

  const handleDelete = useCallback(() => {
    if (!memory) return;
    Alert.alert("Delete Entry", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          apiFetch(`/api/memories/${memory.id}`, { method: "DELETE" }).catch(() => {});
          refetch();
          router.back();
        },
      },
    ]);
  }, [memory, refetch, router]);

  if (!memory) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={20} color="#1E1E1E" strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.emptyText}>Thought not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const category = memory.card_category;
  const label = categoryLabel(category);
  const isVoice = memory.message_type === "audio";
  const isImage = memory.message_type === "image";
  const displayText = memory.content || memory.media_description;
  const title = displayText
    ? displayText.split("\n")[0].slice(0, 60)
    : "Journal Entry";

  const dateFormatted = new Date(memory.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back button */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color="#1E1E1E" strokeWidth={1.8} />
        </Pressable>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.date}>
          {dateFormatted}
        </Animated.Text>

        {/* Title */}
        <Animated.Text entering={FadeInDown.duration(400).delay(150)} style={styles.title}>
          {title}
        </Animated.Text>

        {/* Tags */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.tagsRow}>
          {label && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{label}</Text>
            </View>
          )}
          {isVoice && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Voice</Text>
            </View>
          )}
          {isImage && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Photo</Text>
            </View>
          )}
        </Animated.View>

        {/* Hero image */}
        {isImage && memory.media_url && (
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <Image
              source={{ uri: memory.media_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        {/* Audio player */}
        {isVoice && memory.media_url && (
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <AudioPlayer uri={memory.media_url} />
          </Animated.View>
        )}

        {/* Body text */}
        {displayText && (
          <Animated.Text entering={FadeInDown.duration(400).delay(300)} style={styles.body}>
            {displayText}
          </Animated.Text>
        )}
      </ScrollView>

      {/* Floating action bar */}
      <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.actionBar}>
        <Pressable style={styles.actionBtn}>
          <Pencil size={20} color="#1E1E1E" strokeWidth={1.8} />
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Bookmark size={20} color="#1E1E1E" strokeWidth={1.8} />
        </Pressable>
        <Pressable onPress={handleDelete} style={styles.actionBtn}>
          <Trash2 size={20} color="#EE2336" strokeWidth={1.8} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0EFEB",
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  date: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#8F4601",
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.bold,
    ...typography.title,
    color: "#1E1E1E",
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#555555",
  },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#1E1E1E",
    lineHeight: 26,
  },
  actionBar: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#555555",
    textAlign: "center",
    marginTop: 40,
  },
});
