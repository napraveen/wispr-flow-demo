import { describe, it, expect } from "vitest";
import {
  anonymousReviewLimiter,
  validateRepositoryPostingPolicy,
  validateContentLength
} from "../lib/ratelimit/limiter";

describe("Phase 5: Access Control, Rate Limiting & Safety Policies", () => {
  describe("IP-Based Rate Limiting", () => {
    const testIp = "192.168.1.100";

    it("allows requests under the rate limit and blocks excessive requests", () => {
      anonymousReviewLimiter.reset(testIp);

      // Max requests for anonymousReviewLimiter is 6
      for (let i = 0; i < 6; i++) {
        const result = anonymousReviewLimiter.check(testIp);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i);
      }

      // 7th request must be rejected
      const blocked = anonymousReviewLimiter.check(testIp);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.reason).toContain("Rate limit of 6 requests per minute exceeded");
    });
  });

  describe("Demo Repository Allowlist Policy", () => {
    it("allows anonymous visitors to post to the configured demo repository", () => {
      const decision = validateRepositoryPostingPolicy(
        "napraveen",
        "vox-pr-demo-sandbox",
        undefined // anonymous
      );
      expect(decision.allowed).toBe(true);
    });

    it("blocks anonymous visitors from posting to non-demo repositories", () => {
      const decision = validateRepositoryPostingPolicy(
        "facebook",
        "react",
        undefined // anonymous
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("Anonymous visitors are permitted to submit reviews only to the public demo repository");
    });

    it("allows authenticated users with a token to post to any repository", () => {
      const decision = validateRepositoryPostingPolicy(
        "facebook",
        "react",
        "ghp_validToken12345"
      );
      expect(decision.allowed).toBe(true);
    });
  });

  describe("Content Length Capping", () => {
    it("accepts transcripts within reasonable length limits", () => {
      const check = validateContentLength("Short review transcript");
      expect(check.valid).toBe(true);
    });

    it("rejects abusive transcripts exceeding length limits", () => {
      const hugeString = "a".repeat(16000);
      const check = validateContentLength(hugeString, 15000);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("exceeds maximum allowed limit");
    });
  });
});
