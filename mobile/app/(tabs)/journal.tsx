import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Search, X, BookOpen } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useMemories, type MemoriesParams } from "../../lib/api/queries";
import { getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import type { Memory } from "../../../shared/types/api";

import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";
import { PillBadge } from "../../components/ui/pill-badge";
import { MediaPlayer } from "../../components/ui/media-player";

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

function formatDateHeading(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
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
  const [memoryPages, setMemoryPages] = useState<Memory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

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
      const existingIds = new Set(prev.map((m) => m.id));
      const next = data.memories.filter((m) => !existingIds.has(m.id));
      return next.length > 0 ? [...prev, ...next] : prev;
    });
  }, [data, offset]);

  const sortedMemories = useMemo(
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

  const clearSearch = useCallback(() => {
    setMemoryPages([]);
    setTotalCount(0);
    setSearchQuery("");
    setOffset(0);
  }, []);

  const handleFilterChange = useCallback((key: string) => {
    setMemoryPages([]);
    setTotalCount(0);
    setActiveFilter(key);
    setOffset(0);
  }, []);

  const closeMemoryDetail = useCallback(() => {
    setSelectedMemory(null);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <GradientBackground>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Journal
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.glassSurface,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Search
              size={16}
              color={colors.mutedForeground}
              strokeWidth={1.5}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search memories..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={(text) => {
                setMemoryPages([]);
                setTotalCount(0);
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
        <View style={styles.filterRow}>
          {TYPE_FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <PressScale
                key={filter.key}
                onPress={() => handleFilterChange(filter.key)}
                scale={0.95}
              >
                <PillBadge
                  label={filter.label}
                  color={active ? colors.primary : colors.glassSurface}
                  textColor={
                    active ? colors.primaryForeground : colors.mutedForeground
                  }
                />
              </PressScale>
            );
          })}
        </View>

        {/* Content */}
        {isLoading && offset === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : memoryPages.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <GlassCard delay={100} padding={32}>
              <View style={styles.emptyInner}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.glassSurface },
                  ]}
                >
                  <BookOpen
                    size={32}
                    color={colors.mutedForeground}
                    strokeWidth={1.2}
                  />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: colors.foreground }]}
                >
                  No entries yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {searchQuery
                    ? "No memories match your search. Try different keywords."
                    : "Your journal entries will appear here as you chat with Groot."}
                </Text>
              </View>
            </GlassCard>
          </ScrollView>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.flex}>
            <FlatList
              data={sortedMemories}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.2}
              renderItem={({ item, index }) => {
                const mood = getMoodFromMetadata(item);
                const moodColor = mood
                  ? getMoodColorFromName(mood, colors)
                  : undefined;
                const badge = getTypeBadge(item.message_type);
                const dateLabel = formatDateHeading(item.created_at);
                const previous = index > 0 ? sortedMemories[index - 1] : null;
                const previousDateLabel = previous
                  ? formatDateHeading(previous.created_at)
                  : null;
                const showDateHeading = previousDateLabel !== dateLabel;
                const next = index < sortedMemories.length - 1
                  ? sortedMemories[index + 1]
                  : null;
                const nextDateLabel = next
                  ? formatDateHeading(next.created_at)
                  : null;
                const isLastInDateGroup = nextDateLabel !== dateLabel;

                return (
                  <View
                    style={
                      isLastInDateGroup
                        ? styles.entryRowLastInGroup
                        : styles.entryRow
                    }
                  >
                    {showDateHeading && (
                      <Text
                        style={[styles.dateHeading, { color: colors.mutedForeground }]}
                      >
                        {dateLabel}
                      </Text>
                    )}

                    <PressScale
                      scale={0.985}
                      onPress={() => setSelectedMemory(item)}
                    >
                      <GlassCard
                        accentColor={moodColor}
                        delay={Math.min(index * 40, 300)}
                        padding={16}
                      >
                        {/* Card header row */}
                        <View style={styles.entryHeader}>
                          <View style={styles.entryHeaderLeft}>
                            {mood && (
                              <View
                                style={[
                                  styles.moodDot,
                                  {
                                    backgroundColor: moodColor,
                                    shadowColor: moodColor,
                                  },
                                ]}
                              />
                            )}
                            <Text
                              style={[
                                styles.entryTime,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {formatTime(item.created_at)}
                            </Text>
                          </View>
                          <PillBadge label={badge.label} small />
                        </View>

                        {/* Inline media (image thumbnail / audio indicator) */}
                        {item.media_url && (item.media_url.startsWith("storage:") || item.media_url.startsWith("media:")) && (item.message_type === "image" || item.message_type === "audio") && (
                          <MediaPlayer mediaUrl={item.media_url} messageType={item.message_type} />
                        )}

                        {/* Content — for voice messages, show transcription as main content */}
                        {item.message_type === "audio" && !item.content && item.media_description ? (
                          <Text
                            style={[
                              styles.entryContent,
                              { color: colors.foreground },
                            ]}
                            numberOfLines={3}
                          >
                            {item.media_description}
                          </Text>
                        ) : (
                          <>
                            {(item.content ?? "").length > 0 && (
                              <Text
                                style={[
                                  styles.entryContent,
                                  { color: colors.foreground },
                                ]}
                                numberOfLines={3}
                              >
                                {item.content}
                              </Text>
                            )}
                            {/* Media description (for image captions, etc.) */}
                            {item.media_description && item.message_type !== "audio" && (
                              <Text
                                style={[
                                  styles.mediaDesc,
                                  { color: colors.mutedForeground },
                                ]}
                                numberOfLines={2}
                              >
                                {item.media_description}
                              </Text>
                            )}
                          </>
                        )}
                      </GlassCard>
                    </PressScale>
                  </View>
                );
              }}
              ListFooterComponent={
                isLoading && offset > 0 ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.loadingMore}
                  />
                ) : !hasMore && memoryPages.length > 0 ? (
                  <Text style={[styles.endText, { color: colors.mutedForeground }]}>
                    {totalCount} {totalCount === 1 ? "memory" : "memories"} total
                  </Text>
                ) : null
              }
            />
          </Animated.View>
        )}

        <Modal
          visible={!!selectedMemory}
          transparent
          animationType="fade"
          onRequestClose={closeMemoryDetail}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={closeMemoryDetail}
            />
            <View style={styles.modalCardWrap}>
              <GlassCard padding={18} style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Journal Entry
                  </Text>
                  <PressScale
                    onPress={closeMemoryDetail}
                    scale={0.94}
                    haptic={false}
                    style={styles.modalCloseButton}
                  >
                    <X size={18} color={colors.mutedForeground} strokeWidth={2} />
                  </PressScale>
                </View>

                {selectedMemory ? (
                  <ScrollView
                    style={styles.modalBody}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.modalMetaRow}>
                      <PillBadge
                        label={getTypeBadge(selectedMemory.message_type).label}
                        small
                      />
                      <Text
                        style={[
                          styles.modalMetaText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {new Date(selectedMemory.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    {/* Media player — audio playback or image display */}
                    {selectedMemory.media_url?.startsWith("storage:") && (
                      <View style={{ marginBottom: 14 }}>
                        <MediaPlayer
                          mediaUrl={selectedMemory.media_url}
                          messageType={selectedMemory.message_type}
                        />
                      </View>
                    )}

                    {/* For voice messages: show transcription as the main content */}
                    {selectedMemory.message_type === "audio" && !selectedMemory.content && selectedMemory.media_description ? (
                      <Text style={[styles.modalContent, { color: colors.foreground }]}>
                        {selectedMemory.media_description}
                      </Text>
                    ) : (
                      <>
                        {(selectedMemory.content ?? "").length > 0 && (
                          <Text style={[styles.modalContent, { color: colors.foreground }]}>
                            {selectedMemory.content}
                          </Text>
                        )}

                        {selectedMemory.media_description ? (
                          <View
                            style={[
                              styles.modalMediaBlock,
                              {
                                backgroundColor: colors.glassSurface,
                                borderColor: colors.glassBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.modalMediaLabel,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {selectedMemory.message_type === "image" ? "Description" : "Transcription"}
                            </Text>
                            <Text
                              style={[
                                styles.modalMediaText,
                                { color: colors.foreground },
                              ]}
                            >
                              {selectedMemory.media_description}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    )}
                  </ScrollView>
                ) : null}
              </GlassCard>
            </View>
          </View>
        </Modal>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    ...typography.title,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  dateHeading: {
    fontFamily: "Inter_600SemiBold",
    ...typography.xs,
    letterSpacing: 0.4,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  entryRow: {
    marginBottom: 16,
  },
  entryRowLastInGroup: {
    marginBottom: 22,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // Glow effect on Android via elevation is limited,
    // but the shadowColor on iOS adds a soft halo
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  entryTime: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },
  entryContent: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  mediaDesc: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    fontStyle: "italic",
    marginTop: 8,
  },
  loadingMore: {
    paddingVertical: 20,
  },
  endText: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    textAlign: "center",
    paddingVertical: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 10, 16, 0.66)",
  },
  modalCardWrap: {
    maxHeight: "76%",
  },
  modalCard: {
    borderRadius: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    ...typography.lg,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    maxHeight: "100%",
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  modalMetaText: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },
  modalContent: {
    fontFamily: "Inter_400Regular",
    ...typography.base,
    lineHeight: 24,
  },
  modalMediaBlock: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  modalMediaLabel: {
    fontFamily: "Inter_500Medium",
    ...typography.xs,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  modalMediaText: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    lineHeight: 20,
  },
});
