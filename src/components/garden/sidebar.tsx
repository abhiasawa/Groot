"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, Users, Heart, BarChart3, CheckSquare, Lightbulb, Settings, Search, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { href: "/garden", label: "Home", icon: Home },
  { href: "/garden/journal", label: "Journal", icon: BookOpen },
  { href: "/garden/people", label: "People", icon: Users },
  { href: "/garden/mood", label: "Mood", icon: Heart },
  { href: "/garden/habits", label: "Habits", icon: BarChart3 },
  { href: "/garden/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/garden/insights", label: "Insights", icon: Lightbulb },
  { href: "/garden/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[240px] h-screen fixed left-0 top-0 z-30 bg-muted/50 border-r border-border">
      {/* Logo */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <Sprout className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            The Garden
          </span>
        </div>
      </div>

      <Separator />

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/garden" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground"
          onClick={() => document.dispatchEvent(new CustomEvent("open-powerbar"))}
        >
          <Search className="h-3.5 w-3.5 opacity-60" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">
            {"\u2318"}K
          </kbd>
        </Button>
        <p className="text-[11px] px-1 text-muted-foreground">
          Your AI second brain
        </p>
      </div>
    </aside>
  );
}
