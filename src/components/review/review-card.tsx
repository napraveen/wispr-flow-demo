"use client";

import React, { useState } from "react";
import { GroundedReviewComment, ReviewSeverity } from "@/lib/types/review";
import { DegradationBadge } from "./degradation-badge";
import {
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Check,
  Edit2,
  Trash2,
  Code2,
  CheckCircle2
} from "lucide-react";

interface ReviewCardProps {
  comment: GroundedReviewComment;
  onUpdate: (updated: GroundedReviewComment) => void;
  onDelete: (id: string) => void;
  onSelectAnchor?: (file: string, line: number) => void;
}

export function ReviewCard({
  comment,
  onUpdate,
  onDelete,
  onSelectAnchor
}: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(comment.body);
  const [editedSeverity, setEditedSeverity] = useState<ReviewSeverity>(comment.severity);
  const [editedCode, setEditedCode] = useState(comment.suggestedChange || "");

  const handleSave = () => {
    onUpdate({
      ...comment,
      body: editedBody,
      severity: editedSeverity,
      suggestedChange: editedCode.trim() ? editedCode : null
    });
    setIsEditing(false);
  };

  const getSeverityStyle = (sev: ReviewSeverity) => {
    switch (sev) {
      case "BLOCKER":
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          chip: "bg-red-500/15 text-red-400 border-red-500/30"
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          chip: "bg-amber-500/15 text-amber-400 border-amber-500/30"
        };
      case "SUGGESTION":
        return {
          icon: <Lightbulb className="w-3.5 h-3.5" />,
          chip: "bg-blue-500/15 text-blue-400 border-blue-500/30"
        };
      case "NITPICK":
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          chip: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
        };
    }
  };

  const sevStyle = getSeverityStyle(comment.severity);

  return (
    <div className="border border-[#30363d] rounded-lg bg-[#0d1117] p-3.5 text-xs space-y-3 hover:border-[#484f58] transition-colors">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Severity Chip */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border text-[11px] ${sevStyle.chip}`}
          >
            {sevStyle.icon}
            {comment.severity}
          </span>

          {/* Degradation Badge */}
          <DegradationBadge
            status={comment.degradationStatus}
            isSnapped={comment.isSnapped}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            aria-label="Edit review comment"
            className="p-1 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            aria-label="Delete review comment"
            className="p-1 rounded text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target File & Line Anchor */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b949e]">
        <span
          onClick={() => {
            if (comment.line && onSelectAnchor) {
              onSelectAnchor(comment.path, comment.line);
            }
          }}
          className={`truncate hover:text-blue-400 cursor-pointer ${
            comment.line ? "underline decoration-dotted" : ""
          }`}
        >
          {comment.path}
          {comment.line !== null ? `:${comment.line}` : " (file-level)"}
        </span>

        {comment.side && (
          <span className="text-[10px] text-[#6e7681]">({comment.side} side)</span>
        )}
      </div>

      {/* Snapped Warning Banner */}
      {comment.isSnapped && comment.snapReason && (
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] leading-relaxed">
          <strong>Diff Grounding Notice:</strong> {comment.snapReason}
        </div>
      )}

      {/* Comment Body */}
      {isEditing ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8b949e]">Severity:</span>
            {(["BLOCKER", "WARNING", "SUGGESTION", "NITPICK"] as ReviewSeverity[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setEditedSeverity(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  editedSeverity === s
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            className="w-full p-2 bg-[#161b22] text-[#f0f6fc] border border-[#30363d] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-xs resize-y min-h-[60px]"
          />

          <div className="space-y-1">
            <label className="text-[10px] text-[#8b949e] font-mono">Suggested Code Change (optional):</label>
            <textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              placeholder="e.g. const token = sanitize(rawToken);"
              className="w-full p-2 bg-[#161b22] text-[#7ee787] font-mono text-[11px] border border-[#30363d] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[40px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-[11px] rounded bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 text-[11px] rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">
          {comment.body}
        </div>
      )}

      {/* Suggested Code Change Preview */}
      {!isEditing && comment.suggestedChange && (
        <div className="mt-2 rounded border border-[#30363d] overflow-hidden bg-[#161b22]">
          <div className="px-3 py-1 bg-[#1f242c] text-[10px] font-mono text-[#8b949e] flex items-center gap-1.5 border-b border-[#30363d]">
            <Code2 className="w-3 h-3 text-emerald-400" />
            <span>Suggested Code Change</span>
          </div>
          <pre className="p-2.5 font-mono text-[11px] text-[#7ee787] overflow-x-auto whitespace-pre">
            {comment.suggestedChange}
          </pre>
        </div>
      )}
    </div>
  );
}
