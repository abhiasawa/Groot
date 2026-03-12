import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { Audio } from "expo-av";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Square, X, ImagePlus, Camera } from "lucide-react-native";

import { useQueryClient } from "@tanstack/react-query";
import { fonts } from "../../constants/typography";
import { apiFetch } from "../../lib/api/client";
import { NotoMascot } from "./noto-mascot";

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
  editId?: string;
  editContent?: string;
}

// ── Main Component ──

export function ComposeModal({
  visible,
  onClose,
  initialMode,
  editId,
  editContent,
}: ComposeModalProps) {
  const isEditMode = !!editId;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"text" | "voice" | "image">(
    initialMode ?? "voice",
  );
  const [sent, setSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [textDraft, setTextDraft] = useState(editContent ?? "");
  const [submittingText, setSubmittingText] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStarted = useRef(false);

  // Pulse ring
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value * 1.15 }],
    opacity: ringOpacity.value * 0.5,
  }));

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    // eslint-disable-next-line react-hooks/immutability
    ringScale.value = 1;
    // eslint-disable-next-line react-hooks/immutability
    ringOpacity.value = 0;
    setSent(false);
    setTranscribing(false);
    setTranscript("");
    setTextDraft(editContent ?? "");
    setMode(initialMode ?? "voice");
    setSubmittingText(false);
    setImageUri(null);
    setImageMime("image/jpeg");
    setRecording(false);
    setRecordingDuration(0);
    onClose();
  }, [editContent, initialMode, onClose, ringScale, ringOpacity]);

  // ── Start recording (single continuous) ──
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const { recording: rec } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          numberOfChannels: 1,
          sampleRate: 44100,
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          numberOfChannels: 1,
          audioQuality: Audio.IOSAudioQuality.HIGH,
        },
      });

      recordingRef.current = rec;
      setRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Pulse rings
      // eslint-disable-next-line react-hooks/immutability
      ringOpacity.value = withTiming(0.25, { duration: 600 });
      // eslint-disable-next-line react-hooks/immutability
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.12, {
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Permission denied or audio error
    }
  }, [ringScale, ringOpacity]);

  useEffect(() => {
    if (visible) {
      setMode(initialMode ?? "voice");
      if (!editId) {
        setTextDraft(editContent ?? "");
      }
    }
  }, [visible, initialMode, editContent, editId]);

  useEffect(() => {
    if (visible && mode === "voice" && !isEditMode && !autoStarted.current) {
      autoStarted.current = true;
      setTimeout(() => {
        void startRecording();
      }, 300);
    }
    if (!visible || mode !== "voice") {
      autoStarted.current = false;
    }
  }, [visible, isEditMode, mode, startRecording]);

  // ── Stop, transcribe, then send ──
  const stopAndSend = useCallback(async () => {
    if (!recordingRef.current) return;

    setRecording(false);
    // eslint-disable-next-line react-hooks/immutability
    ringOpacity.value = withTiming(0, { duration: 200 });
    // eslint-disable-next-line react-hooks/immutability
    ringScale.value = withTiming(1, { duration: 200 });
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

      let audioBase64: string;
      try {
        audioBase64 = await readFileAsBase64(uri);
      } catch {
        return;
      }
      if (!audioBase64 || audioBase64.length < 100) return;

      // Show transcribing state with mascot
      setTranscribing(true);

      const capturedImageUri = imageUri;
      const capturedImageMime = imageMime;

      // Quick transcription preview — fire off to transcribe-chunk endpoint
      apiFetch<{ text: string }>("/api/mobile/transcribe-chunk", {
        method: "POST",
        body: JSON.stringify({
          audio_base64: audioBase64,
          mime_type: "audio/m4a",
        }),
      })
        .then((res) => {
          if (res.text?.trim()) {
            setTranscript(res.text.trim());
          }
        })
        .catch(() => {})
        .finally(() => {
          // Show success after a moment whether or not transcription worked
          setTimeout(() => {
            setSent(true);
            setTranscribing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => handleClose(), 1200);
          }, 500);
        });

      // Fire-and-forget: upload audio + image in background
      (async () => {
        try {
          if (capturedImageUri) {
            const imgBase64 = await readFileAsBase64(capturedImageUri);
            await apiFetch<ComposeResponse>("/api/mobile/compose", {
              method: "POST",
              body: JSON.stringify({
                message_type: "image",
                media_base64: imgBase64,
                mime_type: capturedImageMime,
              }),
            }).catch(() => {});
          }

          await apiFetch<ComposeResponse>("/api/mobile/compose", {
            method: "POST",
            body: JSON.stringify({
              message_type: "audio",
              media_base64: audioBase64,
              mime_type: "audio/m4a",
            }),
          });
        } catch {
          /* silent */
        }
      })();
    } catch {
      // Recording stop failed
    }
  }, [handleClose, ringScale, ringOpacity, imageUri, imageMime]);

  // ── Image attachment ──
  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageMime(result.assets[0].mimeType ?? "image/jpeg");
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
      setImageUri(result.assets[0].uri);
      setImageMime(result.assets[0].mimeType ?? "image/jpeg");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const submitText = useCallback(async () => {
    if (!textDraft.trim()) return;

    setSubmittingText(true);

    try {
      await apiFetch<ComposeResponse>("/api/mobile/compose", {
        method: "POST",
        body: JSON.stringify({
          message_type: "text",
          content: textDraft.trim(),
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => handleClose(), 1000);
    } catch {
      setSubmittingText(false);
    }
  }, [handleClose, queryClient, textDraft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[
          s.fullscreen,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Close */}
        <View style={s.topBar}>
          <Pressable onPress={handleClose} hitSlop={12} style={s.closeBtn}>
            <X size={18} color="#C0BDB8" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Success */}
        {sent && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={s.centerContent}
          >
            <NotoMascot size={220} />
            {transcript ? (
              <ScrollView
                style={s.successTranscript}
                showsVerticalScrollIndicator={false}
              >
                <Text style={s.successTranscriptText}>{transcript}</Text>
              </ScrollView>
            ) : (
              <Animated.Text
                entering={FadeInDown.duration(300).delay(100)}
                style={s.capturedTitle}
              >
                Thought captured
              </Animated.Text>
            )}
          </Animated.View>
        )}

        {/* Transcribing — after recording, before success */}
        {transcribing && !sent && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={s.centerContent}
          >
            <NotoMascot size={180} />
            <Text style={s.transcribingText}>Transcribing...</Text>
          </Animated.View>
        )}

        {/* Recording */}
        {recording && !sent && !transcribing && (
          <View style={s.recordingLayout}>
            {/* Mascot with rings */}
            <View style={s.mascotSection}>
              <View style={s.ringContainer}>
                <Animated.View style={[s.ring, s.ringOuter, ring2Style]} />
                <Animated.View style={[s.ring, s.ringInner, ringStyle]} />
              </View>
              <NotoMascot size={180} />
              <Text style={s.timerText}>{formatTime(recordingDuration)}</Text>
              <Text style={s.listeningText}>Listening...</Text>
            </View>

            {/* Image thumbnail */}
            {imageUri && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={s.thumbWrap}
              >
                <Image source={{ uri: imageUri }} style={s.thumb} />
                <Pressable
                  onPress={() => setImageUri(null)}
                  style={s.thumbRemove}
                >
                  <X size={8} color="#999" strokeWidth={3} />
                </Pressable>
              </Animated.View>
            )}

            {/* Spacer to push bottom bar down */}
            <View style={{ flex: 1 }} />

            {/* Bottom actions */}
            <View style={s.bottomBar}>
              <Pressable onPress={pickImage} style={s.photoBtn} hitSlop={8}>
                <ImagePlus size={20} color="#C0BDB8" strokeWidth={1.6} />
              </Pressable>
              <Pressable onPress={stopAndSend} style={s.stopBtn}>
                <Square size={18} color="#FFF" strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={takePhoto} style={s.photoBtn} hitSlop={8}>
                <Camera size={20} color="#C0BDB8" strokeWidth={1.6} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Pre-recording */}
        {!recording && !sent && !transcribing && (
          <View style={s.centerContent}>
            <NotoMascot size={180} />
            <View style={s.modeTabs}>
              <Pressable
                onPress={() => setMode("text")}
                style={[s.modeTab, mode === "text" && s.modeTabActive]}
              >
                <Text
                  style={[
                    s.modeTabText,
                    mode === "text" && s.modeTabTextActive,
                  ]}
                >
                  Note
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("voice")}
                style={[s.modeTab, mode === "voice" && s.modeTabActive]}
              >
                <Text
                  style={[
                    s.modeTabText,
                    mode === "voice" && s.modeTabTextActive,
                  ]}
                >
                  Voice
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("image")}
                style={[s.modeTab, mode === "image" && s.modeTabActive]}
              >
                <Text
                  style={[
                    s.modeTabText,
                    mode === "image" && s.modeTabTextActive,
                  ]}
                >
                  Photo
                </Text>
              </Pressable>
            </View>

            {mode === "text" ? (
              <View style={s.idlePanel}>
                <Text style={s.idleTitle}>Write it before it drifts away</Text>
                <Text style={s.idleSubtitle}>
                  Add a quick note straight into your memory stream.
                </Text>
                <TextInput
                  multiline
                  value={textDraft}
                  onChangeText={setTextDraft}
                  placeholder="What happened, what are you feeling, what do you want to remember?"
                  placeholderTextColor="#B7B2AA"
                  style={s.textInput}
                />
                <Pressable
                  onPress={() => void submitText()}
                  style={[
                    s.primaryIdleButton,
                    (!textDraft.trim() || submittingText) &&
                      s.primaryIdleButtonDisabled,
                  ]}
                  disabled={!textDraft.trim() || submittingText}
                >
                  <Text style={s.primaryIdleButtonText}>
                    {submittingText ? "Saving..." : "Save thought"}
                  </Text>
                </Pressable>
              </View>
            ) : mode === "image" ? (
              <View style={s.idlePanel}>
                <Text style={s.idleTitle}>Capture a photo memory</Text>
                <Text style={s.idleSubtitle}>
                  Add an image from your camera or library, then record if you
                  want context.
                </Text>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={s.idleImagePreview}
                  />
                ) : null}
                <View style={s.imageActions}>
                  <Pressable onPress={pickImage} style={s.secondaryIdleButton}>
                    <Text style={s.secondaryIdleButtonText}>Choose photo</Text>
                  </Pressable>
                  <Pressable onPress={takePhoto} style={s.secondaryIdleButton}>
                    <Text style={s.secondaryIdleButtonText}>Take photo</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setMode("voice")}
                  style={s.primaryIdleButton}
                >
                  <Text style={s.primaryIdleButtonText}>
                    Record with this photo
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.idlePanel}>
                <Text style={s.idleTitle}>Start recording</Text>
                <Text style={s.idleSubtitle}>
                  Speak naturally. You can attach a photo while recording.
                </Text>
                <Pressable
                  onPress={() => void startRecording()}
                  style={s.primaryIdleButton}
                >
                  <Text style={s.primaryIdleButtonText}>
                    Start voice capture
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const RING_SIZE = 200;

