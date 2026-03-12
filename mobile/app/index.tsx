import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Camera,
  ChevronRight,
  Mic,
  Settings,
  SquarePen,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { useCurrentUser } from "../lib/api/queries";
import { fonts } from "../constants/typography";
import { NotoMascot } from "../components/ui/noto-mascot";

export default function CaptureHomeScreen() {
  const router = useRouter();
  const { data: userData } = useCurrentUser();

  const heroBounce = useSharedValue(1);
  const heroBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroBounce.value }],
  }));

  const openCapture = useCallback(
    (mode?: "voice" | "text" | "image") => {
      // eslint-disable-next-line react-hooks/immutability
      heroBounce.value = withSequence(
        withSpring(0.82, { damping: 8, stiffness: 400 }),
        withSpring(1.08, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 250 }),
      );

      setTimeout(() => {
        router.push(
          mode ? { pathname: "/capture", params: { mode } } : "/capture",
        );
      }, 150);
    },
    [heroBounce, router],
  );

  const displayName = userData?.user?.display_name?.trim() || "You";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.appName}>noto</Text>
              <Text style={styles.greeting}>
                Capture first. Organize after.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.avatarBtn}
              hitSlop={8}
            >
              <Text style={styles.avatarInitial}>
                {displayName[0]?.toUpperCase() ?? "?"}
              </Text>
            </Pressable>
          </View>

          <Animated.View style={heroBounceStyle}>
            <Pressable
              onPress={() => openCapture("voice")}
              style={styles.heroCard}
            >
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Page one</Text>
                <Text style={styles.heroTitle}>
                  Record what matters right now
                </Text>
                <Text style={styles.heroSubtitle}>
                  Start with a voice note, a quick thought, or an image. The
                  journal stays on the next page for history and search.
                </Text>
                <View style={styles.heroButton}>
                  <Mic size={15} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.heroButtonText}>Open the cloud</Text>
                </View>
              </View>

              <View style={styles.heroMascotWrap}>
                <NotoMascot size={170} compact />
                <View style={styles.heroBadge}>
                  <Camera size={12} color="#1E1E1E" strokeWidth={2} />
                  <Text style={styles.heroBadgeText}>Voice, note, photo</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          <View style={styles.actionRow}>
            <ActionCard
              icon={<SquarePen size={18} color="#1E1E1E" strokeWidth={2} />}
              title="Write a note"
              body="Drop a quick thought without opening the journal."
              onPress={() => openCapture("text")}
            />
            <ActionCard
              icon={<Camera size={18} color="#1E1E1E" strokeWidth={2} />}
              title="Add a photo"
              body="Capture a memory from your camera roll or camera."
              onPress={() => openCapture("image")}
            />
          </View>

          <View style={styles.secondaryCard}>
            <View style={styles.secondaryCopy}>
              <Text style={styles.secondaryEyebrow}>Page two</Text>
              <Text style={styles.secondaryTitle}>Journal and search</Text>
              <Text style={styles.secondaryBody}>
                Browse your past thoughts, search your history, and open any
                entry in detail from a separate screen.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/journal")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Open journal</Text>
              <ChevronRight size={16} color="#1E1E1E" strokeWidth={2.2} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.settingsRow}
          >
            <View style={styles.settingsIcon}>
              <Settings size={16} color="#6F6A63" strokeWidth={2} />
            </View>
            <View style={styles.settingsCopy}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsBody}>
                Account, export, and app controls.
              </Text>
            </View>
            <ChevronRight size={16} color="#AAA39A" strokeWidth={2} />
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  title,
  body,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionCard}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionBody}>{body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FEFEFE",
  },
  root: {
    flex: 1,
    backgroundColor: "#FEFEFE",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 48,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: "#1A1A1A",
    letterSpacing: -1,
  },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#A6A29B",
    marginTop: 2,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8E6E3",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#77706A",
  },
  heroCard: {
    minHeight: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: 22,
    paddingVertical: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  heroCopy: {
    maxWidth: "62%",
    zIndex: 2,
  },
  heroEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#A6A29B",
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 31,
    lineHeight: 34,
    letterSpacing: -1.1,
    color: "#1A1A1A",
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#6F6A63",
    marginTop: 10,
  },
  heroButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E1E1E",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  heroMascotWrap: {
    position: "absolute",
    right: -10,
    bottom: 10,
    alignItems: "center",
  },
  heroBadge: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#1E1E1E",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#F7F4EF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFE8DE",
    minHeight: 152,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  actionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#1A1A1A",
  },
  actionBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "#6F6A63",
    marginTop: 8,
  },
  secondaryCard: {
    backgroundColor: "#FFF8E8",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F2E2B0",
    gap: 16,
  },
  secondaryCopy: {
    gap: 6,
  },
  secondaryEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#B38A20",
  },
  secondaryTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 24,
    color: "#1A1A1A",
  },
  secondaryBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#6F6A63",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#1E1E1E",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: 16,
  },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsCopy: {
    flex: 1,
  },
  settingsTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#1A1A1A",
  },
  settingsBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#8B857D",
    marginTop: 3,
  },
});
