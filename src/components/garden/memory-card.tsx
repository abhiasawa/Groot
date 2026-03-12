"use client";

import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Mic, Camera, ChevronDown, Trash2 } from "lucide-react";
import MarkdownContent from "./markdown-content";

interface MemoryCardProps {
  id: string;
  content: string;
  mediaDescription?: string;
  messageType: string;
  createdAt: string;
  moodColor: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete?: (id: string) => void;
  isFresh?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> =
  {
    text: { icon: FileText, label: "Text" },
    audio: { icon: Mic, label: "Voice" },
    image: { icon: Camera, label: "Photo" },
  };

export default function MemoryCard({
  id,
  content,
  mediaDescription,
  messageType,
  createdAt,
  moodColor,
  isExpanded,
  onToggleExpand,
  onDelete,
  isFresh = false,
}: MemoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const time = new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const wordCount = content?.split(/\s+/).length ?? 0;
  const config = TYPE_CONFIG[messageType] ?? TYPE_CONFIG["text"]!;
  const Icon = config.icon;

  useEffect(() => {
    if (isExpanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isExpanded]);

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden",
          isExpanded && "col-span-full",
          isFresh &&
            "ring-2 ring-accent/50 ring-offset-2 ring-offset-background",
        )}
        style={{ borderLeft: `3px solid ${moodColor}` }}
        onClick={() => onToggleExpand(id)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: moodColor }}
          />
          {isFresh && (
            <Badge className="border border-accent/25 bg-accent/15 text-accent-foreground">
              New
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {time}
          </span>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete memory</span>
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pb-2">
          <MarkdownContent
            content={content}
            truncate={isExpanded ? undefined : 200}
          />

          {mediaDescription && (
            <p className="text-xs mt-2 italic text-muted-foreground">
              {mediaDescription}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-dashed border-border opacity-70">
          {wordCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {wordCount} words
            </span>
          )}
          <span className="text-[11px] text-primary ml-auto flex items-center gap-1">
            {isExpanded ? "Show less" : "Read more"}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
