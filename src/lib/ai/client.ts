import Anthropic from "@anthropic-ai/sdk";
import { z, type ZodType } from "zod";

export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

const SYSTEM_PROMPT = "Responde exclusivamente con JSON válido, sin Markdown.";

type Provider = "anthropic" | "openai";

// AI_PROVIDER forces a provider; otherwise the first configured key wins (Anthropic, then OpenAI).
function activeProvider(): Provider | null {
  const forced = process.env.AI_PROVIDER;
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

async function completeWithAnthropic(prompt: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1_500,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content.find((item) => item.type === "text");
  return block && block.type === "text" ? block.text : null;
}

async function completeWithOpenAI(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 4_000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI respondió ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

// Spell out the exact JSON shape so every provider returns what the schema validates.
function withSchema(prompt: string, schema: ZodType) {
  try {
    const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
    return `${prompt}\n\nDevuelve un objeto JSON que cumpla exactamente este JSON Schema:\n${jsonSchema}`;
  } catch {
    return prompt;
  }
}

export async function askAI<T>(
  prompt: string,
  schema: ZodType<T>,
  fallback: T,
): Promise<T> {
  const provider = activeProvider();
  if (!provider) {
    return schema.parse(fallback);
  }

  const fullPrompt = withSchema(prompt, schema);

  try {
    const text = provider === "openai"
      ? await completeWithOpenAI(fullPrompt)
      : await completeWithAnthropic(fullPrompt);
    if (!text) {
      return schema.parse(fallback);
    }
    return schema.parse(JSON.parse(text) as unknown);
  } catch (error) {
    console.error(`La respuesta IA (${provider}) no fue válida; se usará el mock.`, error);
    return schema.parse(fallback);
  }
}
