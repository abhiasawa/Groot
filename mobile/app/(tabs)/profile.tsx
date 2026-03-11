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
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import {
  Code2,
  Download,
  LogOut,
  ShieldCheck,
} from "lucide-react-native";

import { fonts, typography } from "../../constants/typography";
import { ApiError, apiFetch } from "../../lib/api/client";
import { useCurrentUser } from "../../lib/api/queries";
import { useAuth } from "../../lib/auth/provider";

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

export default function ProfileScreen() {
  const { signOut } = useAuth();
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
          <ActivityIndicator size="large" color="#1E1E1E" />
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
            tintColor="#1E1E1E"
          />
        }
      >
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Avatar + Name */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.display_name || "?")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {user?.display_name ?? "Noto user"}
          </Text>
          <Text style={styles.profileEmail}>
            {user?.email ?? "No email linked"}
          </Text>
          <Text style={styles.profileVersion}>
            v{Constants.expoConfig?.version ?? "dev"}
          </Text>
        </View>

        {/* Export section */}
        <Text style={styles.sectionTitle}>Export</Text>
        <View style={styles.card}>
          <Pressable onPress={() => void exportData("markdown")} style={styles.row}>
            <View style={styles.rowIcon}>
              <Download size={16} color="#1E1E1E" strokeWidth={1.8} />
            </View>
            <Text style={styles.rowTitle}>Export to Markdown</Text>
            <Text style={styles.rowAction}>
              {exporting === "markdown" ? "Exporting..." : "Download"}
            </Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable onPress={() => void exportData("json")} style={styles.row}>
            <View style={styles.rowIcon}>
              <Code2 size={16} color="#1E1E1E" strokeWidth={1.8} />
            </View>
            <Text style={styles.rowTitle}>Export to JSON</Text>
            <Text style={styles.rowAction}>
              {exporting === "json" ? "Exporting..." : "Download"}
            </Text>
          </Pressable>
        </View>

        {/* Sign out */}
        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={16} color="#1E1E1E" strokeWidth={1.9} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.dangerZone}>
          <View style={styles.dangerIcon}>
            <ShieldCheck size={18} color="#EE2336" strokeWidth={1.9} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0EFEB" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },
  pageTitle: {
    fontFamily: fonts.bold,
    ...typography.xl,
    color: "#1E1E1E",
    marginBottom: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D0C5B6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: "#FFF",
  },
  profileName: {
    fontFamily: fonts.semiBold,
    ...typography.lg,
    color: "#1E1E1E",
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#555555",
  },
  profileVersion: {
    fontFamily: fonts.regular,
    ...typography.xs,
    color: "rgba(30,30,30,0.4)",
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: "rgba(30,30,30,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0EFEB",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    ...typography.sm,
    color: "#1E1E1E",
  },
  rowAction: {
    fontFamily: fonts.semiBold,
    ...typography.xs,
    color: "#1E1E1E",
  },
  separator: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginHorizontal: 12,
  },
  signOutButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  signOutText: {
    fontFamily: fonts.semiBold,
    ...typography.sm,
    color: "#1E1E1E",
  },
  dangerZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(238,35,54,0.25)",
    backgroundColor: "rgba(238,35,54,0.03)",
    borderRadius: 24,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  dangerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(238,35,54,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dangerTitle: {
    fontFamily: fonts.semiBold,
    ...typography.base,
    color: "#1E1E1E",
    marginBottom: 6,
  },
  dangerBody: {
    textAlign: "center",
    fontFamily: fonts.regular,
    ...typography.xs,
    color: "#555555",
    lineHeight: 20,
    marginBottom: 14,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "rgba(238,35,54,0.25)",
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deleteText: {
    fontFamily: fonts.semiBold,
    ...typography.xs,
    color: "#EE2336",
  },
});
