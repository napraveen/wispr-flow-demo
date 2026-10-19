"use client";

import React from "react";
import {
  AlertTriangle,
  Lock,
  Clock,
  ShieldAlert,
  ServerCrash,
  FileQuestion,
  RotateCcw,
  KeyRound
} from "lucide-react";

export type ErrorStateCode =
  | "INVALID_PR_URL"
  | "NOT_FOUND_OR_PRIVATE"
  | "RATE_LIMITED"
  | "POSTING_UNAUTHORIZED_REPO"
  | "MODEL_FAILURE"
  | "GITHUB_API_REJECTION"
  | "UNKNOWN_ERROR";

interface ErrorBoundaryViewProps {
  code: ErrorStateCode;
  message: string;
  onRetry?: () => void;
  onConnectToken?: () => void;
}

export function ErrorBoundaryView({
  code,
  message,
  onRetry,
  onConnectToken
}: ErrorBoundaryViewProps) {
  const getErrorMeta = () => {
    switch (code) {
      case "INVALID_PR_URL":
        return {
          icon: <FileQuestion className="w-8 h-8 text-amber-400" />,
          title: "Invalid Pull Request Link",
          description: "The link provided could not be recognized as a valid GitHub pull request.",
          tip: "Example of a valid link: https://github.com/facebook/react/pull/37895 or owner/repo/pull/123."
        };
      case "NOT_FOUND_OR_PRIVATE":
        return {
          icon: <Lock className="w-8 h-8 text-blue-400" />,
          title: "Repository Not Found or Private",
          description: "GitHub returned 404 Not Found. The repository may be private or the pull request number does not exist.",
          tip: "Connect your personal GitHub token in the top bar to review private repositories."
        };
      case "RATE_LIMITED":
        return {
          icon: <Clock className="w-8 h-8 text-orange-400" />,
          title: "Rate Limit Exceeded",
          description: "Too many requests sent in a short period.",
          tip: "Please wait 60 seconds for the window to reset, or connect a personal GitHub token for higher rate limits."
        };
      case "POSTING_UNAUTHORIZED_REPO":
        return {
          icon: <ShieldAlert className="w-8 h-8 text-purple-400" />,
          title: "Public Demo Sandbox Protection",
          description: "Anonymous visitors are restricted to posting reviews on the designated public demo repository.",
          tip: "To post reviews to your own repository, click 'Connect GitHub' in the header to authenticate with your own token."
        };
      case "MODEL_FAILURE":
        return {
          icon: <ServerCrash className="w-8 h-8 text-red-400" />,
          title: "AI Synthesis Error",
          description: "The language model service encountered an error or the API key was invalid / expired.",
          tip: "Verify your GEMINI_API_KEY in the environment or try dictating with shorter sentences."
        };
      case "GITHUB_API_REJECTION":
        return {
          icon: <AlertTriangle className="w-8 h-8 text-red-400" />,
          title: "GitHub Rejected Review",
          description: "GitHub's review API rejected the submission (HTTP 422).",
          tip: "The head commit may have been updated since you loaded the PR. Reload the PR to synchronize with the latest commit."
        };
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8 text-red-400" />,
          title: "Application Error",
          description: message || "An unexpected error occurred.",
          tip: "Check your network connection and try again."
        };
    }
  };

  const meta = getErrorMeta();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] shadow-lg max-w-lg mx-auto my-6 text-center space-y-4"
    >
      <div className="flex justify-center">{meta.icon}</div>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-[#f0f6fc]">{meta.title}</h3>
        <p className="text-xs text-[#c9d1d9] leading-relaxed">{meta.description}</p>
      </div>

      <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-[11px] text-[#8b949e] text-left leading-relaxed">
        <strong className="text-[#c9d1d9]">Troubleshooting:</strong> {meta.tip}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}

        {onConnectToken && (code === "NOT_FOUND_OR_PRIVATE" || code === "POSTING_UNAUTHORIZED_REPO") && (
          <button
            type="button"
            onClick={onConnectToken}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium border border-[#30363d] transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            <span>Connect GitHub Token</span>
          </button>
        )}
      </div>
    </div>
  );
}
