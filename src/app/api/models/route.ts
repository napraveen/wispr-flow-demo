import { NextRequest, NextResponse } from "next/server";
import { listVerifiedGeminiModels, resolveOptimalGeminiModel } from "@/lib/llm/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const keyParam = searchParams.get("key");
    const apiKey = keyParam || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in server environment." },
        { status: 400 }
      );
    }

    const models = await listVerifiedGeminiModels(apiKey);
    const optimalModel = await resolveOptimalGeminiModel(apiKey);

    return NextResponse.json({
      models,
      optimalModel
    });
  } catch (err: any) {
    console.error("Error listing Gemini models:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list models from Google AI API." },
      { status: 500 }
    );
  }
}
