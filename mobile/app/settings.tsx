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
} from "lucide-react-native";

import { useAuth } from "../lib/auth/provider";
import { useTheme } from "../lib/theme/provider";
import { useSettings } from "../lib/api/queries";
import { useUpdatePreference } from "../lib/api/mutations";
import { Sheet } from "../components/ui/sheet";
import { SectionLabel } from "../components/ui/section-label";
import { PressScale } from "../components/ui/press-scale";

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

  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <PressScale onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </PressScale>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

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
        {/* ── Appearance ─────────────────── */}
        <View style={s.section}>
          <SectionLabel>Appearance</SectionLabel>
          <View style={s.themeRow}>
            <ThemeOption
              label="Light"
              icon={<Sun size={18} color={mode === "light" ? colors.primary : colors.mutedForeground} strokeWidth={1.5} />}
              active={mode === "light"}
              onPress={() => setMode("light")}
              colors={colors}
            />
            <ThemeOption
              label="Dark"
              icon={<Moon size={18} color={mode === "dark" ? colors.primary : colors.mutedForeground} strokeWidth={1.5} />}
              active={mode === "dark"}
              onPress={() => setMode("dark")}
              colors={colors}
            />
            <ThemeOption
              label="System"
              icon={<Monitor size={18} color={mode === "system" ? colors.primary : colors.mutedForeground} strokeWidth={1.5} />}
              active={mode === "system"}
              onPress={() => setMode("system")}
              colors={colors}
            />
          </View>
        </View>

        {/* ── Notifications ──────────────── */}
        <View style={s.section}>
          <SectionLabel>Notifications</SectionLabel>
          <Sheet padding={0}>
            {notificationPrefs.map((pref, index) => {
              const enabled = data?.preferences?.[pref.key] ?? true;
              const isLast = index === notificationPrefs.length - 1;

              return (
                <View
                  key={pref.key}
                  style={[
                    s.row,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={[s.rowIcon, { backgroundColor: colors.muted }]}>
                    {pref.icon}
                  </View>
                  <View style={s.rowContent}>
                    <Text style={[s.rowLabel, { color: colors.foreground }]}>
                      {pref.label}
                    </Text>
                    <Text style={[s.rowDesc, { color: colors.mutedForeground }]}>
                      {pref.description}
                    </Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(value) => handleTogglePref(pref.key, value)}
                    trackColor={{ false: colors.input, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              );
            })}
          </Sheet>
        </View>

        {/* ── Account ────────────────────── */}
        <View style={s.section}>
          <SectionLabel>Account</SectionLabel>
          <Sheet padding={0}>
            <PressScale onPress={signOut}>
              <View style={s.signOutRow}>
                <View style={[s.rowIcon, { backgroundColor: colors.destructive + "15" }]}>
                  <LogOut size={18} color={colors.destructive} strokeWidth={1.5} />
                </View>
                <Text style={[s.signOutLabel, { color: colors.destructive }]}>
                  Sign Out
                </Text>
              </View>
            </PressScale>
          </Sheet>
        </View>

        {/* Version */}
        <Text style={[s.versionText, { color: colors.mutedForeground }]}>
          Groot Mobile v1.0.0
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    <PressScale onPress={onPress} style={s.themeOptionWrap}>
      <Sheet
        padding={14}
        accentColor={active ? colors.primary : undefined}
        style={
          active
            ? { borderColor: colors.primary, borderWidth: 1.5 }
            : undefined
        }
      >
        <View style={s.themeOptionContent}>
          {icon}
          <Text
            style={[
              s.themeOptionLabel,
              {
                fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                color: active ? colors.primary : colors.mutedForeground,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </Sheet>
    </PressScale>
  );
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: { marginBottom: 28 },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOptionWrap: { flex: 1 },
  themeOptionContent: {
    alignItems: "center",
    gap: 6,
  },
  themeOptionLabel: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 2,
  },
  rowDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  signOutLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  versionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
