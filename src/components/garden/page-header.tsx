"use client";

export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1
        className="text-2xl md:text-3xl font-semibold"
        style={{
          fontFamily: "var(--font-heading)",
          color: "var(--color-text)",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1" style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
