import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import {
  useMemories,
  useCalendarDots,
  type MemoriesParams,
} from "../../lib/api/queries";
import { typography } from "../../constants/typography";
import type { Memory } from "../../../shared/types/api";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";
import { PillBadge } from "../../components/ui/pill-badge";
import { MediaPlayer } from "../../components/ui/media-player";
import { SearchInput } from "../../components/ui/search-input";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "text", label: "Text" },
  { key: "audio", label: "Voice" },
  { key: "image", label: "Photo" },
] as const;

function formatDateHeading(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function JournalScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const params: MemoriesParams = useMemo(
    () => ({
      q: query || undefined,
      type: activeFilter === "all" ? undefined : activeFilter,
      date: selectedDate,
      limit: 100,
    }),
    [query, activeFilter, selectedDate],
  );

  const { data, isLoading, refetch } = useMemories(params);
  const { data: dotData } = useCalendarDots(monthKey(calendarMonth));

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const memories = data?.memories ?? [];
  const grouped = useMemo(() => {
    const groups = new Map<string, Memory[]>();
    for (const memory of memories) {
      const dateLabel = formatDateHeading(memory.created_at);
      const list = groups.get(dateLabel);
      if (list) list.push(memory);
      else groups.set(dateLabel, [memory]);
    }
    return [...groups.entries()];
  }, [memories]);

  return (
    <TabSwipeView currentTab="journal">
      <SafeAreaView style={styles.safe}>
        <GradientBackground>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <View style={styles.headerRow}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Journal</Text>
              <PressScale
                onPress={() => setViewMode((v) => (v === "timeline" ? "calendar" : "timeline"))}
                haptic={false}
              >
                <View
                  style={[
                    styles.headerIconBtn,
                    { backgroundColor: viewMode === "calendar" ? colors.primary : colors.glassSurface },
                  ]}
                >
                  <CalendarDays
                    size={18}
                    color={viewMode === "calendar" ? colors.primaryForeground : colors.mutedForeground}
                    strokeWidth={1.8}
                  />
                </View>
              </PressScale>
            </View>

            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search memories..."
            />

            <View style={styles.filterChips}>
              {FILTERS.map((filter) => (
                <PressScale key={filter.key} onPress={() => setActiveFilter(filter.key)} scale={0.96}>
                  <PillBadge
                    label={filter.label}
                    color={activeFilter === filter.key ? colors.secondaryForeground : colors.glassSurface}
                    textColor={activeFilter === filter.key ? "#FFFFFF" : colors.mutedForeground}
                    small
                  />
                </PressScale>
              ))}
            </View>

            {viewMode === "calendar" ? (
              <CalendarSection
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                markedDates={new Set(dotData?.dates ?? [])}
                selectedDate={selectedDate}
                onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? undefined : date))}
              />
            ) : selectedDate ? (
              <View style={styles.selectedDateRow}>
                <PillBadge
                  label={new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}
                  color={colors.secondary}
                  textColor={colors.secondaryForeground}
                />
                <PressScale onPress={() => setSelectedDate(undefined)} haptic={false}>
                  <PillBadge label="Clear" small />
                </PressScale>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : memories.length === 0 ? (
              <GlassCard style={styles.emptyCard} padding={26}>
                <View style={styles.emptyInner}>
                  <BookOpen size={34} color={colors.mutedForeground} strokeWidth={1.5} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No entries found</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Try another search or clear filters to view more journal memories.
                  </Text>
                </View>
              </GlassCard>
            ) : (
              grouped.map(([dateLabel, entries]) => (
                <View key={dateLabel} style={styles.groupWrap}>
                  <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{dateLabel}</Text>
                  {entries.map((memory, index) => (
                    <PressScale
                      key={memory.id}
                      onPress={() => setSelectedMemory(memory)}
                      style={index < entries.length - 1 ? styles.entryGap : undefined}
                      scale={0.987}
                    >
                      <GlassCard padding={14}>
                        <View style={styles.entryHead}>
                          <Text style={[styles.entryTime, { color: colors.mutedForeground }]}>
                            {formatTime(memory.created_at)}
                          </Text>
                          {memory.message_type !== "audio" ? (
                            <PillBadge label={memory.message_type || "Entry"} small />
                          ) : null}
                        </View>

                        {/* Groot's preceding question for context */}
                        {memory.context_message ? (
                          <View style={[styles.contextWrap, { borderLeftColor: `${colors.primary}40` }]}>
                            <Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>
                              Groot asked:
                            </Text>
                            <Text style={[styles.contextText, { color: `${colors.mutedForeground}CC` }]} numberOfLines={2}>
                              {memory.context_message}
                            </Text>
                          </View>
                        ) : null}

                        {memory.media_url &&
                          (memory.media_url.startsWith("storage:") || memory.media_url.startsWith("media:")) &&
                          (memory.message_type === "image" || memory.message_type === "audio") ? (
                          <MediaPlayer mediaUrl={memory.media_url} messageType={memory.message_type} />
                        ) : null}

                        {(memory.content || memory.media_description) ? (
                          <Text style={[styles.entryText, { color: colors.foreground }]} numberOfLines={3}>
                            {memory.content || memory.media_description}
                          </Text>
                        ) : null}
                      </GlassCard>
                    </PressScale>
                  ))}
                </View>
              ))
            )}

            <View style={styles.bottomGap} />
          </ScrollView>

          <MemoryModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        </GradientBackground>
      </SafeAreaView>
    </TabSwipeView>
  );
}

