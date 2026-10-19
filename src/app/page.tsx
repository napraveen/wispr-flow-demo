"use client";

import React, { useState, useEffect } from "react";
import { PRInputBar } from "@/components/pr-input-bar";
import { SplitDiffViewer } from "@/components/diff-viewer/split-diff";
import { DictationPanel } from "@/components/dictation-panel";
import { ReviewSummary } from "@/components/review/review-summary";
import { ErrorBoundaryView, ErrorStateCode } from "@/components/error-boundary-view";
import { TokenModal } from "@/components/token-modal";
import { PullRequestDetails } from "@/lib/types/diff";
import { GroundedReviewComment } from "@/lib/types/review";
import {
  GitPullRequest,
  ExternalLink,
  AlertCircle,
  FileDiff,
  Mic,
  MessageSquare,
  Sparkles,
  Loader2,
  CheckCircle2,
  KeyRound
} from "lucide-react";

function categorizeError(message: string): ErrorStateCode {
  const lower = message.toLowerCase();
  if (lower.includes("invalid github pull request url") || lower.includes("expected format")) {
    return "INVALID_PR_URL";
  }
  if (lower.includes("not found") || lower.includes("private") || lower.includes("404")) {
    return "NOT_FOUND_OR_PRIVATE";
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "RATE_LIMITED";
  }
  if (lower.includes("demo repository") || lower.includes("unauthorized repo")) {
    return "POSTING_UNAUTHORIZED_REPO";
  }
  if (lower.includes("gemini") || lower.includes("model") || lower.includes("synthesis")) {
    return "MODEL_FAILURE";
  }
  if (lower.includes("422") || lower.includes("rejected") || lower.includes("unprocessable")) {
    return "GITHUB_API_REJECTION";
  }
  return "UNKNOWN_ERROR";
}

