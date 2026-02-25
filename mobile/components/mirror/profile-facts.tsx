import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { User, Heart, Target, Star } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "../ui/glass-card";
import { SectionHeader } from "../ui/section-header";

interface ProfileFact {
  id: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  lastMentioned: string | null;
}

interface ProfileFactsProps {
  facts: ProfileFact[];
}

function getFactIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes("name") || k.includes("age") || k.includes("location")) return User;
  if (k.includes("like") || k.includes("love") || k.includes("enjoy")) return Heart;
  if (k.includes("goal") || k.includes("want") || k.includes("plan")) return Target;
  return Star;
}

export function ProfileFacts({ facts }: ProfileFactsProps) {
  const { colors } = useTheme();

  if (facts.length === 0) return null;

  // Group into categories
  const grouped = {
    identity: facts.filter((f) => ["name", "age", "location", "job", "profession"].some((k) => f.key.toLowerCase().includes(k))),
    preferences: facts.filter((f) => ["like", "love", "prefer", "enjoy", "favorite"].some((k) => f.key.toLowerCase().includes(k))),
    goals: facts.filter((f) => ["goal", "want", "plan", "wish", "hope"].some((k) => f.key.toLowerCase().includes(k))),
    other: [] as ProfileFact[],
  };

  // Everything else goes to "other"
  const categorized = new Set([...grouped.identity, ...grouped.preferences, ...grouped.goals].map((f) => f.id));
  grouped.other = facts.filter((f) => !categorized.has(f.id));

  const sections = [
    { title: "About You", facts: grouped.identity, icon: User },
    { title: "Preferences", facts: grouped.preferences, icon: Heart },
    { title: "Goals", facts: grouped.goals, icon: Target },
    { title: "Other", facts: grouped.other, icon: Star },
  ].filter((s) => s.facts.length > 0);

  return (
    <View>
      <SectionHeader title="What Groot Knows" />
      {sections.map((section) => (
        <GlassCard key={section.title} delay={100} padding={14} style={s.card}>
          <View style={s.sectionHeader}>
            <section.icon size={14} color={colors.primary} />
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>
              {section.title}
            </Text>
          </View>
          {section.facts.map((fact) => (
            <View key={fact.id} style={s.factRow}>
              <Text style={[s.factKey, { color: colors.mutedForeground }]}>
                {fact.key}
              </Text>
              <Text style={[s.factValue, { color: colors.foreground }]} numberOfLines={2}>
                {fact.value}
              </Text>
            </View>
          ))}
        </GlassCard>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
    gap: 12,
  },
  factKey: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    flex: 0.4,
  },
  factValue: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    flex: 0.6,
    textAlign: "right",
  },
});
