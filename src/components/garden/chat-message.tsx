"use client";

import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

/** Convert WhatsApp-style markdown to sanitized HTML for display. */
function formatGrootText(text: string): string {
  const html = text
    .replace(/\*(.+?)\*/g, "<strong>$1</strong>") // *bold*
    .replace(/_(.+?)_/g, "<em>$1</em>") // _italic_
    .replace(/~(.+?)~/g, "<del>$1</del>") // ~strikethrough~
    .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">$1</code>')
    .replace(/^> (.+)$/gm, '<span class="border-l-2 border-muted-foreground/40 pl-2 text-muted-foreground">$1</span>')
    .replace(/\n/g, "<br />");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "del", "code", "span", "br"],
    ALLOWED_ATTR: ["class"],
  });
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  if (!content) {
    // Streaming placeholder
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary px-4 py-2.5">
          <span className="inline-flex gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-secondary text-secondary-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose-sm [&_strong]:font-semibold [&_em]:italic [&_del]:line-through"
            style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
            dangerouslySetInnerHTML={{ __html: formatGrootText(content) }}
          />
        )}
      </div>
    </div>
  );
}
