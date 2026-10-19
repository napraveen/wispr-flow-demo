import { ParsedFileDiff, DiffHunk, DiffLine, DiffSide } from "../types/diff";

export function parseUnifiedDiff(rawDiff: string): ParsedFileDiff[] {
  if (!rawDiff || !rawDiff.trim()) {
    return [];
  }

  const files: ParsedFileDiff[] = [];
  // Split on diff --git boundary
  const fileChunks = rawDiff.split(/^diff --git /m);

  for (const chunk of fileChunks) {
    if (!chunk.trim()) continue;

    const lines = chunk.split("\n");
    const headerLine = lines[0]; // e.g., "a/path/to/file.ts b/path/to/file.ts"
    const pathsMatch = headerLine.match(/a\/(.+?)\s+b\/(.+)/);

    let oldPath = pathsMatch ? pathsMatch[1] : "";
    let newPath = pathsMatch ? pathsMatch[2] : "";

    let status: "modified" | "added" | "deleted" | "renamed" | "binary" = "modified";

    // Scan headers before first hunk
    let firstHunkIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("@@")) {
        firstHunkIndex = i;
        break;
      }
      if (line.startsWith("new file mode")) {
        status = "added";
      } else if (line.startsWith("deleted file mode")) {
        status = "deleted";
      } else if (line.startsWith("rename from ")) {
        status = "renamed";
        oldPath = line.substring(12).trim();
      } else if (line.startsWith("rename to ")) {
        status = "renamed";
        newPath = line.substring(10).trim();
      } else if (line.startsWith("similarity index")) {
        status = "renamed";
      } else if (line.includes("Binary files") && line.includes("differ")) {
        status = "binary";
      } else if (line.startsWith("--- a/")) {
        oldPath = line.substring(6).trim();
      } else if (line.startsWith("+++ b/")) {
        newPath = line.substring(6).trim();
      } else if (line.startsWith("--- /dev/null")) {
        status = "added";
      } else if (line.startsWith("+++ /dev/null")) {
        status = "deleted";
      }
    }

    // Default paths if not parsed from headers
    if (!newPath && oldPath) newPath = oldPath;
    if (!oldPath && newPath) oldPath = newPath;

    const hunks: DiffHunk[] = [];
    const commentableLines: { line: number; side: DiffSide; hunkIndex: number }[] = [];

    if (status !== "binary" && firstHunkIndex !== -1) {
      let currentHunk: DiffHunk | null = null;
      let currLeft = 0;
      let currRight = 0;
      let hunkIdx = -1;

      for (let i = firstHunkIndex; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("@@")) {
          if (currentHunk) {
            hunks.push(currentHunk);
          }
          hunkIdx++;
          const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
          if (match) {
            const oldStart = parseInt(match[1], 10);
            const oldLines = match[2] !== undefined ? parseInt(match[2], 10) : 1;
            const newStart = parseInt(match[3], 10);
            const newLines = match[4] !== undefined ? parseInt(match[4], 10) : 1;

            currLeft = oldStart;
            currRight = newStart;

            currentHunk = {
              header: line,
              oldStart,
              oldLines,
              newStart,
              newLines,
              lines: []
            };
          } else {
            currentHunk = null;
          }
          continue;
        }

        if (!currentHunk) continue;

        if (line.startsWith("+")) {
          const lNum = currRight++;
          currentHunk.lines.push({
            type: "add",
            newLineNumber: lNum,
            content: line.substring(1)
          });
          commentableLines.push({
            line: lNum,
            side: "RIGHT",
            hunkIndex: hunkIdx
          });
        } else if (line.startsWith("-")) {
          const lNum = currLeft++;
          currentHunk.lines.push({
            type: "delete",
            oldLineNumber: lNum,
            content: line.substring(1)
          });
          commentableLines.push({
            line: lNum,
            side: "LEFT",
            hunkIndex: hunkIdx
          });
        } else if (line.startsWith(" ")) {
          const leftNum = currLeft++;
          const rightNum = currRight++;
          currentHunk.lines.push({
            type: "context",
            oldLineNumber: leftNum,
            newLineNumber: rightNum,
            content: line.substring(1)
          });
          commentableLines.push({
            line: rightNum,
            side: "RIGHT",
            hunkIndex: hunkIdx
          });
        } else if (line.startsWith("\\")) {
          // e.g. \ No newline at end of file
          // non-commentable marker
        }
      }

      if (currentHunk) {
        hunks.push(currentHunk);
      }
    }

    files.push({
      oldPath,
      newPath: newPath || oldPath,
      status,
      hunks,
      commentableLines
    });
  }

  return files;
}

export function buildCommentableIndex(files: ParsedFileDiff[]) {
  // Map of filePath -> Map<line, Set<side>>
  const map = new Map<string, Map<number, Set<DiffSide>>>();

  for (const file of files) {
    const pathKey = file.newPath || file.oldPath;
    if (!map.has(pathKey)) {
      map.set(pathKey, new Map());
    }
    const lineMap = map.get(pathKey)!;

    for (const item of file.commentableLines) {
      if (!lineMap.has(item.line)) {
        lineMap.set(item.line, new Set());
      }
      lineMap.get(item.line)!.add(item.side);
    }
  }

  return map;
}
