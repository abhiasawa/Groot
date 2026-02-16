"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

const ForceGraph = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface GraphNode {
  id: string;
  label: string;
  type: string;
  content: string;
  size: number;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export default function GraphPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!user) return;

    fetch(`/api/graph?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setGraphData({
          nodes: data.nodes ?? [],
          links: data.links ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (userLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-[60vh] rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      </div>
    );
  }

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
          className="rounded-xl border overflow-hidden relative"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            height: "60vh",
          }}
        >
          <ForceGraph
            graphData={graphData}
            nodeLabel="label"
            nodeColor={(node) => {
              const n = node as GraphNode;
              return n.type === "profile" ? "#D4A843" : "#2D5F3B";
            }}
            nodeVal={(node) => (node as GraphNode).size}
            linkColor={() => "#8BA98E"}
            onNodeClick={(node) => setSelectedNode(node as GraphNode)}
            width={typeof window !== "undefined" ? Math.min(window.innerWidth - 40, 1100) : 800}
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
