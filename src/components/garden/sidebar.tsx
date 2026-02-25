"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  BarChart3,
  Settings,
  Heart,
  Lightbulb,
  Sparkles,
  Sprout,
} from "lucide-react";

const PRIMARY_NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: Home },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/habits", label: "Habits", icon: BarChart3 },
  { href: "/garden/settings", label: "Settings", icon: Settings },
] as const;

const DEEP_DIVE_ITEMS = [
  { href: "/garden/insights", label: "Insights", icon: Lightbulb },
  { href: "/garden/mood", label: "Mood", icon: Heart },
  { href: "/garden/stories", label: "Stories", icon: Sparkles },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-card md:flex md:flex-col">
      <div className="border-b border-border px-4 py-5">
        <a href="/garden" className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-primary" />
          <span className="text-lg tracking-tight" style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}>The Garden</span>
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Daily
        </p>
        <div className="space-y-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/garden" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>

        <p className="px-3 pb-2 pt-5 text-[11px] uppercase tracking-wider text-muted-foreground">
          Deep Dives
        </p>
        <div className="space-y-1">
          {DEEP_DIVE_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        Your AI second brain
      </div>
    </aside>
  );
}
