"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

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
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then((data) => {
        setGraphData({
          nodes: data.nodes ?? [],
          links: data.links ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-[60vh] rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Graph" subtitle="Connections between your memories" />

      {graphData.nodes.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">🕸️</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>Your knowledge graph is empty</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Share more with Groot — connections between your memories will appear here.
          </p>
        </DiaryCard>
      ) : (
        <DiaryCard className="!p-0 overflow-hidden" style={{ height: "60vh" }}>
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
        </DiaryCard>
      )}

      {/* Node Detail Panel */}
      {selectedNode && (
        <DiaryCard>
          <div className="flex justify-between items-start">
            <div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full uppercase"
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
        </DiaryCard>
      )}
    </div>
  );
}
