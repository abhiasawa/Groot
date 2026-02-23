import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Bell,
  BookOpen,
  Calendar,
  Clock,
  Settings as SettingsIcon,
} from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useSettings } from "../lib/api/queries";
import { useUpdatePreference } from "../lib/api/mutations";
import { typography } from "../constants/typography";

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
  const { colors, mode, setMode, resolvedMode } = useTheme();
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

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
          {/* Theme section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Appearance</Text>
            <View style={s.themeRow}>
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

          {/* Notifications section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notifications</Text>
            <View style={s.notifList}>
              {notificationPrefs.map((pref, index) => {
                const enabled = data?.preferences?.[pref.key] ?? false;
                const isLast = index === notificationPrefs.length - 1;

                return (
                  <View
                    key={pref.key}
                    style={[s.notifRow, !isLast && s.notifRowBorder]}
                  >
                    <View style={s.notifIcon}>{pref.icon}</View>
                    <View style={s.notifContent}>
                      <Text style={s.notifLabel}>{pref.label}</Text>
                      <Text style={s.notifDesc}>{pref.description}</Text>
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
            </View>
          </View>

          {/* Version */}
          <Text style={s.versionText}>Groot Mobile v1.0.0</Text>
        </ScrollView>
      )}
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
    <Pressable
      onPress={onPress}
      style={[
        {
          flex: 1,
          alignItems: "center",
          paddingVertical: 14,
          borderRadius: 10,
          backgroundColor: active ? colors.secondary : "transparent",
          borderWidth: active ? 1 : StyleSheet.hairlineWidth,
          borderColor: active ? colors.primary : colors.border,
          gap: 6,
        },
      ]}
    >
      {icon}
      <Text
        style={{
          fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
          ...typography.sm,
          color: active ? colors.primary : colors.mutedForeground,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    themeRow: {
      flexDirection: "row",
      gap: 10,
    },
    notifList: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    notifRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    notifRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    notifIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: c.secondary,
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
      color: c.foreground,
      marginBottom: 2,
    },
    notifDesc: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    versionText: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      textAlign: "center",
      marginTop: 8,
    },
  });
