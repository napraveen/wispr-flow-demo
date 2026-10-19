"use client";

import React from "react";
import { GroundedReviewComment } from "@/lib/types/review";
import { ReviewCard } from "./review-card";
import { CheckCircle2, AlertOctagon, MessageSquare, Send, Sparkles } from "lucide-react";

interface ReviewSummaryProps {
  summary: string;
  onSummaryChange: (val: string) => void;
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
  onEventChange: (e: "APPROVE" | "REQUEST_CHANGES" | "COMMENT") => void;
  comments: GroundedReviewComment[];
  onUpdateComment: (comment: GroundedReviewComment) => void;
  onDeleteComment: (id: string) => void;
  onSubmitReview: () => void;
  isSubmitting: boolean;
  onSelectAnchor?: (file: string, line: number) => void;
  modelUsed?: string;
}

export function ReviewSummary({
  summary,
  onSummaryChange,
  event,
  onEventChange,
  comments,
  onUpdateComment,
  onDeleteComment,
  onSubmitReview,
  isSubmitting,
  onSelectAnchor,
  modelUsed
}: ReviewSummaryProps) {
  const blockersCount = comments.filter((c) => c.severity === "BLOCKER").length;
  const warningsCount = comments.filter((c) => c.severity === "WARNING").length;
  const suggestionsCount = comments.filter((c) => c.severity === "SUGGESTION").length;
  const nitpicksCount = comments.filter((c) => c.severity === "NITPICK").length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#161b22]">
      {/* Header with stats */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[#f0f6fc]">Structured Review</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#30363d] text-[#8b949e] font-mono">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </span>
        </div>

        {modelUsed && (
          <span className="text-[11px] font-mono text-[#8b949e]">
            Model: <span className="text-[#58a6ff]">{modelUsed}</span>
          </span>
        )}
      </div>

      {/* Scrollable Comments & Summary Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {blockersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
              {blockersCount} {blockersCount === 1 ? "Blocker" : "Blockers"}
            </span>
          )}
          {warningsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {warningsCount} {warningsCount === 1 ? "Warning" : "Warnings"}
            </span>
          )}
          {suggestionsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {suggestionsCount} {suggestionsCount === 1 ? "Suggestion" : "Suggestions"}
            </span>
          )}
          {nitpicksCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">
              {nitpicksCount} {nitpicksCount === 1 ? "Nitpick" : "Nitpicks"}
            </span>
          )}
        </div>

        {/* Review Summary Editor */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Review Summary Body:
          </label>
          <textarea
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            rows={3}
            placeholder="Overall review summary..."
            className="w-full p-2.5 text-xs bg-[#0d1117] text-[#f0f6fc] border border-[#30363d] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
          />
        </div>

        {/* Individual Comment Cards */}
        <div className="space-y-3">
          <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
            Grounded Comments ({comments.length}):
          </label>

          {comments.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8b949e] border border-dashed border-[#30363d] rounded-lg">
              No inline comments. The review will be submitted with the summary body only.
            </div>
          ) : (
            comments.map((comment) => (
              <ReviewCard
                key={comment.id}
                comment={comment}
                onUpdate={onUpdateComment}
                onDelete={onDeleteComment}
                onSelectAnchor={onSelectAnchor}
              />
            ))
          )}
        </div>
      </div>

      {/* Review Event & Submission Footer */}
      <div className="p-3 bg-[#0d1117] border-t border-[#30363d] shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEventChange("COMMENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                event === "COMMENT"
                  ? "bg-zinc-700/60 text-white border-zinc-500 ring-1 ring-zinc-400"
                  : "bg-[#161b22] text-[#8b949e] border-[#30363d] hover:text-[#c9d1d9]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Comment
            </button>

            <button
              type="button"
              onClick={() => onEventChange("REQUEST_CHANGES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                event === "REQUEST_CHANGES"
                  ? "bg-red-600/30 text-red-300 border-red-500 ring-1 ring-red-400"
                  : "bg-[#161b22] text-[#8b949e] border-[#30363d] hover:text-red-400"
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Request Changes
            </button>

            <button
              type="button"
              onClick={() => onEventChange("APPROVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                event === "APPROVE"
                  ? "bg-emerald-600/30 text-emerald-300 border-emerald-500 ring-1 ring-emerald-400"
                  : "bg-[#161b22] text-[#8b949e] border-[#30363d] hover:text-emerald-400"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
          </div>

          <button
            type="button"
            onClick={onSubmitReview}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Review to GitHub</span>
          </button>
        </div>
      </div>
    </div>
  );
}
