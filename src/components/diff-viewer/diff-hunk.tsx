"use client";

import React from "react";
import { DiffHunk as DiffHunkType } from "@/lib/types/diff";

interface DiffHunkProps {
  hunk: DiffHunkType;
  filePath: string;
  selectedLine?: number | null;
  onLineClick?: (line: number) => void;
}

export function DiffHunk({ hunk, filePath, selectedLine, onLineClick }: DiffHunkProps) {
  return (
    <div className="font-mono text-xs border-t border-[#30363d]">
      <div className="bg-[#161b22] text-[#8b949e] px-4 py-1.5 select-none font-semibold sticky top-0 z-10 border-b border-[#30363d]/50">
        {hunk.header}
      </div>
      <div className="divide-y divide-[#30363d]/20">
        {hunk.lines.map((line, idx) => {
          const isAdd = line.type === "add";
          const isDelete = line.type === "delete";
          const isContext = line.type === "context";

          const rightLine = line.newLineNumber;
          const leftLine = line.oldLineNumber;

          const isSelected = (rightLine && rightLine === selectedLine) || (leftLine && leftLine === selectedLine);

          let bgClass = "hover:bg-[#1f242c]";
          let textClass = "text-[#c9d1d9]";
          let gutterClass = "text-[#6e7681]";
          let marker = " ";

          if (isAdd) {
            bgClass = "bg-[#2ea043]/15 hover:bg-[#2ea043]/25";
            textClass = "text-[#7ee787]";
            gutterClass = "text-[#3fb950] bg-[#2ea043]/20";
            marker = "+";
          } else if (isDelete) {
            bgClass = "bg-[#f85149]/15 hover:bg-[#f85149]/25";
            textClass = "text-[#ffa198]";
            gutterClass = "text-[#f85149] bg-[#f85149]/20";
            marker = "-";
          }

          if (isSelected) {
            bgClass = "bg-yellow-500/20 ring-1 ring-yellow-500/50";
          }

          return (
            <div
              key={`${idx}-${leftLine ?? ""}-${rightLine ?? ""}`}
              onClick={() => {
                if (rightLine && onLineClick) onLineClick(rightLine);
                else if (leftLine && onLineClick) onLineClick(leftLine);
              }}
              className={`flex items-stretch select-text transition-colors duration-75 cursor-pointer ${bgClass}`}
            >
              {/* Left line number (Old) */}
              <div
                className={`w-12 shrink-0 py-0.5 px-2 text-right select-none font-mono text-[11px] border-r border-[#30363d]/50 ${gutterClass}`}
              >
                {leftLine ?? ""}
              </div>

              {/* Right line number (New) */}
              <div
                className={`w-12 shrink-0 py-0.5 px-2 text-right select-none font-mono text-[11px] border-r border-[#30363d]/50 ${gutterClass}`}
              >
                {rightLine ?? ""}
              </div>

              {/* Diff marker */}
              <div className="w-5 shrink-0 text-center select-none py-0.5 text-[11px] font-bold text-[#8b949e]">
                {marker}
              </div>

              {/* Line content */}
              <div className={`flex-1 py-0.5 px-2 whitespace-pre overflow-x-auto ${textClass}`}>
                {line.content || " "}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
