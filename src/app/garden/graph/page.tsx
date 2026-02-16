"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// react-force-graph-2d needs to be client-side only (uses canvas)
const ForceGraph = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<{
    label: string;
    content: string;
    type: string;
  } | null>(null);

  // Placeholder data — in production, fetch from /api/graph
  const graphData = {
    nodes: [] as Array<{ id: string; label: string; type: string; content: string; size: number }>,
    links: [] as Array<{ source: string; target: string; strength: number }>,
  };

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Knowledge Graph
      </h1>

      {graphData.nodes.length === 0 ? (
        <div
          className="p-8 rounded-xl border text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <span className="text-4xl block mb-3">🕸️</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>
            Your knowledge graph is empty
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Share more with Groot — connections between your memories will appear here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            height: "60vh",
          }}
        >
          <ForceGraph
            graphData={graphData}
            nodeLabel="label"
            nodeColor={() => "#2D5F3B"}
            linkColor={() => "#8BA98E"}
            onNodeClick={(node) => {
              const n = node as { label: string; content: string; type: string };
              setSelectedNode(n);
            }}
            width={typeof window !== "undefined" ? window.innerWidth - 300 : 800}
            height={500}
          />
        </div>
      )}

      {/* Node Detail Panel */}
      {selectedNode && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {selectedNode.type}
              </span>
              <p className="text-sm mt-2" style={{ color: "var(--color-text)" }}>
                {selectedNode.content}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
