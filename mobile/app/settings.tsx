import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import {
  ArrowLeft,
  Code2,
  Download,
  LogOut,
  ShieldCheck,
} from "lucide-react-native";

import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { ApiError, apiFetch } from "../lib/api/client";
import { useCurrentUser } from "../lib/api/queries";
import { useAuth } from "../lib/auth/provider";
import { useTheme } from "../lib/theme/provider";
import { typography } from "../constants/typography";

function buildMarkdownExport(payload: Record<string, unknown>) {
  const user = (payload.user as Record<string, unknown> | null) ?? null;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  return [
    "# Groot Export",
    "",
    `Exported: ${String(payload.exported_at ?? new Date().toISOString())}`,
    "",
    "## Profile",
    `- Name: ${String(user?.display_name ?? "Unknown")}`,
    `- Email: ${String(user?.email ?? "Unknown")}`,
    "",
    "## Messages",
    `Total: ${messages.length}`,
    "",
    ...messages.slice(0, 20).map((message) => {
      const item = message as Record<string, unknown>;
      return `- ${String(item.created_at ?? "")}: ${String(item.content ?? item.media_description ?? "No content")}`;
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
  const { data: meData, isLoading, refetch } = useCurrentUser();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exporting, setExporting] = useState<null | "markdown" | "json">(null);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetch()
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [refetch]);

  const user = meData?.user;

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

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This action is not reversible. Export your data first if you want to keep a copy.",
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
            <Text style={[styles.topTitle, { color: colors.foreground }]}>Settings</Text>
          </View>

          <SectionTitle title="Account" />
          <GlassCard padding={16} style={styles.accountCard}>
            <Text style={[styles.accountName, { color: colors.foreground }]}>
              {user?.display_name ?? "Groot user"}
            </Text>
            <Text style={[styles.accountMeta, { color: colors.mutedForeground }]}>
              {user?.email ?? "No email linked"}
            </Text>
            <Text style={[styles.accountBuild, { color: colors.mutedForeground }]}>
              v{Constants.expoConfig?.version ?? "dev"}
            </Text>
            <PressScale onPress={handleSignOut} haptic={false} style={styles.signOutWrap}>
              <View style={[styles.signOutButton, { backgroundColor: `${colors.primary}14` }]}>
                <LogOut size={16} color={colors.primary} strokeWidth={1.9} />
                <Text style={[styles.signOutText, { color: colors.primary }]}>Sign out</Text>
              </View>
            </PressScale>
          </GlassCard>

          <SectionTitle title="Export" />
          <GlassCard padding={8}>
            <SettingsRow
              icon={<Download size={16} color={colors.primary} strokeWidth={1.8} />}
              title="Export to Markdown"
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
              trailing={
                <Text style={[styles.exportLabel, { color: colors.primary }]}>
                  {exporting === "json" ? "Exporting..." : "Download"}
                </Text>
              }
              onPress={() => void exportData("json")}
              bordered={false}
            />
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
              This cannot be undone. Export your data first.
            </Text>
            <PressScale onPress={handleDelete} haptic={false}>
              <View style={[styles.deleteButton, { backgroundColor: colors.card, borderColor: `${colors.destructive}30` }]}>
                <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete Account</Text>
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
  trailing,
  bordered = true,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  trailing: React.ReactNode;
  bordered?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.row, bordered ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null]}>
      <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
      <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={styles.rowTrailing}>{trailing}</View>
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
  rowTitle: {
    flex: 1,
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
  },
  rowTrailing: {},
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
