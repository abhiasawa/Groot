import React, { useState, useCallback, useMemo } from "react";
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
import { Camera, Plus, Search, X } from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import {
  useMemories,
  useCurrentUser,
  type MemoriesParams,
} from "../lib/api/queries";
import { fonts, typography } from "../constants/typography";
import { MasonryGrid } from "../components/feed/masonry-grid";
import { SkeletonGrid } from "../components/feed/skeleton-grid";
import { NotoMascot } from "../components/ui/noto-mascot";
import { ComposeModal } from "../components/ui/compose-modal";
import type { Memory } from "../../shared/types/api";

export default function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [justCapturedId, setJustCapturedId] = useState<string | null>(null);
  const { data: userData } = useCurrentUser();

  // FAB bounce animation
  const fabBounce = useSharedValue(1);
  const fabBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabBounce.value }],
  }));

  const handleFabPress = useCallback(() => {
    fabBounce.value = withSequence(
      withSpring(0.82, { damping: 8, stiffness: 400 }),
      withSpring(1.08, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 250 }),
    );
    setTimeout(() => setComposeVisible(true), 180);
  }, [fabBounce]);

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
  }, [refetch, queryClient]);

  const cancelSearch = useCallback(() => {
    setQuery("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleCardPress = useCallback(
    (m: Memory) => {
      router.push({ pathname: "/card-detail", params: { id: m.id } });
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

  const handleComposeClose = useCallback(() => {
    setComposeVisible(false);
    // Force invalidate and refetch to show new entry
    queryClient.invalidateQueries({ queryKey: ["memories"] });
    refetch().then((result) => {
      const newMemories = result.data?.memories;
      if (newMemories?.length) {
        setJustCapturedId(newMemories[0].id);
        setTimeout(() => setJustCapturedId(null), 1200);
      }
    });
  }, [refetch, queryClient]);

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
              colors={["#818CF8"]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appName}>noto</Text>
              <Text style={styles.greeting}>
                {memories.length} thought{memories.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.avatarBtn}
              hitSlop={8}
            >
              {userData?.user?.avatar_url ? (
                <Animated.Image
                  source={{ uri: userData.user.avatar_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(userData?.user?.display_name || "?")[0].toUpperCase()}
                </Text>
              )}
            </Pressable>
          </View>

          <Animated.View style={fabBounceStyle}>
            <Pressable onPress={handleFabPress} style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Primary action</Text>
                <Text style={styles.heroTitle}>Capture a new thought</Text>
                <Text style={styles.heroSubtitle}>
                  Voice note, quick thought, or image first. Your journal comes
                  after the capture.
                </Text>
                <View style={styles.heroButton}>
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.heroButtonText}>Open the cloud</Text>
                </View>
              </View>

              <View style={styles.heroMascotWrap}>
                <NotoMascot size={170} compact />
                <View style={styles.heroBadge}>
                  <Camera size={12} color="#1E1E1E" strokeWidth={2} />
                  <Text style={styles.heroBadgeText}>
                    Thoughts, notes, images
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {/* Search bar */}
          <View
            style={[styles.searchBar, searchFocused && styles.searchBarActive]}
          >
            <Search
              size={16}
              color={searchFocused ? "#FFF" : "#BBB"}
              strokeWidth={2}
            />
            <TextInput
              style={[
                styles.searchInput,
                searchFocused && styles.searchInputActive,
              ]}
              placeholder="Search your mind..."
              placeholderTextColor={
                searchFocused ? "rgba(255,255,255,0.5)" : "#CCC"
              }
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

          {/* Results count */}
          {searchFocused && query.length > 0 && (
            <Text style={styles.resultsCount}>
              {memories.length} thought{memories.length !== 1 ? "s" : ""}
            </Text>
          )}

          {!searchFocused && (
            <Text style={styles.sectionLabel}>Recent thoughts</Text>
          )}

          {/* Content */}
          {isLoading ? (
            <SkeletonGrid />
          ) : memories.length === 0 ? (
            <Animated.View
              entering={FadeInDown.duration(500)}
              style={styles.emptyState}
            >
              <NotoMascot size={220} />
              <Text style={styles.emptyTitle}>
                {query ? "No thoughts found" : "Your mind is clear"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query
                  ? "Try a different search"
                  : "Tap the cloud to capture your first thought"}
              </Text>
            </Animated.View>
          ) : (
            <MasonryGrid
              memories={memories}
              onCardPress={handleCardPress}
              onDelete={handleDelete}
              justCapturedId={justCapturedId}
            />
          )}

          <View style={styles.bottomGap} />
        </ScrollView>

        {/* Compose modal */}
        <ComposeModal visible={composeVisible} onClose={handleComposeClose} />
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
    paddingTop: 14,
    paddingBottom: 130,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: "#1A1A1A",
    letterSpacing: -1,
  },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#C0BDB8",
    marginTop: 2,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8E6E3",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    overflow: "hidden",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#999",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EFED",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
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
  resultsCount: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#C0BDB8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#C0BDB8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  heroCopy: {
    maxWidth: "62%",
    zIndex: 2,
  },
  heroEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#A6A29B",
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 29,
    lineHeight: 31,
    letterSpacing: -1.1,
    color: "#1A1A1A",
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#6F6A63",
    marginTop: 10,
  },
  heroButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E1E1E",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  heroMascotWrap: {
    position: "absolute",
    right: -10,
    bottom: 8,
    alignItems: "center",
  },
  heroBadge: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#1E1E1E",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 50,
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

  bottomGap: {
    height: 12,
  },
});
