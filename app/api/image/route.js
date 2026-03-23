import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

// Multiple image models with their providers as fallbacks
const IMAGE_MODELS = [
  {
    provider: "wavespeed",
    model: "thatboymentor/wan2.2carbonarapackAN",
    steps: 5,
  },
  {
    provider: "hf-inference",
    model: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 30,
  },
  {
    provider: "hf-inference",
    model: "black-forest-labs/FLUX.1-dev",
    steps: 20,
  },
];

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    const hfToken = process.env.HF_TOKEN;

    if (!hfToken) {
      return NextResponse.json(
        { error: "Hugging Face token is not configured." },
        { status: 500 }
      );
    }

    if (!prompt || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt is required for image generation." },
        { status: 400 }
      );
    }

    const client = new InferenceClient(hfToken);
    let lastError = null;

    for (const modelConfig of IMAGE_MODELS) {
      try {
        console.log(`Trying image model: ${modelConfig.model} (${modelConfig.provider})`);

        const image = await client.textToImage({
          provider: modelConfig.provider,
          model: modelConfig.model,
          inputs: prompt,
          parameters: { num_inference_steps: modelConfig.steps },
        });

        // Convert blob to base64
        const arrayBuffer = await image.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = image.type || "image/png";

        return NextResponse.json({
          image: `data:${mimeType};base64,${base64}`,
          model: modelConfig.model,
        });
      } catch (err) {
        console.log(`Model ${modelConfig.model} failed:`, err.message);
        lastError = err.message;
        // Continue to next model
      }
    }

    // All models failed
    return NextResponse.json(
      { error: `All image models failed. Last error: ${lastError}` },
      { status: 503 }
    );
  } catch (error) {
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: error.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
