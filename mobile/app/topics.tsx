import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Hash,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useTopics } from "../lib/api/queries";
import { getMoodColorFromName } from "../constants/mood";
import { typography } from "../constants/typography";
import type { Topic, TopicMemory } from "../../shared/types/api";

// ── Helpers ──────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Component ────────────────────────────────

export default function TopicsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTopics();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const toggleExpand = useCallback(
    (name: string) => {
      setExpandedTopic((prev) => (prev === name ? null : name));
    },
    [],
  );

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>Topics</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data?.topics?.length ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Hash size={32} color={colors.mutedForeground} strokeWidth={1} />
          <Text style={s.emptyTitle}>No topics discovered yet</Text>
          <Text style={s.emptySubtitle}>
            As you share more with Groot, topics and themes will be
            automatically identified from your conversations.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <Text style={s.summaryText}>
            {data.totalTopics} topics across {data.totalTaggedMemories}{" "}
            memories
          </Text>

          {/* Topic grid */}
          <View style={s.topicGrid}>
            {data.topics.map((topic: Topic) => {
              const isExpanded = expandedTopic === topic.name;
              const moodColor = topic.dominantMood
                ? getMoodColorFromName(topic.dominantMood, colors)
                : null;

              return (
                <View key={topic.name}>
                  <Pressable
                    style={({ pressed }) => [
                      s.topicCard,
                      isExpanded && s.topicCardExpanded,
                      pressed && s.topicCardPressed,
                    ]}
                    onPress={() => toggleExpand(topic.name)}
                  >
                    <View style={s.topicHeader}>
                      <View style={s.topicNameRow}>
                        <Text style={s.topicName}>{topic.name}</Text>
                        {moodColor && (
                          <View
                            style={[
                              s.topicMoodDot,
                              { backgroundColor: moodColor },
                            ]}
                          />
                        )}
                      </View>
                      <View style={s.topicRight}>
                        <View style={s.countBadge}>
                          <Text style={s.countText}>
                            {topic.memoryCount}
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp
                            size={16}
                            color={colors.mutedForeground}
                            strokeWidth={1.5}
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            color={colors.mutedForeground}
                            strokeWidth={1.5}
                          />
                        )}
                      </View>
                    </View>

                    <Text style={s.lastMentioned}>
                      Last mentioned {formatDate(topic.lastMentioned)}
                    </Text>
                  </Pressable>

                  {/* Expanded sample memories */}
                  {isExpanded && topic.sampleMemories.length > 0 && (
                    <View style={s.samplesContainer}>
                      {topic.sampleMemories.map((mem: TopicMemory) => (
                        <View key={mem.id} style={s.sampleCard}>
                          <Text style={s.sampleContent} numberOfLines={2}>
                            {mem.content}
                          </Text>
                          <Text style={s.sampleDate}>
                            {formatDate(mem.created_at)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    summaryText: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 16,
    },
    topicGrid: {
      gap: 0,
    },
    topicCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    topicCardExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 0,
    },
    topicCardPressed: {
      backgroundColor: c.secondary,
    },
    topicHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    topicNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    topicName: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
    },
    topicMoodDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    topicRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    countBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countText: {
      fontFamily: "Inter_600SemiBold",
      ...typography.xs,
      color: c.mutedForeground,
    },
    lastMentioned: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    samplesContainer: {
      backgroundColor: c.secondary,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      padding: 12,
      marginBottom: 8,
      gap: 8,
    },
    sampleCard: {
      backgroundColor: c.card,
      borderRadius: 8,
      padding: 12,
    },
    sampleContent: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 20,
    },
    sampleDate: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      marginTop: 6,
    },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
