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
  Settings,
  Sparkles,
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
import NotoMascotWeb from "@/components/garden/noto-mascot-web";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cachedFetch, invalidateCache } from "@/lib/garden/fetch-cache";

interface MemoriesResponse {
  total: number;
}

export default function GardenHome() {
  const { user } = useCurrentUser();
  const [totalThoughts, setTotalThoughts] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState<File | null>(null);
  const [composeImageName, setComposeImageName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setLoadingStats(true);
      try {
        const response = await cachedFetch<MemoriesResponse>(
          "/api/memories?limit=1",
          30_000,
        );
        if (!cancelled) {
          setTotalThoughts(response.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load your summary",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStats(false);
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

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
  const quickLinks = [
    {
      href: "/garden/journal",
      label: "Journal",
      description: "Search the full archive and revisit older entries.",
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
        setTotalThoughts((current) =>
          current == null ? current : current + 1,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Capture failed");
      } finally {
        setSubmitting(false);
      }
    },
    [composeImage, composeText],
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
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Keep page one simple: capture what matters now. Use the journal on
              page two when you want to search, reflect, or browse your history.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-border/80 bg-card/70 px-3 py-2 shadow-sm">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground">Capture first</p>
            </div>
            <Avatar className="size-10 border border-border/80">
              <AvatarFallback className="bg-accent/30 text-sm font-semibold text-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="group relative overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,214,110,0.55),_transparent_42%),linear-gradient(145deg,_#fff9ec,_#ffffff_58%,_#f7f1e7)] p-8 text-left shadow-[0_24px_90px_-44px_rgba(35,24,0,0.45)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8 lg:min-h-[23rem]">
              <div className="max-w-xl">
                <span className="inline-flex items-center rounded-full border border-accent/30 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-foreground/80">
                  Page one
                </span>
                <h2 className="mt-5 max-w-lg text-4xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-5xl">
                  Capture a new thought before it slips away.
                </h2>
                <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                  Voice note, quick note, or image first. Search and archive
                  browsing stay deliberately separate in the journal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background">
                  <Plus className="size-4" />
                  Open capture
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/70 px-4 py-2.5 text-sm text-muted-foreground">
                  <Camera className="size-4" />
                  Thoughts, notes, photos
                </span>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 right-0 w-[17rem] translate-x-5 translate-y-4 sm:w-[19rem]">
              <NotoMascotWeb compact />
            </div>
          </button>

          <div className="flex flex-col gap-4">
            <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Current pace
              </p>
              {loadingStats ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-10 w-28 rounded-full" />
                  <Skeleton className="h-4 w-full rounded-full" />
                </div>
              ) : (
                <>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-foreground">
                    {totalThoughts ?? 0}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Captured thoughts in your memory stream so far.
                  </p>
                </>
              )}
            </div>

            {quickLinks.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 rounded-[1.6rem] border border-border/70 bg-card/70 px-5 py-4 shadow-sm transition-colors hover:bg-card"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-foreground">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture a new memory</DialogTitle>
            <DialogDescription>
              Add a quick thought or attach a photo. The journal stays separate
              for history and search.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleComposeSubmit} className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
              <textarea
                value={composeText}
                onChange={(event) => setComposeText(event.target.value)}
                rows={5}
                placeholder="What happened? What do you want to remember?"
                className="min-h-32 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:bg-accent/5">
              <span className="inline-flex items-center gap-2">
                <ImagePlus className="size-4" />
                {composeImageName || "Attach a photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Optional
              </span>
            </label>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || (!composeText.trim() && !composeImage)}
                className="rounded-full px-5"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Capturing
                  </>
                ) : (
                  "Save memory"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
