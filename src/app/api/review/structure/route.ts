import { NextRequest, NextResponse } from "next/server";
import { generateStructuredReview } from "@/lib/llm/client";
import { ParsedFileDiff } from "@/lib/types/diff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, files, apiKey } = body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json(
        { error: "Transcript is required and cannot be empty." },
        { status: 400 }
      );
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Parsed PR diff files are required for grounding." },
        { status: 400 }
      );
    }

    // Determine API Key: passed in body or server env
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!effectiveApiKey) {
      return NextResponse.json(
        {
          error: "Google AI Gemini API key is missing. Set GEMINI_API_KEY in .env.local or pass apiKey in request."
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
      { error: err.message || "Failed to generate structured review." },
      { status: 500 }
    );
  }
}
