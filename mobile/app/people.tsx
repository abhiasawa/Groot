import React, { useCallback } from "react";
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
import Animated, { FadeIn } from "react-native-reanimated";
import { ArrowLeft, Users, MessageSquare } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { usePeople } from "../lib/api/queries";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { PillBadge } from "../components/ui/pill-badge";
import type { Person } from "../../shared/types/api";

// ── Helpers ──────────────────────────────────

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

// Consistent color for a name
function getAvatarColor(name: string, colors: ReturnType<typeof useTheme>["colors"]): string {
  const palette = [
    colors.chart1,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.chart5,
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length] ?? colors.primary;
}

// ── Component ────────────────────────────────

export default function PeopleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = usePeople();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Loading ──────────────────────────────

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

  // ── Empty ────────────────────────────────

  if (!data?.people?.length) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          {/* Header */}
          <View style={styles.header}>
            <PressScale onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
            </PressScale>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <Animated.View
              entering={FadeIn.delay(100).duration(600)}
              style={[styles.emptyIconWrap, { backgroundColor: colors.glassSurface }]}
            >
              <Users size={40} color={colors.mutedForeground} strokeWidth={1.2} />
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(250).duration(600)}
              style={[styles.emptyTitle, { color: colors.foreground }]}
            >
              No people mentioned yet
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(400).duration(600)}
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              When you mention people in your conversations with Groot, they
              will be tracked here with relationship info.
            </Animated.Text>
          </ScrollView>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  // ── Main render ──────────────────────────

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        {/* Header */}
        <View style={styles.header}>
          <PressScale onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
          </PressScale>
          <View style={{ width: 24 }} />
        </View>

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
          {/* Title */}
          <Animated.View
            entering={FadeIn.duration(700)}
            style={styles.titleSection}
          >
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              People
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              Your inner circle
            </Text>
          </Animated.View>

          {/* Person list */}
          {data.people.map((person: Person, index: number) => {
            const avatarBg = getAvatarColor(person.name, colors);

            return (
              <GlassCard
                key={person.name}
                delay={index * 80}
                padding={14}
                style={styles.personCardSpacing}
              >
                <View style={styles.personRow}>
                  <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(person.name)}
                    </Text>
                  </View>

                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: colors.foreground }]}>
                      {person.name}
                    </Text>
                    {person.relationship && (
                      <Text style={[styles.personRelationship, { color: colors.mutedForeground }]}>
                        {person.relationship}
                      </Text>
                    )}
                    <View style={styles.personMeta}>
                      <View style={styles.metaItem}>
                        <MessageSquare
                          size={12}
                          color={colors.mutedForeground}
                          strokeWidth={1.5}
                        />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {person.mentionCount}{" "}
                          {person.mentionCount === 1 ? "mention" : "mentions"}
                        </Text>
                      </View>
                      <Text style={[styles.metaSep, { color: colors.mutedForeground }]}>
                        -
                      </Text>
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                        {formatDate(person.lastMentioned)}
                      </Text>
                    </View>
                  </View>

                  <PillBadge
                    label={person.source}
                    small
                  />
                </View>
              </GlassCard>
            );
          })}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.hero,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  personCardSpacing: {
    marginBottom: 10,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    fontFamily: "Sora_700Bold",
    ...typography.sm,
    color: "#FFFFFF",
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  personRelationship: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 1,
  },
  personMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  metaSep: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
    marginBottom: 12,
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
