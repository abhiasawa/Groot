import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useMemories, useCurrentUser } from "../../lib/api/queries";
import { fonts, typography } from "../../constants/typography";
import { WeekCalendar } from "../../components/home/week-calendar";
import { JournalHero } from "../../components/home/journal-hero";
import { QuickPrompts } from "../../components/home/quick-prompts";

export default function HomeScreen() {
  const router = useRouter();
  const { data: userData } = useCurrentUser();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const { data } = useMemories({ limit: 100, date: selectedDate });
  const memories = useMemo(() => data?.memories ?? [], [data?.memories]);

  const displayName = userData?.user?.display_name || "there";
  const firstName = displayName.split(" ")[0];

  const handlePromptPress = useCallback((_text: string) => {
    router.push("/capture");
  }, [router]);

  const handleJournalHeroPress = useCallback(() => {
    router.push("/(tabs)/journey");
  }, [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {firstName}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={styles.avatarBtn}
            hitSlop={8}
          >
            {userData?.user?.avatar_url ? (
              <Image
                source={{ uri: userData.user.avatar_url }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {firstName[0]?.toUpperCase() ?? "?"}
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Week Calendar */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)}>
          <WeekCalendar
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d === selectedDate ? undefined : d)}
          />
        </Animated.View>

        {/* Journal Hero Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(120)}>
          <JournalHero onPress={handleJournalHeroPress} />
        </Animated.View>

        {/* Quick Journal Prompts */}
        <Animated.View entering={FadeInDown.duration(300).delay(180)}>
          <QuickPrompts onPromptPress={handlePromptPress} />
        </Animated.View>

        {/* Recent entries count */}
        {memories.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(240)}>
            <Pressable
              onPress={() => router.push("/(tabs)/journey")}
              style={styles.recentCard}
            >
              <Text style={styles.recentNumber}>{memories.length}</Text>
              <Text style={styles.recentLabel}>
                thought{memories.length !== 1 ? "s" : ""} captured
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0EFEB",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontFamily: fonts.semiBold,
    ...typography.xl,
    color: "#1E1E1E",
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D0C5B6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#FFF",
  },
  recentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  recentNumber: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: "#1E1E1E",
    letterSpacing: -0.5,
  },
  recentLabel: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#555555",
  },
});
