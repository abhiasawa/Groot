import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated as RNAnimated,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Send,
  Mic,
  Image as ImageIcon,
  Square,
  Sprout,
  ChevronDown,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { apiFetch } from "../../lib/api/client";
import { ChatBubble, DateSeparator, TypingIndicator } from "./chat-bubble";

// ── Types ──

interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  content: string | null;
  media_url?: string | null;
  media_description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface MessagesResponse {
  messages: ChatMessage[];
  has_more: boolean;
  cursor: string | null;
}

interface ComposeResponse {
  ok: boolean;
  reply: string;
  reply_id?: string;
  inbound_id?: string;
  mood?: string | null;
  tasks?: number;
  error?: string;
}

interface ChatScreenProps {
  visible: boolean;
  onClose: () => void;
}

// ── Main Component ──

export function ChatScreen({ visible, onClose }: ChatScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const pulseAnimRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  // ── Load message history on open ──
  useEffect(() => {
    if (visible) {
      loadMessages();
    } else {
      // Reset state on close
      setMessages([]);
      setCursor(null);
      setHasMore(false);
      setInitialLoad(true);
    }
  }, [visible]);

  const loadMessages = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apiFetch<MessagesResponse>(
        "/api/mobile/messages?limit=50",
      );
      setMessages(res.messages);
      setHasMore(res.has_more);
      setCursor(res.cursor);
    } catch {
      // Silently fail — will show empty chat
    } finally {
      setLoadingHistory(false);
      setInitialLoad(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || !cursor || loadingHistory) return;

    setLoadingHistory(true);
    try {
      const res = await apiFetch<MessagesResponse>(
        `/api/mobile/messages?limit=30&before=${cursor}`,
      );
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMore(res.has_more);
      setCursor(res.cursor);
    } catch {
      // Silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, [hasMore, cursor, loadingHistory]);

  // ── Send text message ──
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setSending(true);
    setText("");

    // Optimistic: add user's message immediately
    const tempId = `temp_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempId,
      direction: "inbound",
      message_type: "text",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await apiFetch<ComposeResponse>("/api/mobile/compose", {
        method: "POST",
        body: JSON.stringify({
          message_type: "text",
          content: trimmed,
        }),
      });

      if (response.reply) {
        const grootMsg: ChatMessage = {
          id: response.reply_id ?? `groot_${Date.now()}`,
          direction: "outbound",
          message_type: "text",
          content: response.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, grootMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        direction: "outbound",
        message_type: "text",
        content: "Something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [text, sending]);

  // ── Voice recording ──
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

      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseAnimRef.current = loop;
      loop.start();

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

      if (!uri) return;

      setSending(true);

      // Optimistic: add voice message
      const tempId = `temp_voice_${Date.now()}`;
      const userMsg: ChatMessage = {
        id: tempId,
        direction: "inbound",
        message_type: "audio",
        content: null,
        media_description: "Voice note",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as const,
      });

      const response = await apiFetch<ComposeResponse>("/api/mobile/compose", {
        method: "POST",
        body: JSON.stringify({
          message_type: "audio",
          media_base64: base64,
          mime_type: "audio/m4a",
        }),
      });

      // Update the temp message with transcription
      if (response.reply) {
        const grootMsg: ChatMessage = {
          id: `groot_${Date.now()}`,
          direction: "outbound",
          message_type: "text",
          content: response.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, grootMsg]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        direction: "outbound",
        message_type: "text",
        content: `Couldn't process voice note: ${message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setRecordingDuration(0);
    }
  }, []);

  // ── Image sending ──
  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImage(result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
    }
  }, []);

  const sendImage = useCallback(async (uri: string, mimeType: string) => {
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tempId = `temp_img_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempId,
      direction: "inbound",
      message_type: "image",
      content: null,
      media_description: "Photo",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as const,
      });

      const response = await apiFetch<ComposeResponse>("/api/mobile/compose", {
        method: "POST",
        body: JSON.stringify({
          message_type: "image",
          media_base64: base64,
          mime_type: mimeType,
        }),
      });

      if (response.reply) {
        const grootMsg: ChatMessage = {
          id: `groot_${Date.now()}`,
          direction: "outbound",
          message_type: "text",
          content: response.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, grootMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        direction: "outbound",
        message_type: "text",
        content: "Couldn't process the image. Try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, []);

  // ── Close handler ──
  const handleClose = useCallback(() => {
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
    setRecording(false);
    setRecordingDuration(0);
    setText("");
    onClose();
  }, [onClose]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Build items with date separators ──
  const itemsWithDates = React.useMemo(() => {
    const items: Array<{ type: "date"; date: string } | { type: "message"; message: ChatMessage }> = [];
    let lastDate = "";

    for (const msg of messages) {
      const msgDate = msg.created_at.slice(0, 10);
      if (msgDate !== lastDate) {
        items.push({ type: "date", date: msg.created_at });
        lastDate = msgDate;
      }
      items.push({ type: "message", message: msg });
    }

    return items;
  }, [messages]);

  const canSend = text.trim().length > 0 && !sending;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.glassBorder,
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.avatarWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Sprout size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Groot</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                {sending ? "thinking..." : "your AI companion"}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleClose} hitSlop={12}>
            <View style={[styles.closeBtn, { backgroundColor: colors.glassSurface }]}>
              <ChevronDown size={20} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </View>

        {/* ── Messages ── */}
        {initialLoad ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={itemsWithDates}
            keyExtractor={(item, index) =>
              item.type === "date" ? `date_${index}` : item.message.id
            }
            renderItem={({ item }) => {
              if (item.type === "date") {
                return <DateSeparator date={item.date} />;
              }
              return (
                <ChatBubble
                  direction={item.message.direction}
                  content={item.message.content}
                  mediaDescription={item.message.media_description}
                  messageType={item.message.message_type}
                  timestamp={item.message.created_at}
                />
              );
            }}
            contentContainerStyle={[
              styles.messageList,
              { paddingBottom: 8 },
            ]}
            onContentSizeChange={() => {
              // Auto-scroll to bottom when new messages arrive
              if (!loadingHistory) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onStartReachedThreshold={0.1}
            ListHeaderComponent={
              loadingHistory && !initialLoad ? (
                <View style={styles.loadMoreWrap}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              ) : hasMore ? (
                <Pressable onPress={loadOlderMessages} style={styles.loadMoreBtn}>
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                    Load older messages
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Sprout size={48} color={colors.mutedForeground} strokeWidth={1.3} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Hey there!
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  Send a message to start chatting with Groot.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* ── Typing indicator ── */}
        {sending && <TypingIndicator />}

        {/* ── Input bar ── */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.glassBorder,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {recording ? (
            <View style={styles.recordingBar}>
              <RNAnimated.View
                style={[
                  styles.recordingDot,
                  {
                    backgroundColor: colors.destructive,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Text style={[styles.recordingTime, { color: colors.foreground }]}>
                {formatTime(recordingDuration)}
              </Text>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={stopRecording}
                style={[styles.stopBtn, { backgroundColor: `${colors.destructive}15` }]}
              >
                <Square size={18} color={colors.destructive} strokeWidth={2.2} />
                <Text style={[styles.stopBtnText, { color: colors.destructive }]}>Stop</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputRow}>
              {/* Media buttons */}
              <View style={styles.mediaButtons}>
                <Pressable onPress={startRecording} hitSlop={8} style={styles.mediaBtn}>
                  <Mic size={20} color={colors.mutedForeground} strokeWidth={1.8} />
                </Pressable>
                <Pressable onPress={pickImage} hitSlop={8} style={styles.mediaBtn}>
                  <ImageIcon size={20} color={colors.mutedForeground} strokeWidth={1.8} />
                </Pressable>
              </View>

              {/* Text input */}
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: colors.secondary, borderColor: colors.glassBorder },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Message Groot..."
                  placeholderTextColor={colors.mutedForeground}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={4000}
                  editable={!sending}
                />
              </View>

              {/* Send button */}
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[
                  styles.sendBtn,
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.base,
  },
  headerSubtitle: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    paddingTop: 8,
  },
  loadMoreWrap: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loadMoreText: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  mediaButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingBottom: 6,
  },
  mediaBtn: {
    padding: 6,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  input: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    maxHeight: 100,
    minHeight: 36,
    paddingTop: Platform.OS === "ios" ? 8 : 6,
    paddingBottom: 6,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingTime: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
    fontVariant: ["tabular-nums"],
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  stopBtnText: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.sm,
  },
});
