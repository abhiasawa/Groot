"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageCircle, BookOpen, Lightbulb, User, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/garden/chat", label: "Chat", icon: MessageCircle },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/insights", label: "Insights", icon: Lightbulb, matchAlso: ["/garden/mood", "/garden/habits", "/garden/stories"] },
  { href: "/garden/mirror", label: "Profile", icon: User },
  { href: "/garden/settings", label: "Settings", icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const matchAlso = "matchAlso" in item ? item.matchAlso : [];
          const isActive =
            pathname.startsWith(item.href) ||
            matchAlso.some((p) => pathname.startsWith(p));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
