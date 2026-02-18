"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";

interface PowerbarCommand {
  id: string;
  label: string;
  icon: string;
  section: "navigation" | "actions";
  action: () => void;
  keywords?: string[];
}

export default function Powerbar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(search);
  searchRef.current = search;
  const router = useRouter();
  const { toggleTheme, resolvedTheme } = useTheme();

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
    { id: "home", label: "Home", icon: "\uD83C\uDFE1", section: "navigation", action: () => navigate("/garden"), keywords: ["dashboard"] },
    { id: "journal", label: "Journal", icon: "\uD83D\uDCD3", section: "navigation", action: () => navigate("/garden/journal"), keywords: ["entries", "memories", "diary"] },
    { id: "people", label: "People", icon: "\uD83D\uDC65", section: "navigation", action: () => navigate("/garden/people"), keywords: ["contacts", "friends", "family"] },
    { id: "mood", label: "Mood", icon: "\uD83C\uDFAD", section: "navigation", action: () => navigate("/garden/mood"), keywords: ["emotions", "feelings"] },
    { id: "habits", label: "Habits", icon: "\uD83D\uDCCA", section: "navigation", action: () => navigate("/garden/habits"), keywords: ["streaks", "tracking"] },
    { id: "tasks", label: "Tasks", icon: "\u2705", section: "navigation", action: () => navigate("/garden/tasks"), keywords: ["todo", "pending"] },
    { id: "insights", label: "Insights", icon: "\uD83D\uDCA1", section: "navigation", action: () => navigate("/garden/insights"), keywords: ["reports", "weekly"] },
    { id: "profile", label: "Profile", icon: "\uD83E\uDDE0", section: "navigation", action: () => navigate("/garden/profile"), keywords: ["about me"] },
    { id: "graph", label: "Knowledge Graph", icon: "\uD83D\uDD78\uFE0F", section: "navigation", action: () => navigate("/garden/graph"), keywords: ["connections", "links"] },
    { id: "settings", label: "Settings", icon: "\u2699\uFE0F", section: "navigation", action: () => navigate("/garden/settings"), keywords: ["preferences"] },
    { id: "toggle-theme", label: `Toggle dark mode (${resolvedTheme})`, icon: resolvedTheme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19", section: "actions", action: () => { toggleTheme(); setOpen(false); }, keywords: ["theme", "light", "dark", "appearance"] },
    { id: "search-memories", label: "Search memories...", icon: "\uD83D\uDD0D", section: "actions", action: () => navigate(`/garden/journal?q=${encodeURIComponent(searchRef.current)}`), keywords: ["find", "query"] },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />

      <div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-elevated)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Powerbar" shouldFilter={true}>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-sm outline-none bg-transparent"
            style={{
              color: "var(--color-text)",
              borderBottom: "1px solid var(--color-border)",
            }}
            autoFocus
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigate">
              {commands.filter(c => c.section === "navigation").map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={`${cmd.label} ${(cmd.keywords ?? []).join(" ")}`}
                  onSelect={cmd.action}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer"
                  style={{ color: "var(--color-text)" }}
                >
                  <span className="w-5 text-center">{cmd.icon}</span>
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="h-px my-1" style={{ backgroundColor: "var(--color-border)" }} />

            <Command.Group heading="Actions">
              {commands.filter(c => c.section === "actions").map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={`${cmd.label} ${(cmd.keywords ?? []).join(" ")}`}
                  onSelect={cmd.action}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer"
                  style={{ color: "var(--color-text)" }}
                >
                  <span className="w-5 text-center">{cmd.icon}</span>
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div
            className="flex items-center justify-between px-4 py-2 text-[10px]"
            style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <span>Navigate with arrow keys</span>
            <span>ESC to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