// Calendar cell sizing — computed from screen width
const CAL_H_PADDING = 18; // scroll paddingHorizontal
const CAL_CARD_PADDING = 16; // GlassCard padding
const CAL_GAP = 4;
const CAL_COLS = 7;
const CAL_CELL_SIZE = Math.floor(
  (Dimensions.get("window").width - CAL_H_PADDING * 2 - CAL_CARD_PADDING * 2 - CAL_GAP * (CAL_COLS - 1)) / CAL_COLS,
);

function CalendarSection({
  month,
  onMonthChange,
  markedDates,
  selectedDate,
  onSelectDate,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  markedDates: Set<string>;
  selectedDate?: string;
  onSelectDate: (d: string) => void;
}) {
  const { colors } = useTheme();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const today = new Date().toISOString().slice(0, 10);

  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, date });
  }

  const dayCellStyle = {
    width: CAL_CELL_SIZE,
    height: CAL_CELL_SIZE,
    borderRadius: CAL_CELL_SIZE / 4,
  };

  return (
    <GlassCard padding={CAL_CARD_PADDING} style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <PressScale onPress={() => onMonthChange(new Date(year, monthIndex - 1, 1))} haptic={false}>
          <ChevronLeft size={18} color={colors.foreground} strokeWidth={1.8} />
        </PressScale>
        <View style={styles.calendarTitleRow}>
          <CalendarDays size={15} color={colors.primary} strokeWidth={1.8} />
          <Text style={[styles.calendarTitle, { color: colors.foreground }]}>
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
        </View>
        <PressScale onPress={() => onMonthChange(new Date(year, monthIndex + 1, 1))} haptic={false}>
          <ChevronRight size={18} color={colors.foreground} strokeWidth={1.8} />
        </PressScale>
      </View>

      <View style={styles.calendarGrid}>
        {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
          <View key={`label-${i}`} style={[styles.dayLabelCell, dayCellStyle]}>
            <Text style={[styles.dayLabelText, { color: colors.mutedForeground }]}>{label}</Text>
          </View>
        ))}

        {cells.map((cell, idx) => {
          if (!cell) return <View key={`empty-${idx}`} style={dayCellStyle} />;
          const isSelected = selectedDate === cell.date;
          const hasEntry = markedDates.has(cell.date);
          const isToday = today === cell.date;

          return (
            <PressScale key={cell.date} onPress={() => onSelectDate(cell.date)} haptic={false} scale={0.92}>
              <View
                style={[
                  styles.dayCell,
                  dayCellStyle,
                  {
                    backgroundColor: isSelected ? colors.primary : hasEntry ? `${colors.accent}20` : "transparent",
                    borderColor: isToday ? colors.primary : "transparent",
                    borderWidth: isToday ? 1.5 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : hasEntry
                          ? colors.accent
                          : colors.foreground,
                    },
                  ]}
                >
                  {cell.day}
                </Text>
                {hasEntry ? (
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: isSelected ? colors.primaryForeground : colors.accent,
                      },
                    ]}
                  />
                ) : null}
              </View>
            </PressScale>
          );
        })}
      </View>
    </GlassCard>
  );
}

function MemoryModal({ memory, onClose }: { memory: Memory | null; onClose: () => void }) {
  const { colors } = useTheme();
  if (!memory) return null;

  return (
    <Modal transparent animationType="fade" visible={!!memory} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalWrap}>
          <GlassCard padding={18}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Journal Entry</Text>
              <PressScale onPress={onClose} haptic={false}>
                <View style={styles.modalClose}>
                  <X size={18} color={colors.mutedForeground} strokeWidth={2} />
                </View>
              </PressScale>
            </View>

            <Text style={[styles.modalMeta, { color: colors.mutedForeground }]}>
              {new Date(memory.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Groot's question context in full view */}
              {memory.context_message ? (
                <View style={[styles.contextWrap, { borderLeftColor: `${colors.primary}40`, marginBottom: 12 }]}>
                  <Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>
                    Groot asked:
                  </Text>
                  <Text style={[styles.contextText, { color: `${colors.mutedForeground}CC` }]}>
                    {memory.context_message}
                  </Text>
                </View>
              ) : null}

              {memory.media_url &&
              (memory.media_url.startsWith("storage:") || memory.media_url.startsWith("media:")) ? (
                <View style={styles.modalMedia}>
                  <MediaPlayer mediaUrl={memory.media_url} messageType={memory.message_type} />
                </View>
              ) : null}
              <Text style={[styles.modalContent, { color: colors.foreground }]}>
                {memory.content || memory.media_description || "No text available"}
              </Text>
            </ScrollView>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 90,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  pageTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  selectedDateRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  loadingWrap: {
    paddingTop: 90,
    alignItems: "center",
  },
  emptyCard: {
    marginTop: 26,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  groupWrap: {
    marginTop: 24,
  },
  groupTitle: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  entryGap: {
    marginBottom: 10,
  },
  entryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entryTime: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  entryText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  // ── Groot context message ──
  contextWrap: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.12)",
  },
  contextLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  contextText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  bottomGap: {
    height: 20,
  },
  calendarCard: {
    marginTop: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calendarTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CAL_GAP,
  },
  dayLabelCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  dayLabelText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
  },
  dayCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
  },
  dayDot: {
    marginTop: 2,
    width: 4,
    height: 4,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 12, 28, 0.68)",
  },
  modalWrap: {
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  modalMeta: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginBottom: 12,
  },
  modalBody: {
    maxHeight: "100%",
  },
  modalMedia: {
    marginBottom: 12,
  },
  modalContent: {
    fontFamily: "Manrope_400Regular",
    ...typography.base,
    lineHeight: 24,
  },
});