const s = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: "#FEFEFE" },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#F5F4F2",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginTop: 22,
  },
  modeTab: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modeTabActive: {
    backgroundColor: "#1A1A1A",
  },
  modeTabText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#8B857D",
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  idlePanel: {
    width: "100%",
    paddingHorizontal: 28,
    marginTop: 24,
    alignItems: "center",
  },
  idleTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    color: "#1A1A1A",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  idleSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#8B857D",
    textAlign: "center",
    marginTop: 10,
    maxWidth: 300,
  },
  textInput: {
    width: "100%",
    minHeight: 146,
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: "#F8F6F3",
    borderWidth: 1,
    borderColor: "#EAE3D8",
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: "#1A1A1A",
    textAlignVertical: "top",
  },
  primaryIdleButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  primaryIdleButtonDisabled: {
    opacity: 0.45,
  },
  primaryIdleButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  secondaryIdleButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F5F4F2",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryIdleButtonText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#1A1A1A",
  },
  imageActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  idleImagePreview: {
    width: 160,
    height: 160,
    borderRadius: 24,
    marginTop: 18,
  },

  // Recording layout
  recordingLayout: { flex: 1, alignItems: "center", paddingTop: 24 },
  mascotSection: { alignItems: "center", justifyContent: "center" },
  ringContainer: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
  },
  ringInner: { width: RING_SIZE, height: RING_SIZE },
  ringOuter: { width: RING_SIZE + 40, height: RING_SIZE + 40 },

  timerText: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: "#1A1A1A",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
    marginTop: 16,
  },
  listeningText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#C0BDB8",
    marginTop: 4,
  },

  // Transcribing
  transcribingText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#C0BDB8",
    marginTop: 16,
  },

  // Success transcript
  successTranscript: { maxHeight: 200, marginTop: 16, paddingHorizontal: 32 },
  successTranscriptText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 26,
    textAlign: "center",
  },

  // Image thumbnail
  thumbWrap: { marginTop: 20 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#F0EFED",
  },
  thumbRemove: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E6E3",
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 36,
    paddingBottom: 28,
  },
  photoBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

  capturedTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: "#1A1A1A",
    marginTop: 16,
  },
  startingText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#D0CDC8",
    marginTop: 16,
  },
});
