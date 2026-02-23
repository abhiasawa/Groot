import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, FileText, Mic, Camera, X } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useMemories, type MemoriesParams } from "../../lib/api/queries";
import { getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import type { Memory } from "../../../shared/types/api";

// ── Constants ────────────────────────────────

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "text", label: "Text" },
  { key: "audio", label: "Voice" },
  { key: "image", label: "Photo" },
] as const;

const PAGE_SIZE = 20;

// ── Helpers ──────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function groupByDate(memories: Memory[]): { date: string; items: Memory[] }[] {
  const map = new Map<string, Memory[]>();
  for (const m of memories) {
    const day = new Date(m.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const existing = map.get(day);
    if (existing) {
      existing.push(m);
    } else {
      map.set(day, [m]);
    }
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function getTypeBadge(type: string): { label: string; icon: string } {
  switch (type) {
    case "text":
      return { label: "Text", icon: "text" };
    case "audio":
      return { label: "Voice", icon: "audio" };
    case "image":
      return { label: "Photo", icon: "image" };
    default:
      return { label: type, icon: "text" };
  }
}

function getMoodFromMetadata(memory: Memory): string | null {
  if (memory.metadata && typeof memory.metadata === "object") {
    const mood = (memory.metadata as Record<string, unknown>).mood;
    if (typeof mood === "string") return mood;
  }
  return null;
}

// ── Component ────────────────────────────────

export default function JournalScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);

  const params: MemoriesParams = useMemo(
    () => ({
      q: searchQuery || undefined,
      type: activeFilter === "all" ? undefined : activeFilter,
      limit: PAGE_SIZE,
      offset,
    }),
    [searchQuery, activeFilter, offset],
  );

  const { data, isLoading, isRefetching, refetch } = useMemories(params);

  const onRefresh = useCallback(() => {
    setOffset(0);
    refetch();
  }, [refetch]);

  const grouped = useMemo(
    () => groupByDate(data?.memories ?? []),
    [data?.memories],
  );

  const hasMore = (data?.total ?? 0) > offset + PAGE_SIZE;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore, isLoading]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setOffset(0);
  }, []);

  const handleFilterChange = useCallback((key: string) => {
    setActiveFilter(key);
    setOffset(0);
  }, []);

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Search bar */}
      <View style={s.searchContainer}>
        <View style={s.searchBar}>
          <Search
            size={16}
            color={colors.mutedForeground}
            strokeWidth={1.5}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Search memories..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setOffset(0);
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X
                size={16}
                color={colors.mutedForeground}
                strokeWidth={1.5}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Type filter chips */}
      <View style={s.filterRow}>
        {TYPE_FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => handleFilterChange(filter.key)}
              style={[s.filterChip, active && s.filterChipActive]}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {isLoading && offset === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data?.memories?.length ? (
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
          <FileText
            size={32}
            color={colors.mutedForeground}
            strokeWidth={1}
          />
          <Text style={s.emptyTitle}>No entries yet</Text>
          <Text style={s.emptySubtitle}>
            {searchQuery
              ? "No memories match your search. Try different keywords."
              : "Your journal entries will appear here as you chat with Groot."}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 100;
            if (isCloseToBottom) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {grouped.map((group) => (
            <View key={group.date} style={s.dateGroup}>
              <Text style={s.dateHeader}>{group.date}</Text>
              {group.items.map((memory) => {
                const mood = getMoodFromMetadata(memory);
                const moodColor = mood
                  ? getMoodColorFromName(mood, colors)
                  : colors.border;
                const badge = getTypeBadge(memory.message_type);

                return (
                  <View
                    key={memory.id}
                    style={[s.entryCard, { borderLeftColor: moodColor }]}
                  >
                    <View style={s.entryHeader}>
                      <View style={s.entryHeaderLeft}>
                        {mood && (
                          <View
                            style={[
                              s.moodDot,
                              { backgroundColor: moodColor },
                            ]}
                          />
                        )}
                        <Text style={s.entryTime}>
                          {formatTime(memory.created_at)}
                        </Text>
                      </View>
                      <View style={s.typeBadge}>
                        <Text style={s.typeBadgeText}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={s.entryContent} numberOfLines={3}>
                      {memory.content}
                    </Text>
                    {memory.media_description && (
                      <Text style={s.mediaDesc} numberOfLines={1}>
                        {memory.media_description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          {isLoading && offset > 0 && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ paddingVertical: 20 }}
            />
          )}

          {!hasMore && data.memories.length > 0 && (
            <Text style={s.endText}>
              {data.total} {data.total === 1 ? "memory" : "memories"} total
            </Text>
          )}
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
    searchContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.secondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      padding: 0,
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: c.secondary,
    },
    filterChipActive: {
      backgroundColor: c.primary,
    },
    filterChipText: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
    },
    filterChipTextActive: {
      color: c.primaryForeground,
    },
    listContent: {
      padding: 20,
      paddingTop: 0,
      paddingBottom: 40,
    },
    dateGroup: {
      marginBottom: 20,
    },
    dateHeader: {
      fontFamily: "Inter_600SemiBold",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 10,
    },
    entryCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderLeftWidth: 3,
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    entryHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    moodDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    entryTime: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
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
    entryContent: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },
    mediaDesc: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      fontStyle: "italic",
      marginTop: 6,
    },
    endText: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      textAlign: "center",
      paddingVertical: 16,
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
