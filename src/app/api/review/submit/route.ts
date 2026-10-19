import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitPullRequestReview } from "@/lib/github/review-poster";
import {
  anonymousReviewLimiter,
  validateRepositoryPostingPolicy,
  validateContentLength
} from "@/lib/ratelimit/limiter";

export const dynamic = "force-dynamic";

const SubmitReviewRequestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  pullNumber: z.number().int().positive(),
  commitId: z.string().min(1),
  body: z.string(),
  event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
  comments: z.array(
    z.object({
      id: z.string(),
      path: z.string().min(1),
      line: z.number().nullable(),
      side: z.enum(["LEFT", "RIGHT"]),
      originalSpokenLine: z.number().nullable().optional(),
      degradationStatus: z.enum(["EXACT", "SNAPPED", "FILE_LEVEL", "REVIEW_BODY"]),
      severity: z.enum(["BLOCKER", "WARNING", "SUGGESTION", "NITPICK"]),
      body: z.string().min(1),
      suggestedChange: z.string().nullable().optional(),
      isSnapped: z.boolean(),
      snapReason: z.string().optional()
    })
  )
});

export async function POST(req: NextRequest) {
  try {
    // 1. IP extraction for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    // 2. Auth token extraction
    const authHeader = req.headers.get("authorization");
    let userToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userToken = authHeader.substring(7).trim();
    }

    const rawJson = await req.json();
    const validated = SubmitReviewRequestSchema.parse(rawJson);

    // 3. Allowlist policy check: Anonymous users may only post to the designated demo repository
    const policy = validateRepositoryPostingPolicy(validated.owner, validated.repo, userToken);
    if (!policy.allowed) {
      return NextResponse.json(
        {
          error: policy.reason,
          code: "POSTING_UNAUTHORIZED_REPO"
        },
        { status: 403 }
      );
    }

    // 4. Rate limiting for anonymous users
    if (!userToken) {
      const rateCheck = anonymousReviewLimiter.check(ip);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error: rateCheck.reason,
            code: "RATE_LIMITED",
            resetSeconds: rateCheck.resetSeconds
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateCheck.resetSeconds),
              "X-RateLimit-Limit": String(rateCheck.limit),
              "X-RateLimit-Remaining": "0"
            }
          }
        );
      }
    }

    // 5. Content length sanity check
    const contentCheck = validateContentLength(validated.body);
    if (!contentCheck.valid) {
      return NextResponse.json(
        { error: contentCheck.reason, code: "CONTENT_TOO_LARGE" },
        { status: 413 }
      );
    }

    // 6. Execute submission
    const result = await submitPullRequestReview({
      owner: validated.owner,
      repo: validated.repo,
      pullNumber: validated.pullNumber,
      commitId: validated.commitId,
      body: validated.body,
      event: validated.event,
      comments: validated.comments as any,
      userToken
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error submitting review to GitHub:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid review submission payload.", details: err.errors, code: "INVALID_PAYLOAD" },
        { status: 400 }
      );
    }

    const status = err.status || 500;
    const message = err.message || "Failed to submit review to GitHub.";
    return NextResponse.json(
      {
        error: message,
        code: status === 422 ? "GITHUB_API_REJECTION" : "GITHUB_API_ERROR"
      },
      { status }
    );
  }
}
