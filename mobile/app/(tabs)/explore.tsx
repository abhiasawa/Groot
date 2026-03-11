import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, X } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useMemories, type MemoriesParams } from "../../lib/api/queries";
import { fonts, typography } from "../../constants/typography";
import { MasonryGrid } from "../../components/feed/masonry-grid";
import { SkeletonGrid } from "../../components/feed/skeleton-grid";
import type { Memory } from "../../../shared/types/api";

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const params: MemoriesParams = useMemo(
    () => ({ q: query || undefined, limit: 100 }),
    [query],
  );

  const { data, isLoading } = useMemories(params);
  const memories = useMemo(() => data?.memories ?? [], [data?.memories]);

  const cancelSearch = useCallback(() => {
    setQuery("");
    setFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleCardPress = useCallback(
    (m: Memory) => {
      router.push({ pathname: "/card-detail", params: { id: m.id } });
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <Text style={styles.title}>Explore</Text>

        {/* Search bar */}
        <View style={[styles.searchBar, focused && styles.searchBarActive]}>
          <Search size={16} color={focused ? "#FFF" : "#999"} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, focused && styles.searchInputActive]}
            placeholder="Search your thoughts..."
            placeholderTextColor={focused ? "rgba(255,255,255,0.5)" : "#BBB"}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            returnKeyType="search"
          />
          {focused && (
            <Pressable onPress={cancelSearch} hitSlop={8}>
              <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Results */}
        {query.length > 0 && (
          <Text style={styles.resultCount}>
            {memories.length} result{memories.length !== 1 ? "s" : ""}
          </Text>
        )}

        <Animated.ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <SkeletonGrid />
          ) : memories.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {query ? "No thoughts found" : "Search your mind"}
              </Text>
              <Text style={styles.emptyBody}>
                {query
                  ? "Try different keywords"
                  : "Type to search through all your journal entries"}
              </Text>
            </Animated.View>
          ) : (
            <MasonryGrid memories={memories} onCardPress={handleCardPress} />
          )}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0EFEB" },
  root: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.bold,
    ...typography.xl,
    color: "#1E1E1E",
    marginTop: 14,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchBarActive: { backgroundColor: "#1E1E1E" },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#1E1E1E",
    padding: 0,
  },
  searchInputActive: { color: "#FFF" },
  resultCount: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: "rgba(30,30,30,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  scroll: { paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    ...typography.lg,
    color: "#1E1E1E",
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#555555",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
