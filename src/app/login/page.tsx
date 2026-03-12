"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

// ── Google GSI types ────────────────────────────────
interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleGSI {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
      }) => void;
      renderButton: (
        element: HTMLElement,
        config: {
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          type?: "standard" | "icon";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
          width?: number;
          logo_alignment?: "left" | "center";
        },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleGSI;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // ── Google Sign-In callback ──────────────────────
  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      setGoogleLoading(true);
      setError("");

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: response.credential }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          token?: string;
          error?: string;
        };

        if (!res.ok || !data.token) {
          throw new Error(data.error ?? "Google sign-in failed");
        }

        // Cookie is set by the server — redirect to the garden
        const next = searchParams.get("next") ?? "/garden";
        router.push(next);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Google sign-in failed";
        setError(message);
      } finally {
        setGoogleLoading(false);
      }
    },
    [searchParams, router],
  );

  // ── Load Google GSI script ───────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // If already loaded, initialize
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          type: "standard",
          text: "continue_with",
          shape: "rectangular",
          width: 380,
          logo_alignment: "left",
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: resolvedTheme === "dark" ? "filled_black" : "outline",
            size: "large",
            type: "standard",
            text: "continue_with",
            shape: "rectangular",
            width: 380,
            logo_alignment: "left",
          });
        }
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount
      const existing = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      if (existing) existing.remove();
    };
  }, [handleGoogleCredential, resolvedTheme]);

  // ── Step 1: Request OTP via WhatsApp ────────────
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone.trim() }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to send code");
      }

      setStep("otp");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ─────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError("Please enter the 6-digit code from WhatsApp");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone.trim(),
          code: otp.trim(),
        }),
      });

      const data = (await res.json()) as { token?: string; error?: string };

      if (!res.ok || !data.token) {
        throw new Error(data.error ?? "Invalid code");
      }

      // Cookie is set by the server — redirect to the garden
      const next = searchParams.get("next") ?? "/garden";
      router.push(next);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-semibold text-primary"
            style={{ letterSpacing: "-0.03em" }}
          >
            The Garden
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-accent">
            by Groot
          </p>
        </div>

        {step === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
                className="text-sm text-primary"
              >
                ← Back
              </button>
              <p className="text-sm font-medium text-foreground">
                Check your WhatsApp
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{phone}</strong>
            </p>

            <div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                required
                className="w-full px-4 py-4 rounded-lg border text-center text-2xl font-bold tracking-[0.5em] outline-none transition-colors bg-secondary border-border text-foreground"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full rounded-[14px] bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleRequestOtp(e);
              }}
              className="w-full text-sm text-center py-2 text-primary"
            >
              Resend code
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {/* ── Google Sign-In ── */}
            {GOOGLE_CLIENT_ID && (
              <div>
                <div
                  ref={googleButtonRef}
                  className="flex justify-center"
                  style={{ minHeight: 44 }}
                />
                {googleLoading && (
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    Signing in...
                  </p>
                )}
              </div>
            )}

            {/* ── Divider ── */}
            {GOOGLE_CLIENT_ID && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* ── WhatsApp OTP ── */}
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium mb-1 text-foreground"
                >
                  WhatsApp number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  required
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors bg-secondary border-border text-foreground"
                />
              </div>

              {error && !googleLoading && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full rounded-[14px] bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Code via WhatsApp"}
              </button>
            </form>
          </div>
        )}

        <details className="mt-6 rounded-2xl border border-border bg-secondary/70 p-4 text-sm text-muted-foreground">
          <summary className="cursor-pointer list-none font-medium text-foreground">
            How does this work?
          </summary>
          <p className="mt-2">
            Existing users can sign in with Google or request a WhatsApp code.
            New accounts are still provisioned through Groot first.
          </p>
        </details>
      </div>
    </div>
  );
}
