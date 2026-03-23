import { NextResponse } from "next/server";

// Multiple free models as fallbacks
const FREE_MODELS = [
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-super:free",
  "deepseek/deepseek-r1:free",
];

export async function POST(request) {
  try {
    const { messages, model } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is not configured." },
        { status: 500 }
      );
    }

    // Try the requested model first, then fallbacks
    const modelsToTry = model ? [model, ...FREE_MODELS] : FREE_MODELS;

    let lastError = null;

    for (const currentModel of modelsToTry) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3002",
            "X-Title": "AI Chatbot",
          },
          method: "POST",
          body: JSON.stringify({
            model: currentModel,
            messages: messages,
          }),
        }
      );

      const data = await response.json();

      // If successful, return the response
      if (response.ok && !data.error) {
        return NextResponse.json(data);
      }

      // Log and try next model
      console.log(`Model ${currentModel} failed:`, data.error?.message || "Unknown error");
      lastError = data.error?.message || `Failed with status ${response.status}`;
    }

    // All models failed
    return NextResponse.json(
      { error: `All models are currently unavailable. Last error: ${lastError}` },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
