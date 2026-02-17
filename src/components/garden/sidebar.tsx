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
        backgroundColor: "var(--color-paper)",
        borderColor: "var(--color-border)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='transparent'/%3E%3Crect width='1' height='1' fill='%23000' opacity='0.012'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Logo area */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <span
            className="text-lg"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-primary)",
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            The Garden
          </span>
        </div>
        <div className="mt-3 h-px" style={{ backgroundColor: "var(--color-border)" }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/garden" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-150"
              style={{
                backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                color: isActive ? "white" : "var(--color-text-secondary)",
                fontWeight: isActive ? 500 : 400,
                fontFamily: "var(--font-body)",
                boxShadow: isActive ? "0 2px 8px rgba(45, 95, 59, 0.2)" : "none",
              }}
            >
              <span className="text-base w-6 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4">
        <div className="h-px mb-4" style={{ backgroundColor: "var(--color-border)" }} />
        <p
          className="text-[11px] italic"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)" }}
        >
          Your AI second brain
        </p>
      </div>
    </aside>
  );
}
