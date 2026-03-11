import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, X } from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";

import { useMemories, useCurrentUser, type MemoriesParams } from "../lib/api/queries";
import { typography } from "../constants/typography";
import { MasonryGrid } from "../components/feed/masonry-grid";
import { SkeletonGrid } from "../components/feed/skeleton-grid";
import { NotoMascot } from "../components/ui/noto-mascot";
import { ComposeModal } from "../components/ui/compose-modal";
import type { Memory } from "../../shared/types/api";

const { width: SCREEN_W } = Dimensions.get("window");

export default function FeedScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [justCapturedId, setJustCapturedId] = useState<string | null>(null);
  const { data: userData } = useCurrentUser();
  const isRefreshingRef = useRef(false);

  // FAB bounce animation
  const fabBounce = useSharedValue(1);
  const fabBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabBounce.value }],
  }));

  // Custom pull-to-refresh shared values
  const scrollY = useSharedValue(0);
  const pullProgress = useSharedValue(0);
  const PULL_THRESHOLD = 100;

  const handleFabPress = useCallback(() => {
    // Bouncy squish then open compose
    fabBounce.value = withSequence(
      withSpring(0.82, { damping: 8, stiffness: 400 }),
      withSpring(1.08, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 250 }),
    );
    // Open compose slightly delayed so the bounce is visible
    setTimeout(() => setComposeVisible(true), 180);
  }, [fabBounce]);

  const params: MemoriesParams = useMemo(
    () => ({ q: query || undefined, limit: 100 }),
    [query],
  );

  const { data, isLoading, refetch } = useMemories(params);
  const memories = useMemo(() => data?.memories ?? [], [data?.memories]);

  const triggerRefresh = useCallback(() => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsPullRefreshing(true);
    refetch().finally(() => {
      setIsPullRefreshing(false);
      isRefreshingRef.current = false;
      pullProgress.value = withTiming(0, { duration: 300 });
    });
  }, [refetch, pullProgress]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      if (event.contentOffset.y < 0) {
        pullProgress.value = Math.min(Math.abs(event.contentOffset.y) / PULL_THRESHOLD, 1.5);
      }
    },
    onEndDrag: (event) => {
      if (event.contentOffset.y < -PULL_THRESHOLD && !isRefreshingRef.current) {
        runOnJS(triggerRefresh)();
      } else if (!isRefreshingRef.current) {
        pullProgress.value = withTiming(0, { duration: 200 });
      }
    },
  });

  const pullMascotStyle = useAnimatedStyle(() => {
    const ty = interpolate(
      pullProgress.value,
      [0, 0.3, 1, 1.5],
      [-60, -30, 10, 20],
      Extrapolation.CLAMP,
    );
    const s = interpolate(
      pullProgress.value,
      [0, 0.5, 1, 1.5],
      [0.3, 0.7, 1, 1.1],
      Extrapolation.CLAMP,
    );
    const o = interpolate(
      pullProgress.value,
      [0, 0.2, 0.5, 1],
      [0, 0.3, 0.8, 1],
      Extrapolation.CLAMP,
    );
    const r = interpolate(
      pullProgress.value,
      [0, 1, 1.5],
      [0, 0, 15],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: ty }, { scale: s }, { rotate: `${r}deg` }],
      opacity: o,
    };
  });

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
      // Optimistic refetch after delete attempt
      import("../lib/api/client").then(({ apiFetch }) => {
        apiFetch(`/api/memories/${memoryId}`, { method: "DELETE" }).catch(() => {
          // Backend may not support delete yet — that's fine
        });
      });
      refetch();
    },
    [refetch],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        {/* Pull-to-refresh mascot indicator */}
        <Animated.View style={[styles.pullMascot, pullMascotStyle]}>
          <NotoMascot size={60} compact />
          {isPullRefreshing && (
            <Text style={styles.refreshText}>Refreshing...</Text>
          )}
        </Animated.View>

        <Animated.ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          bounces={true}
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

          {/* Search bar */}
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

          {/* Results count */}
          {searchFocused && query.length > 0 && (
            <Text style={styles.resultsCount}>
              {memories.length} thought{memories.length !== 1 ? "s" : ""}
            </Text>
          )}

          {/* Content */}
          {isLoading ? (
            <SkeletonGrid />
          ) : memories.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
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
            <MasonryGrid memories={memories} onCardPress={handleCardPress} onDelete={handleDelete} justCapturedId={justCapturedId} />
          )}

          <View style={styles.bottomGap} />
        </Animated.ScrollView>

        {/* FAB — animated mascot, tap to capture */}
        {!searchFocused && (
          <Animated.View style={[styles.fabWrap, fabBounceStyle]}>
            <Pressable onPress={handleFabPress} style={styles.fab}>
              <NotoMascot size={110} compact />
            </Pressable>
          </Animated.View>
        )}

        {/* Compose modal */}
        <ComposeModal
          visible={composeVisible}
          onClose={() => {
            setComposeVisible(false);
            refetch().then((result) => {
              const newMemories = result.data?.memories;
              if (newMemories?.length) {
                setJustCapturedId(newMemories[0].id);
                setTimeout(() => setJustCapturedId(null), 1200);
              }
            });
          }}
        />
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
    fontFamily: "Sora_700Bold",
    fontSize: 30,
    color: "#1A1A1A",
    letterSpacing: -1,
  },
  greeting: {
    fontFamily: "Manrope_400Regular",
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
    fontFamily: "Sora_700Bold",
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
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: "#333",
    padding: 0,
  },
  searchInputActive: {
    color: "#FFF",
  },
  resultsCount: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    color: "#C0BDB8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Pull-to-refresh mascot (positioned above scroll)
  pullMascot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    paddingTop: 4,
  },
  refreshText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    color: "#C0BDB8",
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 50,
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
    paddingHorizontal: 20,
  },

  // FAB — the mascot IS the button
  fabWrap: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    left: SCREEN_W / 2 - 55,
  },
  fab: {
    width: 110,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    // Lavender glow behind the cloud
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },

  bottomGap: {
    height: 30,
  },
});
