import { z } from "zod";
import { DiffSide } from "./diff";

export type ReviewSeverity = "BLOCKER" | "WARNING" | "SUGGESTION" | "NITPICK";

export type DegradationStatus = "EXACT" | "SNAPPED" | "FILE_LEVEL" | "REVIEW_BODY";

export const LLMCandidateCommentSchema = z.object({
  targetFile: z.string().describe("Relative path of the target file mentioned in speech"),
  targetLine: z.number().nullable().describe("Target line number if spoken or inferred, else null"),
  severity: z.enum(["BLOCKER", "WARNING", "SUGGESTION", "NITPICK"]),
  commentMarkdown: z.string().min(1).describe("Clear, professional review comment"),
  suggestedCodeChange: z.string().nullable().describe("Replacement code block if a code change is proposed, else null"),
  confidence: z.number().min(0).max(1).describe("Confidence score of placement between 0 and 1")
});

export const LLMReviewResponseSchema = z.object({
  summary: z.string().describe("Overall review summary markdown"),
  recommendedEvent: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
  comments: z.array(LLMCandidateCommentSchema)
});

export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>;

export interface GroundedReviewComment {
  id: string;
  path: string;
  line: number | null;
  side: DiffSide;
  originalSpokenLine: number | null;
  degradationStatus: DegradationStatus;
  severity: ReviewSeverity;
  body: string;
  suggestedChange: string | null;
  isSnapped: boolean;
  snapReason?: string;
}

export interface ReviewSubmissionPayload {
  owner: string;
  repo: string;
  pullNumber: number;
  commitId: string;
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
  body: string;
  comments: {
    path: string;
    line: number;
    side: DiffSide;
    body: string;
  }[];
}
