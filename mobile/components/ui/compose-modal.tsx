import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { Audio } from "expo-av";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Camera,
  Square,
  X,
  Check,
} from "lucide-react-native";

import { fonts, typography } from "../../constants/typography";
import { apiFetch } from "../../lib/api/client";
import { VoiceWaveform } from "../feed/voice-waveform";

// ── Helpers ──

async function readFileAsBase64(uri: string): Promise<string> {
  const file = new ExpoFile(uri);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// ── Types ──

interface ComposeResponse {
  ok: boolean;
  reply: string;
  mood?: string | null;
  tasks?: number;
  error?: string;
}

interface ComposeModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: "text" | "voice" | "image" | null;
  initialPrompt?: string;
}

const PROMPTS = [
  "What's on your mind?",
  "What are you thinking about?",
  "Anything to capture?",
  "A thought, a feeling, anything...",
  "What happened today?",
];

function randomPrompt() {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

// ── Main Component ──

export function ComposeModal({ visible, onClose, initialMode, initialPrompt }: ComposeModalProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [placeholder] = useState(randomPrompt);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Recording dot blink
  const dotOpacity = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  // Pre-fill text from quick journal prompts
  useEffect(() => {
    if (visible && initialPrompt) {
      setText(initialPrompt);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [visible, initialPrompt]);

  const triggeredModeRef = useRef<string | null>(null);

  useEffect(() => {
    if (visible && initialMode && triggeredModeRef.current !== initialMode) {
      triggeredModeRef.current = initialMode;
      if (initialMode === "text") {
        setTimeout(() => inputRef.current?.focus(), 350);
      } else if (initialMode === "voice") {
        setTimeout(() => startRecording(), 400);
      } else if (initialMode === "image") {
        setTimeout(() => pickImage(), 400);
      }
    }
    if (!visible) {
      triggeredModeRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialMode]);

  const handleClose = useCallback(() => {
    setText("");
    setSent(false);
    setImagePreview(null);
    setImageMime("image/jpeg");
    setSending(false);
    setRecording(false);
    setRecordingDuration(0);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  }, [onClose]);

  // ── Send Text ──
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !imagePreview) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setSending(true);

    try {
      if (imagePreview) {
        const base64 = await readFileAsBase64(imagePreview);
        await apiFetch<ComposeResponse>("/api/mobile/compose", {
          method: "POST",
          body: JSON.stringify({
            message_type: "image",
            media_base64: base64,
            mime_type: imageMime,
            caption: trimmed || undefined,
          }),
        });
        setImagePreview(null);
      } else {
        await apiFetch<ComposeResponse>("/api/mobile/compose", {
          method: "POST",
          body: JSON.stringify({
            message_type: "text",
            content: trimmed,
          }),
        });
      }

      setText("");
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => handleClose(), 800);
    } catch {
      setSending(false);
    }
  }, [text, imagePreview, imageMime, handleClose]);

  // ── Voice Recording ──
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = rec;
      setRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Blink the recording dot
      dotOpacity.value = withRepeat(
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Permission denied
    }
  }, [dotOpacity]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setRecording(false);
    dotOpacity.value = withTiming(1, { duration: 100 });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) return;

      setSending(true);

      let base64: string;
      try {
        base64 = await readFileAsBase64(uri);
      } catch {
        setSending(false);
        return;
      }

      if (!base64 || base64.length < 100) {
        setSending(false);
        return;
      }

      await apiFetch<ComposeResponse>("/api/mobile/compose", {
        method: "POST",
        body: JSON.stringify({
          message_type: "audio",
          media_base64: base64,
          mime_type: "audio/m4a",
        }),
      });

      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => handleClose(), 800);
    } catch {
      setSending(false);
    }
  }, [handleClose, dotOpacity]);

  // ── Image Picker ──
  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImagePreview(asset.uri);
      setImageMime(asset.mimeType ?? "image/jpeg");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImagePreview(asset.uri);
      setImageMime(asset.mimeType ?? "image/jpeg");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const canSend = (text.trim().length > 0 || imagePreview) && !sending;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable style={s.overlay} onPress={handleClose}>
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(200)}
            style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          >
            <Pressable onPress={() => {}}>
              <View style={s.handle} />

              {/* Header */}
              <View style={s.header}>
                <Text style={s.headerTitle}>New Thought</Text>
                <Pressable onPress={handleClose} hitSlop={12} style={s.closeButton}>
                  <X size={18} color="#999" />
                </Pressable>
              </View>

              {/* Success state — card morph animation */}
              {sent && (
                <Animated.View entering={FadeIn.duration(200)} style={s.sentWrap}>
                  {/* Mini card that "becomes" the feed card */}
                  <Animated.View
                    entering={ZoomIn.springify().damping(12).stiffness(200)}
                    style={s.sentCard}
                  >
                    <View style={s.sentCardInner}>
                      <View style={s.sentIcon}>
                        <Check size={18} color="#FFF" strokeWidth={2.5} />
                      </View>
                      <Text style={s.sentTitle}>Captured</Text>
                    </View>
                    <Text style={s.sentSubtitle}>Your thought is safe with me</Text>
                  </Animated.View>
                </Animated.View>
              )}

              {/* Image preview */}
              {imagePreview && !sent && (
                <View style={s.imagePreviewWrap}>
                  <Animated.Image
                    entering={FadeIn.duration(200)}
                    source={{ uri: imagePreview }}
                    style={s.imagePreview}
                  />
                  <Pressable onPress={() => setImagePreview(null)} style={s.imageRemove}>
                    <X size={14} color="#999" />
                  </Pressable>
                </View>
              )}

              {/* Recording state */}
              {recording && (
                <Animated.View entering={FadeInUp.duration(300)} style={s.recordingWrap}>
                  <View style={s.recordingTop}>
                    <Animated.View style={[s.recordingDot, dotStyle]} />
                    <Text style={s.recordingTime}>{formatTime(recordingDuration)}</Text>
                  </View>
                  <VoiceWaveform active color="#1A1A1A" />
                  <Pressable onPress={stopRecording} style={s.stopBtn}>
                    <Square size={18} color="#FFF" strokeWidth={2.5} />
                  </Pressable>
                </Animated.View>
              )}

              {/* Sending */}
              {sending && !sent && (
                <View style={s.sendingWrap}>
                  <Text style={s.sendingText}>Saving your thought...</Text>
                </View>
              )}

              {/* Input */}
              {!recording && !sending && !sent && (
                <>
                  <View style={s.inputWrap}>
                    <TextInput
                      ref={inputRef}
                      style={s.input}
                      placeholder={placeholder}
                      placeholderTextColor="#D0CDC8"
                      value={text}
                      onChangeText={setText}
                      multiline
                      maxLength={4000}
                      textAlignVertical="top"
                      autoFocus={initialMode === "text"}
                    />
                  </View>

                  {/* Bottom bar: actions + send */}
                  <View style={s.bottomBar}>
                    <View style={s.modeButtons}>
                      <Pressable
                        onPress={startRecording}
                        onLongPress={startRecording}
                        onPressOut={() => {
                          // Auto-send when finger lifts if recording (hold-to-record)
                          if (recordingRef.current && recording) {
                            stopRecording();
                          }
                        }}
                        delayLongPress={300}
                        style={s.modeBtn}
                        hitSlop={6}
                      >
                        <Mic size={20} color="#999" strokeWidth={1.8} />
                      </Pressable>
                      <Pressable onPress={pickImage} style={s.modeBtn} hitSlop={6}>
                        <ImageIcon size={20} color="#999" strokeWidth={1.8} />
                      </Pressable>
                      <Pressable onPress={takePhoto} style={s.modeBtn} hitSlop={6}>
                        <Camera size={20} color="#999" strokeWidth={1.8} />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={handleSend}
                      disabled={!canSend}
                      style={[
                        s.sendBtn,
                        { backgroundColor: canSend ? "#1A1A1A" : "#E5E5E3" },
                      ]}
                    >
                      <Send
                        size={18}
                        color={canSend ? "#FFF" : "#BBB"}
                        strokeWidth={2.2}
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    minHeight: 280,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E5E3",
    marginBottom: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: "#1E1E1E",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },

  // Success — card morph
  sentWrap: {
    alignItems: "center",
    paddingVertical: 24,
  },
  sentCard: {
    backgroundColor: "#E6F7ED",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
    gap: 8,
  },
  sentCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#49A76C",
    alignItems: "center",
    justifyContent: "center",
  },
  sentTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#2A2A2A",
  },
  sentSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#49A76C",
    marginTop: 2,
  },

  // Image
  imagePreviewWrap: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  imageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  // Recording
  recordingWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 20,
  },
  recordingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E25555",
  },
  recordingTime: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: "#1A1A1A",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  stopBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E25555",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E25555",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  // Sending
  sendingWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  sendingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#C0BDB8",
  },

  // Input
  inputWrap: {
    backgroundColor: "#F9F9F8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    minHeight: 100,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 24,
    maxHeight: 160,
    minHeight: 70,
    padding: 0,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modeButtons: {
    flexDirection: "row",
    gap: 4,
  },
  modeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
