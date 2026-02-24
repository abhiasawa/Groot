import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Bell,
  BookOpen,
  Calendar,
  Clock,
  LogOut,
  Mail,
} from "lucide-react-native";

import { useAuth } from "../lib/auth/provider";
import { useTheme } from "../lib/theme/provider";
import { useSettings } from "../lib/api/queries";
import { useUpdatePreference } from "../lib/api/mutations";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";

// ── Notification preference config ───────────

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

function useNotificationPrefs(): NotificationPref[] {
  const { colors } = useTheme();
  return [
    {
      key: "evening_journal",
      label: "Evening Reflection",
      description: "A daily prompt to reflect on your day",
      icon: <BookOpen size={18} color={colors.chart1} strokeWidth={1.5} />,
    },
    {
      key: "morning_checkin",
      label: "Daily Check-in",
      description: "Morning check-in to start your day",
      icon: <Calendar size={18} color={colors.chart2} strokeWidth={1.5} />,
    },
    {
      key: "weekly_report",
      label: "Weekly Report",
      description: "Summary of your week with insights",
      icon: <Bell size={18} color={colors.chart3} strokeWidth={1.5} />,
    },
    {
      key: "feature_tips",
      label: "Feature Tips",
      description: "Tips on how to get more from Groot",
      icon: <Clock size={18} color={colors.chart4} strokeWidth={1.5} />,
    },
  ];
}

// ── Component ────────────────────────────────

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useSettings();
  const updatePref = useUpdatePreference();

  const notificationPrefs = useNotificationPrefs();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTogglePref = useCallback(
    (key: string, value: boolean) => {
      updatePref.mutate({ key, value });
    },
    [updatePref],
  );

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
              Settings
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              Customize your experience
            </Text>
          </Animated.View>

          {/* ── Appearance section ────────── */}
          <View style={styles.section}>
            <SectionHeader title="Appearance" />
            <View style={styles.themeRow}>
              <ThemeOption
                label="Light"
                icon={
                  <Sun
                    size={18}
                    color={
                      mode === "light"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                    strokeWidth={1.5}
                  />
                }
                active={mode === "light"}
                onPress={() => setMode("light")}
                colors={colors}
              />
              <ThemeOption
                label="Dark"
                icon={
                  <Moon
                    size={18}
                    color={
                      mode === "dark"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                    strokeWidth={1.5}
                  />
                }
                active={mode === "dark"}
                onPress={() => setMode("dark")}
                colors={colors}
              />
              <ThemeOption
                label="System"
                icon={
                  <Monitor
                    size={18}
                    color={
                      mode === "system"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                    strokeWidth={1.5}
                  />
                }
                active={mode === "system"}
                onPress={() => setMode("system")}
                colors={colors}
              />
            </View>
          </View>

          {/* ── Notifications section ────── */}
          <View style={styles.section}>
            <SectionHeader title="Notifications" />
            <GlassCard delay={200} padding={0}>
              {notificationPrefs.map((pref, index) => {
                const enabled = data?.preferences?.[pref.key] ?? false;
                const isLast = index === notificationPrefs.length - 1;

                return (
                  <View
                    key={pref.key}
                    style={[
                      styles.notifRow,
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.glassBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.notifIconWrap,
                        { backgroundColor: colors.glassSurface },
                      ]}
                    >
                      {pref.icon}
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifLabel, { color: colors.foreground }]}>
                        {pref.label}
                      </Text>
                      <Text style={[styles.notifDesc, { color: colors.mutedForeground }]}>
                        {pref.description}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={(value) =>
                        handleTogglePref(pref.key, value)
                      }
                      trackColor={{
                        false: colors.input,
                        true: colors.primary,
                      }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}
            </GlassCard>
          </View>

          {/* ── Account section ──────────── */}
          <View style={styles.section}>
            <SectionHeader title="Account" />
            <GlassCard delay={300} padding={0}>
              <View
                style={[
                  styles.notifRow,
                  {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.glassBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.notifIconWrap,
                    { backgroundColor: colors.glassSurface },
                  ]}
                >
                  <Mail size={18} color={colors.primary} strokeWidth={1.5} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifLabel, { color: colors.foreground }]}>
                    Account
                  </Text>
                  <Text style={[styles.notifDesc, { color: colors.mutedForeground }]}>
                    Signed in via WhatsApp
                  </Text>
                </View>
              </View>
              <PressScale onPress={signOut}>
                <View style={styles.signOutRow}>
                  <View
                    style={[
                      styles.notifIconWrap,
                      { backgroundColor: colors.destructive + "15" },
                    ]}
                  >
                    <LogOut size={18} color={colors.destructive} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.signOutLabel, { color: colors.destructive }]}>
                    Sign Out
                  </Text>
                </View>
              </PressScale>
            </GlassCard>
          </View>

          {/* Version */}
          <Animated.Text
            entering={FadeIn.delay(400).duration(600)}
            style={[styles.versionText, { color: colors.mutedForeground }]}
          >
            Groot Mobile v1.0.0
          </Animated.Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Theme option ─────────────────────────────

function ThemeOption({
  label,
  icon,
  active,
  onPress,
  colors,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <PressScale onPress={onPress} style={styles.themeOptionWrap}>
      <GlassCard
        padding={14}
        accentColor={active ? colors.primary : undefined}
        delay={100}
        style={
          active
            ? { borderColor: colors.primary, borderWidth: 1.5 }
            : undefined
        }
      >
        <View style={styles.themeOptionContent}>
          {icon}
          <Text
            style={[
              styles.themeOptionLabel,
              {
                fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                color: active ? colors.primary : colors.mutedForeground,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </GlassCard>
    </PressScale>
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
    fontFamily: "Inter_700Bold",
    ...typography.hero,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
  },
  section: {
    marginBottom: 32,
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOptionWrap: {
    flex: 1,
  },
  themeOptionContent: {
    alignItems: "center",
    gap: 6,
  },
  themeOptionLabel: {
    ...typography.sm,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifLabel: {
    fontFamily: "Inter_500Medium",
    ...typography.sm,
    marginBottom: 2,
  },
  notifDesc: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  signOutLabel: {
    fontFamily: "Inter_600SemiBold",
    ...typography.sm,
  },
  versionText: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    textAlign: "center",
    marginTop: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});
