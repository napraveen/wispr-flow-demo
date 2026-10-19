"use client";

import React, { useState, useEffect } from "react";
import { PRInputBar } from "@/components/pr-input-bar";
import { SplitDiffViewer } from "@/components/diff-viewer/split-diff";
import { DictationPanel } from "@/components/dictation-panel";
import { PullRequestDetails } from "@/lib/types/diff";
import {
  GitPullRequest,
  ExternalLink,
  AlertCircle,
  FileDiff,
  Mic,
  MessageSquare,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  // Default to a real active PR on a major open-source repository
  const [prUrl, setPrUrl] = useState("https://github.com/facebook/react/pull/37895");
  const [loadingPr, setLoadingPr] = useState(false);
  const [prDetails, setPrDetails] = useState<PullRequestDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dictation stream state
  const [transcript, setTranscript] = useState("");
  const [selectedAnchor, setSelectedAnchor] = useState<{ file: string; line: number } | null>(null);

  // Fetch PR data
  const handleLoadPR = async (url: string) => {
    setLoadingPr(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/pr?url=${encodeURIComponent(url)}`);
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

        {/* PR Quick Links */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="text-[#8b949e]">Examples:</span>
          <button
            onClick={() => handleLoadPR("https://github.com/facebook/react/pull/31600")}
            className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
          >
            react#31600
          </button>
          <button
            onClick={() => handleLoadPR("https://github.com/vercel/next.js/pull/70800")}
            className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
          >
            next.js#70800
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
              <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/40 text-red-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Failed to Load Pull Request</h3>
                  <p className="text-xs mt-1 text-red-200">{errorMessage}</p>
                </div>
              </div>
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
              onGenerateReview={() => {
                alert("Review generation will be activated in Phase 3 after diff grounding tests.");
              }}
              isGenerating={false}
              disabled={!prDetails}
            />
          </div>

          {/* Comments & Degradation Ladder Area */}
          <div className="h-1/2 p-4 pt-2 flex flex-col">
            <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-[#f0f6fc]">Review Comments</h3>
                </div>
                <span className="text-xs text-[#8b949e]">Phase 1 Ready</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8b949e]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-[#c9d1d9]">Diff Loaded & Parsed</p>
                <p className="text-xs mt-1 text-[#8b949e] max-w-xs">
                  {totalCommentableLines} legal comment anchors computed from real diff hunks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
