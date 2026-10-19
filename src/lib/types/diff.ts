export type DiffSide = "LEFT" | "RIGHT";

export interface DiffLine {
  type: "context" | "add" | "delete";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface ParsedFileDiff {
  oldPath: string;
  newPath: string;
  status: "modified" | "added" | "deleted" | "renamed" | "binary";
  hunks: DiffHunk[];
  commentableLines: {
    line: number;
    side: DiffSide;
    hunkIndex: number;
  }[];
}

export interface PullRequestDetails {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  body: string | null;
  state: string;
  htmlUrl: string;
  author: string;
  headSha: string;
  baseSha: string;
  files: ParsedFileDiff[];
}
