import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitPullRequestReview } from "@/lib/github/review-poster";

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
    const rawJson = await req.json();
    const validated = SubmitReviewRequestSchema.parse(rawJson);

    // Check optional user auth token in header
    const authHeader = req.headers.get("authorization");
    let userToken: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userToken = authHeader.substring(7);
    }

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
        { error: "Invalid review submission payload.", details: err.errors },
        { status: 400 }
      );
    }

    const status = err.status || 500;
    const message = err.message || "Failed to submit review to GitHub.";
    return NextResponse.json({ error: message }, { status });
  }
}
