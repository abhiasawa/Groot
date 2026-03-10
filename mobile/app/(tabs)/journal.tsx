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
  Dimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, X, Settings } from "lucide-react-native";

import { useMemories, type MemoriesParams } from "../../lib/api/queries";
import { typography } from "../../constants/typography";
import { MasonryGrid } from "../../components/feed/masonry-grid";
import { NotoMascot } from "../../components/ui/noto-mascot";
import { ComposeModal } from "../../components/ui/compose-modal";
import type { Memory } from "../../../shared/types/api";

const { width: SCREEN_W } = Dimensions.get("window");

export default function FeedScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  void selectedMemory; // Card detail view — TODO

  const params: MemoriesParams = useMemo(
    () => ({
      q: query || undefined,
      limit: 100,
    }),
    [query],
  );

  const { data, isLoading, refetch } = useMemories(params);
  const memories = useMemo(() => data?.memories ?? [], [data?.memories]);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const cancelSearch = useCallback(() => {
    setQuery("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor="#111"
            />
          }
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appName}>noto</Text>
              <Text style={styles.thoughtCount}>
                {memories.length} thought{memories.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.avatarBtn}
              hitSlop={8}
            >
              <Settings size={20} color="#666" strokeWidth={1.6} />
            </Pressable>
          </View>

          {/* ── Search bar ── */}
          <View style={[styles.searchBar, searchFocused && styles.searchBarActive]}>
            <Search size={16} color={searchFocused ? "#FFF" : "#BBB"} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, searchFocused && styles.searchInputActive]}
              placeholder="Search your mind..."
              placeholderTextColor={searchFocused ? "rgba(255,255,255,0.5)" : "#CCC"}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              returnKeyType="search"
            />
            {searchFocused && (
              <Pressable onPress={cancelSearch} hitSlop={8}>
                <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {/* ── Results count (search mode) ── */}
          {searchFocused && query.length > 0 && (
            <Text style={styles.resultsCount}>
              {memories.length} thought{memories.length !== 1 ? "s" : ""}
            </Text>
          )}

          {/* ── Content ── */}
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#111" size="large" />
            </View>
          ) : memories.length === 0 ? (
            <View style={styles.emptyState}>
              <NotoMascot size={200} />
              <Text style={styles.emptyTitle}>
                {query ? "No thoughts found" : "Your mind is clear"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query
                  ? "Try a different search"
                  : "Tap + to capture your first thought"}
              </Text>
            </View>
          ) : (
            <MasonryGrid
              memories={memories}
              onCardPress={(m) => setSelectedMemory(m)}
            />
          )}

          <View style={styles.bottomGap} />
        </ScrollView>

        {/* ── FAB ── */}
        {!searchFocused && (
          <Pressable
            onPress={() => setComposeVisible(true)}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        )}

        {/* ── Compose modal ── */}
        <ComposeModal
          visible={composeVisible}
          onClose={() => {
            setComposeVisible(false);
            // Refresh feed after capture
            refetch();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  root: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  appName: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    color: "#111",
    letterSpacing: -0.8,
  },
  thoughtCount: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    color: "#BBB",
    marginTop: 2,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  // ── Search ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchBarActive: {
    backgroundColor: "#111",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: "#333",
    padding: 0,
  },
  searchInputActive: {
    color: "#FFF",
  },
  resultsCount: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#BBB",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // ── Loading ──
  loadingWrap: {
    paddingTop: 100,
    alignItems: "center",
  },

  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
    color: "#333",
    marginTop: 20,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    bottom: 24,
    left: SCREEN_W / 2 - 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  fabIcon: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 30,
  },

  bottomGap: {
    height: 20,
  },
});
