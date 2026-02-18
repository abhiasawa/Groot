"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Users,
  Heart,
  BarChart3,
  CheckSquare,
  Lightbulb,
  Settings,
  Sprout,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: Home },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/people", label: "People", icon: Users },
  { href: "/garden/mood", label: "Mood", icon: Heart },
  { href: "/garden/habits", label: "Habits", icon: BarChart3 },
  { href: "/garden/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/garden/insights", label: "Insights", icon: Lightbulb },
  { href: "/garden/settings", label: "Settings", icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-card md:flex md:flex-col">
      <div className="border-b border-border px-4 py-5">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">The Garden</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
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
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        Your AI second brain
      </div>
    </aside>
  );
}
