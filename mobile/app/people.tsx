import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Users, MessageSquare } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { usePeople } from "../lib/api/queries";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import type { Person } from "../../shared/types/api";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(
  name: string,
  colors: ReturnType<typeof useTheme>["colors"],
): string {
  const palette = [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length] ?? colors.primary;
}

function sourceLabel(source: Person["source"]): string {
  if (source === "ai_detected") return "AI";
  if (source === "profile") return "Profile";
  return "Contact";
}

export default function PeopleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = usePeople();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const people = data?.people ?? [];
  const summary = useMemo(() => {
    return {
      total: people.length,
      mentions: people.reduce((sum, p) => sum + p.mentionCount, 0),
      active: people.filter((p) => p.lastMentioned).length,
    };
  }, [people]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
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
          <DeepScreenHeader
            title="People"
            subtitle="Relationship memory and mention history."
            onBack={() => router.back()}
            tags={["Inner Circle", "Connections"]}
          />

          {!people.length ? (
            <Animated.View entering={FadeIn.delay(90).duration(600)}>
              <GlassCard padding={26}>
                <View style={styles.emptyInner}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: colors.glassSurface }]}>
                    <Users size={40} color={colors.mutedForeground} strokeWidth={1.2} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No people mentioned yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    As you mention people in your conversations, this view will map your
                    relationship context automatically.
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <SummaryStat label="People" value={summary.total} />
                  <SummaryStat label="Mentions" value={summary.mentions} />
                  <SummaryStat label="Active" value={summary.active} />
                </View>
              </GlassCard>

              {people.map((person: Person, index: number) => {
                const avatarBg = getAvatarColor(person.name, colors);

                return (
                  <GlassCard
                    key={person.name}
                    delay={index * 70}
                    padding={14}
                    style={styles.personCardSpacing}
                  >
                    <View style={styles.personRow}>
                      <View style={[styles.avatarWrap, { borderColor: avatarBg }]}>
                        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                          <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                        </View>
                      </View>

                      <View style={styles.personInfo}>
                        <Text style={[styles.personName, { color: colors.foreground }]}>
                          {person.name}
                        </Text>
                        {person.relationship ? (
                          <Text style={[styles.personRelationship, { color: colors.mutedForeground }]}>
                            {person.relationship}
                          </Text>
                        ) : null}

                        <View style={styles.personMeta}>
                          <View style={styles.metaItem}>
                            <MessageSquare size={12} color={colors.mutedForeground} strokeWidth={1.5} />
                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                              {person.mentionCount} mentions
                            </Text>
                          </View>
                          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                            {formatDate(person.lastMentioned)}
                          </Text>
                        </View>
                      </View>

                      <PillBadge label={sourceLabel(person.source)} small />
                    </View>
                  </GlassCard>
                );
              })}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  personCardSpacing: {
    marginBottom: 10,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: "Sora_700Bold",
    ...typography.sm,
    color: "#FFFFFF",
  },
  personInfo: {
    flex: 1,
    marginRight: 8,
  },
  personName: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  personRelationship: {
    marginTop: 1,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  personMeta: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.base,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 20,
  },
});
