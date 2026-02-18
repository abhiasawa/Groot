"use client";

import { useState, useRef, useEffect } from "react";
import MarkdownContent from "./markdown-content";

interface LinkedMemory {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface MemoryCardProps {
  id: string;
  content: string;
  mediaDescription?: string;
  messageType: string;
  createdAt: string;
  moodColor: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  linkedMemories?: LinkedMemory[];
  loadingLinks?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  text: "\u270D\uFE0F",
  audio: "\uD83C\uDFA4",
  image: "\uD83D\uDCF7",
};

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  audio: "Voice",
  image: "Photo",
};

export default function MemoryCard({
  id,
  content,
  mediaDescription,
  messageType,
  createdAt,
  moodColor,
  isExpanded,
  onToggleExpand,
  linkedMemories,
  loadingLinks,
}: MemoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const time = new Date(createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const wordCount = content?.split(/\s+/).length ?? 0;
  const typeIcon = TYPE_ICONS[messageType] ?? "\u270D\uFE0F";
  const typeLabel = TYPE_LABELS[messageType] ?? "Text";

  // Scroll expanded card into view
  useEffect(() => {
    if (isExpanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isExpanded]);

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-200 break-inside-avoid cursor-pointer${isExpanded ? " [column-span:all]" : ""}`}
      style={{
        backgroundColor: "var(--color-paper)",
        boxShadow: hovered ? "var(--shadow-card-hover, 0 4px 12px rgba(0,0,0,0.1))" : "var(--shadow-paper)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${moodColor}`,
        backgroundImage: "var(--texture-paper)",
        transform: hovered && !isExpanded ? "translateY(-1px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onToggleExpand(id)}
    >
      {/* Header: type badge + mood dot + timestamp */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
        >
          <span>{typeIcon}</span> {typeLabel}
        </span>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: moodColor }} />
        <span className="text-[11px] ml-auto" style={{ color: "var(--color-text-secondary)" }}>{time}</span>
      </div>

      {/* Content */}
      <div className="px-5 pb-2">
        {isExpanded ? (
          <MarkdownContent content={content} />
        ) : (
          <MarkdownContent content={content} truncate={200} />
        )}

        {mediaDescription && (
          <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-secondary)" }}>
            {mediaDescription}
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-wrap"
        style={{ borderTop: "1px dashed var(--color-border)", opacity: 0.7 }}
      >
        {wordCount > 0 && (
          <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            {wordCount} words
          </span>
        )}
        <span
          className="text-[11px] ml-auto"
          style={{ color: "var(--color-primary)", cursor: "pointer" }}
        >
          {isExpanded ? "Show less" : "Read more"}
        </span>
      </div>

      {/* Linked Memories (expanded only) */}
      {isExpanded && (
        <div
          className="px-5 pb-4 pt-2"
          style={{ borderTop: "1px solid var(--color-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-2 font-semibold"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Linked Memories
          </p>

          {loadingLinks ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-8 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
              ))}
            </div>
          ) : linkedMemories && linkedMemories.length > 0 ? (
            <div className="space-y-2">
              {linkedMemories.map((lm) => (
                <div
                  key={lm.id}
                  className="p-3 rounded-lg text-xs"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-diary)",
                    lineHeight: 1.6,
                  }}
                >
                  <MarkdownContent content={lm.content} truncate={120} />
                  <span className="text-[10px] block mt-1" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
                    {new Date(lm.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
              No linked memories yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
