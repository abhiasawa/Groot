import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

  const s = styles(colors);

  const totalFacts = data
    ? data.facts.static.length +
      data.facts.dynamic.length +
      data.facts.preference.length +
      data.facts.goal.length
    : 0;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : totalFacts === 0 ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <User size={32} color={colors.mutedForeground} strokeWidth={1} />
          <Text style={s.emptyTitle}>Profile is empty</Text>
          <Text style={s.emptySubtitle}>
            Groot builds your profile from conversations. Share about yourself
            -- your interests, goals, and preferences -- and they will appear
            here.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {categories.map((cat) => {
            const facts = data?.facts[cat.key] ?? [];
            if (facts.length === 0) return null;

            return (
              <View key={cat.key} style={s.categorySection}>
                <View style={s.categoryHeader}>
                  {cat.icon}
                  <View>
                    <Text style={s.categoryLabel}>{cat.label}</Text>
                    <Text style={s.categoryDesc}>{cat.description}</Text>
                  </View>
                </View>

                {facts.map((fact: ProfileFact) => (
                  <View key={fact.id} style={s.factRow}>
                    <View style={s.factContent}>
                      <Text style={s.factKey}>{fact.key}</Text>
                      <Text style={s.factValue}>{fact.value}</Text>
                      {fact.lastMentioned && (
                        <Text style={s.factMeta}>
                          Last mentioned{" "}
                          {new Date(fact.lastMentioned).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleDelete(fact)}
                      hitSlop={12}
                      style={s.deleteBtn}
                    >
                      <Trash2
                        size={16}
                        color={colors.destructive}
                        strokeWidth={1.5}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    categorySection: {
      marginBottom: 28,
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    categoryLabel: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
    },
    categoryDesc: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    factRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    factContent: {
      flex: 1,
    },
    factKey: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    factValue: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },
    factMeta: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      marginTop: 4,
    },
    deleteBtn: {
      padding: 8,
      marginLeft: 8,
    },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
