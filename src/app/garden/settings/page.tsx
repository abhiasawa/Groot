"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [morningCheckin, setMorningCheckin] = useState(true);
  const [eveningJournal, setEveningJournal] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [featureTips, setFeatureTips] = useState(true);

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
            value={morningCheckin}
            onChange={setMorningCheckin}
          />
          <ToggleRow
            label="Evening journal"
            description="Daily at 9 PM IST"
            value={eveningJournal}
            onChange={setEveningJournal}
          />
          <ToggleRow
            label="Weekly report"
            description="Sunday at 10 AM IST"
            value={weeklyReport}
            onChange={setWeeklyReport}
          />
          <ToggleRow
            label="Feature tips"
            description="Occasional tips about new features"
            value={featureTips}
            onChange={setFeatureTips}
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
            className="w-full text-left px-4 py-3 rounded-lg text-sm border"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            Export my data (JSON)
          </button>
          <button
            className="w-full text-left px-4 py-3 rounded-lg text-sm border"
            style={{
              borderColor: "var(--color-danger)",
              color: "var(--color-danger)",
            }}
          >
            Delete all my data
          </button>
        </div>
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
