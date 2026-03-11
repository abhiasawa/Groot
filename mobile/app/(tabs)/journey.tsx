import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useMemories } from "../../lib/api/queries";
import { fonts, typography } from "../../constants/typography";
import { type EmotionType } from "../../constants/card-colors";
import { EmotionsChart } from "../../components/journey/emotions-chart";
import type { Memory } from "../../../shared/types/api";

// ── Emotion keyword classifier ──────────────────────────────
const EMOTION_KEYWORDS: Record<EmotionType, RegExp> = {
  happy: /\b(happy|joy|excited|grateful|thankful|proud|love|wonderful|amazing|great|blessed|celebrate|smile|laugh|fun|delight|elated|cheerful|glad)\b/i,
  sad: /\b(sad|miss|lonely|lost|grief|cry|hurt|heartbreak|regret|sorrow|depressed|down|melancholy|blue|disappointed)\b/i,
  calm: /\b(calm|peace|serene|relax|content|mindful|quiet|still|gentle|balanced|centered|tranquil|meditat|breath)\b/i,
  anxious: /\b(anxious|worried|stress|nervous|overwhelm|afraid|scared|panic|tense|uncertain|restless|uneasy|fear|concern|dread)\b/i,
};

function classifyEmotion(text: string): EmotionType | null {
  if (!text) return null;
  for (const [emotion, regex] of Object.entries(EMOTION_KEYWORDS)) {
    if (regex.test(text)) return emotion as EmotionType;
  }
  return null;
}

function analyzeEmotions(memories: Memory[]) {
  const counts: Record<EmotionType, number> = { happy: 0, sad: 0, calm: 0, anxious: 0 };
  let total = 0;

  for (const m of memories) {
    const text = m.content || m.media_description || "";
    const emotion = classifyEmotion(text);
    if (emotion) {
      counts[emotion]++;
      total++;
    }
  }

  if (total === 0) return { happy: 25, sad: 25, calm: 25, anxious: 25 };

  return {
    happy: Math.round((counts.happy / total) * 100),
    sad: Math.round((counts.sad / total) * 100),
    calm: Math.round((counts.calm / total) * 100),
    anxious: Math.round((counts.anxious / total) * 100),
  };
}

export default function JourneyScreen() {
  const router = useRouter();
  const { data } = useMemories({ limit: 100 });
  const memories = useMemo(() => data?.memories ?? [], [data?.memories]);
  const emotionData = useMemo(() => analyzeEmotions(memories), [memories]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>My Journal</Text>

        {/* Stats hero */}
        <View style={styles.statsHero}>
          <Text style={styles.statsNumber}>{memories.length}</Text>
          <Text style={styles.statsSubtitle}>
            {memories.length > 0
              ? "Thoughts captured on your journey"
              : "Start capturing your thoughts"}
          </Text>
        </View>

        {/* Emotions card */}
        <EmotionsChart data={emotionData} />

        {/* CTA */}
        <Pressable
          onPress={() => router.push("/capture")}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaText}>Create a New Journal</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0EFEB" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },
  pageTitle: {
    fontFamily: fonts.bold,
    ...typography.xl,
    color: "#1E1E1E",
    marginBottom: 24,
  },
  statsHero: {
    alignItems: "center",
    marginBottom: 28,
  },
  statsNumber: {
    fontFamily: fonts.bold,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1.5,
    color: "#1E1E1E",
  },
  statsSubtitle: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#555555",
    marginTop: 4,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#FFBB2C",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  ctaText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#1E1E1E",
  },
});
