import { getGitHubClient } from "./client";
import { parseUnifiedDiff } from "../diff/parser";
import { PullRequestDetails } from "../types/diff";

export function parsePullRequestUrl(input: string): { owner: string; repo: string; pullNumber: number } | null {
  const trimmed = input.trim();
  // Matches:
  // https://github.com/owner/repo/pull/123
  // http://github.com/owner/repo/pull/123
  // github.com/owner/repo/pull/123
  // owner/repo/pull/123
  // owner/repo#123
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/i;
  const match = trimmed.match(urlRegex);

  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      pullNumber: parseInt(match[3], 10)
    };
  }

  const shortRegex = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#|\/pull\/)(\d+)$/i;
  const shortMatch = trimmed.match(shortRegex);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      pullNumber: parseInt(shortMatch[3], 10)
    };
  }

  return null;
}

export async function fetchPullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  userToken?: string
): Promise<PullRequestDetails> {
  const octokit = getGitHubClient(userToken);

  // 1. Fetch PR details
  const prRes = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });

  const pr = prRes.data;

  // 2. Fetch raw unified diff
  const diffRes = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: pullNumber,
    headers: {
      accept: "application/vnd.github.v3.diff"
    }
  });

  const rawDiff = typeof diffRes.data === "string" ? diffRes.data : String(diffRes.data);
  const parsedFiles = parseUnifiedDiff(rawDiff);

  return {
    owner,
    repo,
    pullNumber,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    htmlUrl: pr.html_url,
    author: pr.user?.login || "unknown",
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
    files: parsedFiles
  };
}
