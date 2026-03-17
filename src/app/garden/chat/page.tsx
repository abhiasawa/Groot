"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { stripMetadata } from "@/lib/ai/metadata-parser";
import ChatMessage from "@/components/garden/chat-message";
import ChatInput from "@/components/garden/chat-input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load recent messages on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/memories?limit=20&types=text", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data.messages)) return;

        const history: Message[] = data.messages.map(
          (m: { id: string; direction: string; content: string }) => ({
            id: m.id,
            role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
            content: m.content || "",
          }),
        );
        setMessages(history);
      } catch {
        // Silent — chat works without history
      }
    }
    loadHistory();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        content: text.trim(),
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
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: text.trim() }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: err.error || "Something went wrong. Try again." }
                : m,
            ),
          );
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });
          const display = stripMetadata(accumulated);

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: display } : m)),
          );
        }

        // Final cleanup — ensure metadata is fully stripped
        const final = stripMetadata(accumulated);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: final } : m)),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "_Something went wrong. Try again._" }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col md:h-[calc(100vh-4rem)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-4 md:px-0">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p
                className="text-2xl text-foreground"
                style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
              >
                Talk to Groot
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your AI companion — ready to listen, think, and remember.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-2 py-3 md:px-0">
        <div className="mx-auto max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
