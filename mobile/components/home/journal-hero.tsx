import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { fonts, typography } from "../../constants/typography";
import { AnimatedSun } from "../ui/animated-sun";
import { notoTheme } from "../../lib/theme/tokens";

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

interface JournalHeroProps {
  onPress?: () => void;
}

export function JournalHero({ onPress }: JournalHeroProps) {
  const timeOfDay = getTimeOfDay();

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Journal</Text>
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {/* Hero card row */}
      <View style={styles.cardRow}>
        {/* Main card */}
        <Pressable onPress={onPress} style={styles.mainCard}>
          <View style={styles.mainCardContent}>
            <Text style={styles.heroTitle}>Let's start{"\n"}your day</Text>
            <Text style={styles.heroSubtitle}>
              Write down your thoughts and feelings
            </Text>
          </View>
          <View style={styles.sunContainer}>
            <AnimatedSun size={100} />
          </View>
        </Pressable>

        {/* Sidebar strip */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarText}>{timeOfDay}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    ...typography.lg,
    color: "#1E1E1E",
  },
  seeAll: {
    fontFamily: fonts.medium,
    ...typography.sm,
    color: "rgba(30,30,30,0.5)",
  },
  cardRow: {
    flexDirection: "row",
    height: 200,
    gap: 8,
  },
  mainCard: {
    flex: 1,
    backgroundColor: notoTheme.accent,
    borderRadius: 20,
    padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  mainCardContent: {
    flex: 1,
    zIndex: 1,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: "#1E1E1E",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "rgba(30,30,30,0.7)",
    marginTop: 6,
    maxWidth: 160,
  },
  sunContainer: {
    position: "absolute",
    right: -8,
    bottom: -8,
  },
  sidebar: {
    width: 56,
    backgroundColor: "#CFC5B6",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#FFF",
    transform: [{ rotate: "-90deg" }],
    width: 100,
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
