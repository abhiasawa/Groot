"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home, BookOpen, Users, Heart, BarChart3, CheckSquare,
  Lightbulb, Brain, Tag, Settings, Sun, Moon, Search,
} from "lucide-react";

interface PowerbarCommand {
  id: string;
  label: string;
  icon: React.ElementType;
  section: "navigation" | "actions";
  action: () => void;
  keywords?: string[];
}

export default function Powerbar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const openHandler = () => setOpen(true);
    document.addEventListener("keydown", handler);
    document.addEventListener("open-powerbar", openHandler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("open-powerbar", openHandler);
    };
  }, []);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setSearch("");
  }, [router]);

  const commands: PowerbarCommand[] = [
    { id: "home", label: "Home", icon: Home, section: "navigation", action: () => navigate("/garden"), keywords: ["dashboard"] },
    { id: "journal", label: "Journal", icon: BookOpen, section: "navigation", action: () => navigate("/garden/journal"), keywords: ["entries", "memories", "diary"] },
    { id: "people", label: "People", icon: Users, section: "navigation", action: () => navigate("/garden/people"), keywords: ["contacts", "friends", "family"] },
    { id: "mood", label: "Mood", icon: Heart, section: "navigation", action: () => navigate("/garden/mood"), keywords: ["emotions", "feelings"] },
    { id: "habits", label: "Habits", icon: BarChart3, section: "navigation", action: () => navigate("/garden/habits"), keywords: ["streaks", "tracking"] },
    { id: "tasks", label: "Tasks", icon: CheckSquare, section: "navigation", action: () => navigate("/garden/tasks"), keywords: ["todo", "pending"] },
    { id: "insights", label: "Insights", icon: Lightbulb, section: "navigation", action: () => navigate("/garden/insights"), keywords: ["reports", "weekly"] },
    { id: "profile", label: "Profile", icon: Brain, section: "navigation", action: () => navigate("/garden/profile"), keywords: ["about me"] },
    { id: "topics", label: "Topics", icon: Tag, section: "navigation", action: () => navigate("/garden/topics"), keywords: ["tags", "categories", "topics"] },
    { id: "settings", label: "Settings", icon: Settings, section: "navigation", action: () => navigate("/garden/settings"), keywords: ["preferences"] },
    { id: "toggle-theme", label: `Toggle dark mode (${resolvedTheme})`, icon: resolvedTheme === "dark" ? Sun : Moon, section: "actions", action: () => { toggleTheme(); setOpen(false); }, keywords: ["theme", "light", "dark", "appearance"] },
    {
      id: "search-memories",
      label: "Search memories...",
      icon: Search,
      section: "actions",
      action: () => {
        const query = search.trim();
        navigate(query ? `/garden/journal?q=${encodeURIComponent(query)}` : "/garden/journal");
      },
      keywords: ["find", "query"],
    },
  ];

  if (!open) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} modal={false}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Type a command or search..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {commands.filter(c => c.section === "navigation").map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${(cmd.keywords ?? []).join(" ")}`}
                onSelect={cmd.action}
              >
                <Icon className="mr-2 h-4 w-4" />
                {cmd.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {commands.filter(c => c.section === "actions").map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.id}
                value={`${cmd.label} ${(cmd.keywords ?? []).join(" ")}`}
                onSelect={cmd.action}
              >
                <Icon className="mr-2 h-4 w-4" />
                {cmd.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
