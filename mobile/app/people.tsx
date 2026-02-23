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
import { useRouter } from "expo-router";
import { ArrowLeft, Users, User, MessageSquare } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { usePeople } from "../lib/api/queries";
import { typography } from "../constants/typography";
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

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>People</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data?.people?.length ? (
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
          <Users size={32} color={colors.mutedForeground} strokeWidth={1} />
          <Text style={s.emptyTitle}>No people mentioned yet</Text>
          <Text style={s.emptySubtitle}>
            When you mention people in your conversations with Groot, they
            will be tracked here with relationship info.
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
          {data.people.map((person: Person) => {
            const avatarBg = getAvatarColor(person.name, colors);

            return (
              <View key={person.name} style={s.personCard}>
                <View
                  style={[s.avatar, { backgroundColor: avatarBg }]}
                >
                  <Text style={s.avatarText}>
                    {getInitials(person.name)}
                  </Text>
                </View>

                <View style={s.personInfo}>
                  <Text style={s.personName}>{person.name}</Text>
                  {person.relationship && (
                    <Text style={s.personRelationship}>
                      {person.relationship}
                    </Text>
                  )}
                  <View style={s.personMeta}>
                    <View style={s.metaItem}>
                      <MessageSquare
                        size={12}
                        color={colors.mutedForeground}
                        strokeWidth={1.5}
                      />
                      <Text style={s.metaText}>
                        {person.mentionCount}{" "}
                        {person.mentionCount === 1 ? "mention" : "mentions"}
                      </Text>
                    </View>
                    <Text style={s.metaSep}>-</Text>
                    <Text style={s.metaText}>
                      {formatDate(person.lastMentioned)}
                    </Text>
                  </View>
                </View>

                <View style={s.sourceBadge}>
                  <Text style={s.sourceText}>{person.source}</Text>
                </View>
              </View>
            );
          })}
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
    personCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
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
      fontFamily: "Inter_700Bold",
      ...typography.sm,
      color: "#FFFFFF",
    },
    personInfo: {
      flex: 1,
    },
    personName: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
    },
    personRelationship: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
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
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    metaSep: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    sourceBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    sourceText: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      textTransform: "capitalize",
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
