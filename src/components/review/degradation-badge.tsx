"use client";

import React from "react";
import { DegradationStatus } from "@/lib/types/review";
import { CheckCircle2, AlertTriangle, FileText, Bookmark } from "lucide-react";

interface DegradationBadgeProps {
  status: DegradationStatus;
  isSnapped?: boolean;
}

export function DegradationBadge({ status, isSnapped }: DegradationBadgeProps) {
  if (status === "EXACT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" />
        EXACT ANCHOR
      </span>
    );
  }

  if (status === "SNAPPED" || isSnapped) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" />
        SNAPPED TO NEAR DIFF LINE
      </span>
    );
  }

  if (status === "FILE_LEVEL") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <FileText className="w-3 h-3" />
        FILE-LEVEL COMMENT
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
      <Bookmark className="w-3 h-3" />
      REVIEW BODY NOTE
    </span>
  );
}
