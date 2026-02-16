"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Preferences {
  morning_checkin: boolean;
  evening_journal: boolean;
  weekly_report: boolean;
  feature_tips: boolean;
}

export default function SettingsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [prefs, setPrefs] = useState<Preferences>({
    morning_checkin: true,
    evening_journal: true,
    weekly_report: true,
    feature_tips: true,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetch(`/api/settings?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const updatePref = useCallback(
    (key: keyof Preferences, value: boolean) => {
      if (!user) return;
      setPrefs((prev) => ({ ...prev, [key]: value }));

      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, key, value }),
      }).catch(() => {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !value }));
      });
    },
    [user],
  );

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/export?userId=${user.id}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `groot-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-lg">
        <div className="h-8 w-24 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-48 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-32 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Settings
      </h1>

      {/* Notifications */}
      <section
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>
          Notifications
        </h2>
        <div className="space-y-4">
          <ToggleRow
            label="Morning check-in"
            description="Daily at 8 AM IST"
            value={prefs.morning_checkin}
            onChange={(v) => updatePref("morning_checkin", v)}
          />
          <ToggleRow
            label="Evening journal"
            description="Daily at 9 PM IST"
            value={prefs.evening_journal}
            onChange={(v) => updatePref("evening_journal", v)}
          />
          <ToggleRow
            label="Weekly report"
            description="Sunday at 10 AM IST"
            value={prefs.weekly_report}
            onChange={(v) => updatePref("weekly_report", v)}
          />
          <ToggleRow
            label="Feature tips"
            description="Occasional tips about new features"
            value={prefs.feature_tips}
            onChange={(v) => updatePref("feature_tips", v)}
          />
        </div>
      </section>

      {/* Privacy */}
      <section
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>
          Privacy & Data
        </h2>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full text-left px-4 py-3 rounded-lg text-sm border"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
              opacity: exporting ? 0.5 : 1,
            }}
          >
            {exporting ? "Exporting..." : "Export my data (JSON)"}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-left px-4 py-3 rounded-lg text-sm border"
            style={{
              borderColor: "var(--color-danger)",
              color: "var(--color-danger)",
            }}
          >
            Delete all my data
          </button>
        </div>

        {showDeleteConfirm && (
          <div
            className="mt-4 p-4 rounded-lg border"
            style={{
              borderColor: "var(--color-danger)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            <p className="text-sm mb-3" style={{ color: "var(--color-danger)" }}>
              This will permanently delete all your data including memories, habits, tasks, and reports. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--color-danger)",
                  color: "white",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
                title="Contact support to delete your account"
              >
                Delete (contact support)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* About */}
      <section
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>
          About Groot
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Groot is your AI Second Brain on WhatsApp. Version 0.1.0
        </p>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full transition-colors relative"
        style={{
          backgroundColor: value ? "var(--color-primary)" : "var(--color-border)",
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm"
          style={{
            transform: value ? "translateX(22px)" : "translateX(2px)",
          }}
        />
      </button>
    </div>
  );
}
