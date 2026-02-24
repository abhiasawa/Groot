import * as SecureStore from "expo-secure-store";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://groot-three.vercel.app"
).replace(/\/$/, "");
const TOKEN_KEY = "groot-jwt";

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
 * Automatically attaches the JWT Bearer token from secure storage.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  // Attach Bearer token from secure storage
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${token}`;
    }
  } catch {
    // SecureStore unavailable — proceed without token
  }

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
