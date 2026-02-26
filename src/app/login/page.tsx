"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
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
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "outline",
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
  }, [handleGoogleCredential]);

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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-lg"
        style={{ backgroundColor: "var(--color-card)" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1
            className="text-2xl font-semibold"
            style={{
              color: "var(--color-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            The Garden
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Your Groot dashboard
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
                className="text-sm"
                style={{ color: "var(--color-primary)" }}
              >
                ← Back
              </button>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Check your WhatsApp
              </p>
            </div>

            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
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
                className="w-full px-4 py-4 rounded-lg border text-center text-2xl font-bold tracking-[0.5em] outline-none transition-colors"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleRequestOtp(e);
              }}
              className="w-full text-sm text-center py-2"
              style={{ color: "var(--color-primary)" }}
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
                  <p
                    className="text-xs text-center mt-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Signing in...
                  </p>
                )}
              </div>
            )}

            {/* ── Divider ── */}
            {GOOGLE_CLIENT_ID && (
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "var(--color-border)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  or
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "var(--color-border)" }}
                />
              </div>
            )}

            {/* ── WhatsApp OTP ── */}
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-text)" }}
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
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              {error && !googleLoading && (
                <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {loading ? "Sending..." : "Send Code via WhatsApp"}
              </button>
            </form>
          </div>
        )}

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Message Groot on WhatsApp first to create your account.
        </p>
      </div>
    </div>
  );
}
