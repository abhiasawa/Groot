import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";

import { fonts, typography } from "../../constants/typography";
import { PROMPT_COLORS } from "../../constants/card-colors";

interface Prompt {
  title: string;
  body: string;
  bg: string;
  initialText: string;
  tag: string;
}

const PROMPTS: Prompt[] = [
  {
    title: "Pause & reflect",
    body: "Take a moment to think about what you're grateful for",
    bg: PROMPT_COLORS.rose,
    initialText: "What are you grateful for today?",
    tag: "Personal",
  },
  {
    title: "Set Intentions",
    body: "Define how you want to feel and show up today",
    bg: PROMPT_COLORS.lavender,
    initialText: "How do you want to feel today?",
    tag: "Personal",
  },
  {
    title: "Embrace the Present",
    body: "Let go of yesterday and focus on this moment",
    bg: PROMPT_COLORS.stone,
    initialText: "What can you let go of today?",
    tag: "Family",
  },
];

interface QuickPromptsProps {
  onPromptPress?: (initialText: string) => void;
}

export function QuickPrompts({ onPromptPress }: QuickPromptsProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Journal</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PROMPTS.map((prompt) => (
          <Pressable
            key={prompt.title}
            onPress={() => onPromptPress?.(prompt.initialText)}
            style={[styles.card, { backgroundColor: prompt.bg }]}
          >
            <Text style={styles.cardTitle}>{prompt.title}</Text>
            <Text style={styles.cardBody} numberOfLines={3}>
              {prompt.body}
            </Text>
            <View style={styles.tagRow}>
              <Text style={styles.tagToday}>Today</Text>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{prompt.tag}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
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
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  card: {
    width: 160,
    height: 150,
    borderRadius: 16,
    padding: 14,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#1E1E1E",
    letterSpacing: -0.1,
  },
  cardBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(30,30,30,0.6)",
    lineHeight: 17,
    marginTop: 4,
    flex: 1,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagToday: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "rgba(30,30,30,0.5)",
  },
  tagBadge: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: "rgba(30,30,30,0.6)",
  },
});
