"use client";

export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1
        className="text-2xl md:text-3xl"
        style={{
          fontFamily: "var(--font-heading)",
          color: "var(--color-text)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          fontWeight: 600,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mt-1.5"
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-diary)",
            fontStyle: "italic",
          }}
        >
          {subtitle}
        </p>
      )}
      <div className="flex items-center gap-3 mt-4">
        <div className="w-8 h-[2px] rounded-full" style={{ backgroundColor: "var(--color-primary)", opacity: 0.6 }} />
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
      </div>
    </div>
  );
}
