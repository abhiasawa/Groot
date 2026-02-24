import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PagerView from "react-native-pager-view";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Search, X, BookOpen, Image, Mic, MessageCircle } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import {
  useMemories,
  useStories,
  useMood,
  type MemoriesParams,
} from "../../lib/api/queries";
import {
  getMoodColor,
  getMoodColorFromName,
  MOOD_LABELS,
} from "../../constants/mood";
import { Sheet } from "../../components/ui/sheet";
import { SectionLabel } from "../../components/ui/section-label";
import { Tag } from "../../components/ui/tag";
import { MediaPlayer } from "../../components/ui/media-player";
import type { Memory, Story, DailyMood } from "../../../shared/types/api";

// ── Constants ────────────────────────────────

const PAGE_SIZE = 20;
const SCREEN_WIDTH = Dimensions.get("window").width;
const TABS = ["All", "Stories", "Mood"] as const;

// Mood grid
const GRID_PADDING = 20;
const DOT_GAP = 2;
const COLS = 20;
const DOT_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - DOT_GAP * (COLS - 1)) / COLS,
);

// ── Helpers ──────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86400000;

  if (diff < dayMs && d.getDate() === now.getDate()) return "Today";
  if (diff < dayMs * 2) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getMoodFromMetadata(memory: Memory): string | null {
  if (memory.metadata && typeof memory.metadata === "object") {
    const meta = memory.metadata as Record<string, unknown>;
    if (typeof meta.detectedMood === "string") return meta.detectedMood;
    if (typeof meta.mood === "string") return meta.mood;
  }
  return null;
}

function getTagsFromMetadata(memory: Memory): string[] {
  if (memory.metadata && typeof memory.metadata === "object") {
    const meta = memory.metadata as Record<string, unknown>;
    if (Array.isArray(meta.memoryTags)) return meta.memoryTags as string[];
  }
  return [];
}

function getTypeIcon(type: string) {
  switch (type) {
    case "image":
      return Image;
    case "audio":
      return Mic;
    default:
      return MessageCircle;
  }
}

function buildYearGrid(
  year: number,
  dailyMoods: DailyMood[],
): { date: string; score: number | null }[] {
  const moodMap = new Map<string, number>();
  for (const dm of dailyMoods) {
    moodMap.set(dm.date, dm.score);
  }
  const grid: { date: string; score: number | null }[] = [];
  const current = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const today = new Date();
  while (current <= end && current <= today) {
    const dateStr = current.toISOString().slice(0, 10);
    grid.push({ date: dateStr, score: moodMap.get(dateStr) ?? null });
    current.setDate(current.getDate() + 1);
  }
  return grid;
}

function getMoodDistribution(
  dailyMoods: DailyMood[],
): { score: number; label: string; count: number; pct: number }[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const dm of dailyMoods) {
    if (dm.score >= 1 && dm.score <= 5) {
      counts[dm.score] = (counts[dm.score] ?? 0) + 1;
    }
  }
  const total = dailyMoods.length || 1;
  return [5, 4, 3, 2, 1].map((score) => ({
    score,
    label: MOOD_LABELS[score] ?? "Unknown",
    count: counts[score] ?? 0,
    pct: Math.round(((counts[score] ?? 0) / total) * 100),
  }));
}

// ── Main Component ───────────────────────────

