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
  ActivityIndicator,
  Animated as RNAnimated,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { Audio } from "expo-av";
import {
  X,
  Send,
  Mic,
  Image as ImageIcon,
  Camera,
  Square,
  Sparkles,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { apiFetch } from "../../lib/api/client";

// ── Helpers ──

/** Read a local file URI as a base64-encoded string (replaces deprecated readAsStringAsync). */
async function readFileAsBase64(uri: string): Promise<string> {
  const file = new ExpoFile(uri);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Convert bytes to base64 in chunks to avoid call stack overflow
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
  /** Auto-trigger mode: "text" focuses input, "voice" starts recording, "image" opens gallery */
  initialMode?: "text" | "voice" | "image" | null;
}

// ── Main Component ──

export function ComposeModal({ visible, onClose, initialMode }: ComposeModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [reply, setReply] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  // Track which mode was auto-triggered to avoid re-triggering
  const triggeredModeRef = useRef<string | null>(null);

  // Auto-trigger mode when modal opens
  useEffect(() => {
    if (visible && initialMode && triggeredModeRef.current !== initialMode) {
      triggeredModeRef.current = initialMode;
      if (initialMode === "text") {
        setTimeout(() => inputRef.current?.focus(), 350);
      } else if (initialMode === "voice") {
        // Small delay to let modal animate in before starting recording
        setTimeout(() => startRecording(), 400);
      } else if (initialMode === "image") {
        setTimeout(() => pickImage(), 400);
      }
    }
    if (!visible) {
      triggeredModeRef.current = null;
    }
  }, [visible, initialMode]);

  // Cleanup on close
  const handleClose = useCallback(() => {
    setText("");
    setReply(null);
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
    if (pulseAnimRef.current) {
      pulseAnimRef.current.stop();
      pulseAnimRef.current = null;
      pulseAnim.setValue(1);
    }
    onClose();
  }, [onClose]);

  // ── Send Text ──
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !imagePreview) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setSending(true);
    setReply(null);

    try {
      let response: ComposeResponse;

      if (imagePreview) {
        // Send image
        const base64 = await readFileAsBase64(imagePreview);
        response = await apiFetch<ComposeResponse>("/api/mobile/compose", {
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
        // Send text
        response = await apiFetch<ComposeResponse>("/api/mobile/compose", {
          method: "POST",
          body: JSON.stringify({
            message_type: "text",
            content: trimmed,
          }),
        });
      }

      setText("");
      if (response.reply) {
        setReply(response.reply);
      }
    } catch {
      setReply("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }, [text, imagePreview, imageMime]);

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

      // Pulse animation — use loop to avoid recursive re-render issues
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseAnimRef.current = loop;
      loop.start();

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Permission denied or other error
    }
  }, [pulseAnim]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pulseAnimRef.current) {
      pulseAnimRef.current.stop();
      pulseAnimRef.current = null;
      pulseAnim.setValue(1);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setReply("Recording failed — no audio file was created.");
        return;
      }

      setSending(true);
      setReply(null);

      // Read audio file as base64
      let base64: string;
      try {
        base64 = await readFileAsBase64(uri);
      } catch {
        setReply("Couldn't read the recorded audio file. Try again.");
        setSending(false);
        return;
      }

      // Reject empty or suspiciously small recordings
      if (!base64 || base64.length < 100) {
        setReply("Recording was too short or empty. Hold the button longer.");
        setSending(false);
        return;
      }

      const response = await apiFetch<ComposeResponse>("/api/mobile/compose", {
        method: "POST",
        body: JSON.stringify({
          message_type: "audio",
          media_base64: base64,
          mime_type: "audio/m4a",
        }),
      });

      if (response.reply) {
        setReply(response.reply);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      if (message.includes("413") || message.includes("too large")) {
        setReply("Voice note is too large. Try a shorter recording.");
      } else if (message.includes("401") || message.includes("auth")) {
        setReply("Session expired. Please restart the app and try again.");
      } else if (message.includes("timeout") || message.includes("network")) {
        setReply("Network issue. Check your connection and try again.");
      } else {
        setReply(`Couldn't process the voice note: ${message}`);
      }
    } finally {
      setSending(false);
      setRecordingDuration(0);
    }
  }, []);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <Pressable style={s.overlay} onPress={handleClose}>
          <Pressable
            style={[
              s.sheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={() => {}}
          >
            {/* ── Header ── */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Sparkles size={18} color={colors.primary} strokeWidth={2} />
                <Text style={[s.headerTitle, { color: colors.foreground }]}>
                  Talk to Groot
                </Text>
              </View>
              <Pressable onPress={handleClose} hitSlop={12}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* ── Reply bubble ── */}
            {reply && (
              <View style={[s.replyBubble, { backgroundColor: `${colors.primary}10` }]}>
                <Text style={[s.replyText, { color: colors.foreground }]}>
                  {reply}
                </Text>
                <Pressable
                  onPress={() => setReply(null)}
                  style={[s.replyDismiss, { backgroundColor: `${colors.primary}18` }]}
                >
                  <Text style={[s.replyDismissText, { color: colors.primary }]}>
                    New message
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ── Image preview ── */}
            {imagePreview && !reply && (
              <View style={s.imagePreviewWrap}>
                <RNAnimated.Image
                  source={{ uri: imagePreview }}
                  style={[s.imagePreview, { borderColor: colors.glassBorder }]}
                />
                <Pressable
                  onPress={() => setImagePreview(null)}
                  style={[s.imageRemove, { backgroundColor: colors.card }]}
                >
                  <X size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}

            {/* ── Recording state ── */}
            {recording && (
              <View style={s.recordingWrap}>
                <RNAnimated.View
                  style={[
                    s.recordingDot,
                    {
                      backgroundColor: colors.destructive,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <Text style={[s.recordingTime, { color: colors.foreground }]}>
                  {formatTime(recordingDuration)}
                </Text>
                <Text style={[s.recordingLabel, { color: colors.mutedForeground }]}>
                  Recording...
                </Text>
              </View>
            )}

            {/* ── Loading ── */}
            {sending && (
              <View style={s.sendingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[s.sendingText, { color: colors.mutedForeground }]}>
                  Groot is thinking...
                </Text>
              </View>
            )}

            {/* ── Input area ── */}
            {!reply && !recording && !sending && (
              <View style={[s.inputRow, { borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}>
                <TextInput
                  ref={inputRef}
                  style={[s.input, { color: colors.foreground }]}
                  placeholder={imagePreview ? "Add a caption..." : "What's on your mind?"}
                  placeholderTextColor={colors.mutedForeground}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={4000}
                  textAlignVertical="top"
                />
                <Pressable
                  onPress={handleSend}
                  disabled={!canSend}
                  style={[
                    s.sendBtn,
                    {
                      backgroundColor: canSend ? colors.primary : `${colors.primary}30`,
                    },
                  ]}
                >
                  <Send
                    size={18}
                    color={canSend ? colors.primaryForeground : colors.mutedForeground}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>
            )}

            {/* ── Action buttons ── */}
            {!reply && !sending && (
              <View style={s.actions}>
                {recording ? (
                  <Pressable
                    onPress={stopRecording}
                    style={[s.actionBtn, s.actionBtnWide, { backgroundColor: `${colors.destructive}15` }]}
                  >
                    <Square size={16} color={colors.destructive} strokeWidth={2.2} />
                    <Text style={[s.actionLabel, { color: colors.destructive }]}>
                      Stop Recording
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={startRecording}
                      style={[s.actionBtn, { backgroundColor: `${colors.chart3}12` }]}
                    >
                      <Mic size={18} color={colors.chart3} strokeWidth={2} />
                      <Text style={[s.actionLabel, { color: colors.chart3 }]}>Voice</Text>
                    </Pressable>
                    <Pressable
                      onPress={pickImage}
                      style={[s.actionBtn, { backgroundColor: `${colors.accent}12` }]}
                    >
                      <ImageIcon size={18} color={colors.accent} strokeWidth={2} />
                      <Text style={[s.actionLabel, { color: colors.accent }]}>Gallery</Text>
                    </Pressable>
                    <Pressable
                      onPress={takePhoto}
                      style={[s.actionBtn, { backgroundColor: `${colors.primary}12` }]}
                    >
                      <Camera size={18} color={colors.primary} strokeWidth={2} />
                      <Text style={[s.actionLabel, { color: colors.primary }]}>Camera</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ──

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 200,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },

  // ── Reply ──
  replyBubble: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  replyText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  replyDismiss: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  replyDismissText: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
  },

  // ── Image preview ──
  imagePreviewWrap: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
  },
  imageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // ── Recording ──
  recordingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    justifyContent: "center",
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingTime: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
    fontVariant: ["tabular-nums"],
  },
  recordingLabel: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },

  // ── Sending ──
  sendingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  sendingText: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },

  // ── Input ──
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    maxHeight: 120,
    minHeight: 40,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  // ── Actions ──
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnWide: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
  },
});
