"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: "🏡" },
  { href: "/garden/journal", label: "Journal", icon: "📓" },
  { href: "/garden/people", label: "People", icon: "👥" },
  { href: "/garden/mood", label: "Mood", icon: "🎭" },
  { href: "/garden/habits", label: "Habits", icon: "📊" },
  { href: "/garden/tasks", label: "Tasks", icon: "✅" },
  { href: "/garden/insights", label: "Insights", icon: "💡" },
  { href: "/garden/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 border-r"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <span className="text-2xl">🌱</span>
        <span
          className="text-lg font-semibold"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          The Garden
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/garden" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                color: isActive ? "white" : "var(--color-text-secondary)",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Groot AI Second Brain
        </p>
      </div>
    </aside>
  );
}
