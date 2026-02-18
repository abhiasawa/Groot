"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Network } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { BackgroundGradient } from "@/components/aceternity/background-gradient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
    cachedFetch<{ nodes?: GraphNode[]; links?: GraphLink[] }>("/api/graph")
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[60vh] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Graph" subtitle="Connections between your memories" />

      {graphData.nodes.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center text-center">
            <Network className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Your knowledge graph is empty</p>
            <p className="text-sm mt-1 text-muted-foreground">
              Share more with Groot -- connections between your memories will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <BackgroundGradient containerClassName="rounded-xl">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-0 h-[60vh]">
              <ForceGraph
                graphData={graphData}
                nodeLabel="label"
                nodeColor={(node) => {
                  const n = node as GraphNode;
                  return n.type === "profile" ? "#D9730D" : "#2383E2";
                }}
                nodeVal={(node) => (node as GraphNode).size}
                linkColor={() => "hsl(var(--border))"}
                linkWidth={() => 1}
                onNodeClick={(node) => setSelectedNode(node as GraphNode)}
                width={typeof window !== "undefined" ? Math.min(window.innerWidth - 40, 1100) : 800}
                height={500}
              />
            </CardContent>
          </Card>
        </BackgroundGradient>
      )}

      {/* Node Detail Sheet */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => { if (!open) setSelectedNode(null); }}>
        <SheetContent side="right">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">
                {selectedNode?.type}
              </Badge>
            </div>
            <SheetTitle>{selectedNode?.label}</SheetTitle>
            <SheetDescription>Memory detail</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <p className="text-sm text-foreground leading-relaxed">
              {selectedNode?.content}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