export default function TimelineScreen() {
  const { colors } = useTheme();
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const indicatorLeft = useSharedValue(0);

  const tabWidth = SCREEN_WIDTH / TABS.length;

  const onPageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      const pos = e.nativeEvent.position;
      setActiveTab(pos);
      indicatorLeft.value = withTiming(pos * tabWidth, { duration: 200 });
    },
    [tabWidth, indicatorLeft],
  );

  const selectTab = useCallback(
    (index: number) => {
      pagerRef.current?.setPage(index);
      setActiveTab(index);
      indicatorLeft.value = withTiming(index * tabWidth, { duration: 200 });
    },
    [tabWidth, indicatorLeft],
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorLeft.value }],
    width: tabWidth,
  }));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* ── Header ──────────────────────── */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>
          Timeline
        </Text>
        <Pressable onPress={() => setShowSearch((v) => !v)} hitSlop={8}>
          {showSearch ? (
            <X size={22} color={colors.mutedForeground} strokeWidth={1.5} />
          ) : (
            <Search size={22} color={colors.mutedForeground} strokeWidth={1.5} />
          )}
        </Pressable>
      </View>

      {/* ── Tab Indicator ───────────────── */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab, i) => (
          <Pressable key={tab} style={s.tabItem} onPress={() => selectTab(i)}>
            <Text
              style={[
                s.tabLabel,
                {
                  color:
                    activeTab === i ? colors.foreground : colors.mutedForeground,
                  fontFamily:
                    activeTab === i ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
        <Animated.View
          style={[
            s.tabIndicator,
            { backgroundColor: colors.primary },
            indicatorStyle,
          ]}
        />
      </View>

      {/* ── PagerView ───────────────────── */}
      <PagerView
        ref={pagerRef}
        style={s.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        <View key="all" style={s.page}>
          <AllFeed
            colors={colors}
            showSearch={showSearch}
          />
        </View>
        <View key="stories" style={s.page}>
          <StoriesFeed colors={colors} />
        </View>
        <View key="mood" style={s.page}>
          <MoodView colors={colors} />
        </View>
      </PagerView>
    </SafeAreaView>
  );
}

// ── All Feed (Page 0) ────────────────────────

function AllFeed({
  colors,
  showSearch,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  showSearch: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [memoryPages, setMemoryPages] = useState<Memory[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const params: MemoriesParams = useMemo(
    () => ({
      q: searchQuery || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [searchQuery, offset],
  );

  const { data, isLoading, isRefetching, refetch } = useMemories(params);

  const onRefresh = useCallback(() => {
    setMemoryPages([]);
    setTotalCount(0);
    setOffset(0);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!data) return;
    setTotalCount(data.total ?? 0);
    if (offset === 0) {
      setMemoryPages(data.memories);
      return;
    }
    setMemoryPages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const next = data.memories.filter((m) => !ids.has(m.id));
      return next.length > 0 ? [...prev, ...next] : prev;
    });
  }, [data, offset]);

  const sorted = useMemo(
    () =>
      [...memoryPages].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [memoryPages],
  );

  const hasMore = memoryPages.length < totalCount;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && !isRefetching) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore, isLoading, isRefetching]);

  // Group by date
  const sections = useMemo(() => {
    const groups: { title: string; data: Memory[] }[] = [];
    let currentDate = "";
    for (const m of sorted) {
      const d = formatDateHeading(m.created_at);
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ title: d, data: [] });
      }
      groups[groups.length - 1]!.data.push(m);
    }
    // Flatten for FlatList with separators
    const flat: (Memory | { _dateHeader: string })[] = [];
    for (const g of groups) {
      flat.push({ _dateHeader: g.title } as { _dateHeader: string });
      flat.push(...g.data);
    }
    return flat;
  }, [sorted]);

  if (isLoading && offset === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      {showSearch && (
        <View style={s.searchWrap}>
          <View
            style={[
              s.searchBar,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Search size={16} color={colors.mutedForeground} strokeWidth={1.5} />
            <TextInput
              style={[s.searchInput, { color: colors.foreground }]}
              placeholder="Search memories..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={(t) => {
                setMemoryPages([]);
                setTotalCount(0);
                setSearchQuery(t);
                setOffset(0);
              }}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setMemoryPages([]);
                  setTotalCount(0);
                  setSearchQuery("");
                  setOffset(0);
                }}
                hitSlop={8}
              >
                <X size={16} color={colors.mutedForeground} strokeWidth={1.5} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {sorted.length === 0 ? (
        <ScrollView
          contentContainerStyle={s.emptyScroll}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={s.emptyWrap}>
            <BookOpen size={32} color={colors.mutedForeground} strokeWidth={1.2} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              {searchQuery ? "No memories match your search." : "Your memories will appear here."}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, i) =>
            "_dateHeader" in item
              ? `header-${(item as { _dateHeader: string })._dateHeader}`
              : (item as Memory).id
          }
          contentContainerStyle={s.listPad}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            if ("_dateHeader" in item) {
              return (
                <Text style={[s.dateHeader, { color: colors.mutedForeground }]}>
                  {(item as { _dateHeader: string })._dateHeader}
                </Text>
              );
            }
            const memory = item as Memory;
            return <MemoryCard memory={memory} colors={colors} />;
          }}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator style={{ paddingVertical: 20 }} color={colors.primary} />
            ) : null
          }
        />
      )}
    </View>
  );
}

// ── Memory Card ──────────────────────────────