export default function Home() {
  // Default to a real active PR on a major open-source repository
  const [prUrl, setPrUrl] = useState("https://github.com/facebook/react/pull/37895");
  const [loadingPr, setLoadingPr] = useState(false);
  const [prDetails, setPrDetails] = useState<PullRequestDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GitHub User Token State
  const [githubToken, setGithubToken] = useState("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  // Dictation stream state
  const [transcript, setTranscript] = useState(
    "In compiler/crates/react_compiler_hir/src/globals.rs around line 40, this logic adds ref access to ResizeObserver callbacks. Make sure we also handle MutationObserver callbacks properly here."
  );
  const [selectedAnchor, setSelectedAnchor] = useState<{ file: string; line: number } | null>(null);

  // Structured Review state
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewEvent, setReviewEvent] = useState<"APPROVE" | "REQUEST_CHANGES" | "COMMENT">("COMMENT");
  const [comments, setComments] = useState<GroundedReviewComment[]>([]);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    reviewId: number;
    htmlUrl: string;
    selfApprovalDegraded: boolean;
    degradeNotice?: string;
  } | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vox_pr_github_token");
      if (saved) setGithubToken(saved);
    } catch (e) {
      // SSR or restricted storage
    }
  }, []);

  const handleSaveToken = (newToken: string) => {
    setGithubToken(newToken);
    try {
      if (newToken) {
        localStorage.setItem("vox_pr_github_token", newToken);
      } else {
        localStorage.removeItem("vox_pr_github_token");
      }
    } catch (e) {}
  };

  // Fetch PR data
  const handleLoadPR = async (url: string) => {
    setLoadingPr(true);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (githubToken) {
        headers["Authorization"] = `Bearer ${githubToken}`;
      }

      const res = await fetch(`/api/pr?url=${encodeURIComponent(url)}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch pull request.");
      }
      setPrDetails(data);
      setPrUrl(url);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while fetching the pull request.");
    } finally {
      setLoadingPr(false);
    }
  };

  // Generate Structured Review via LLM
  const handleGenerateReview = async () => {
    if (!prDetails || !transcript.trim()) return;

    setIsGenerating(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/review/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          files: prDetails.files
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to synthesize structured review.");
      }

      setReviewSummary(data.rawResponse.summary);
      setReviewEvent(data.rawResponse.recommendedEvent);
      setComments(data.groundedComments);
      setModelUsed(data.modelUsed);
    } catch (err: any) {
      console.error("Review generation error:", err);
      setReviewError(err.message || "An error occurred while generating the review.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateComment = (updated: GroundedReviewComment) => {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteComment = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmitReview = async () => {
    if (!prDetails) return;

    setIsSubmitting(true);
    setReviewError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (githubToken) {
        headers["Authorization"] = `Bearer ${githubToken}`;
      }

      const res = await fetch("/api/review/submit", {
        method: "POST",
        headers,
        body: JSON.stringify({
          owner: prDetails.owner,
          repo: prDetails.repo,
          pullNumber: prDetails.pullNumber,
          commitId: prDetails.headSha,
          body: reviewSummary,
          event: reviewEvent,
          comments
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post review to GitHub.");
      }

      setSubmissionSuccess({
        reviewId: data.reviewId,
        htmlUrl: data.htmlUrl,
        selfApprovalDegraded: data.selfApprovalDegraded,
        degradeNotice: data.degradeNotice
      });
    } catch (err: any) {
      console.error("Submission error:", err);
      setReviewError(err.message || "Failed to post review to GitHub.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleLoadPR(prUrl);
  }, []);

  const totalCommentableLines = prDetails?.files.reduce(
    (acc, f) => acc + f.commentableLines.length,
    0
  ) || 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0d1117]">
      {/* Top Navigation Bar */}
      <header className="h-16 shrink-0 border-b border-[#30363d] bg-[#161b22] px-6 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Vox PR</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/50">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e]">Spoken reviews grounded to real diffs</p>
          </div>
        </div>

        {/* PR URL Input */}
        <div className="flex-1 max-w-2xl mx-4">
          <PRInputBar
            currentUrl={prUrl}
            isLoading={loadingPr}
            onLoadPR={handleLoadPR}
          />
        </div>

        {/* Action Controls & Token Connect */}
        <div className="flex items-center gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => setIsTokenModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              githubToken
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:bg-[#30363d]"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            <span>{githubToken ? "GitHub Token Connected" : "Connect GitHub"}</span>
          </button>
        </div>
      </header>

      {/* Main Single-Screen Split Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Real Diff Viewer */}
        <div className="flex-1 flex flex-col border-r border-[#30363d] overflow-hidden bg-[#0d1117]">
          {/* Diff Header */}
          <div className="px-5 py-3 border-b border-[#30363d] bg-[#161b22]/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileDiff className="w-4 h-4 text-blue-400 shrink-0" />
              {prDetails ? (
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#f0f6fc] truncate">
                      {prDetails.owner}/{prDetails.repo}#{prDetails.pullNumber}
                    </span>
                    <a
                      href={prDetails.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8b949e] hover:text-[#58a6ff] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-[#8b949e] truncate">{prDetails.title}</p>
                </div>
              ) : (
                <span className="text-xs text-[#8b949e]">No pull request loaded</span>
              )}
            </div>

            {prDetails && (
              <div className="flex items-center gap-3 shrink-0 text-xs">
                <span className="text-[#8b949e]">
                  <strong className="text-[#f0f6fc]">{prDetails.files.length}</strong> files changed
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/30">
                  {totalCommentableLines} legal anchors
                </span>
              </div>
            )}
          </div>

          {/* Diff Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {errorMessage ? (
              <ErrorBoundaryView
                code={categorizeError(errorMessage)}
                message={errorMessage}
                onRetry={() => handleLoadPR(prUrl)}
                onConnectToken={() => setIsTokenModalOpen(true)}
              />
            ) : prDetails ? (
              <SplitDiffViewer
                files={prDetails.files}
                selectedFile={selectedAnchor?.file}
                selectedLine={selectedAnchor?.line}
                onSelectAnchor={(file, line) => {
                  setSelectedAnchor({ file, line });
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#8b949e]">
                Loading pull request data...
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Prominent Dictation Stream & Review Actions */}
        <div className="w-[480px] lg:w-[540px] xl:w-[600px] flex flex-col shrink-0 bg-[#0d1117] overflow-hidden">
          {/* Dictation Box */}
          <div className="h-1/2 p-4 pb-2 flex flex-col">
            <DictationPanel
              transcript={transcript}
              onTranscriptChange={setTranscript}
              onGenerateReview={handleGenerateReview}
              isGenerating={isGenerating}
              disabled={!prDetails}
            />
          </div>

          {/* Comments & Degradation Ladder Area */}
          <div className="h-1/2 p-4 pt-2 flex flex-col overflow-hidden">
            {reviewError ? (
              <div className="flex-1 bg-[#161b22] border border-red-500/40 rounded-xl p-4 overflow-y-auto">
                <ErrorBoundaryView
                  code={categorizeError(reviewError)}
                  message={reviewError}
                  onRetry={handleGenerateReview}
                  onConnectToken={() => setIsTokenModalOpen(true)}
                />
              </div>
            ) : submissionSuccess ? (
              <div className="flex-1 bg-[#161b22] border border-emerald-500/40 rounded-xl p-6 flex flex-col items-center justify-center text-center text-emerald-300 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Review Successfully Posted to GitHub!</h4>
                <p className="text-xs text-[#8b949e]">
                  Review ID: <span className="font-mono text-emerald-400">{submissionSuccess.reviewId}</span>
                </p>

                {submissionSuccess.selfApprovalDegraded && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left max-w-sm">
                    <strong>Notice:</strong> {submissionSuccess.degradeNotice || "GitHub does not permit author self-approval; review posted as a Comment."}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={submissionSuccess.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
                  >
                    <span>View Review on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setSubmissionSuccess(null)}
                    className="px-3 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium border border-[#30363d] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : comments.length > 0 || reviewSummary ? (
              <div className="flex-1 border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
                <ReviewSummary
                  summary={reviewSummary}
                  onSummaryChange={setReviewSummary}
                  event={reviewEvent}
                  onEventChange={setReviewEvent}
                  comments={comments}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onSubmitReview={handleSubmitReview}
                  isSubmitting={isSubmitting}
                  onSelectAnchor={(file, line) => {
                    setSelectedAnchor({ file, line });
                  }}
                  modelUsed={modelUsed}
                />
              </div>
            ) : (
              <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-[#f0f6fc]">Review Comments</h3>
                  </div>
                  <span className="text-xs text-[#8b949e]">Grounding Ready</span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8b949e]">
                  <Sparkles className="w-8 h-8 text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-[#c9d1d9]">Ready to Synthesize Review</p>
                  <p className="text-xs mt-1 text-[#8b949e] max-w-xs">
                    Dictate your thoughts above and click &quot;Synthesize Review&quot;. The model will ground comments to real diff lines.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* GitHub Personal Access Token Modal */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        token={githubToken}
        onSaveToken={handleSaveToken}
      />
    </div>
  );
}
