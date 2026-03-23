"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  BookOpen,
  Lightbulb,
  CheckSquare,
  User,
  Settings,
  Sprout,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/garden/chat", label: "Chat", icon: MessageCircle },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/garden/insights", label: "Insights", icon: Lightbulb, matchAlso: ["/garden/mood", "/garden/habits", "/garden/stories"] },
  { href: "/garden/mirror", label: "Profile", icon: User },
  { href: "/garden/settings", label: "Settings", icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-card md:flex md:flex-col">
      <div className="border-b border-border px-4 py-5">
        <Link href="/garden" className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-primary" />
          <span
            className="text-lg tracking-tight"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
            }}
          >
            Noto
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const matchAlso = "matchAlso" in item ? item.matchAlso : [];
            const isActive =
              pathname.startsWith(item.href) ||
              matchAlso.some((p) => pathname.startsWith(p));
            const Icon = item.icon;

            return (
              <Link
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
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        Your AI companion
      </div>
    </aside>
  );
}
