"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

const FILTERS = ["All", "Notes", "Todos", "Ideas", "Links", "Voice"];
const TYPE_MAP: Record<string, string> = {
  Notes: "text",
  Voice: "audio",
  Links: "text",
  Ideas: "text",
  Todos: "text",
};

interface Memory {
  id: string;
  content: string;
  media_description: string | null;
  message_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function MemoriesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const params = new URLSearchParams({ userId: user.id, limit: "50" });
    if (searchQuery) params.set("q", searchQuery);
    if (activeFilter !== "All" && TYPE_MAP[activeFilter]) {
      params.set("type", TYPE_MAP[activeFilter]!);
    }

    try {
      const res = await fetch(`/api/memories?${params}`);
      const data = await res.json();
      setMemories(data.memories ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, activeFilter]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  if (userLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-12 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
        >
          Memories
        </h1>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {total} total
        </span>
      </div>

      {/* Search */}
      <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: "var(--color-bg)" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your memories..."
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            color: "var(--color-text)",
          }}
        />

        {/* Filter Bar */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: activeFilter === filter ? "var(--color-primary)" : "var(--color-surface)",
                color: activeFilter === filter ? "white" : "var(--color-text-secondary)",
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Memory List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div
          className="p-8 rounded-xl border text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <span className="text-4xl block mb-3">🌱</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>
            {searchQuery ? "No memories match your search" : "Your Garden is ready to grow"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {searchQuery
              ? "Try a different search term."
              : "Send messages to Groot on WhatsApp — your memories will bloom here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TypeIcon type={m.message_type} />
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
                >
                  {m.message_type === "audio" ? "Voice" : m.message_type}
                </span>
                <span className="text-xs ml-auto" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(m.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)" }}>
                {m.content || m.media_description || "(media)"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    text: "📝",
    audio: "🎙️",
    image: "🖼️",
    interactive: "🔘",
  };
  return <span className="text-sm">{icons[type] ?? "💬"}</span>;
}
