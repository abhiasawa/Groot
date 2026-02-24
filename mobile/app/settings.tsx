import React, { useCallback, useMemo } from "react";
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
import { useRouter, useSegments } from "expo-router";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  BookOpen,
  Calendar,
  Clock,
  User,
  LogOut,
  Mail,
} from "lucide-react-native";

import { useAuth } from "../lib/auth/provider";
import { useTheme } from "../lib/theme/provider";
import { useSettings, useCurrentUser } from "../lib/api/queries";
import { useUpdatePreference } from "../lib/api/mutations";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import { PillBadge } from "../components/ui/pill-badge";
import { TabSwipeView } from "../components/ui/tab-swipe-view";

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
      description: "A daily prompt to close your day.",
      icon: <BookOpen size={17} color={colors.chart1} strokeWidth={1.6} />,
    },
    {
      key: "morning_checkin",
      label: "Daily Check-in",
      description: "Morning nudge to start with intent.",
      icon: <Calendar size={17} color={colors.chart2} strokeWidth={1.6} />,
    },
    {
      key: "weekly_report",
      label: "Weekly Report",
      description: "Summary of patterns and insights.",
      icon: <Bell size={17} color={colors.chart3} strokeWidth={1.6} />,
    },
    {
      key: "feature_tips",
      label: "Feature Tips",
      description: "Occasional tips for better workflows.",
      icon: <Clock size={17} color={colors.chart4} strokeWidth={1.6} />,
    },
  ];
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const isTabRoute = segments[0] === "(tabs)";
  const { data, isLoading, refetch } = useSettings();
  const {
    data: meData,
    refetch: refetchMe,
  } = useCurrentUser();
  const updatePref = useUpdatePreference();
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);

  const notificationPrefs = useNotificationPrefs();

  const enabledCount = useMemo(() => {
    return notificationPrefs.filter((pref) => data?.preferences?.[pref.key] ?? true).length;
  }, [data?.preferences, notificationPrefs]);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    Promise.all([refetch(), refetchMe()])
      .catch(() => {})
      .finally(() => setIsPullRefreshing(false));
  }, [refetch, refetchMe]);

  const handleTogglePref = useCallback(
    (key: string, value: boolean) => {
      updatePref.mutate({ key, value });
    },
    [updatePref],
  );

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  const user = meData?.user;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const inner = (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isTabRoute ? (
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.foreground }]}>Settings</Text>
            </View>
          ) : (
            <DeepScreenHeader
              title="Settings"
              subtitle="Tune your experience and account controls."
              onBack={() => router.back()}
              tags={["Preferences", "Account"]}
            />
          )}

          <View style={styles.sectionWrap}>
            <SectionHeader title="Appearance" />
            <View style={styles.themeRow}>
              <ThemeOption
                label="Light"
                icon={
                  <Sun
                    size={17}
                    color={mode === "light" ? colors.primaryForeground : colors.mutedForeground}
                    strokeWidth={1.6}
                  />
                }
                active={mode === "light"}
                onPress={() => setMode("light")}
              />
              <ThemeOption
                label="Dark"
                icon={
                  <Moon
                    size={17}
                    color={mode === "dark" ? colors.primaryForeground : colors.mutedForeground}
                    strokeWidth={1.6}
                  />
                }
                active={mode === "dark"}
                onPress={() => setMode("dark")}
              />
              <ThemeOption
                label="System"
                icon={
                  <Monitor
                    size={17}
                    color={mode === "system" ? colors.primaryForeground : colors.mutedForeground}
                    strokeWidth={1.6}
                  />
                }
                active={mode === "system"}
                onPress={() => setMode("system")}
              />
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <SectionHeader title="Notifications" />
            <GlassCard padding={0}>
              {notificationPrefs.map((pref, index) => {
                const enabled = data?.preferences?.[pref.key] ?? true;
                const isLast = index === notificationPrefs.length - 1;

                return (
                  <View
                    key={pref.key}
                    style={[
                      styles.prefRow,
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.glassBorder,
                      },
                    ]}
                  >
                    <View style={[styles.prefIconWrap, { backgroundColor: colors.glassSurface }]}>
                      {pref.icon}
                    </View>
                    <View style={styles.prefCopy}>
                      <Text style={[styles.prefLabel, { color: colors.foreground }]}>{pref.label}</Text>
                      <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>
                        {pref.description}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={(value) => handleTogglePref(pref.key, value)}
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

          <View style={styles.sectionWrap}>
            <SectionHeader title="Account" />
            <GlassCard padding={0}>
              <View
                style={[
                  styles.prefRow,
                  {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.glassBorder,
                  },
                ]}
              >
                <View style={[styles.prefIconWrap, { backgroundColor: colors.glassSurface }]}>
                  <Mail size={17} color={colors.primary} strokeWidth={1.6} />
                </View>
                <View style={styles.prefCopy}>
                  <Text style={[styles.prefLabel, { color: colors.foreground }]}>
                    {user?.display_name || "WhatsApp account"}
                  </Text>
                  <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>
                    {user?.whatsapp_number || "Connected with WhatsApp"}
                  </Text>
                </View>
                <PillBadge label="Connected" small />
              </View>

              <PressScale onPress={() => router.push("/(tabs)/profile" as never)}>
                <View
                  style={[
                    styles.prefRow,
                    {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.glassBorder,
                    },
                  ]}
                >
                  <View style={[styles.prefIconWrap, { backgroundColor: colors.glassSurface }]}>
                    <User size={17} color={colors.accent} strokeWidth={1.6} />
                  </View>
                  <View style={styles.prefCopy}>
                    <Text style={[styles.prefLabel, { color: colors.foreground }]}>Personal Profile</Text>
                    <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>Review and prune memory facts.</Text>
                  </View>
                </View>
              </PressScale>

              <PressScale onPress={handleSignOut}>
                <View style={styles.signOutRow}>
                  <View style={[styles.prefIconWrap, { backgroundColor: `${colors.destructive}1A` }]}>
                    <LogOut size={17} color={colors.destructive} strokeWidth={1.6} />
                  </View>
                  <Text style={[styles.signOutLabel, { color: colors.destructive }]}>Sign Out</Text>
                </View>
              </PressScale>
            </GlassCard>
          </View>

          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Groot Mobile v1.0.0</Text>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );

  return isTabRoute ? <TabSwipeView currentTab="settings">{inner}</TabSwipeView> : inner;
}

function ThemeOption({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <PressScale onPress={onPress} style={styles.themeOptionWrap}>
      <View
        style={[
          styles.themeOptionBox,
          {
            backgroundColor: active ? colors.primary : colors.secondary,
            borderRadius: 14,
          },
        ]}
      >
        <View style={styles.themeOptionInner}>
          {icon}
          <Text
            style={[
              styles.themeOptionLabel,
              {
                color: active ? colors.primaryForeground : colors.foreground,
                fontFamily: active ? "Sora_600SemiBold" : "Manrope_500Medium",
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  tabHeader: {
    marginBottom: 16,
  },
  tabTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
  },
  sectionWrap: {
    marginBottom: 22,
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOptionWrap: {
    flex: 1,
  },
  themeOptionBox: {
    padding: 13,
  },
  themeOptionInner: {
    alignItems: "center",
    gap: 5,
  },
  themeOptionLabel: {
    ...typography.xs,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  prefIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  prefCopy: {
    flex: 1,
    marginRight: 10,
  },
  prefLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.sm,
  },
  prefDesc: {
    marginTop: 1,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  signOutLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  versionText: {
    marginTop: 2,
    textAlign: "center",
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  bottomSpacer: {
    height: 20,
  },
});
