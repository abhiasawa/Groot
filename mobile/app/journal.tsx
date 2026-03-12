import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Settings, X } from "lucide-react-native";

import { useMemories, type MemoriesParams } from "../lib/api/queries";
import { fonts, typography } from "../constants/typography";
import { MasonryGrid } from "../components/feed/masonry-grid";
import { SkeletonGrid } from "../components/feed/skeleton-grid";
import { NotoMascot } from "../components/ui/noto-mascot";
import type { Memory } from "../../shared/types/api";

export default function JournalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const params: MemoriesParams = useMemo(
    () => ({ q: query || undefined, limit: 100 }),
    [query],
  );

  const { data, isLoading, refetch } = useMemories(params);
  const memories = useMemo(() => data?.memories ?? [], [data?.memories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ["memories"] });
    refetch().finally(() => setRefreshing(false));
  }, [queryClient, refetch]);

  const cancelSearch = useCallback(() => {
    setQuery("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleCardPress = useCallback(
    (memory: Memory) => {
      router.push({ pathname: "/card-detail", params: { id: memory.id } });
    },
    [router],
  );

  const handleDelete = useCallback(
    (memoryId: string) => {
      import("../lib/api/client").then(({ apiFetch }) => {
        apiFetch(`/api/memories/${memoryId}`, { method: "DELETE" }).catch(
          () => {},
        );
      });
      refetch();
    },
    [refetch],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C0BDB8"
              colors={["#FFBB2C"]}
            />
          }
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.topIconButton}
            >
              <ArrowLeft size={18} color="#1A1A1A" strokeWidth={2.2} />
            </Pressable>
            <View style={styles.topCopy}>
              <Text style={styles.topTitle}>Journal</Text>
              <Text style={styles.topSubtitle}>
                Search and revisit what you have already captured.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.topIconButton}
            >
              <Settings size={18} color="#1A1A1A" strokeWidth={2.2} />
            </Pressable>
          </View>

          <View
            style={[styles.searchBar, searchFocused && styles.searchBarActive]}
          >
            <Search
              size={16}
              color={searchFocused ? "#FFF" : "#A9A39A"}
              strokeWidth={2}
            />
            <TextInput
              style={[
                styles.searchInput,
                searchFocused && styles.searchInputActive,
              ]}
              placeholder="Search your past thoughts..."
              placeholderTextColor={
                searchFocused ? "rgba(255,255,255,0.5)" : "#B6B0A6"
              }
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              returnKeyType="search"
            />
            {searchFocused && (
              <Pressable onPress={cancelSearch} hitSlop={8}>
                <X size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              </Pressable>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>
              {query ? "Search results" : "Past captures"}
            </Text>
            <Text style={styles.metaCount}>
              {data?.total ?? memories.length} thought
              {(data?.total ?? memories.length) === 1 ? "" : "s"}
            </Text>
          </View>

          {isLoading ? (
            <SkeletonGrid />
          ) : memories.length === 0 ? (
            <View style={styles.emptyState}>
              <NotoMascot size={210} compact />
              <Text style={styles.emptyTitle}>
                {query ? "No thoughts found" : "Nothing in the journal yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query
                  ? "Try a different phrase or clear the search."
                  : "Capture something on the first page, then it will appear here."}
              </Text>
            </View>
          ) : (
            <MasonryGrid
              memories={memories}
              onCardPress={handleCardPress}
              onDelete={handleDelete}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FEFEFE",
  },
  root: {
    flex: 1,
    backgroundColor: "#FEFEFE",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: {
    flex: 1,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: "#1A1A1A",
    letterSpacing: -0.9,
  },
  topSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "#8F887E",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EFED",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchBarActive: {
    backgroundColor: "#1A1A1A",
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#333",
    padding: 0,
  },
  searchInputActive: {
    color: "#FFF",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metaLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#A6A29B",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  metaCount: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#8F887E",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 52,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    ...typography.lg,
    color: "#333",
    marginTop: 20,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
