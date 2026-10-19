"use client";

import React, { useState } from "react";
import { ParsedFileDiff } from "@/lib/types/diff";
import { DiffHunk } from "./diff-hunk";
import { FileCode, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

interface SplitDiffViewerProps {
  files: ParsedFileDiff[];
  selectedFile?: string | null;
  selectedLine?: number | null;
  onSelectAnchor?: (file: string, line: number) => void;
}

export function SplitDiffViewer({
  files,
  selectedFile,
  selectedLine,
  onSelectAnchor
}: SplitDiffViewerProps) {
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const toggleCollapse = (path: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#8b949e]">
        <FileCode className="w-12 h-12 mb-3 text-[#30363d]" />
        <p className="text-sm font-medium">No diff changes found in this pull request.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((file) => {
        const filePath = file.newPath || file.oldPath;
        const isCollapsed = !!collapsedFiles[filePath];
        const isSelected = selectedFile === filePath;

        return (
          <div
            key={filePath}
            id={`file-${encodeURIComponent(filePath)}`}
            className={`border rounded-lg overflow-hidden bg-[#0d1117] transition-colors ${
              isSelected ? "border-blue-500/80 shadow-md shadow-blue-500/10" : "border-[#30363d]"
            }`}
          >
            {/* File Header */}
            <div
              onClick={() => toggleCollapse(filePath)}
              className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] cursor-pointer select-none hover:bg-[#1c2128] transition-colors"
            >
              <div className="flex items-center gap-2.5 text-sm font-mono font-medium text-[#c9d1d9] truncate">
                <button
                  type="button"
                  aria-label="Toggle file collapse"
                  className="text-[#8b949e] hover:text-[#f0f6fc]"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <FileCode className="w-4 h-4 text-[#8b949e] shrink-0" />
                <span className="truncate">{filePath}</span>
              </div>

              <div className="flex items-center gap-2">
                {file.status === "added" && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#2ea043]/20 text-[#3fb950] border border-[#2ea043]/30">
                    ADDED
                  </span>
                )}
                {file.status === "deleted" && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/30">
                    DELETED
                  </span>
                )}
                {file.status === "renamed" && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#a371f7]/20 text-[#d2a8ff] border border-[#a371f7]/30">
                    RENAMED
                  </span>
                )}
                {file.status === "binary" && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#8b949e]/20 text-[#8b949e] border border-[#8b949e]/30">
                    BINARY
                  </span>
                )}
                {file.status === "modified" && (
                  <span className="text-[11px] font-mono text-[#8b949e]">
                    {file.commentableLines.length} commentable lines
                  </span>
                )}
              </div>
            </div>

            {/* File Hunks */}
            {!isCollapsed && (
              <div>
                {file.status === "binary" ? (
                  <div className="p-6 text-center text-xs text-[#8b949e] font-mono">
                    Binary file not displayed.
                  </div>
                ) : file.hunks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#8b949e] font-mono">
                    File empty or changes not within diff hunks.
                  </div>
                ) : (
                  file.hunks.map((hunk, hIdx) => (
                    <DiffHunk
                      key={`${filePath}-${hIdx}`}
                      hunk={hunk}
                      filePath={filePath}
                      selectedLine={isSelected ? selectedLine : null}
                      onLineClick={(line) => {
                        if (onSelectAnchor) onSelectAnchor(filePath, line);
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
