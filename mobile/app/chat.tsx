import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";

import { MessageBubble } from "../components/chat/message-bubble";
import { ChatInput } from "../components/chat/chat-input";
import { fonts, typography } from "../constants/typography";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://groot-three.vercel.app"
).replace(/\/$/, "");
const TOKEN_KEY = "groot-jwt";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Strip the ---METADATA--- block from streamed text. */
function stripMetadata(text: string): string {
  const idx = text.indexOf("\n---METADATA---\n");
  return idx === -1 ? text : text.slice(0, idx).trim();
}

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load recent messages on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/memories?limit=20&types=text`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!Array.isArray(data.messages) || cancelled) return;

        const history: Message[] = data.messages.map(
          (m: { id: string; direction: string; content: string }) => ({
            id: m.id,
            role: m.direction === "inbound" ? "user" : "assistant",
            content: m.content || "",
          }),
        );
        setMessages(history);
      } catch {
        // Silent — chat works without history
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };
    const assistantId = `assistant_${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: err.error || "Something went wrong." }
              : m,
          ),
        );
        setIsStreaming(false);
        return;
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        const display = stripMetadata(accumulated);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: display } : m,
          ),
        );
      }

      // Final cleanup
      const final = stripMetadata(accumulated);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: final } : m,
        ),
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Something went wrong. Try again." }
              : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble role={item.role} content={item.content} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <ArrowLeft size={18} color="#1A1A1A" strokeWidth={2.2} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Groot</Text>
            <Text style={styles.headerSubtitle}>Your AI companion</Text>
          </View>
        </View>

        {/* Messages */}
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Talk to Groot</Text>
            <Text style={styles.emptySubtitle}>
              Your AI companion — ready to listen, think, and remember.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}

        {/* Input */}
        <SafeAreaView edges={["bottom"]} style={styles.inputWrap}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            disabled={isStreaming}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FEFEFE",
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#8F887E",
    marginTop: 1,
  },
  messageList: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    ...typography.xl,
    color: "#1E1E1E",
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#8F887E",
    textAlign: "center",
    marginTop: 8,
  },
  inputWrap: {
    backgroundColor: "#FFFFFF",
  },
});