function MemoryCard({
  memory,
  colors,
}: {
  memory: Memory;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const mood = getMoodFromMetadata(memory);
  const moodColor = mood ? getMoodColorFromName(mood, colors) : undefined;
  const tags = getTagsFromMetadata(memory);
  const TypeIcon = getTypeIcon(memory.message_type);
  const hasMedia =
    memory.media_url &&
    (memory.media_url.startsWith("storage:") || memory.media_url.startsWith("media:")) &&
    (memory.message_type === "image" || memory.message_type === "audio");

  return (
    <Sheet style={s.memoryCard} accentColor={moodColor}>
      <View style={s.memoryHeader}>
        {moodColor ? (
          <View style={[s.memoryDot, { backgroundColor: moodColor }]} />
        ) : (
          <TypeIcon size={14} color={colors.mutedForeground} strokeWidth={1.5} />
        )}
        <Text style={[s.memoryTime, { color: colors.mutedForeground }]}>
          {formatTime(memory.created_at)}
        </Text>
      </View>

      {hasMedia && (
        <View style={s.mediaWrap}>
          <MediaPlayer mediaUrl={memory.media_url!} messageType={memory.message_type} />
        </View>
      )}

      <Text style={[s.memoryContent, { color: colors.foreground }]} numberOfLines={4}>
        {memory.content}
      </Text>

      {tags.length > 0 && (
        <View style={s.tagsRow}>
          {tags.slice(0, 3).map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </View>
      )}
    </Sheet>
  );
}

// ── Stories Feed (Page 1) ────────────────────

function StoriesFeed({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const { data, isLoading, isRefetching, refetch } = useStories();

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const stories = data?.stories ?? [];

  if (stories.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={s.emptyScroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        <View style={s.emptyWrap}>
          <BookOpen size={32} color={colors.mutedForeground} strokeWidth={1.2} />
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
            Storyworthy moments will appear here as Groot captures them from your
            conversations.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={stories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={s.listPad}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
      renderItem={({ item }) => <StoryCard story={item} colors={colors} />}
    />
  );
}

function StoryCard({
  story,
  colors,
}: {
  story: Story;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const mood = getMoodFromMetadata(story);
  const moodColor = mood ? getMoodColorFromName(mood, colors) : colors.accent;
  const tags = getTagsFromMetadata(story);

  const dayName = new Date(story.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Sheet style={s.storyCard} accentColor={moodColor}>
      <Text style={[s.storyDay, { color: colors.mutedForeground }]}>
        {dayName}
      </Text>
      <Text style={[s.storyContent, { color: colors.foreground }]} numberOfLines={8}>
        {story.content}
      </Text>
      {tags.length > 0 && (
        <View style={s.tagsRow}>
          {tags.slice(0, 3).map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </View>
      )}
    </Sheet>
  );
}

// ── Mood View (Page 2) ───────────────────────

function MoodView({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const year = new Date().getFullYear();
  const { data, isLoading, isRefetching, refetch } = useMood(year);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const dailyMoods = data?.dailyMoods ?? [];
  const recentMood = data?.recentMood ?? null;
  const moodColor = recentMood ? getMoodColorFromName(recentMood, colors) : colors.mutedForeground;
  const grid = buildYearGrid(year, dailyMoods);
  const distribution = getMoodDistribution(dailyMoods);

  // Last 7 days of mood dots
  const last7 = grid.slice(-7);

  return (
    <ScrollView
      contentContainerStyle={s.listPad}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      {/* Hero */}
      <View style={s.moodHero}>
        <Text style={[s.moodHeroText, { color: moodColor }]}>
          {recentMood ? `Feeling ${recentMood.toLowerCase()}` : "No mood data yet"}
        </Text>
        <View style={s.moodDotsRow}>
          {last7.map((d, i) => (
            <View
              key={d.date}
              style={[
                s.moodDotSmall,
                {
                  backgroundColor:
                    d.score !== null
                      ? getMoodColor(d.score, colors)
                      : colors.moodNone,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Year in Pixels */}
      {grid.length > 0 && (
        <View style={s.section}>
          <SectionLabel>Year in Pixels</SectionLabel>
          <Sheet padding={12}>
            <View style={s.pixelGrid}>
              {grid.map((d) => (
                <View
                  key={d.date}
                  style={[
                    s.pixelDot,
                    {
                      backgroundColor:
                        d.score !== null
                          ? getMoodColor(d.score, colors)
                          : colors.moodNone,
                    },
                  ]}
                />
              ))}
            </View>
            {/* Legend */}
            <View style={s.legendRow}>
              {[5, 4, 3, 2, 1].map((score) => (
                <View key={score} style={s.legendItem}>
                  <View
                    style={[
                      s.legendDot,
                      { backgroundColor: getMoodColor(score, colors) },
                    ]}
                  />
                  <Text style={[s.legendLabel, { color: colors.mutedForeground }]}>
                    {MOOD_LABELS[score]}
                  </Text>
                </View>
              ))}
            </View>
          </Sheet>
        </View>
      )}

      {/* Distribution */}
      {dailyMoods.length > 0 && (
        <View style={s.section}>
          <SectionLabel>Distribution</SectionLabel>
          <Sheet padding={16}>
            {distribution.map((d) => (
              <View key={d.score} style={s.distRow}>
                <Text style={[s.distLabel, { color: colors.foreground }]}>
                  {d.label}
                </Text>
                <View style={[s.distBarBg, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      s.distBarFill,
                      {
                        backgroundColor: getMoodColor(d.score, colors),
                        width: `${Math.max(d.pct, 2)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.distPct, { color: colors.mutedForeground }]}>
                  {d.pct}%
                </Text>
              </View>
            ))}
          </Sheet>
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pager: { flex: 1 },
  page: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    position: "relative",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 14,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
  },

  // Search
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    paddingVertical: 0,
  },

  // List
  listPad: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Date header
  dateHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  // Memory card
  memoryCard: {
    marginBottom: 10,
  },
  memoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  memoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memoryTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  mediaWrap: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  memoryContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },

  // Story card
  storyCard: {
    marginBottom: 14,
  },
  storyDay: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 8,
  },
  storyContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },

  // Empty state
  emptyScroll: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyWrap: {
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  // Mood hero
  moodHero: {
    marginBottom: 24,
  },
  moodHeroText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 10,
  },
  moodDotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  moodDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Pixel grid
  section: { marginTop: 20 },
  pixelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DOT_GAP,
  },
  pixelDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },

  // Distribution
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  distLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    width: 44,
  },
  distBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  distPct: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    width: 34,
    textAlign: "right",
  },
});
