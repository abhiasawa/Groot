import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import {
  Bell,
  Check,
  ChevronRight,
  Link2,
  LogOut,
  Mail,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  Phone,
  Sun,
  Unlink,
} from "lucide-react-native";

import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { apiFetch } from "../lib/api/client";
import { useUpdatePreference } from "../lib/api/mutations";
import { useCurrentUser, useSettings } from "../lib/api/queries";
import { useAuth } from "../lib/auth/provider";
import { requestPermissions } from "../lib/notifications";
import { useTheme } from "../lib/theme/provider";
import { typography } from "../constants/typography";

type NotificationPref = {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

function useNotificationPrefs() {
  const { colors } = useTheme();

  return useMemo<NotificationPref[]>(
    () => [
      {
        key: "morning_checkin",
        label: "Morning check-in",
        description: "A quiet nudge to start the day with intent.",
        icon: <Sun size={16} color={colors.chart2} strokeWidth={1.8} />,
      },
      {
        key: "evening_journal",
        label: "Evening reflection",
        description: "A prompt to close the loop before the day ends.",
        icon: <Moon size={16} color={colors.chart1} strokeWidth={1.8} />,
      },
      {
        key: "weekly_report",
        label: "Weekly synthesis",
        description: "A forest-level recap of patterns, habits, and shifts.",
        icon: <Bell size={16} color={colors.chart3} strokeWidth={1.8} />,
      },
      {
        key: "feature_tips",
        label: "Guided tips",
        description: "Subtle suggestions for using more of Groot well.",
        icon: <Mic size={16} color={colors.chart5} strokeWidth={1.8} />,
      },
    ],
    [colors.chart1, colors.chart2, colors.chart3, colors.chart5],
  );
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const isTabRoute = segments[0] === "(tabs)";
  const { data, isLoading, refetch } = useSettings();
  const { data: meData, refetch: refetchMe } = useCurrentUser();
  const updatePref = useUpdatePreference();
  const notificationPrefs = useNotificationPrefs();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [whatsAppLinking, setWhatsAppLinking] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifPermission(status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined");
    });
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([refetch(), refetchMe()])
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [refetch, refetchMe]);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermissions();
    setNotifPermission(granted ? "granted" : "denied");
  }, []);

  const handleTogglePref = useCallback(
    (key: string, value: boolean) => {
      updatePref.mutate({ key, value });
    },
    [updatePref],
  );

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  const handleLinkWhatsApp = useCallback(async () => {
    if (!whatsAppNumber.trim()) {
      setWhatsAppError("Enter your WhatsApp number to connect Groot.");
      return;
    }

    setWhatsAppLinking(true);
    setWhatsAppError(null);

    try {
      await apiFetch<{ ok: boolean; whatsapp_number: string }>("/api/auth/link-whatsapp", {
        method: "POST",
        body: JSON.stringify({ whatsapp_number: whatsAppNumber.trim() }),
      });
      setShowWhatsAppInput(false);
      setWhatsAppNumber("");
      void refetchMe();
      Alert.alert("WhatsApp linked", "Groot can now message you on WhatsApp.");
    } catch (err: unknown) {
      setWhatsAppError(err instanceof Error ? err.message : "Failed to link WhatsApp.");
    } finally {
      setWhatsAppLinking(false);
    }
  }, [refetchMe, whatsAppNumber]);

  const handleUnlinkWhatsApp = useCallback(() => {
    Alert.alert(
      "Unlink WhatsApp",
      "Groot will stop sending messages to WhatsApp. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch<{ ok: boolean }>("/api/auth/link-whatsapp", { method: "DELETE" });
              void refetchMe();
            } catch {
              Alert.alert("Error", "Failed to unlink WhatsApp.");
            }
          },
        },
      ],
    );
  }, [refetchMe]);

  const notificationCount = notificationPrefs.filter(
    (pref) => data?.preferences?.[pref.key] ?? true,
  ).length;

  const user = meData?.user;
  const hasWhatsApp = Boolean(user?.whatsapp_number);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <GradientBackground>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerEyebrow, { color: colors.primary }]}>Deep soil</Text>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings & privacy</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                Tune voice, privacy, channels, and how Groot reaches you.
              </Text>
            </View>
            {!isTabRoute ? (
              <PressScale onPress={() => router.back()} haptic={false}>
                <View style={[styles.backPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
                </View>
              </PressScale>
            ) : null}
          </View>

          <GlassCard style={styles.profileCard} padding={20}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>Profile root</Text>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.display_name ?? "Groot user"}
            </Text>
            <View style={styles.profileMeta}>
              <InfoPill icon={<Mail size={14} color={colors.primary} strokeWidth={1.8} />} label={user?.email ?? "No email"} />
              <InfoPill
                icon={<Phone size={14} color={colors.primary} strokeWidth={1.8} />}
                label={user?.whatsapp_number ?? "WhatsApp not linked"}
              />
            </View>
          </GlassCard>

          <SectionTitle title="Appearance" />
          <View style={styles.modeRow}>
            <ModeCard
              label="Light"
              active={mode === "light"}
              icon={<Sun size={18} color={mode === "light" ? colors.primaryForeground : colors.primary} strokeWidth={2} />}
              onPress={() => setMode("light")}
            />
            <ModeCard
              label="Dark"
              active={mode === "dark"}
              icon={<Moon size={18} color={mode === "dark" ? colors.primaryForeground : colors.primary} strokeWidth={2} />}
              onPress={() => setMode("dark")}
            />
            <ModeCard
              label="System"
              active={mode === "system"}
              icon={<Monitor size={18} color={mode === "system" ? colors.primaryForeground : colors.primary} strokeWidth={2} />}
              onPress={() => setMode("system")}
            />
          </View>

          <SectionTitle title="Notifications" meta={`${notificationCount}/${notificationPrefs.length} active`} />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<Bell size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Notification permission"
              description={
                notifPermission === "granted"
                  ? "Allowed on this device."
                  : notifPermission === "denied"
                    ? "Disabled at system level."
                    : "Not configured yet."
              }
              trailing={
                notifPermission === "granted" ? (
                  <View style={[styles.statusPill, { backgroundColor: `${colors.primary}18` }]}>
                    <Check size={14} color={colors.primary} strokeWidth={2.1} />
                    <Text style={[styles.statusPillText, { color: colors.primary }]}>Enabled</Text>
                  </View>
                ) : (
                  <PressScale onPress={handleRequestPermission} haptic={false}>
                    <View style={[styles.actionPill, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.actionPillText, { color: colors.primaryForeground }]}>Allow</Text>
                    </View>
                  </PressScale>
                )
              }
            />

            {notificationPrefs.map((pref, index) => (
              <SettingsRow
                key={pref.key}
                icon={pref.icon}
                title={pref.label}
                description={pref.description}
                bordered={index < notificationPrefs.length - 1}
                trailing={
                  <Switch
                    trackColor={{ false: colors.muted, true: `${colors.primary}55` }}
                    thumbColor={data?.preferences?.[pref.key] ?? true ? colors.primary : colors.card}
                    ios_backgroundColor={colors.muted}
                    value={data?.preferences?.[pref.key] ?? true}
                    onValueChange={(value) => handleTogglePref(pref.key, value)}
                  />
                }
              />
            ))}
          </GlassCard>

          <SectionTitle title="Channels" />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<MessageCircle size={16} color={colors.primary} strokeWidth={1.8} />}
              title="WhatsApp bridge"
              description={
                hasWhatsApp
                  ? `Connected to ${user?.whatsapp_number}`
                  : "Link WhatsApp so Groot can reach you outside the app."
              }
              trailing={
                hasWhatsApp ? (
                  <PressScale onPress={handleUnlinkWhatsApp} haptic={false}>
                    <View style={[styles.secondaryPill, { backgroundColor: `${colors.destructive}18` }]}>
                      <Unlink size={14} color={colors.destructive} strokeWidth={2} />
                      <Text style={[styles.secondaryPillText, { color: colors.destructive }]}>Unlink</Text>
                    </View>
                  </PressScale>
                ) : (
                  <PressScale onPress={() => setShowWhatsAppInput((value) => !value)} haptic={false}>
                    <View style={[styles.secondaryPill, { backgroundColor: `${colors.primary}18` }]}>
                      <Link2 size={14} color={colors.primary} strokeWidth={2} />
                      <Text style={[styles.secondaryPillText, { color: colors.primary }]}>Connect</Text>
                    </View>
                  </PressScale>
                )
              }
            />

            {showWhatsAppInput ? (
              <View style={[styles.linkBox, { borderColor: colors.border }]}>
                <TextInput
                  value={whatsAppNumber}
                  onChangeText={setWhatsAppNumber}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.linkInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                {whatsAppError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{whatsAppError}</Text>
                ) : null}
                <PressScale onPress={handleLinkWhatsApp} haptic={false}>
                  <View style={[styles.connectButton, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>
                      {whatsAppLinking ? "Linking..." : "Link WhatsApp"}
                    </Text>
                  </View>
                </PressScale>
              </View>
            ) : null}
          </GlassCard>

          <SectionTitle title="System" />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<Mic size={16} color={colors.primary} strokeWidth={1.8} />}
              title="App build"
              description={`Expo ${Constants.expoConfig?.version ?? "dev"} on ${Constants.platform?.android ? "Android" : "device"}`}
              trailing={<ChevronRight size={16} color={colors.mutedForeground} strokeWidth={1.8} />}
            />
            <SettingsRow
              icon={<LogOut size={16} color={colors.destructive} strokeWidth={1.8} />}
              title="Sign out"
              description="End this session on the current device."
              trailing={
                <PressScale onPress={handleSignOut} haptic={false}>
                  <View style={[styles.secondaryPill, { backgroundColor: `${colors.destructive}18` }]}>
                    <Text style={[styles.secondaryPillText, { color: colors.destructive }]}>Leave</Text>
                  </View>
                </PressScale>
              }
            />
          </GlassCard>

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {meta ? <Text style={[styles.sectionMeta, { color: colors.primary }]}>{meta}</Text> : null}
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  trailing,
  bordered = true,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  trailing: React.ReactNode;
  bordered?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, bordered ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {trailing}
    </View>
  );
}

function ModeCard({
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
    <PressScale onPress={onPress} haptic={false} style={styles.modeCardWrap}>
      <View
        style={[
          styles.modeCard,
          {
            backgroundColor: active ? colors.primary : colors.glassSurface,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        {icon}
        <Text style={[styles.modeLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>
          {label}
        </Text>
      </View>
    </PressScale>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.infoPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {icon}
      <Text style={[styles.infoPillText, { color: colors.foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 42,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerEyebrow: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  backPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  profileCard: {
    marginBottom: 24,
  },
  sectionEyebrow: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  profileName: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
    marginBottom: 14,
  },
  profileMeta: {
    gap: 10,
  },
  infoPill: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoPillText: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
  },
  sectionMeta: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  modeCardWrap: {
    flex: 1,
  },
  modeCard: {
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  modeLabel: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 16,
    gap: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
    marginBottom: 4,
  },
  rowDescription: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusPillText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  actionPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPillText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  secondaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryPillText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  linkBox: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  linkInput: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  errorText: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 8,
  },
  connectButton: {
    borderRadius: 16,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  connectButtonText: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
  },
  bottomGap: {
    height: 110,
  },
});
