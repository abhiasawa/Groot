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
import { Search, X, Settings, Feather, Mic, Camera } from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import { useMemories, type MemoriesParams } from "../lib/api/queries";
import { typography } from "../constants/typography";
import { MasonryGrid } from "../components/feed/masonry-grid";
import { NotoMascot } from "../components/ui/noto-mascot";
import { ComposeModal } from "../components/ui/compose-modal";
import type { Memory } from "../../shared/types/api";

const { width: SCREEN_W } = Dimensions.get("window");

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function FeedScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [composeMode, setComposeMode] = useState<"text" | "voice" | "image" | null>(null);
  const [fabExpanded, setFabExpanded] = useState(false);

  // FAB bounce animation
  const fabBounce = useSharedValue(1);
  const fabBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabBounce.value }],
  }));

  // Expanded menu animation
  const menuScale = useSharedValue(0);
  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuScale.value,
  }));

  const bounceFab = useCallback(() => {
    // Bouncy squish effect
    fabBounce.value = withSequence(
      withSpring(0.8, { damping: 8, stiffness: 400 }),
      withSpring(1.1, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 250 }),
    );
  }, [fabBounce]);

  const toggleFab = useCallback(() => {
    bounceFab();
    if (fabExpanded) {
      menuScale.value = withTiming(0, { duration: 150 });
      setFabExpanded(false);
    } else {
      menuScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      setFabExpanded(true);
    }
  }, [fabExpanded, menuScale, bounceFab]);

  const openCompose = useCallback(
    (mode: "text" | "voice" | "image") => {
      menuScale.value = withTiming(0, { duration: 100 });
      setFabExpanded(false);
      setComposeMode(mode);
      setComposeVisible(true);
    },
    [menuScale],
  );

  const params: MemoriesParams = useMemo(
    () => ({ q: query || undefined, limit: 100 }),
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

  const handleCardPress = useCallback(
    (m: Memory) => {
      router.push({ pathname: "/card-detail", params: { id: m.id } });
    },
    [router],
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
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor="#1A1A1A"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appName}>noto</Text>
              <Text style={styles.greeting}>{getGreeting()}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.settingsBtn}
              hitSlop={8}
            >
              <Settings size={18} color="#999" strokeWidth={1.5} />
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
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#1A1A1A" size="large" />
            </View>
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
            <>
              {memories.length > 0 && (
                <Text style={styles.sectionLabel}>
                  {memories.length} thought{memories.length !== 1 ? "s" : ""}
                </Text>
              )}
              <MasonryGrid memories={memories} onCardPress={handleCardPress} />
            </>
          )}

          <View style={styles.bottomGap} />
        </ScrollView>

        {/* Expanded FAB menu overlay */}
        {fabExpanded && (
          <Pressable style={styles.fabOverlay} onPress={toggleFab}>
            <Animated.View style={[styles.fabMenu, menuStyle]}>
              <Pressable style={styles.fabOption} onPress={() => openCompose("text")}>
                <View style={[styles.fabOptionCircle, { backgroundColor: "#E8F0FE" }]}>
                  <Feather size={22} color="#5B8BD4" strokeWidth={2} />
                </View>
                <Text style={styles.fabOptionLabel}>Write</Text>
              </Pressable>
              <Pressable style={styles.fabOption} onPress={() => openCompose("voice")}>
                <View style={[styles.fabOptionCircle, { backgroundColor: "#FDE8EE" }]}>
                  <Mic size={22} color="#D4607A" strokeWidth={2} />
                </View>
                <Text style={styles.fabOptionLabel}>Voice</Text>
              </Pressable>
              <Pressable style={styles.fabOption} onPress={() => openCompose("image")}>
                <View style={[styles.fabOptionCircle, { backgroundColor: "#F0ECF9" }]}>
                  <Camera size={22} color="#8B78B8" strokeWidth={2} />
                </View>
                <Text style={styles.fabOptionLabel}>Photo</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        )}

        {/* FAB — animated mascot cloud */}
        {!searchFocused && (
          <Animated.View style={[styles.fabWrap, fabBounceStyle]}>
            <Pressable onPress={toggleFab} style={styles.fab}>
              {fabExpanded ? (
                <View style={styles.fabCloseCircle}>
                  <X size={24} color="#FFF" strokeWidth={2.2} />
                </View>
              ) : (
                <NotoMascot size={85} />
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* Compose modal */}
        <ComposeModal
          visible={composeVisible}
          initialMode={composeMode}
          onClose={() => {
            setComposeVisible(false);
            setComposeMode(null);
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
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
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

  // Section
  sectionLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#C0BDB8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },

  // Loading
  loadingWrap: {
    paddingTop: 100,
    alignItems: "center",
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

  // FAB overlay
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(254,254,254,0.88)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 120,
  },
  fabMenu: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 20,
  },
  fabOption: {
    alignItems: "center",
    gap: 8,
  },
  fabOptionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  fabOptionLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#666",
  },

  // FAB — the mascot IS the button
  fabWrap: {
    position: "absolute",
    bottom: 20,
    left: SCREEN_W / 2 - 45,
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    // Soft shadow behind the cloud
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  fabCloseCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomGap: {
    height: 30,
  },
});
