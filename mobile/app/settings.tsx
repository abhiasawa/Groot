import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  Download,
  Fingerprint,
  Leaf,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
} from "lucide-react-native";

import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { ApiError, apiFetch } from "../lib/api/client";
import { useUpdatePreference } from "../lib/api/mutations";
import { useCurrentUser, useSettings } from "../lib/api/queries";
import { useAuth } from "../lib/auth/provider";
import { useTheme } from "../lib/theme/provider";
import { typography } from "../constants/typography";

type PreferenceKey =
  | "noise_suppression"
  | "on_device_processing"
  | "biometric_lock";

function preferenceValue(
  preferences: Record<string, boolean> | undefined,
  key: PreferenceKey,
  fallback: boolean,
) {
  return preferences?.[key] ?? fallback;
}

function buildMarkdownExport(payload: Record<string, unknown>) {
  const user = (payload.user as Record<string, unknown> | null) ?? null;
  const profile = Array.isArray(payload.profile) ? payload.profile : [];
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const habits = Array.isArray(payload.habits) ? payload.habits : [];
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
  const reports = Array.isArray(payload.weekly_reports) ? payload.weekly_reports : [];

  return [
    "# Groot Export",
    "",
    `Exported: ${String(payload.exported_at ?? new Date().toISOString())}`,
    "",
    "## Profile",
    `- Name: ${String(user?.display_name ?? "Unknown")}`,
    `- Email: ${String(user?.email ?? "Unknown")}`,
    `- WhatsApp: ${String(user?.whatsapp_number ?? "Not linked")}`,
    "",
    "## Stats",
    `- Profile facts: ${profile.length}`,
    `- Messages: ${messages.length}`,
    `- Habits: ${habits.length}`,
    `- Tasks: ${tasks.length}`,
    `- Reminders: ${reminders.length}`,
    `- Weekly reports: ${reports.length}`,
    "",
    "## Recent Messages",
    ...messages.slice(0, 10).map((message) => {
      const item = message as Record<string, unknown>;
      return `- ${String(item.created_at ?? "")}: ${String(item.content ?? item.media_description ?? "No content")}`;
    }),
    "",
    "## Recent Reports",
    ...reports.slice(0, 5).map((report) => {
      const item = report as Record<string, unknown>;
      return `- ${String(item.week_start ?? "")}: ${String(item.summary ?? "No summary")}`;
    }),
    "",
  ].join("\n");
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const isTabRoute = segments[0] === "(tabs)";
  const { data, isLoading, refetch } = useSettings();
  const { data: meData, refetch: refetchMe } = useCurrentUser();
  const updatePref = useUpdatePreference();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exporting, setExporting] = useState<null | "markdown" | "json">(null);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([refetch(), refetchMe()])
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [refetch, refetchMe]);

  const user = meData?.user;
  const preferences = data?.preferences;

  const toggles = useMemo(
    () => ({
      noiseSuppression: preferenceValue(preferences, "noise_suppression", true),
      onDeviceProcessing: preferenceValue(preferences, "on_device_processing", true),
      biometricLock: preferenceValue(preferences, "biometric_lock", false),
    }),
    [preferences],
  );

  const setPreference = useCallback(
    (key: PreferenceKey, value: boolean) => {
      updatePref.mutate({ key, value });
    },
    [updatePref],
  );

  const exportData = useCallback(
    async (format: "markdown" | "json") => {
      try {
        setExporting(format);
        const payload = await apiFetch<Record<string, unknown>>("/api/export");
        const extension = format === "json" ? "json" : "md";
        const fileName = `groot-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
        const content =
          format === "json"
            ? JSON.stringify(payload, null, 2)
            : buildMarkdownExport(payload);
        const file = new FileSystem.File(FileSystem.Paths.cache, fileName);
        file.create({ overwrite: true, intermediates: true });
        file.write(content);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          Alert.alert("Exported", file.uri);
        }
      } catch (error) {
        const message =
          error instanceof ApiError || error instanceof Error
            ? error.message
            : "Failed to export data.";
        Alert.alert("Export failed", message);
      } finally {
        setExporting(null);
      }
    },
    [],
  );

  const handleProfileOptimization = useCallback(async () => {
    const token = await SecureStore.getItemAsync("groot-jwt");
    Alert.alert(
      "Profile Optimization",
      token
        ? "Voice profile tuning is now enabled for this device profile. Capture a few more voice seeds to improve recognition."
        : "Sign in again if you want Groot to sync voice profile tuning across devices.",
    );
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Deep Soil Account",
      "This action is not reversible. Use export first if you want to keep a copy of your data.",
      [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive" }],
    );
  }, []);

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

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
          <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
            <PressScale
              onPress={() => {
                if (!isTabRoute) {
                  router.back();
                }
              }}
              haptic={false}
              disabled={isTabRoute}
            >
              <View
                style={[
                  styles.topIconButton,
                  {
                    backgroundColor: colors.secondary,
                    opacity: isTabRoute ? 0 : 1,
                  },
                ]}
              >
                <ArrowLeft size={18} color={colors.primary} />
              </View>
            </PressScale>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>Settings & privacy</Text>
          </View>

          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: colors.primary }]}>Deep Soil</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              Tune voice recognition, privacy, export, and device-level protection.
            </Text>
          </View>

          <SectionTitle title="Voice Profile" />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<SlidersHorizontal size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Profile Optimization"
              description="Enhance voice recognition accuracy"
              trailing={<ChevronRight size={18} color={colors.primary} strokeWidth={1.8} />}
              onPress={handleProfileOptimization}
            />
            <SettingsRow
              icon={<Volume2 size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Noise Suppression"
              description="Filter background soil vibration sounds"
              bordered={false}
              trailing={
                <Switch
                  trackColor={{ false: colors.muted, true: `${colors.primary}66` }}
                  thumbColor={toggles.noiseSuppression ? colors.primary : colors.card}
                  ios_backgroundColor={colors.muted}
                  value={toggles.noiseSuppression}
                  onValueChange={(value) => setPreference("noise_suppression", value)}
                />
              }
            />
          </GlassCard>

          <SectionTitle title="Data Privacy" />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<Leaf size={16} color={colors.primary} strokeWidth={1.8} />}
              title="On-device processing"
              description="Process biometric data locally for maximum privacy"
              trailing={
                <Switch
                  trackColor={{ false: colors.muted, true: `${colors.primary}66` }}
                  thumbColor={toggles.onDeviceProcessing ? colors.primary : colors.card}
                  ios_backgroundColor={colors.muted}
                  value={toggles.onDeviceProcessing}
                  onValueChange={(value) => setPreference("on_device_processing", value)}
                />
              }
            />
            <SettingsRow
              icon={<Fingerprint size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Biometric Lock"
              description="Require fingerprint or face ID to open"
              bordered={false}
              trailing={
                <Switch
                  trackColor={{ false: colors.muted, true: `${colors.primary}66` }}
                  thumbColor={toggles.biometricLock ? colors.primary : colors.card}
                  ios_backgroundColor={colors.muted}
                  value={toggles.biometricLock}
                  onValueChange={(value) => setPreference("biometric_lock", value)}
                />
              }
            />
          </GlassCard>

          <SectionTitle title="Export & Data" />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<Download size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Export to Markdown"
              description="Rich text format for notes"
              trailing={
                <Text style={[styles.exportLabel, { color: colors.primary }]}>
                  {exporting === "markdown" ? "Exporting..." : "Download"}
                </Text>
              }
              onPress={() => void exportData("markdown")}
            />
            <SettingsRow
              icon={<Code2 size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Export to JSON"
              description="Structured data for integration"
              trailing={
                <Text style={[styles.exportLabel, { color: colors.primary }]}>
                  {exporting === "json" ? "Exporting..." : "Download"}
                </Text>
              }
              onPress={() => void exportData("json")}
              bordered={false}
            />
          </GlassCard>

          <SectionTitle title="Account" />
          <GlassCard padding={16} style={styles.accountCard}>
            <Text style={[styles.accountName, { color: colors.foreground }]}>
              {user?.display_name ?? "Groot user"}
            </Text>
            <Text style={[styles.accountMeta, { color: colors.mutedForeground }]}>
              {user?.email ?? "No email linked"}
            </Text>
            <Text style={[styles.accountMeta, { color: colors.mutedForeground }]}>
              {user?.whatsapp_number ?? "WhatsApp not linked"}
            </Text>
            <Text style={[styles.accountBuild, { color: colors.mutedForeground }]}>
              Expo {Constants.expoConfig?.version ?? "dev"}
            </Text>
            <PressScale onPress={handleSignOut} haptic={false} style={styles.signOutWrap}>
              <View style={[styles.signOutButton, { backgroundColor: `${colors.primary}14` }]}>
                <LogOut size={16} color={colors.primary} strokeWidth={1.9} />
                <Text style={[styles.signOutText, { color: colors.primary }]}>Sign out</Text>
              </View>
            </PressScale>
          </GlassCard>

          <SectionTitle title="Danger Zone" />
          <View
            style={[
              styles.dangerZone,
              {
                backgroundColor: `${colors.destructive}08`,
                borderColor: `${colors.destructive}35`,
              },
            ]}
          >
            <View style={[styles.dangerIcon, { backgroundColor: `${colors.destructive}14` }]}>
              <ShieldCheck size={18} color={colors.destructive} strokeWidth={1.9} />
            </View>
            <Text style={[styles.dangerTitle, { color: colors.foreground }]}>Clear All Data</Text>
            <Text style={[styles.dangerBody, { color: colors.mutedForeground }]}>
              This action cannot be undone. Export your archive before you continue.
            </Text>
            <PressScale onPress={handleDelete} haptic={false}>
              <View style={[styles.deleteButton, { backgroundColor: colors.card, borderColor: `${colors.destructive}30` }]}>
                <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete Deep Soil Account</Text>
              </View>
            </PressScale>
          </View>

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  trailing,
  bordered = true,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  trailing: React.ReactNode;
  bordered?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.row, bordered ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null]}>
      <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return content;

  return (
    <PressScale onPress={onPress} haptic={false}>
      {content}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 42,
  },
  topBar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    marginBottom: 18,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    marginLeft: 10,
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  heroCopy: {
    marginBottom: 20,
  },
  heroEyebrow: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 16,
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
  exportLabel: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  accountCard: {
    marginBottom: 6,
  },
  accountName: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginBottom: 4,
  },
  accountMeta: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    marginBottom: 2,
  },
  accountBuild: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 10,
  },
  signOutWrap: {
    marginTop: 14,
  },
  signOutButton: {
    height: 44,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
  },
  dangerZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 26,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  dangerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dangerTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 6,
  },
  dangerBody: {
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    lineHeight: 20,
    marginBottom: 14,
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deleteText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  bottomGap: {
    height: 120,
  },
});
