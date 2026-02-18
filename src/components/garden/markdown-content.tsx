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
    <h1 className="text-2xl font-bold text-foreground tracking-tight mt-6 mb-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-foreground tracking-tight mt-5 mb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-foreground leading-[1.75] mb-3">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children, className }) => {
    if (className) {
      return (
        <code className={`${className} block p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto leading-relaxed`}>
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded-sm bg-muted font-mono text-[0.9em] text-accent">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-auto">
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul className="pl-6 mb-3 list-disc">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="pl-6 mb-3 list-decimal">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-foreground leading-[1.75] mb-1">
      {children}
    </li>
  ),
  input: (props) => (
    <input
      {...props}
      disabled
      className="mr-2 accent-primary"
    />
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left px-3 py-2 border-b-2 border-border font-semibold text-foreground text-sm">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-border text-foreground">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-accent pl-4 my-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="border-none h-px bg-border my-6" />
  ),
  del: ({ children }) => (
    <del className="text-muted-foreground">{children}</del>
  ),
};

function truncateMarkdown(text: string, limit: number): string {
  if (text.length <= limit) return text;

  let cutoff = limit;
  const lineBreak = text.lastIndexOf("\n", limit);
  if (lineBreak > limit * 0.6) {
    cutoff = lineBreak;
  } else {
    const spaceBreak = text.lastIndexOf(" ", limit);
    if (spaceBreak > limit * 0.6) cutoff = spaceBreak;
  }

  let result = text.slice(0, cutoff);

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
