"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
  truncate?: number;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-2xl)", color: "var(--color-text)", letterSpacing: "var(--tracking-heading)", marginTop: "var(--space-6)", marginBottom: "var(--space-3)" }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", color: "var(--color-text)", letterSpacing: "var(--tracking-heading)", marginTop: "var(--space-5)", marginBottom: "var(--space-2)" }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", color: "var(--color-text)", marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ color: "var(--color-text)", fontFamily: "var(--font-diary)", lineHeight: 1.75, marginBottom: "var(--space-3)" }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic" }}>{children}</em>
  ),
  code: ({ children, className }) => {
    if (className) {
      return (
        <code
          className={className}
          style={{
            display: "block",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-surface)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            overflowX: "auto",
            lineHeight: 1.6,
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code style={{
        padding: "2px 6px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--color-surface)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.9em",
        color: "var(--color-accent)",
      }}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre style={{ margin: "var(--space-3) 0", overflow: "auto" }}>
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: "var(--space-6)", marginBottom: "var(--space-3)", listStyleType: "disc" }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: "var(--space-6)", marginBottom: "var(--space-3)", listStyleType: "decimal" }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ color: "var(--color-text)", fontFamily: "var(--font-diary)", lineHeight: 1.75, marginBottom: "var(--space-1)" }}>
      {children}
    </li>
  ),
  input: (props) => (
    <input
      {...props}
      disabled
      style={{ marginRight: "var(--space-2)", accentColor: "var(--color-primary)" }}
    />
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "var(--color-primary)", textDecoration: "underline", textUnderlineOffset: "2px" }}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", marginBottom: "var(--space-3)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{
      textAlign: "left",
      padding: "var(--space-2) var(--space-3)",
      borderBottom: "2px solid var(--color-border)",
      fontWeight: 600,
      color: "var(--color-text)",
      fontSize: "var(--text-sm)",
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: "var(--space-2) var(--space-3)",
      borderBottom: "1px solid var(--color-border)",
      color: "var(--color-text)",
    }}>
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "3px solid var(--color-accent)",
      paddingLeft: "var(--space-4)",
      margin: "var(--space-3) 0",
      color: "var(--color-text-secondary)",
      fontStyle: "italic",
    }}>
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr style={{ border: "none", height: "1px", backgroundColor: "var(--color-border)", margin: "var(--space-6) 0" }} />
  ),
  del: ({ children }) => (
    <del style={{ color: "var(--color-text-secondary)" }}>{children}</del>
  ),
};

function truncateMarkdown(text: string, limit: number): string {
  if (text.length <= limit) return text;

  // Find a clean break point: end of a line, sentence, or word boundary
  let cutoff = limit;
  const lineBreak = text.lastIndexOf("\n", limit);
  if (lineBreak > limit * 0.6) {
    cutoff = lineBreak;
  } else {
    const spaceBreak = text.lastIndexOf(" ", limit);
    if (spaceBreak > limit * 0.6) cutoff = spaceBreak;
  }

  let result = text.slice(0, cutoff);

  // Close any unclosed bold/italic markers
  const boldCount = (result.match(/\*\*/g) ?? []).length;
  if (boldCount % 2 !== 0) result += "**";
  const italicCount = (result.match(/(?<!\*)\*(?!\*)/g) ?? []).length;
  if (italicCount % 2 !== 0) result += "*";
  const backtickCount = (result.match(/`/g) ?? []).length;
  if (backtickCount % 2 !== 0) result += "`";

  return result + "...";
}

export default function MarkdownContent({ content, className = "", truncate }: MarkdownContentProps) {
  const safeContent = content ?? "";
  const displayContent = truncate
    ? truncateMarkdown(safeContent, truncate)
    : safeContent;

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}
