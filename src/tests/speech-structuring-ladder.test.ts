import { describe, it, expect } from "vitest";
import { formatDiffGroundingContext } from "../lib/llm/client";
import { groundTargetPosition } from "../lib/diff/snapper";
import { parseUnifiedDiff } from "../lib/diff/parser";
import { LLMReviewResponseSchema } from "../lib/types/review";

describe("Phase 3: Speech-to-Structured-Review Pipeline & Degradation Ladder", () => {
  const sampleDiff = `diff --git a/compiler/crates/react_compiler_hir/src/globals.rs b/compiler/crates/react_compiler_hir/src/globals.rs
index a1b2c3d..e5f6a7b 100644
--- a/compiler/crates/react_compiler_hir/src/globals.rs
+++ b/compiler/crates/react_compiler_hir/src/globals.rs
@@ -40,5 +40,8 @@
 pub fn is_known_global(name: &str) -> bool {
+    // Added ResizeObserver check
+    if name == "ResizeObserver" {
+        return true;
+    }
     false
 }
`;
  const parsedFiles = parseUnifiedDiff(sampleDiff);

  it("generates compact and accurate legal line range context for LLM prompt", () => {
    const context = formatDiffGroundingContext(parsedFiles);
    expect(context).toContain("AVAILABLE FILES AND COMMENTABLE LINES IN THIS DIFF:");
    expect(context).toContain('compiler/crates/react_compiler_hir/src/globals.rs');
    expect(context).toContain("Legal lines (RIGHT side): [40-46]");
  });

  it("validates structured LLM response against strict Zod schema", () => {
    const validModelOutput = {
      summary: "Identified a missing case for MutationObserver.",
      recommendedEvent: "REQUEST_CHANGES",
      comments: [
        {
          targetFile: "compiler/crates/react_compiler_hir/src/globals.rs",
          targetLine: 42,
          severity: "BLOCKER",
          commentMarkdown: "ResizeObserver is handled, but MutationObserver is completely missing.",
          suggestedCodeChange: "if name == \"ResizeObserver\" || name == \"MutationObserver\" {",
          confidence: 0.95
        }
      ]
    };

    const validated = LLMReviewResponseSchema.parse(validModelOutput);
    expect(validated.recommendedEvent).toBe("REQUEST_CHANGES");
    expect(validated.comments.length).toBe(1);
    expect(validated.comments[0].severity).toBe("BLOCKER");
  });

  it("rejects untrusted LLM outputs with missing or malformed fields", () => {
    const invalidOutput = {
      summary: "Bad output",
      // missing recommendedEvent
      comments: [
        {
          targetFile: "foo.ts",
          // invalid severity
          severity: "SUPER_CRITICAL_NOT_IN_ENUM",
          commentMarkdown: "broken"
        }
      ]
    };

    expect(() => LLMReviewResponseSchema.parse(invalidOutput)).toThrow();
  });

  describe("Realistically Misspoken Transcript Grounding Ladder", () => {
    // Reviewer says:
    // 1. "In globals.rs around line 42, you added ResizeObserver, make it also handle MutationObserver"
    // 2. "In globals.rs around line 49, clean up this trailing bracket" (line 49 is slightly off hunk)
    // 3. "Somewhere in globals.rs line 400, this file should also export the type" (line 400 is far out)
    // 4. "In the auth config file, make sure the secret is not logged" (auth file not in PR)

    it("Ladder Rank 1 (EXACT): Spoken line in diff hunk matches exact legal line", () => {
      const decision = groundTargetPosition("globals.rs", 42, parsedFiles);
      expect(decision.status).toBe("EXACT");
      expect(decision.targetFile).toBe("compiler/crates/react_compiler_hir/src/globals.rs");
      expect(decision.legalLine).toBe(42);
      expect(decision.isSnapped).toBe(false);
    });

    it("Ladder Rank 2 (SNAPPED): Spoken line slightly off hunk snaps to nearest legal diff line", () => {
      // Line 49 is 3 lines away from commentable line 46
      const decision = groundTargetPosition("globals.rs", 49, parsedFiles);
      expect(decision.status).toBe("SNAPPED");
      expect(decision.targetFile).toBe("compiler/crates/react_compiler_hir/src/globals.rs");
      expect(decision.legalLine).toBe(46);
      expect(decision.isSnapped).toBe(true);
      expect(decision.snapReason).toContain("snapped to nearest legal diff line 46");
    });

    it("Ladder Rank 3 (FILE_LEVEL): Spoken line far beyond hunk threshold degrades to file-level", () => {
      const decision = groundTargetPosition("globals.rs", 400, parsedFiles, { maxSnapDistance: 20 });
      expect(decision.status).toBe("FILE_LEVEL");
      expect(decision.targetFile).toBe("compiler/crates/react_compiler_hir/src/globals.rs");
      expect(decision.legalLine).toBeNull();
      expect(decision.isSnapped).toBe(false);
      expect(decision.snapReason).toContain("too far");
    });

    it("Ladder Rank 4 (REVIEW_BODY): Spoken file not present in PR degrades to review body note", () => {
      const decision = groundTargetPosition("auth/config.json", 15, parsedFiles);
      expect(decision.status).toBe("REVIEW_BODY");
      expect(decision.legalLine).toBeNull();
      expect(decision.isSnapped).toBe(false);
      expect(decision.snapReason).toContain("was not modified in this pull request");
    });
  });
});
