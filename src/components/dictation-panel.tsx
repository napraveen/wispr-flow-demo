"use client";

import React, { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Sparkles, Loader2, RotateCcw } from "lucide-react";

interface DictationPanelProps {
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onGenerateReview: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function DictationPanel({
  transcript,
  onTranscriptChange,
  onGenerateReview,
  isGenerating,
  disabled = false
}: DictationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Autofocus the textarea immediately on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Compute live word count
  const wordCount = transcript.trim() === "" ? 0 : transcript.trim().split(/\s+/).length;

  // Browser Web Speech API fallback for visitors without system dictation
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Browser speech recognition is not supported in this browser. Please type or use Wispr Flow / system dictation.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const added = finalTranscript || interimTranscript;
        if (added) {
          onTranscriptChange(transcript ? `${transcript} ${added.trim()}` : added.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to initialize speech recognition", e);
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-[#f0f6fc]">Spoken Thought Stream</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#30363d] text-[#8b949e] font-mono">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Secondary fallback microphone button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            title={isRecording ? "Stop voice fallback" : "Browser mic fallback (optional)"}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              isRecording
                ? "bg-red-500/20 text-red-400 border-red-500/50"
                : "bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] border-[#30363d]"
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono">{isRecording ? "Listening..." : "Fallback Mic"}</span>
          </button>

          {transcript.trim() && (
            <button
              type="button"
              onClick={() => onTranscriptChange("")}
              title="Clear transcript"
              className="p-1.5 text-[#8b949e] hover:text-[#f85149] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Dictation Textarea (Autofocused, prominent) */}
      <div className="relative flex-1 p-3 flex flex-col">
        <textarea
          ref={textareaRef}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          disabled={disabled || isGenerating}
          placeholder="Start talking out loud with Wispr Flow or dictation... Say what you think naturally: 'In the auth file around line 40, this leaks the token. Also that helper function needs null checking...'"
          className="w-full flex-1 p-3 text-sm font-mono leading-relaxed bg-[#0d1117] text-[#f0f6fc] border border-[#30363d] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#484f58] resize-none"
        />

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-[#8b949e]">
            Wispr Flow dictation streams directly into this focused area.
          </p>

          <button
            type="button"
            onClick={onGenerateReview}
            disabled={disabled || isGenerating || !transcript.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-all active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Structuring Review...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Review</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
