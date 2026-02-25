import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Sprout, ArrowRight, Mic, BookOpen, Sun } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useTheme } from "../lib/theme/provider";
import { typography } from "../constants/typography";
import { GradientBackground } from "../components/ui/gradient-background";
import { apiFetch } from "../lib/api/client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Screen Data ──────────────────────────────

interface OnboardingState {
  displayName: string;
  checkinTime: string;
  morningCheckin: boolean;
  eveningJournal: boolean;
  voiceCheckins: boolean;
}

// ── Main Screen ──────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>({
    displayName: "",
    checkinTime: "08:00",
    morningCheckin: true,
    eveningJournal: true,
    voiceCheckins: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const goNext = useCallback(() => {
    if (step < 4) {
      const nextStep = step + 1;
      setStep(nextStep);
      flatListRef.current?.scrollToIndex({ index: nextStep, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [step]);

  const handleComplete = useCallback(async () => {
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await apiFetch("/api/mobile/onboard", {
        method: "POST",
        body: JSON.stringify({
          displayName: state.displayName.trim() || undefined,
          checkinTime: state.checkinTime,
          preferences: {
            morning_checkin: state.morningCheckin,
            evening_journal: state.eveningJournal,
            voice_checkins: state.voiceCheckins,
          },
        }),
      });

      router.replace("/(tabs)/today");
    } catch {
      // Still navigate even if API fails
      router.replace("/(tabs)/today");
    } finally {
      setSubmitting(false);
    }
  }, [state, router]);

  const screens = [
    // Screen 1: Meet Groot
    <MeetGrootScreen key="meet" colors={colors} onNext={goNext} />,
    // Screen 2: How It Works
    <HowItWorksScreen key="how" colors={colors} onNext={goNext} />,
    // Screen 3: Your Name
    <YourNameScreen
      key="name"
      colors={colors}
      name={state.displayName}
      onChangeName={(n) => setState((s) => ({ ...s, displayName: n }))}
      onNext={goNext}
    />,
    // Screen 4: Set Your Time
    <SetTimeScreen
      key="time"
      colors={colors}
      state={state}
      onUpdate={(updates) => setState((s) => ({ ...s, ...updates }))}
      onNext={goNext}
    />,
    // Screen 5: First Question
    <FirstQuestionScreen
      key="question"
      colors={colors}
      name={state.displayName}
      onComplete={handleComplete}
      submitting={submitting}
    />,
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <GradientBackground>
        {/* Progress dots */}
        <View style={s.dotsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.muted,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <FlatList
          ref={flatListRef}
          data={screens}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH }}>{item}</View>
          )}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
        />
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Screen 1: Meet Groot ─────────────────────

function MeetGrootScreen({
  colors,
  onNext,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  onNext: () => void;
}) {
  return (
    <View style={s.screen}>
      <Animated.View entering={FadeInDown.duration(500)} style={s.content}>
        <View style={[s.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
          <Sprout size={48} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Text style={[s.title, { color: colors.foreground }]}>Meet Groot</Text>
        <Text style={[s.body, { color: colors.mutedForeground }]}>
          Your empathetic AI companion. I remember your stories, track your
          moods, and help you grow — one conversation at a time.
        </Text>
      </Animated.View>
      <ContinueButton colors={colors} onPress={onNext} />
    </View>
  );
}

// ── Screen 2: How It Works ───────────────────

function HowItWorksScreen({
  colors,
  onNext,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  onNext: () => void;
}) {
  const features = [
    { icon: BookOpen, label: "Journal daily", desc: "Text, voice, or photos" },
    { icon: Sun, label: "Morning check-ins", desc: "Start each day with intent" },
    { icon: Mic, label: "Voice notes", desc: "Speak freely, I'll listen" },
  ];

  return (
    <View style={s.screen}>
      <Animated.View entering={FadeInDown.duration(500)} style={s.content}>
        <Text style={[s.title, { color: colors.foreground }]}>How It Works</Text>
        <View style={s.features}>
          {features.map((f, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.duration(400).delay(200 + i * 100)}
              style={s.featureRow}
            >
              <View style={[s.featureIcon, { backgroundColor: `${colors.primary}12` }]}>
                <f.icon size={20} color={colors.primary} strokeWidth={1.8} />
              </View>
              <View>
                <Text style={[s.featureLabel, { color: colors.foreground }]}>{f.label}</Text>
                <Text style={[s.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
      <ContinueButton colors={colors} onPress={onNext} />
    </View>
  );
}

// ── Screen 3: Your Name ──────────────────────

function YourNameScreen({
  colors,
  name,
  onChangeName,
  onNext,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  name: string;
  onChangeName: (name: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={s.screen}>
      <Animated.View entering={FadeInDown.duration(500)} style={s.content}>
        <Text style={[s.title, { color: colors.foreground }]}>What should I call you?</Text>
        <Text style={[s.body, { color: colors.mutedForeground }]}>
          Just your first name is fine. You can always change it later.
        </Text>
        <TextInput
          style={[
            s.nameInput,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.secondary,
            },
          ]}
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={onChangeName}
          autoCapitalize="words"
          autoFocus
        />
      </Animated.View>
      <ContinueButton colors={colors} onPress={onNext} disabled={!name.trim()} />
    </View>
  );
}

// ── Screen 4: Set Your Time ──────────────────

function SetTimeScreen({
  colors,
  state,
  onUpdate,
  onNext,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
}) {
  return (
    <View style={s.screen}>
      <Animated.View entering={FadeInDown.duration(500)} style={s.content}>
        <Text style={[s.title, { color: colors.foreground }]}>Set Your Rhythm</Text>
        <Text style={[s.body, { color: colors.mutedForeground }]}>
          Choose when Groot reaches out to you.
        </Text>

        <View style={s.toggleList}>
          <ToggleRow
            colors={colors}
            label="Morning Check-in"
            desc="Start your day with intent"
            value={state.morningCheckin}
            onToggle={(v) => onUpdate({ morningCheckin: v })}
          />
          <ToggleRow
            colors={colors}
            label="Evening Reflection"
            desc="Close your day with a thought"
            value={state.eveningJournal}
            onToggle={(v) => onUpdate({ eveningJournal: v })}
          />
          <ToggleRow
            colors={colors}
            label="Voice Check-ins"
            desc="Respond via voice notes"
            value={state.voiceCheckins}
            onToggle={(v) => onUpdate({ voiceCheckins: v })}
          />
        </View>
      </Animated.View>
      <ContinueButton colors={colors} onPress={onNext} />
    </View>
  );
}

function ToggleRow({
  colors,
  label,
  desc,
  value,
  onToggle,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  label: string;
  desc: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={s.toggleInfo}>
        <Text style={[s.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[s.toggleDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: `${colors.primary}60` }}
        thumbColor={value ? colors.primary : colors.mutedForeground}
      />
    </View>
  );
}

// ── Screen 5: First Question ─────────────────

function FirstQuestionScreen({
  colors,
  name,
  onComplete,
  submitting,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  name: string;
  onComplete: () => void;
  submitting: boolean;
}) {
  return (
    <View style={s.screen}>
      <Animated.View entering={FadeInDown.duration(500)} style={s.content}>
        <View style={[s.iconCircle, { backgroundColor: `${colors.moodGreat}18` }]}>
          <Sprout size={48} color={colors.moodGreat} strokeWidth={1.5} />
        </View>
        <Text style={[s.title, { color: colors.foreground }]}>
          Ready, {name || "friend"}?
        </Text>
        <Text style={[s.body, { color: colors.mutedForeground }]}>
          Your garden is planted. Let's start growing together. I'll ask you a
          question to get us started.
        </Text>
      </Animated.View>
      <Pressable
        onPress={onComplete}
        disabled={submitting}
        style={[
          s.continueBtn,
          { backgroundColor: submitting ? `${colors.primary}60` : colors.primary },
        ]}
      >
        <Text style={[s.continueBtnText, { color: colors.primaryForeground }]}>
          {submitting ? "Setting up..." : "Start My Garden"}
        </Text>
        {!submitting && <ArrowRight size={18} color={colors.primaryForeground} />}
      </Pressable>
    </View>
  );
}

// ── Continue Button ──────────────────────────

function ContinueButton({
  colors,
  onPress,
  disabled,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        s.continueBtn,
        { backgroundColor: disabled ? `${colors.primary}40` : colors.primary },
      ]}
    >
      <Text style={[s.continueBtnText, { color: colors.primaryForeground }]}>Continue</Text>
      <ArrowRight size={18} color={colors.primaryForeground} />
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  features: {
    marginTop: 32,
    gap: 20,
    width: "100%",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  featureDesc: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 1,
  },
  nameInput: {
    fontFamily: "Manrope_500Medium",
    ...typography.lg,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 24,
    width: "100%",
    maxWidth: 280,
  },
  toggleList: {
    marginTop: 24,
    width: "100%",
    gap: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  toggleDesc: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 1,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  continueBtnText: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
});
