import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sparkles, TrendingUp, HelpCircle } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "../ui/glass-card";
import type { Report } from "../../../shared/types/api";

interface WeeklyCardProps {
  report: Report;
}

/**
 * Displays a weekly "Your Week in 3 Moments" card.
 * Reads structured insights from the report's `insights` JSON field.
 */
export function WeeklyCard({ report }: WeeklyCardProps) {
  const { colors } = useTheme();

  // Parse insights — stored as JSON { highlight, pattern, question, stats }
  const insights = parseInsights(report.insights);

  const weekRange = formatWeekRange(report.week_start, report.week_end);

  return (
    <GlassCard delay={100} padding={16}>
      <Text style={[s.title, { color: colors.foreground }]}>Your Week in 3 Moments</Text>
      <Text style={[s.dateRange, { color: colors.mutedForeground }]}>{weekRange}</Text>

      {/* Moment 1: Highlight */}
      <View style={s.momentRow}>
        <View style={[s.iconCircle, { backgroundColor: `${colors.moodGreat}18` }]}>
          <Sparkles size={16} color={colors.moodGreat} />
        </View>
        <View style={s.momentContent}>
          <Text style={[s.momentLabel, { color: colors.moodGreat }]}>Highlight</Text>
          <Text style={[s.momentText, { color: colors.foreground }]}>
            {insights.highlight || "A week of steady progress"}
          </Text>
        </View>
      </View>

      {/* Moment 2: Pattern */}
      <View style={s.momentRow}>
        <View style={[s.iconCircle, { backgroundColor: `${colors.accent}18` }]}>
          <TrendingUp size={16} color={colors.accent} />
        </View>
        <View style={s.momentContent}>
          <Text style={[s.momentLabel, { color: colors.accent }]}>Pattern</Text>
          <Text style={[s.momentText, { color: colors.foreground }]}>
            {insights.pattern || "Building consistent habits"}
          </Text>
        </View>
      </View>

      {/* Moment 3: Question */}
      <View style={s.momentRow}>
        <View style={[s.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
          <HelpCircle size={16} color={colors.primary} />
        </View>
        <View style={s.momentContent}>
          <Text style={[s.momentLabel, { color: colors.primary }]}>Question</Text>
          <Text style={[s.momentText, { color: colors.foreground }]}>
            {insights.question || "What brought you energy this week?"}
          </Text>
        </View>
      </View>

      {/* Stats bar */}
      {insights.stats && (
        <View style={[s.statsBar, { borderColor: colors.border }]}>
          {insights.stats.messages > 0 && (
            <StatPill label={`${insights.stats.messages} msgs`} colors={colors} />
          )}
          {insights.stats.memories > 0 && (
            <StatPill label={`${insights.stats.memories} memories`} colors={colors} />
          )}
          {insights.stats.avgMood != null && (
            <StatPill label={`Mood ${insights.stats.avgMood.toFixed(1)}`} colors={colors} />
          )}
          {insights.stats.topStreak > 0 && (
            <StatPill label={`${insights.stats.topStreak}d streak`} colors={colors} />
          )}
        </View>
      )}
    </GlassCard>
  );
}

function StatPill({ label, colors }: { label: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={[s.pill, { backgroundColor: colors.secondary }]}>
      <Text style={[s.pillText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ── Helpers ──────────────────────────────────

interface ParsedInsights {
  highlight: string;
  pattern: string;
  question: string;
  stats: {
    messages: number;
    memories: number;
    avgMood: number | null;
    topHabit: string | null;
    topStreak: number;
  } | null;
}

function parseInsights(raw: string | null): ParsedInsights {
  const defaults: ParsedInsights = {
    highlight: "",
    pattern: "",
    question: "",
    stats: null,
  };

  if (!raw) return defaults;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      highlight: parsed.highlight ?? "",
      pattern: parsed.pattern ?? "",
      question: parsed.question ?? "",
      stats: parsed.stats ?? null,
    };
  } catch {
    return defaults;
  }
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} — ${e.toLocaleDateString("en-US", opts)}`;
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  title: {
    fontFamily: "Sora_700Bold",
    ...typography.base,
    marginBottom: 2,
  },
  dateRange: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginBottom: 16,
  },
  momentRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  momentContent: {
    flex: 1,
  },
  momentLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  momentText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 20,
  },
  statsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
});
