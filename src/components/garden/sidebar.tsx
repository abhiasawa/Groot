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
      className="hidden md:flex flex-col w-[240px] h-screen fixed left-0 top-0"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {/* Logo area */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌱</span>
          <span
            className="text-sm font-semibold"
            style={{
              color: "var(--color-text)",
              letterSpacing: "-0.01em",
            }}
          >
            The Garden
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/garden" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: isActive ? "rgba(55, 53, 47, 0.08)" : "transparent",
                color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3">
        <p
          className="text-[11px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your AI second brain
        </p>
      </div>
    </aside>
  );
}
