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
import { Hash, ChevronDown, ChevronUp, Sparkles } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useTopics } from "../lib/api/queries";
import { getMoodColorFromName } from "../constants/mood";
import { typography } from "../constants/typography";
import { GradientBackground } from "../components/ui/gradient-background";
import { GlassCard } from "../components/ui/glass-card";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import type { Topic, TopicMemory } from "../../shared/types/api";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function TopicsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch } = useTopics();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const topTopic = data?.topics?.[0];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <DeepScreenHeader
            title="Topics"
            subtitle="Themes automatically distilled from your conversations."
            onBack={() => router.back()}
            tags={["Themes", "Memory Tags"]}
          />

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !data?.topics?.length ? (
            <Animated.View entering={FadeInDown.duration(420)}>
              <GlassCard padding={26}>
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: colors.glassSurface }]}>
                    <Hash size={32} color={colors.mutedForeground} strokeWidth={1.1} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No topics discovered yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Keep sharing with Groot and this screen will surface conversation themes.
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCopy}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                      Library
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                      {data.totalTopics} topics
                    </Text>
                    <Text style={[styles.summarySub, { color: colors.mutedForeground }]}>
                      {data.totalTaggedMemories} tagged memories
                    </Text>
                  </View>
                  {topTopic ? (
                    <View style={styles.trendingTag}>
                      <Sparkles size={14} color={colors.accent} strokeWidth={1.7} />
                      <Text style={[styles.trendingText, { color: colors.accent }]}>
                        {topTopic.name}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </GlassCard>

              <SectionHeader title="All Topics" />
              {data.topics.map((topic: Topic, index: number) => {
                const isExpanded = expandedTopic === topic.name;
                const moodColor = topic.dominantMood
                  ? getMoodColorFromName(topic.dominantMood, colors)
                  : null;

                return (
                  <View key={topic.name} style={styles.topicWrapper}>
                    <PressScale
                      onPress={() =>
                        setExpandedTopic((prev) => (prev === topic.name ? null : topic.name))
                      }
                    >
                      <GlassCard
                        delay={index * 60}
                        padding={14}
                        style={isExpanded ? styles.topicCardExpanded : undefined}
                      >
                        <View style={styles.topicHeader}>
                          <View style={styles.topicNameRow}>
                            <Text style={[styles.topicName, { color: colors.foreground }]}>
                              {topic.name}
                            </Text>
                            {moodColor ? (
                              <View style={[styles.topicMoodDot, { backgroundColor: moodColor }]} />
                            ) : null}
                          </View>
                          <View style={styles.topicRight}>
                            <PillBadge label={`${topic.memoryCount} memories`} small />
                            {isExpanded ? (
                              <ChevronUp size={16} color={colors.mutedForeground} strokeWidth={1.6} />
                            ) : (
                              <ChevronDown size={16} color={colors.mutedForeground} strokeWidth={1.6} />
                            )}
                          </View>
                        </View>
                        <Text style={[styles.lastMentioned, { color: colors.mutedForeground }]}>
                          Last mentioned {formatDate(topic.lastMentioned)}
                        </Text>
                      </GlassCard>
                    </PressScale>

                    {isExpanded && topic.sampleMemories.length > 0 ? (
                      <Animated.View
                        entering={FadeInDown.duration(240)}
                        style={[
                          styles.samplesContainer,
                          {
                            backgroundColor: colors.glassSurface,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        {topic.sampleMemories.map((mem: TopicMemory) => (
                          <GlassCard key={mem.id} padding={12} style={styles.sampleCard}>
                            <Text
                              style={[styles.sampleContent, { color: colors.foreground }]}
                              numberOfLines={2}
                            >
                              {mem.content}
                            </Text>
                            <Text style={[styles.sampleDate, { color: colors.mutedForeground }]}>
                              {formatDate(mem.created_at)}
                            </Text>
                          </GlassCard>
                        ))}
                      </Animated.View>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  summaryValue: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  summarySub: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 2,
  },
  trendingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trendingText: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
  },
  topicWrapper: {
    marginBottom: 10,
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
    gap: 8,
  },
  topicNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  topicName: {
    fontFamily: "Sora_600SemiBold",
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
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  samplesContainer: {
    padding: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    gap: 8,
  },
  sampleCard: {
    marginBottom: 0,
  },
  sampleContent: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 20,
  },
  sampleDate: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  emptyState: {
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 20,
  },
});
