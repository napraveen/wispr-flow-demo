import { ParsedFileDiff, DiffSide } from "../types/diff";
import { DegradationStatus } from "../types/review";

export interface GroundingDecision {
  status: DegradationStatus;
  targetFile: string;
  legalLine: number | null;
  side: DiffSide;
  isSnapped: boolean;
  snapReason?: string;
}

export interface GroundingOptions {
  maxSnapDistance?: number; // default: 20 lines
}

/**
 * Snaps a target line to the nearest legal commentable position in the diff,
 * or degrades gracefully to FILE_LEVEL or REVIEW_BODY.
 */
export function groundTargetPosition(
  targetFile: string,
  targetLine: number | null,
  files: ParsedFileDiff[],
  options: GroundingOptions = {}
): GroundingDecision {
  const maxDistance = options.maxSnapDistance ?? 20;

  // 1. Find matching file (case-insensitive and fuzzy suffix match)
  const normalizedTarget = targetFile.toLowerCase().replace(/^[\\/]+/, "");
  
  const matchedFile = files.find((f) => {
    const fNew = (f.newPath || "").toLowerCase().replace(/^[\\/]+/, "");
    const fOld = (f.oldPath || "").toLowerCase().replace(/^[\\/]+/, "");
    return (
      fNew === normalizedTarget ||
      fOld === normalizedTarget ||
      fNew.endsWith(`/${normalizedTarget}`) ||
      fOld.endsWith(`/${normalizedTarget}`) ||
      normalizedTarget.endsWith(`/${fNew}`)
    );
  });

  // Rank 4: File not found in PR diff at all -> REVIEW_BODY
  if (!matchedFile) {
    return {
      status: "REVIEW_BODY",
      targetFile,
      legalLine: null,
      side: "RIGHT",
      isSnapped: false,
      snapReason: `File "${targetFile}" was not modified in this pull request.`
    };
  }

  const effectivePath = matchedFile.newPath || matchedFile.oldPath;

  // If binary file or no commentable lines exist
  if (matchedFile.status === "binary" || matchedFile.commentableLines.length === 0) {
    return {
      status: "FILE_LEVEL",
      targetFile: effectivePath,
      legalLine: null,
      side: "RIGHT",
      isSnapped: false,
      snapReason: matchedFile.status === "binary"
        ? "Binary files do not support inline diff comments."
        : "No inline diff lines available for commenting."
    };
  }

  // If no specific line was requested -> FILE_LEVEL
  if (targetLine === null || targetLine <= 0) {
    return {
      status: "FILE_LEVEL",
      targetFile: effectivePath,
      legalLine: null,
      side: "RIGHT",
      isSnapped: false,
      snapReason: "General comment on file without specific line anchor."
    };
  }

  // Rank 1: Check for exact match in commentable positions
  // Check RIGHT side first (typical for additions & context), then LEFT side (deletions)
  const exactRight = matchedFile.commentableLines.find(
    (c) => c.line === targetLine && c.side === "RIGHT"
  );
  if (exactRight) {
    return {
      status: "EXACT",
      targetFile: effectivePath,
      legalLine: targetLine,
      side: "RIGHT",
      isSnapped: false
    };
  }

  const exactLeft = matchedFile.commentableLines.find(
    (c) => c.line === targetLine && c.side === "LEFT"
  );
  if (exactLeft) {
    return {
      status: "EXACT",
      targetFile: effectivePath,
      legalLine: targetLine,
      side: "LEFT",
      isSnapped: false
    };
  }

  // Rank 2: Nearest-Neighbor Line Snapping
  let closestLine: number = matchedFile.commentableLines[0].line;
  let closestSide: DiffSide = matchedFile.commentableLines[0].side;
  let minDistance = Math.abs(closestLine - targetLine);

  for (const item of matchedFile.commentableLines) {
    const dist = Math.abs(item.line - targetLine);
    if (dist < minDistance) {
      minDistance = dist;
      closestLine = item.line;
      closestSide = item.side;
    }
  }

  // If within reasonable proximity threshold (<= maxDistance lines), snap
  if (minDistance <= maxDistance) {
    return {
      status: "SNAPPED",
      targetFile: effectivePath,
      legalLine: closestLine,
      side: closestSide,
      isSnapped: true,
      snapReason: `Spoken line ${targetLine} was outside diff hunk; snapped to nearest legal diff line ${closestLine} (distance: ${minDistance} lines).`
    };
  }

  // Rank 3: Distance too large (> maxDistance) -> degrade to FILE_LEVEL
  return {
    status: "FILE_LEVEL",
    targetFile: effectivePath,
    legalLine: null,
    side: "RIGHT",
    isSnapped: false,
    snapReason: `Spoken line ${targetLine} is too far (${minDistance} lines away) from modified diff hunks.`
  };
}
