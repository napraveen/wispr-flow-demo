"use client";

import React, { useState } from "react";
import { KeyRound, X, Check, ExternalLink } from "lucide-react";

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSaveToken: (token: string) => void;
}

export function TokenModal({ isOpen, onClose, token, onSaveToken }: TokenModalProps) {
  const [inputVal, setInputVal] = useState(token);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(inputVal.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-dialog-title"
        className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <h3 id="token-dialog-title" className="text-sm font-bold text-white">
              Connect GitHub Token
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#8b949e] hover:text-[#c9d1d9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#8b949e] leading-relaxed">
          Anonymous visitors can review the preloaded public demo repo freely. To review and post comments to your own private or organization repositories, provide a GitHub Personal Access Token (PAT).
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label
              htmlFor="pat-input"
              className="text-[11px] font-semibold text-[#c9d1d9] block mb-1"
            >
              GitHub Personal Access Token (PAT):
            </label>
            <input
              id="pat-input"
              type="password"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="ghp_... or github_pat_..."
              className="w-full px-3 py-2 text-xs font-mono bg-[#0d1117] text-[#f0f6fc] border border-[#30363d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#484f58]"
            />
          </div>

          <div className="text-[11px] text-[#8b949e] flex items-center justify-between">
            <span>Required scope: <code>repo</code></span>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              Generate token <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
            {token && (
              <button
                type="button"
                onClick={() => {
                  onSaveToken("");
                  setInputVal("");
                  onClose();
                }}
                className="px-3 py-1.5 text-xs rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear Token
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Token</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
