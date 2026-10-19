import { describe, it, expect } from "vitest";
import { fetchPullRequest, parsePullRequestUrl } from "../lib/github/pr-fetcher";

describe("Real GitHub PR Ingestion (Phase 1)", () => {
  it("correctly parses diverse GitHub PR URL formats", () => {
    const urls = [
      "https://github.com/facebook/react/pull/31600",
      "http://github.com/facebook/react/pull/31600",
      "github.com/facebook/react/pull/31600",
      "facebook/react/pull/31600",
      "facebook/react#31600"
    ];

    for (const url of urls) {
      const parsed = parsePullRequestUrl(url);
      expect(parsed).toEqual({
        owner: "facebook/react".split("/")[0],
        repo: "react",
        pullNumber: 31600
      });
    }
  });

  it("fetches real PR metadata and parses live unified diff from GitHub", async () => {
    // Live PR on facebook/react
    const result = await fetchPullRequest("facebook", "react", 37895);

    expect(result.owner).toBe("facebook");
    expect(result.repo).toBe("react");
    expect(result.pullNumber).toBe(37895);
    expect(result.headSha).toBeDefined();
    expect(typeof result.title).toBe("string");
    expect(result.files.length).toBeGreaterThan(0);

    // Verify commentable lines computed
    const totalCommentable = result.files.reduce(
      (sum, file) => sum + file.commentableLines.length,
      0
    );
    expect(totalCommentable).toBeGreaterThan(0);

    console.log("Real GitHub PR Result:", {
      title: result.title,
      author: result.author,
      headSha: result.headSha,
      filesCount: result.files.length,
      firstFile: result.files[0]?.newPath,
      commentableLinesOnFirstFile: result.files[0]?.commentableLines.length,
      totalCommentableLines: totalCommentable
    });
  }, 15000);
});
