"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BookOpen,
  Camera,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MemoryCard from "@/components/garden/memory-card";
import NotoMascotWeb from "@/components/garden/noto-mascot-web";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cachedFetch, invalidateCache } from "@/lib/garden/fetch-cache";

interface Memory {
  id: string;
  content: string | null;
  media_description: string | null;
  message_type: string;
  card_category: string | null;
  created_at: string;
}

interface MemoriesResponse {
  memories: Memory[];
  total: number;
}

const CARD_COLORS: Record<string, string> = {
  task: "var(--mood-good)",
  reminder: "var(--mood-low)",
  story: "var(--accent)",
  reflection: "var(--accent)",
  memory: "var(--foreground)",
};

export default function GardenHome() {
  const { user } = useCurrentUser();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState<File | null>(null);
  const [composeImageName, setComposeImageName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [freshMemoryId, setFreshMemoryId] = useState<string | null>(null);

  const loadMemories = useCallback(async (search = "") => {
    const params = new URLSearchParams({ limit: "100" });
    if (search.trim()) {
      params.set("q", search.trim());
    }

    const response = await cachedFetch<MemoriesResponse>(
      `/api/memories?${params.toString()}`,
      search.trim() ? 0 : 30_000,
    );
    setMemories(response.memories ?? []);
    return response.memories ?? [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const nextMemories = await loadMemories(query);
          if (!cancelled) {
            setMemories(nextMemories);
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Could not load your memories",
            );
            setMemories([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      },
      query.trim() ? 250 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [loadMemories, query]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const displayName = user?.display_name?.trim() || "You";
  const thoughtCountLabel = `${memories.length} thought${
    memories.length === 1 ? "" : "s"
  }`;
  const quickLinks = [
    {
      href: "/garden/journal",
      label: "Journal",
      description: "Browse everything you have captured.",
      icon: BookOpen,
    },
    {
      href: "/garden/garden",
      label: "Garden",
      description: "Open the wider mood and reflection space.",
      icon: Sparkles,
    },
    {
      href: "/garden/settings",
      label: "Settings",
      description: "Theme, account, and notification controls.",
      icon: Settings,
    },
  ] as const;

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/memories/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to delete memory");
        }

        invalidateCache("/api/memories");
        setMemories((current) => current.filter((memory) => memory.id !== id));
        if (expandedId === id) {
          setExpandedId(null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete memory",
        );
      }
    },
    [expandedId],
  );

  const handleImageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setComposeImage(file);
      setComposeImageName(file?.name ?? "");
    },
    [],
  );

  const handleComposeSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!composeText.trim() && !composeImage) {
        setError("Add a thought or attach a photo first.");
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const body = composeImage
          ? {
              message_type: "image",
              caption: composeText.trim() || "Photo captured from web",
              mime_type: composeImage.type || "image/jpeg",
              media_base64: await fileToBase64(composeImage),
            }
          : {
              message_type: "text",
              content: composeText.trim(),
            };

        const res = await fetch("/api/mobile/compose", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await res.json()) as { error?: string };

        if (!res.ok || payload.error) {
          throw new Error(payload.error ?? "Capture failed");
        }

        setComposeOpen(false);
        setComposeText("");
        setComposeImage(null);
        setComposeImageName("");
        invalidateCache("/api/memories");

        const latestMemories = await loadMemories(query);
        const latestId = latestMemories[0]?.id ?? null;
        setFreshMemoryId(latestId);
        if (latestId) {
          window.setTimeout(() => setFreshMemoryId(null), 1800);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Capture failed");
      } finally {
        setSubmitting(false);
      }
    },
    [composeImage, composeText, loadMemories, query],
  );

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4 pt-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {todayLabel}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-foreground">
              noto
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {thoughtCountLabel} in your mind, {displayName}.
            </p>
          </div>

          <Link href="/garden/settings">
            <Avatar size="lg" className="border border-border bg-secondary">
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="group relative overflow-hidden rounded-[32px] border border-border bg-card px-6 py-8 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffbb2c22,transparent_55%)]" />
            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-md">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Primary action
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  Capture a new memory
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Record a thought, attach an image, or save something before it
                  disappears. This is the main job of the home screen.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  <Plus className="size-4" />
                  Open the cloud
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                <div className="relative">
                  <NotoMascotWeb className="drop-shadow-[0_18px_40px_rgba(255,187,44,0.2)] transition duration-300 group-hover:scale-[1.03]" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center">
                    <div className="rounded-full bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur">
                      Thoughts, photos, memories
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>

          <div className="grid gap-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[24px] border border-border bg-card px-5 py-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary p-2 text-foreground">
                          <Icon className="size-4" />
                        </span>
                        <p className="text-base font-medium text-foreground">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your mind..."
              className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-11 text-sm text-foreground outline-none transition focus:border-accent"
            />
            {query && (
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setQuery("")}
              >
                <X className="size-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>

          <Button
            type="button"
            className="h-12 rounded-2xl px-5"
            onClick={() => setComposeOpen(true)}
          >
            <Camera className="size-4" />
            Quick capture
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : memories.length === 0 ? (
          <div className="rounded-[28px] border border-border bg-card px-8 py-14 text-center shadow-sm">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {query ? "No thoughts found" : "Your mind is clear"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {query
                ? "Try a different phrase or clear the search to see everything again."
                : "Use Capture to save a thought or attach a photo, just like the mobile flow."}
            </p>
          </div>
        ) : (
          <section>
            <p className="mb-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {query
                ? `Search results · ${thoughtCountLabel}`
                : "Recent thoughts"}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  id={memory.id}
                  content={
                    memory.content ??
                    memory.media_description ??
                    "Untitled memory"
                  }
                  mediaDescription={memory.media_description ?? undefined}
                  messageType={memory.message_type}
                  createdAt={memory.created_at}
                  moodColor={
                    CARD_COLORS[memory.card_category ?? ""] ?? "var(--accent)"
                  }
                  isExpanded={expandedId === memory.id}
                  onToggleExpand={(id) =>
                    setExpandedId((current) => (current === id ? null : id))
                  }
                  onDelete={handleDelete}
                  isFresh={freshMemoryId === memory.id}
                />
              ))}
            </div>
          </section>
        )}

        <div className="rounded-[28px] border border-border bg-secondary/60 px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Full journal and deeper views are still here
              </p>
              <p className="text-sm text-muted-foreground">
                The web entry now matches mobile first, with the rest of The
                Garden one tap away.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/garden/journal">Journal</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/garden/settings">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="text-2xl tracking-[-0.03em]">
              Capture a thought
            </DialogTitle>
            <DialogDescription>
              Save a note or attach a photo into the same journal stream used on
              mobile.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5 px-6 py-6" onSubmit={handleComposeSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">
                What is on your mind?
              </span>
              <textarea
                value={composeText}
                onChange={(event) => setComposeText(event.target.value)}
                placeholder="Type a thought, reflection, reminder, or anything you want Groot to remember."
                className="min-h-36 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border bg-background px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <ImagePlus className="size-4 text-accent" />
                {composeImageName || "Attach a photo"}
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WEBP
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
              />
            </label>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setComposeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Capture"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="ml-auto h-4 w-10" />
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-[82%]" />
          <Skeleton className="mt-2 h-4 w-[68%]" />
        </div>
      ))}
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Could not encode file"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
