import * as SecureStore from "expo-secure-store";

const API_BASE = "https://groot-three.vercel.app";
const JWT_KEY = "supabase-jwt";

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
 * Authenticated fetch against the Groot API.
 *
 * - Reads the Supabase JWT from expo-secure-store.
 * - Attaches `Authorization: Bearer <jwt>`.
 * - Returns parsed JSON on 2xx; throws `ApiError` otherwise.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const jwt = await SecureStore.getItemAsync(JWT_KEY);

  if (!jwt) {
    throw new ApiError("Not authenticated", 401);
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
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
