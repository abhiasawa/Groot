"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, Users, Heart, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: Home },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/people", label: "People", icon: Users },
  { href: "/garden/mood", label: "Mood", icon: Heart },
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
          const isActive = pathname === item.href || (item.href !== "/garden" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
