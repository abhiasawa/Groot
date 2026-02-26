import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sprout,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useMood, useMemories } from "../../lib/api/queries";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { SectionHeader } from "../../components/ui/section-header";
import { MoodMeadow } from "../../components/garden/mood-meadow";
import { EmptyState } from "../../components/garden/empty-state";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";

// ── Month Navigator ──────────────────────────

function MonthNav({
  month,
  year,
  onPrev,
  onNext,
}: {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isCurrentMonth =
    new Date().getMonth() === month && new Date().getFullYear() === year;

  return (
    <View style={navS.container}>
      <Pressable onPress={onPrev} hitSlop={12}>
        <ChevronLeft size={22} color={colors.foreground} />
      </Pressable>
      <Text style={[navS.label, { color: colors.foreground }]}>{monthName}</Text>
      <Pressable onPress={onNext} hitSlop={12} disabled={isCurrentMonth}>
        <ChevronRight
          size={22}
          color={isCurrentMonth ? colors.mutedForeground : colors.foreground}
          opacity={isCurrentMonth ? 0.3 : 1}
        />
      </Pressable>
    </View>
  );
}

const navS = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  label: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
});

// ── Today's Entry Card ───────────────────────

function TodayEntryCard() {
  const { colors } = useTheme();
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data } = useMemories({ date: todayStr, limit: 1 });
  const entry = data?.memories?.[0];

  if (!entry) {
    return (
      <GlassCard delay={200}>
        <Text style={[entryS.emptyText, { color: colors.mutedForeground }]}>
          No journal entry today yet. Chat with Groot to add one.
        </Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard delay={200}>
      <SectionHeader title="Today's Entry" />
      <Text style={[entryS.content, { color: colors.foreground }]} numberOfLines={4}>
        {entry.content}
      </Text>
      <Text style={[entryS.time, { color: colors.mutedForeground }]}>
        {new Date(entry.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </Text>
    </GlassCard>
  );
}

const entryS = StyleSheet.create({
  content: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  time: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    paddingVertical: 12,
  },
});

// ── Search Bar ───────────────────────────────

function MemorySearch() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const { data, isLoading } = useMemories(
    query.length >= 2 ? { q: query, limit: 5 } : undefined,
  );

  return (
    <View>
      <View style={[searchS.bar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          style={[searchS.input, { color: colors.foreground }]}
          placeholder="Search memories..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      {query.length >= 2 && (
        <View style={searchS.results}>
          {isLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 12 }} />
          )}
          {data?.memories?.map((m) => (
            <View key={m.id} style={[searchS.resultCard, { borderColor: colors.border }]}>
              <Text style={[searchS.resultText, { color: colors.foreground }]} numberOfLines={2}>
                {m.content}
              </Text>
              <Text style={[searchS.resultDate, { color: colors.mutedForeground }]}>
                {new Date(m.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ))}
          {!isLoading && data?.memories?.length === 0 && (
            <Text style={[searchS.noResults, { color: colors.mutedForeground }]}>
              No memories found
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const searchS = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    padding: 0,
  },
  results: {
    marginTop: 8,
  },
  resultCard: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 20,
  },
  resultDate: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 4,
  },
  noResults: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    paddingVertical: 16,
  },
});

// ── Main Screen ──────────────────────────────

export default function GardenScreen() {
  const { colors } = useTheme();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const { data: moodData, isLoading, refetch } = useMood(year);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    const isCurrentMonth =
      month === now.getMonth() && year === now.getFullYear();
    if (isCurrentMonth) return;
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const s = useMemo(() => styles(colors), [colors]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <GradientBackground>
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <TabSwipeView currentTab="garden">
      <SafeAreaView style={s.safe}>
        <GradientBackground>
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={s.headerRow}>
              <Text style={s.pageTitle}>The Garden</Text>
            </View>

            {/* Month Navigator */}
            <MonthNav
              month={month}
              year={year}
              onPrev={prevMonth}
              onNext={nextMonth}
            />

            {/* Mood Meadow */}
            <GlassCard delay={100}>
              {(moodData?.dailyMoods?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={Sprout}
                  title="Your garden is waiting"
                  description="Chat with Groot daily to grow flowers in your mood meadow."
                />
              ) : (
                <MoodMeadow dailyMoods={moodData!.dailyMoods} year={year} />
              )}
            </GlassCard>

            {/* Today's Entry */}
            <View style={s.sectionGap}>
              <TodayEntryCard />
            </View>

            {/* Search */}
            <View style={s.sectionGap}>
              <SectionHeader title="Search Memories" />
              <MemorySearch />
            </View>
          </ScrollView>
        </GradientBackground>
      </SafeAreaView>
    </TabSwipeView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof import("../../lib/theme/provider").useTheme>["colors"]) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scroll: {
      padding: 20,
      paddingBottom: 90,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    pageTitle: {
      fontFamily: "Sora_700Bold",
      ...typography.title,
      color: c.foreground,
      letterSpacing: -0.3,
    },
    sectionGap: {
      marginTop: 20,
    },
  });
