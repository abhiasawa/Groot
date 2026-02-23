const API_BASE = "https://groot-three.vercel.app";

// ── Error class ──────────────────────────────

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ── Fetch wrapper ────────────────────────────

/**
 * Fetch against the Groot API.
 *
 * Uses the single-user fallback on the server (no auth required).
 * Returns parsed JSON on 2xx; throws `ApiError` otherwise.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = `API ${res.status}`;
    try {
      const parsed = JSON.parse(body) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (body) message = body;
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}
