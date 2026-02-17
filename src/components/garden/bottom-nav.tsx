"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: "🏡" },
  { href: "/garden/journal", label: "Journal", icon: "📓" },
  { href: "/garden/people", label: "People", icon: "👥" },
  { href: "/garden/mood", label: "Mood", icon: "🎭" },
  { href: "/garden/settings", label: "More", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex items-center justify-around z-50"
      style={{
        backgroundColor: "var(--color-card)",
        backgroundImage: "var(--texture-linen)",
        borderColor: "var(--color-border)",
        height: "var(--bottom-nav-height)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== "/garden" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 py-1.5 min-w-[44px] min-h-[44px] justify-center"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
            }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
