import { describe, it, expect } from "vitest";
import {
  formatGitHubCommentBody,
  prepareReviewPayload
} from "../lib/github/review-poster";
import { GroundedReviewComment } from "../lib/types/review";

describe("Phase 4: Review Submission & Self-Approval Prevention", () => {
  const mockComments: GroundedReviewComment[] = [
    {
      id: "c1",
      path: "src/auth.ts",
      line: 42,
      side: "RIGHT",
      originalSpokenLine: 42,
      degradationStatus: "EXACT",
      severity: "BLOCKER",
      body: "Token is being leaked here.",
      suggestedChange: "const token = sanitize(raw);",
      isSnapped: false
    },
    {
      id: "c2",
      path: "src/utils.ts",
      line: 15,
      side: "RIGHT",
      originalSpokenLine: 18,
      degradationStatus: "SNAPPED",
      severity: "WARNING",
      body: "Potential division by zero.",
      suggestedChange: null,
      isSnapped: true,
      snapReason: "Spoken line 18 was snapped to nearest diff line 15"
    },
    {
      id: "c3",
      path: "src/config.json",
      line: null,
      side: "RIGHT",
      originalSpokenLine: null,
      degradationStatus: "FILE_LEVEL",
      severity: "SUGGESTION",
      body: "Configuration should use production defaults.",
      suggestedChange: null,
      isSnapped: false
    },
    {
      id: "c4",
      path: "unknown-file.txt",
      line: null,
      side: "RIGHT",
      originalSpokenLine: null,
      degradationStatus: "REVIEW_BODY",
      severity: "NITPICK",
      body: "General note about documentation typos.",
      suggestedChange: null,
      isSnapped: false
    }
  ];

  it("formats inline comment body with severity, snapped notice, and suggestion markdown", () => {
    // Comment 1: exact with suggestion
    const formatted1 = formatGitHubCommentBody(mockComments[0]);
    expect(formatted1).toContain("**[BLOCKER]** Token is being leaked here.");
    expect(formatted1).toContain("```suggestion\nconst token = sanitize(raw);\n```");

    // Comment 2: snapped with notice
    const formatted2 = formatGitHubCommentBody(mockComments[1]);
    expect(formatted2).toContain("**[WARNING]** Potential division by zero.");
    expect(formatted2).toContain("> ℹ️ *Diff Grounding: Spoken line 18 was snapped to nearest diff line 15*");
  });

  it("organizes comments into inline, file-level, and review body notes without losing any thought", () => {
    const { finalBody, inlineComments } = prepareReviewPayload(
      "Overall looks solid.",
      mockComments,
      false
    );

    // Only EXACT and SNAPPED with line numbers become inline comments
    expect(inlineComments.length).toBe(2);
    expect(inlineComments[0].path).toBe("src/auth.ts");
    expect(inlineComments[0].line).toBe(42);
    expect(inlineComments[1].path).toBe("src/utils.ts");
    expect(inlineComments[1].line).toBe(15);

    // File-level comments must be appended to the body
    expect(finalBody).toContain("### File-Level Comments");
    expect(finalBody).toContain("#### File: `src/config.json`");
    expect(finalBody).toContain("Configuration should use production defaults.");

    // Review body notes must be appended to the body
    expect(finalBody).toContain("### Additional Review Notes");
    expect(finalBody).toContain("General note about documentation typos.");
  });

  it("handles self-approval rule and prepends notice to review body", () => {
    const { finalBody } = prepareReviewPayload(
      "LGTM!",
      mockComments,
      true // self-approval degraded
    );

    expect(finalBody).toContain(
      "> ℹ️ **Notice:** Review submitted as *Comment* because GitHub does not permit PR authors to approve their own pull requests."
    );
  });
});
