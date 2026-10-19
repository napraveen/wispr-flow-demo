import { NextRequest, NextResponse } from "next/server";
import { fetchPullRequest, parsePullRequestUrl } from "@/lib/github/pr-fetcher";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url");
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const pullNumberStr = searchParams.get("pullNumber");

    let prOwner = owner;
    let prRepo = repo;
    let prNum = pullNumberStr ? parseInt(pullNumberStr, 10) : null;

    if (url) {
      const parsed = parsePullRequestUrl(url);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid GitHub pull request URL. Expected format: https://github.com/owner/repo/pull/123" },
          { status: 400 }
        );
      }
      prOwner = parsed.owner;
      prRepo = parsed.repo;
      prNum = parsed.pullNumber;
    }

    if (!prOwner || !prRepo || !prNum || isNaN(prNum)) {
      return NextResponse.json(
        { error: "Missing or invalid repository owner, name, or pull request number." },
        { status: 400 }
      );
    }

    // Check optional user auth token in header
    const authHeader = req.headers.get("authorization");
    let userToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userToken = authHeader.substring(7);
    }

    const prDetails = await fetchPullRequest(prOwner, prRepo, prNum, userToken);
    return NextResponse.json(prDetails);
  } catch (err: any) {
    console.error("Error fetching PR:", err);
    const status = err.status || 500;
    const message = err.message || "Failed to fetch pull request from GitHub.";
    return NextResponse.json({ error: message }, { status });
  }
}
