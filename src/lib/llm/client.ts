import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  LLMReviewResponse,
  LLMReviewResponseSchema,
  GroundedReviewComment,
  ReviewSeverity
} from "../types/review";
import { ParsedFileDiff } from "../types/diff";
import { groundTargetPosition } from "../diff/snapper";

export interface VerifiedModelInfo {
  name: string;
  displayName: string;
  description: string;
}

/**
 * Dynamically lists models from Google Generative Language API
 * to verify actual model existence without hardcoding.
 */
export async function listVerifiedGeminiModels(apiKey: string): Promise<VerifiedModelInfo[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list models from Google AI API (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const models = data.models || [];

  return models
    .filter((m: any) =>
      m.supportedGenerationMethods &&
      m.supportedGenerationMethods.includes("generateContent") &&
      m.name.includes("gemini")
    )
    .map((m: any) => ({
      name: m.name.replace(/^models\//, ""),
      displayName: m.displayName || m.name,
      description: m.description || ""
    }));
}

/**
 * Automatically picks the newest fast Gemini model available for structured output.
 */
export async function resolveOptimalGeminiModel(apiKey: string): Promise<string> {
  if (process.env.LLM_MODEL) {
    return process.env.LLM_MODEL;
  }

  const available = await listVerifiedGeminiModels(apiKey);
  
  // Prefer newest fast models: gemini-2.0-flash, gemini-1.5-flash-latest, gemini-1.5-flash
  const preferred = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro"
  ];

  for (const candidate of preferred) {
    const found = available.find((m) => m.name === candidate);
    if (found) {
      return found.name;
    }
  }

  if (available.length > 0) {
    return available[0].name;
  }

  return "gemini-1.5-flash";
}

/**
 * Formats parsed diff files into compact grounding context for the model.
 */
export function formatDiffGroundingContext(files: ParsedFileDiff[]): string {
  let context = "AVAILABLE FILES AND COMMENTABLE LINES IN THIS DIFF:\n";

  for (const file of files) {
    const path = file.newPath || file.oldPath;
    if (file.status === "binary") {
      context += `- File: "${path}" (BINARY FILE - no inline comments)\n`;
      continue;
    }

    const rightLines = file.commentableLines.filter((c) => c.side === "RIGHT").map((c) => c.line);
    const leftLines = file.commentableLines.filter((c) => c.side === "LEFT").map((c) => c.line);

    context += `- File: "${path}" (Status: ${file.status})\n`;
    if (rightLines.length > 0) {
      context += `  Legal lines (RIGHT side): [${summarizeLineRanges(rightLines)}]\n`;
    }
    if (leftLines.length > 0) {
      context += `  Legal lines (LEFT side / deleted): [${summarizeLineRanges(leftLines)}]\n`;
    }
  }

  return context;
}

function summarizeLineRanges(lines: number[]): string {
  if (lines.length === 0) return "";
  const sorted = Array.from(new Set(lines)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = curr;
      prev = curr;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(", ");
}

/**
 * Structured review output generation with Gemini.
 */
export async function generateStructuredReview(
  transcript: string,
  files: ParsedFileDiff[],
  apiKey: string
): Promise<{
  rawResponse: LLMReviewResponse;
  groundedComments: GroundedReviewComment[];
  modelUsed: string;
}> {
  const modelName = await resolveOptimalGeminiModel(apiKey);
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    }
  });

  const groundingContext = formatDiffGroundingContext(files);

  const prompt = `You are an expert code reviewer assisting a software engineer.
The engineer dictated a code review stream out loud (via voice dictation).
Your job is to transform this spoken transcript into a clean, professional, structured GitHub code review.

CRITICAL HARD GROUNDING RULES:
1. Every comment must target a real file from the PR diff.
2. If the user mentions a specific line number (e.g. "around line 40", "line 15"), anchor to that line.
3. If no line number was mentioned but a specific function or logic is discussed, target the closest line where that logic resides in the diff.
4. Categorize each comment by severity:
   - "BLOCKER": Definite bugs, security leaks, broken logic, fatal omissions.
   - "WARNING": Performance concerns, unhandled edge cases, missing validation.
   - "SUGGESTION": Better design patterns, cleaner helpers, idiomatic improvements.
   - "NITPICK": Minor styling, typos, naming suggestions.
5. If the user suggested a concrete code fix, provide the replacement code in "suggestedCodeChange".
6. In "recommendedEvent", select "APPROVE" if all comments are nitpicks/suggestions, "REQUEST_CHANGES" if any blockers exist, or "COMMENT" otherwise.

${groundingContext}

SPOKEN TRANSCRIPT:
"""
${transcript}
"""

OUTPUT FORMAT:
Return a JSON object conforming exactly to this structure:
{
  "summary": "Overall markdown summary of the review",
  "recommendedEvent": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  "comments": [
    {
      "targetFile": "path/to/file.ts",
      "targetLine": 42,
      "severity": "BLOCKER" | "WARNING" | "SUGGESTION" | "NITPICK",
      "commentMarkdown": "Clear professional explanation of the issue and why it matters.",
      "suggestedCodeChange": "optional code suggestion string or null",
      "confidence": 0.95
    }
  ]
}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Validate raw JSON output with strict Zod schema
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (err: any) {
    throw new Error(`Model returned invalid JSON: ${err.message}\nRaw text: ${responseText}`);
  }

  const validatedRaw = LLMReviewResponseSchema.parse(parsedJson);

  // Apply Phase 2 Grounding & Snapping Ladder to each candidate comment
  const groundedComments: GroundedReviewComment[] = validatedRaw.comments.map(
    (candidate, idx) => {
      const decision = groundTargetPosition(
        candidate.targetFile,
        candidate.targetLine,
        files
      );

      return {
        id: `comment-${idx + 1}-${Date.now()}`,
        path: decision.targetFile,
        line: decision.legalLine,
        side: decision.side,
        originalSpokenLine: candidate.targetLine,
        degradationStatus: decision.status,
        severity: candidate.severity as ReviewSeverity,
        body: candidate.commentMarkdown,
        suggestedChange: candidate.suggestedCodeChange,
        isSnapped: decision.isSnapped,
        snapReason: decision.snapReason
      };
    }
  );

  return {
    rawResponse: validatedRaw,
    groundedComments,
    modelUsed: modelName
  };
}
