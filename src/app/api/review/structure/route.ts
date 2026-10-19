import { NextRequest, NextResponse } from "next/server";
import { generateStructuredReview } from "@/lib/llm/client";
import { ParsedFileDiff } from "@/lib/types/diff";
import { synthesisLimiter, validateContentLength } from "@/lib/ratelimit/limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateCheck = synthesisLimiter.check(ip);
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

    const body = await req.json();
    const { transcript, files, apiKey } = body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json(
        { error: "Transcript is required and cannot be empty.", code: "EMPTY_TRANSCRIPT" },
        { status: 400 }
      );
    }

    const lengthCheck = validateContentLength(transcript);
    if (!lengthCheck.valid) {
      return NextResponse.json(
        { error: lengthCheck.reason, code: "TRANSCRIPT_TOO_LONG" },
        { status: 413 }
      );
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Parsed PR diff files are required for grounding.", code: "MISSING_DIFF" },
        { status: 400 }
      );
    }

    // Determine API Key: passed in body or server env
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!effectiveApiKey) {
      return NextResponse.json(
        {
          error: "Google AI Gemini API key is missing. Set GEMINI_API_KEY in .env.local or pass apiKey in request.",
          code: "MODEL_AUTH_MISSING"
        },
        { status: 400 }
      );
    }

    const result = await generateStructuredReview(
      transcript,
      files as ParsedFileDiff[],
      effectiveApiKey
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error generating structured review:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to generate structured review.",
        code: "MODEL_FAILURE"
      },
      { status: 500 }
    );
  }
}
