"use client";

import React, { useState } from "react";
import { GitPullRequest, Search, Loader2 } from "lucide-react";

interface PRInputBarProps {
  currentUrl: string;
  isLoading: boolean;
  onLoadPR: (url: string) => void;
}

export function PRInputBar({ currentUrl, isLoading, onLoadPR }: PRInputBarProps) {
  const [inputUrl, setInputUrl] = useState(currentUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onLoadPR(inputUrl.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-3xl">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8b949e]">
          <GitPullRequest className="w-4 h-4 text-emerald-400" />
        </div>
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Paste GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)"
          className="w-full pl-9 pr-4 py-2 text-sm bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#6e7681]"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !inputUrl.trim()}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading PR...</span>
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            <span>Inspect PR</span>
          </>
        )}
      </button>
    </form>
  );
}
