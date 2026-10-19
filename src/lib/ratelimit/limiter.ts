export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  reason?: string;
}

interface WindowRecord {
  count: number;
  expiresAt: number;
}

class InMemoryRateLimiter {
  private records = new Map<string, WindowRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests = 10, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  public check(ip: string): RateLimitResult {
    const now = Date.now();
    const record = this.records.get(ip);

    // Clean expired record or initialize new
    if (!record || now >= record.expiresAt) {
      this.records.set(ip, {
        count: 1,
        expiresAt: now + this.windowMs
      });
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetSeconds: Math.ceil(this.windowMs / 1000)
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds: Math.ceil((record.expiresAt - now) / 1000),
        reason: `Rate limit of ${this.maxRequests} requests per minute exceeded. Please wait ${Math.ceil((record.expiresAt - now) / 1000)} seconds.`
      };
    }

    record.count++;
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      resetSeconds: Math.ceil((record.expiresAt - now) / 1000)
    };
  }

  public reset(ip: string) {
    this.records.delete(ip);
  }
}

// Global singleton instances for API routes
export const anonymousReviewLimiter = new InMemoryRateLimiter(6, 60); // 6 reviews / min per IP
export const synthesisLimiter = new InMemoryRateLimiter(15, 60); // 15 LLM syntheses / min per IP

/**
 * Validates whether an anonymous visitor is allowed to post a review to this repository.
 * Anonymous visitors are only allowed to post reviews to the configured demo repository.
 */
export function validateRepositoryPostingPolicy(
  owner: string,
  repo: string,
  userToken?: string
): { allowed: boolean; reason?: string } {
  // If user provides their own token, they may post to any repo they have permissions for
  if (userToken && userToken.trim().length > 0) {
    return { allowed: true };
  }

  const demoOwner = (process.env.GITHUB_DEMO_REPO_OWNER || "napraveen").toLowerCase();
  const demoRepo = (process.env.GITHUB_DEMO_REPO_NAME || "vox-pr-demo-sandbox").toLowerCase();

  const isDemo =
    owner.toLowerCase() === demoOwner &&
    repo.toLowerCase() === demoRepo;

  if (!isDemo) {
    return {
      allowed: false,
      reason: `Anonymous visitors are permitted to submit reviews only to the public demo repository (${demoOwner}/${demoRepo}). To post reviews to "${owner}/${repo}", please connect your personal GitHub token.`
    };
  }

  return { allowed: true };
}

/**
 * Checks content length to prevent abuse.
 */
export function validateContentLength(transcript: string, maxLength = 15000): { valid: boolean; reason?: string } {
  if (transcript.length > maxLength) {
    return {
      valid: false,
      reason: `Transcript length (${transcript.length} characters) exceeds maximum allowed limit of ${maxLength} characters.`
    };
  }
  return { valid: true };
}
