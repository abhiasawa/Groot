"use client";

export default function GardenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "#787774", fontSize: "0.875rem", marginBottom: "1rem" }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
