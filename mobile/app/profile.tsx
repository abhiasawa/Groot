import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ArrowLeft,
  User,
  Trash2,
  Pin,
  Zap,
  Heart,
  Target,
} from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useProfile } from "../lib/api/queries";
import { useDeleteProfileFact } from "../lib/api/mutations";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import type { ProfileFact, ProfileData } from "../../shared/types/api";

// ── Category config ──────────────────────────

interface CategoryConfig {
  key: keyof ProfileData["facts"];
  label: string;
  icon: React.ReactNode;
  description: string;
}

function useCategoryConfigs(): CategoryConfig[] {
  const { colors } = useTheme();
  return [
    {
      key: "static",
      label: "About You",
      icon: <Pin size={16} color={colors.chart1} strokeWidth={1.5} />,
      description: "Core facts that rarely change",
    },
    {
      key: "dynamic",
      label: "Current State",
      icon: <Zap size={16} color={colors.chart3} strokeWidth={1.5} />,
      description: "Things that evolve over time",
    },
    {
      key: "preference",
      label: "Preferences",
      icon: <Heart size={16} color={colors.chart4} strokeWidth={1.5} />,
      description: "Your likes, dislikes, and tastes",
    },
    {
      key: "goal",
      label: "Goals",
      icon: <Target size={16} color={colors.chart2} strokeWidth={1.5} />,
      description: "What you are working toward",
    },
  ];
}

// ── Component ────────────────────────────────

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useProfile();
  const deleteFact = useDeleteProfileFact();

  const categories = useCategoryConfigs();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = useCallback(
    (fact: ProfileFact) => {
      Alert.alert(
        "Delete fact",
        `Remove "${fact.key}: ${fact.value}" from your profile?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteFact.mutate({ factId: fact.id }),
          },
        ],
      );
    },
    [deleteFact],
  );

  const totalFacts = data
    ? data.facts.static.length +
      data.facts.dynamic.length +
      data.facts.preference.length +
      data.facts.goal.length
    : 0;

  // ── Loading ──────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  // ── Empty ────────────────────────────────

  if (totalFacts === 0) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          {/* Header */}
          <View style={styles.header}>
            <PressScale onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
            </PressScale>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <Animated.View
              entering={FadeIn.delay(100).duration(600)}
              style={[styles.emptyIconWrap, { backgroundColor: colors.glassSurface }]}
            >
              <User size={40} color={colors.mutedForeground} strokeWidth={1.2} />
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(250).duration(600)}
              style={[styles.emptyTitle, { color: colors.foreground }]}
            >
              Profile is empty
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(400).duration(600)}
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Groot builds your profile from conversations. Share about yourself
              -- your interests, goals, and preferences -- and they will appear
              here.
            </Animated.Text>
          </ScrollView>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  // ── Main render ──────────────────────────

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        {/* Header */}
        <View style={styles.header}>
          <PressScale onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
          </PressScale>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.View
            entering={FadeIn.duration(700)}
            style={styles.titleSection}
          >
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Profile
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              What Groot knows about you
            </Text>
          </Animated.View>

          {/* Categories */}
          {categories.map((cat, catIndex) => {
            const facts = data?.facts[cat.key] ?? [];
            if (facts.length === 0) return null;

            return (
              <View key={cat.key} style={styles.categorySection}>
                {/* Category icon + label row */}
                <View style={styles.categoryIconRow}>
                  <View
                    style={[
                      styles.categoryIconWrap,
                      { backgroundColor: colors.glassSurface },
                    ]}
                  >
                    {cat.icon}
                  </View>
                  <View>
                    <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.categoryDesc, { color: colors.mutedForeground }]}>
                      {cat.description}
                    </Text>
                  </View>
                </View>

                <SectionHeader title={cat.label} />

                {/* Fact cards */}
                {facts.map((fact: ProfileFact, factIndex: number) => (
                  <GlassCard
                    key={fact.id}
                    delay={catIndex * 100 + factIndex * 60}
                    padding={14}
                    style={styles.factCardSpacing}
                  >
                    <View style={styles.factRow}>
                      <View style={styles.factContent}>
                        <Text
                          style={[
                            styles.factKey,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {fact.key}
                        </Text>
                        <Text style={[styles.factValue, { color: colors.foreground }]}>
                          {fact.value}
                        </Text>
                        {fact.lastMentioned && (
                          <Text style={[styles.factMeta, { color: colors.mutedForeground }]}>
                            Last mentioned{" "}
                            {new Date(fact.lastMentioned).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </Text>
                        )}
                      </View>
                      <PressScale
                        onPress={() => handleDelete(fact)}
                        style={styles.deleteBtn}
                      >
                        <Trash2
                          size={16}
                          color={colors.destructive}
                          strokeWidth={1.5}
                        />
                      </PressScale>
                    </View>
                  </GlassCard>
                ))}
              </View>
            );
          })}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  pageTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.hero,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  categorySection: {
    marginBottom: 28,
  },
  categoryIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  categoryDesc: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  factCardSpacing: {
    marginBottom: 8,
  },
  factRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  factContent: {
    flex: 1,
  },
  factKey: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  factValue: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  factMeta: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.base,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 20,
  },
});
