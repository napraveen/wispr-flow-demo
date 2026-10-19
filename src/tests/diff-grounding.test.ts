import { describe, it, expect } from "vitest";
import { parseUnifiedDiff, buildCommentableIndex } from "../lib/diff/parser";
import { groundTargetPosition } from "../lib/diff/snapper";

describe("Phase 2: Diff Grounding & Snapping Engine", () => {
  describe("Awkward Diff Case 1: Renamed Files", () => {
    const renamedDiff = `diff --git a/src/old-utils.ts b/src/new-utils.ts
similarity index 85%
rename from src/old-utils.ts
rename to src/new-utils.ts
index 1234567..89abcdef 100644
--- a/src/old-utils.ts
+++ b/src/new-utils.ts
@@ -1,5 +1,6 @@
 import { format } from "date-fns";
 
+export const NEW_CONSTANT = 42;
 export function helper() {
   return true;
 }
`;

    it("identifies renamed status, oldPath and newPath, and parses commentable lines", () => {
      const files = parseUnifiedDiff(renamedDiff);
      expect(files.length).toBe(1);
      const f = files[0];
      expect(f.status).toBe("renamed");
      expect(f.oldPath).toBe("src/old-utils.ts");
      expect(f.newPath).toBe("src/new-utils.ts");
      expect(f.hunks.length).toBe(1);

      // Commentable lines on new version (RIGHT side)
      const lines = f.commentableLines.map((c) => c.line);
      expect(lines).toContain(3); // The added line: export const NEW_CONSTANT = 42;

      // Grounding target by old or new name resolves to the new file path
      const groundedByOldName = groundTargetPosition("src/old-utils.ts", 3, files);
      expect(groundedByOldName.status).toBe("EXACT");
      expect(groundedByOldName.targetFile).toBe("src/new-utils.ts");
      expect(groundedByOldName.legalLine).toBe(3);

      const groundedByNewName = groundTargetPosition("src/new-utils.ts", 3, files);
      expect(groundedByNewName.status).toBe("EXACT");
      expect(groundedByNewName.targetFile).toBe("src/new-utils.ts");
    });
  });

  describe("Awkward Diff Case 2: Deleted Files", () => {
    const deletedDiff = `diff --git a/legacy/deprecated.ts b/legacy/deprecated.ts
deleted file mode 100644
index abcdef1..0000000
--- a/legacy/deprecated.ts
+++ /dev/null
@@ -1,4 +0,0 @@
-export function oldFunction() {
-  console.warn("Deprecated");
-  return false;
-}
`;

    it("parses deleted file mode with commentable lines on LEFT side", () => {
      const files = parseUnifiedDiff(deletedDiff);
      expect(files.length).toBe(1);
      const f = files[0];
      expect(f.status).toBe("deleted");
      expect(f.hunks.length).toBe(1);

      // In deleted file, all deleted lines must have side = 'LEFT'
      expect(f.commentableLines.length).toBe(4);
      for (const c of f.commentableLines) {
        expect(c.side).toBe("LEFT");
      }

      // Grounding a deleted line matches on LEFT side
      const grounded = groundTargetPosition("legacy/deprecated.ts", 2, files);
      expect(grounded.status).toBe("EXACT");
      expect(grounded.side).toBe("LEFT");
      expect(grounded.legalLine).toBe(2);
    });
  });

  describe("Awkward Diff Case 3: Binary Files", () => {
    const binaryDiff = `diff --git a/assets/logo.png b/assets/logo.png
new file mode 100644
index 0000000..9988776
Binary files /dev/null and b/assets/logo.png differ
`;

    it("flags binary files with 0 commentable lines and degrades to FILE_LEVEL", () => {
      const files = parseUnifiedDiff(binaryDiff);
      expect(files.length).toBe(1);
      const f = files[0];
      expect(f.status).toBe("binary");
      expect(f.commentableLines.length).toBe(0);

      const grounded = groundTargetPosition("assets/logo.png", 10, files);
      expect(grounded.status).toBe("FILE_LEVEL");
      expect(grounded.legalLine).toBeNull();
      expect(grounded.snapReason).toContain("Binary files do not support inline diff comments");
    });
  });

  describe("Awkward Diff Case 4: Multi-Hunk Diffs (Disjoint Change Sections)", () => {
    const multiHunkDiff = `diff --git a/src/service.ts b/src/service.ts
index 1111111..2222222 100644
--- a/src/service.ts
+++ b/src/service.ts
@@ -10,4 +10,5 @@
 function header() {
   const a = 1;
+  const b = 2;
   return a + b;
 }
@@ -200,4 +201,5 @@
 function footer() {
   const x = 100;
+  const y = 200;
   return x + y;
 }
`;

    it("parses multiple hunks and maintains accurate line numbers across gaps", () => {
      const files = parseUnifiedDiff(multiHunkDiff);
      expect(files.length).toBe(1);
      const f = files[0];
      expect(f.hunks.length).toBe(2);

      const hunk1 = f.hunks[0];
      expect(hunk1.oldStart).toBe(10);
      expect(hunk1.newStart).toBe(10);

      const hunk2 = f.hunks[1];
      expect(hunk2.oldStart).toBe(200);
      expect(hunk2.newStart).toBe(201);

      // Verify commentable lines in both hunks
      const rightLines = f.commentableLines.filter((c) => c.side === "RIGHT").map((c) => c.line);
      expect(rightLines).toContain(12); // inside hunk 1
      expect(rightLines).toContain(203); // inside hunk 2
    });
  });

  describe("Nearest-Neighbor Snapping & Degradation Ladder", () => {
    const testDiff = `diff --git a/src/auth.ts b/src/auth.ts
index aaaaaaa..bbbbbbb 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -40,6 +40,7 @@
 export function verifyToken(token: string) {
   if (!token) return null;
+  console.log("validating token");
   return jwt.decode(token);
 }
`;
    const parsedFiles = parseUnifiedDiff(testDiff);

    it("Rank 1 (EXACT): spoken line matches exact diff line", () => {
      const decision = groundTargetPosition("src/auth.ts", 42, parsedFiles);
      expect(decision.status).toBe("EXACT");
      expect(decision.legalLine).toBe(42);
      expect(decision.isSnapped).toBe(false);
    });

    it("Rank 2 (SNAPPED): spoken line is slightly off (e.g. line 45), snaps to closest commentable line", () => {
      // Line 45 is not in diff, but hunk covers 40..45
      // Commentable lines in hunk: 40, 41, 42, 43, 44
      const decision = groundTargetPosition("src/auth.ts", 47, parsedFiles);
      expect(decision.status).toBe("SNAPPED");
      expect(decision.isSnapped).toBe(true);
      expect(decision.legalLine).toBe(44); // Nearest commentable line
      expect(decision.snapReason).toContain("snapped to nearest legal diff line 44");
    });

    it("Rank 3 (FILE_LEVEL): spoken line is far beyond threshold (e.g. line 150), degrades to file-level", () => {
      const decision = groundTargetPosition("src/auth.ts", 150, parsedFiles, { maxSnapDistance: 20 });
      expect(decision.status).toBe("FILE_LEVEL");
      expect(decision.legalLine).toBeNull();
      expect(decision.isSnapped).toBe(false);
      expect(decision.snapReason).toContain("too far");
    });

    it("Rank 4 (REVIEW_BODY): spoken file does not exist in PR at all, degrades to review body note", () => {
      const decision = groundTargetPosition("completely/unrelated/config.json", 10, parsedFiles);
      expect(decision.status).toBe("REVIEW_BODY");
      expect(decision.legalLine).toBeNull();
      expect(decision.snapReason).toContain("was not modified in this pull request");
    });
  });
});
