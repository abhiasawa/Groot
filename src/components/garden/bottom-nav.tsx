"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, Users, Heart, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: Home },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/people", label: "People", icon: Users },
  { href: "/garden/mood", label: "Mood", icon: Heart },
  { href: "/garden/settings", label: "More", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50 flex items-center justify-around"
      style={{
        height: "56px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== "/garden" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center gap-0.5 py-1.5 min-w-[44px] min-h-[44px] justify-center"
          >
            {isActive && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
            )}
            <Icon className={cn(
              "h-5 w-5 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
