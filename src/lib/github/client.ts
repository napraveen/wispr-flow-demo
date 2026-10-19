import { Octokit } from "octokit";

export function getGitHubClient(userToken?: string): Octokit {
  const token = userToken || process.env.GITHUB_TOKEN;
  if (!token) {
    // Unauthenticated client for public repositories (subject to lower rate limits: 60/hr)
    return new Octokit({
      userAgent: "VoxPR-App"
    });
  }

  return new Octokit({
    auth: token,
    userAgent: "VoxPR-App"
  });
}
