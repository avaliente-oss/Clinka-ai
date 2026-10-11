import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";

export async function askAI<T>(
  prompt: string,
  schema: ZodType<T>,
  fallback: T,
): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return schema.parse(fallback);
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1_500,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            "Responde exclusivamente con JSON válido, sin Markdown.",
            prompt,
          ].join("\n\n"),
        },
      ],
    });
    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") {
      return schema.parse(fallback);
    }
    return schema.parse(JSON.parse(block.text) as unknown);
  } catch (error) {
    console.error("La respuesta IA no fue válida; se usará el mock.", error);
    return schema.parse(fallback);
  }
}
