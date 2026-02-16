"use client";

import { useState } from "react";

const FILTERS = ["All", "Notes", "Todos", "Ideas", "Links", "Voice"];

export default function MemoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Memories
      </h1>

      {/* Search */}
      <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: "var(--color-bg)" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your memories..."
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            color: "var(--color-text)",
          }}
        />

        {/* Filter Bar */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: activeFilter === filter ? "var(--color-primary)" : "var(--color-surface)",
                color: activeFilter === filter ? "white" : "var(--color-text-secondary)",
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      <div
        className="p-8 rounded-xl border text-center"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <span className="text-4xl block mb-3">🌱</span>
        <p className="font-medium" style={{ color: "var(--color-text)" }}>
          Your Garden is ready to grow
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Send messages to Groot on WhatsApp — your memories will bloom here.
        </p>
      </div>
    </div>
  );
}
