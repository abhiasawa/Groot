import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  Download,
  LogOut,
  ShieldCheck,
  Smile,
} from "lucide-react-native";

import { fonts, typography } from "../constants/typography";
import { ApiError, apiFetch } from "../lib/api/client";
import { useCurrentUser } from "../lib/api/queries";
import { useAuth } from "../lib/auth/provider";
import { notoTheme, colors } from "../lib/theme/tokens";

function buildMarkdownExport(payload: Record<string, unknown>) {
  const user = (payload.user as Record<string, unknown> | null) ?? null;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  return [
    "# Noto Export",
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

export function SettingsContent({ isTab = false }: { isTab?: boolean } = {}) {
  const { signOut } = useAuth();
  const router = useRouter();
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
        const fileName = `noto-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
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
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={notoTheme.foreground} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={notoTheme.foreground}
          />
        }
      >
        <View style={styles.topBar}>
          {!isTab && (
            <Pressable onPress={() => router.back()} style={styles.topIconButton}>
              <ArrowLeft size={18} color={notoTheme.foreground} />
            </Pressable>
          )}
          <Text style={styles.topTitle}>Settings</Text>
        </View>

        <SectionTitle title="Account" />
        <View style={styles.accountCard}>
          <Text style={styles.accountName}>
            {user?.display_name ?? "Noto user"}
          </Text>
          <Text style={styles.accountMeta}>
            {user?.email ?? "No email linked"}
          </Text>
          <Text style={styles.accountBuild}>
            v{Constants.expoConfig?.version ?? "dev"}
          </Text>
          <Pressable onPress={handleSignOut} style={styles.signOutWrap}>
            <View style={styles.signOutButton}>
              <LogOut size={16} color={notoTheme.foreground} strokeWidth={1.9} />
              <Text style={styles.signOutText}>Sign out</Text>
            </View>
          </Pressable>
        </View>

        <SectionTitle title="Insights" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Smile size={16} color={notoTheme.foreground} strokeWidth={1.8} />}
            title="Mood Trends"
            trailing={
              <ChevronRight size={16} color={colors.textFaded} strokeWidth={1.8} />
            }
            onPress={() => router.push("/mood")}
            bordered={false}
          />
        </View>

        <SectionTitle title="Export" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Download size={16} color={notoTheme.foreground} strokeWidth={1.8} />}
            title="Export to Markdown"
            trailing={
              <Text style={styles.exportLabel}>
                {exporting === "markdown" ? "Exporting..." : "Download"}
              </Text>
            }
            onPress={() => void exportData("markdown")}
          />
          <SettingsRow
            icon={<Code2 size={16} color={notoTheme.foreground} strokeWidth={1.8} />}
            title="Export to JSON"
            trailing={
              <Text style={styles.exportLabel}>
                {exporting === "json" ? "Exporting..." : "Download"}
              </Text>
            }
            onPress={() => void exportData("json")}
            bordered={false}
          />
        </View>

        <SectionTitle title="Danger Zone" />
        <View style={styles.dangerZone}>
          <View style={styles.dangerIcon}>
            <ShieldCheck size={18} color={notoTheme.destructive} strokeWidth={1.9} />
          </View>
          <Text style={styles.dangerTitle}>Clear All Data</Text>
          <Text style={styles.dangerBody}>
            This cannot be undone. Export your data first.
          </Text>
          <Pressable onPress={handleDelete}>
            <View style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  return <SettingsContent />;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  const content = (
    <View style={[styles.row, bordered && styles.rowBordered]}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowTitle}>{title}</Text>
      <View>{trailing}</View>
    </View>
  );

  if (!onPress) return content;

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0EFEB" },
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
    borderBottomColor: notoTheme.border,
    marginBottom: 18,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: notoTheme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    marginLeft: 10,
    fontFamily: fonts.bold,
    ...typography.xl,
    color: notoTheme.foreground,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    ...typography.caption,
    color: "#C0BDB8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: notoTheme.border,
    padding: 8,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  rowBordered: {
    borderBottomWidth: 1,
    borderBottomColor: notoTheme.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: notoTheme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    ...typography.sm,
    color: notoTheme.foreground,
  },
  exportLabel: {
    fontFamily: fonts.bold,
    ...typography.xs,
    color: notoTheme.foreground,
  },
  accountCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: notoTheme.border,
    padding: 16,
    marginBottom: 6,
  },
  accountName: {
    fontFamily: fonts.semiBold,
    ...typography.lg,
    color: notoTheme.foreground,
    marginBottom: 4,
  },
  accountMeta: {
    fontFamily: fonts.medium,
    ...typography.sm,
    color: "#999",
    marginBottom: 2,
  },
  accountBuild: {
    fontFamily: fonts.medium,
    ...typography.xs,
    color: "#C0BDB8",
    marginTop: 10,
  },
  signOutWrap: {
    marginTop: 14,
  },
  signOutButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: notoTheme.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontFamily: fonts.bold,
    ...typography.sm,
    color: notoTheme.foreground,
  },
  dangerZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(226,85,85,0.25)",
    backgroundColor: "rgba(226,85,85,0.03)",
    borderRadius: 24,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  dangerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(226,85,85,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dangerTitle: {
    fontFamily: fonts.semiBold,
    ...typography.base,
    color: notoTheme.foreground,
    marginBottom: 6,
  },
  dangerBody: {
    textAlign: "center",
    fontFamily: fonts.medium,
    ...typography.xs,
    color: "#999",
    lineHeight: 20,
    marginBottom: 14,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "rgba(226,85,85,0.25)",
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deleteText: {
    fontFamily: fonts.bold,
    ...typography.xs,
    color: notoTheme.destructive,
  },
  bottomGap: {
    height: 120,
  },
});
