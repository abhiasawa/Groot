import React, { useCallback } from "react";
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
import {
  Brain,
  CheckSquare,
  Bell,
  Flame,
  Users,
  Heart,
  Clock,
  Sparkles,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useHome } from "../../lib/api/queries";
import { getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import type { RecentMemory, HomeData } from "../../../shared/types/api";

// ── Helpers ──────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(dateStr: string): string {
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
    month: "short",
    day: "numeric",
  });
}

function getTypeBadge(type: string): string {
  switch (type) {
    case "text":
      return "Text";
    case "audio":
      return "Voice";
    case "image":
      return "Photo";
    default:
      return type;
  }
}

// ── Component ────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefetching, refetch } = useHome();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const s = styles(colors);

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const home = data as HomeData | undefined;

  return (
    <SafeAreaView style={s.container}>
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
        {/* Greeting */}
        <Text style={s.greeting}>
          {getGreeting()},{" "}
          <Text style={s.name}>{home?.displayName ?? "there"}</Text>
        </Text>

        {/* Today's mood */}
        {home?.recentMood && (
          <View style={s.moodRow}>
            <View
              style={[
                s.moodDot,
                {
                  backgroundColor: getMoodColorFromName(
                    home.recentMood,
                    colors,
                  ),
                },
              ]}
            />
            <Text style={s.moodText}>
              Feeling{" "}
              <Text style={s.moodLabel}>{home.recentMood.toLowerCase()}</Text>{" "}
              today
            </Text>
          </View>
        )}

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <StatCard
            icon={<Brain size={18} color={colors.chart1} strokeWidth={1.5} />}
            label="Memories"
            value={home?.memoriesCount ?? 0}
            colors={colors}
          />
          <StatCard
            icon={
              <CheckSquare size={18} color={colors.chart2} strokeWidth={1.5} />
            }
            label="Pending"
            value={home?.pendingTasks ?? 0}
            colors={colors}
          />
          <StatCard
            icon={<Bell size={18} color={colors.chart3} strokeWidth={1.5} />}
            label="Reminders"
            value={home?.upcomingReminders ?? 0}
            colors={colors}
          />
          <StatCard
            icon={<Flame size={18} color={colors.chart4} strokeWidth={1.5} />}
            label="Habits"
            value={home?.habitsCount ?? 0}
            colors={colors}
          />
          <StatCard
            icon={<Users size={18} color={colors.chart5} strokeWidth={1.5} />}
            label="People"
            value={home?.peopleCount ?? 0}
            colors={colors}
          />
        </View>

        {/* Flashback */}
        {home?.flashback && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Sparkles
                size={16}
                color={colors.accent}
                strokeWidth={1.5}
              />
              <Text style={s.sectionTitle}>Flashback</Text>
            </View>
            <View style={s.flashbackCard}>
              <Text style={s.flashbackContent} numberOfLines={4}>
                {home.flashback.content}
              </Text>
              <Text style={s.flashbackDate}>
                {new Date(home.flashback.created_at).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" },
                )}
              </Text>
            </View>
          </View>
        )}

        {/* Recent entries */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Entries</Text>

          {!home?.recentMemories?.length ? (
            <View style={s.emptyState}>
              <Heart
                size={32}
                color={colors.mutedForeground}
                strokeWidth={1}
              />
              <Text style={s.emptyTitle}>Your story starts here</Text>
              <Text style={s.emptySubtitle}>
                Send your first message to Groot on WhatsApp or Telegram to
                begin building your second brain.
              </Text>
            </View>
          ) : (
            home.recentMemories.slice(0, 5).map((memory: RecentMemory) => (
              <View key={memory.id} style={s.entryCard}>
                <View style={s.entryHeader}>
                  <View style={s.typeBadge}>
                    <Text style={s.typeBadgeText}>
                      {getTypeBadge(memory.message_type)}
                    </Text>
                  </View>
                  <Text style={s.entryTime}>
                    {formatRelativeTime(memory.created_at)}
                  </Text>
                </View>
                <Text style={s.entryContent} numberOfLines={2}>
                  {memory.content}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stat card ────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        flex: 1,
        minWidth: "28%",
      }}
    >
      {icon}
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          ...typography["2xl"],
          color: colors.foreground,
          marginTop: 6,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          ...typography.xs,
          color: colors.mutedForeground,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
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
      justifyContent: "center",
      alignItems: "center",
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    greeting: {
      fontFamily: "Inter_400Regular",
      ...typography["2xl"],
      color: c.foreground,
      marginBottom: 4,
    },
    name: {
      fontFamily: "Inter_700Bold",
    },
    moodRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 20,
    },
    moodDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    moodText: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
    },
    moodLabel: {
      fontFamily: "Inter_500Medium",
      color: c.foreground,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 28,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginBottom: 12,
    },
    flashbackCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
    },
    flashbackContent: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      fontStyle: "italic",
    },
    flashbackDate: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      marginTop: 10,
    },
    entryCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    typeBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    typeBadgeText: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
    },
    entryTime: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    entryContent: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
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
