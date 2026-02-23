import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
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
import { GradientBackground } from "../components/ui/gradient-background";
import { GlassCard } from "../components/ui/glass-card";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <PressScale onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
          </PressScale>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Topics
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.mutedForeground }]}
            >
              Themes from your conversations
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !data?.topics?.length ? (
          <ScrollView
            contentContainerStyle={styles.center}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <Animated.View
              entering={FadeInDown.duration(420)}
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.glassSurface },
              ]}
            >
              <Hash size={32} color={colors.mutedForeground} strokeWidth={1} />
            </Animated.View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No topics discovered yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              As you share more with Groot, topics and themes will be
              automatically identified from your conversations.
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
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
            <Text
              style={[styles.summaryText, { color: colors.mutedForeground }]}
            >
              {data.totalTopics} topics across {data.totalTaggedMemories}{" "}
              memories
            </Text>

            <SectionHeader title="All Topics" />

            {/* Topic list */}
            <View style={styles.topicGrid}>
              {data.topics.map((topic: Topic, index: number) => {
                const isExpanded = expandedTopic === topic.name;
                const moodColor = topic.dominantMood
                  ? getMoodColorFromName(topic.dominantMood, colors)
                  : null;

                return (
                  <View key={topic.name} style={styles.topicWrapper}>
                    <PressScale
                      onPress={() => toggleExpand(topic.name)}
                      style={isExpanded ? styles.expandedPressScale : undefined}
                    >
                      <GlassCard
                        delay={index * 80}
                        padding={14}
                        style={
                          isExpanded ? styles.topicCardExpanded : undefined
                        }
                      >
                        <View style={styles.topicHeader}>
                          <View style={styles.topicNameRow}>
                            <Text
                              style={[
                                styles.topicName,
                                { color: colors.foreground },
                              ]}
                            >
                              {topic.name}
                            </Text>
                            {moodColor && (
                              <View
                                style={[
                                  styles.topicMoodDot,
                                  { backgroundColor: moodColor },
                                ]}
                              />
                            )}
                          </View>
                          <View style={styles.topicRight}>
                            <PillBadge
                              label={String(topic.memoryCount)}
                              small
                            />
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

                        <Text
                          style={[
                            styles.lastMentioned,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Last mentioned {formatDate(topic.lastMentioned)}
                        </Text>
                      </GlassCard>
                    </PressScale>

                    {/* Expanded sample memories */}
                    {isExpanded && topic.sampleMemories.length > 0 && (
                      <Animated.View
                        entering={FadeInDown.duration(260)}
                        style={[
                          styles.samplesContainer,
                          { backgroundColor: colors.glassSurface },
                        ]}
                      >
                        {topic.sampleMemories.map((mem: TopicMemory) => (
                          <GlassCard key={mem.id} padding={12}>
                            <Text
                              style={[
                                styles.sampleContent,
                                { color: colors.foreground },
                              ]}
                              numberOfLines={2}
                            >
                              {mem.content}
                            </Text>
                            <Text
                              style={[
                                styles.sampleDate,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {formatDate(mem.created_at)}
                            </Text>
                          </GlassCard>
                        ))}
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    marginTop: 2,
  },
  headerSpacer: {
    width: 24,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    marginBottom: 16,
  },
  topicGrid: {
    gap: 0,
  },
  topicWrapper: {
    marginBottom: 10,
  },
  expandedPressScale: {
    marginBottom: 0,
  },
  topicCardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  lastMentioned: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },
  samplesContainer: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 12,
    gap: 8,
  },
  sampleContent: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    lineHeight: 20,
  },
  sampleDate: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    marginTop: 6,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
});
