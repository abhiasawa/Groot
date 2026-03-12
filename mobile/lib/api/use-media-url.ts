import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

/**
 * Resolves a `media_url` value to a real downloadable URL.
 *
 * Handles three formats:
 *  - `storage:path/to/file` → calls /api/media/signed-url?path=...
 *  - `media:whatsappId`     → calls /api/media/proxy?mediaId=...
 *  - http(s) URL            → returns as-is
 *  - null/undefined         → returns null
 */
export function useMediaUrl(mediaUrl: string | null | undefined) {
  const isStorage = mediaUrl?.startsWith("storage:");
  const isWhatsApp = mediaUrl?.startsWith("media:");
  const isHttp = mediaUrl?.startsWith("http");
  const needsResolving = !!(mediaUrl && (isStorage || isWhatsApp));

  return useQuery<string | null>({
    queryKey: ["mediaUrl", mediaUrl],
    queryFn: async () => {
      if (!mediaUrl) return null;

      if (isStorage) {
        const path = mediaUrl.slice("storage:".length);
        const res = await apiFetch<{ url: string }>(
          `/api/media/signed-url?path=${encodeURIComponent(path)}`,
        );
        return res.url;
      }

      if (isWhatsApp) {
        const mediaId = mediaUrl.slice("media:".length);
        const res = await apiFetch<{ url: string }>(
          `/api/media/proxy?mediaId=${encodeURIComponent(mediaId)}`,
        );
        return res.url;
      }

      return mediaUrl;
    },
    enabled: needsResolving || isHttp,
    staleTime: 5 * 60 * 1000, // signed URLs last a while
    gcTime: 10 * 60 * 1000,
    // If it's already an HTTP URL, return it immediately
    ...(isHttp ? { initialData: mediaUrl } : {}),
  });
}
