export function isLastImageRequest(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasImageWord = /\b(image|photo|picture|pic)\b/.test(normalized);
  const hasTimeWord = /\b(last|latest|previous|recent)\b/.test(normalized);
  const hasActionWord = /\b(send|show|share|resend)\b/.test(normalized);
  const hasOwnershipWord = /\b(my|from me)\b/.test(normalized)
    || normalized.includes("i sent")
    || normalized.includes("i shared");

  return hasImageWord && hasTimeWord && hasActionWord && hasOwnershipWord;
}

export function extractStoredMediaId(mediaUrl: string | null): string | null {
  if (!mediaUrl) return null;
  if (!mediaUrl.startsWith("media:")) return null;
  const mediaId = mediaUrl.slice("media:".length).trim();
  return mediaId.length > 0 ? mediaId : null;
}
