import Anthropic from "@anthropic-ai/sdk";
import { z, type ZodType } from "zod";

export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

const JSON_ONLY = "Responde exclusivamente con JSON válido, sin Markdown.";

type Provider = "anthropic" | "openai";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// AI_PROVIDER forces a provider; otherwise the first configured key wins (Anthropic, then OpenAI).
export function activeProvider(): Provider | null {
  const forced = process.env.AI_PROVIDER;
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

async function completeWithAnthropic(system: string, messages: ChatMessage[]) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1_500,
    temperature: 0,
    system,
    messages,
  });
  const block = response.content.find((item) => item.type === "text");
  return block && block.type === "text" ? block.text : null;
}

async function completeWithOpenAI(system: string, messages: ChatMessage[]) {
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
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI respondió ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

// Spell out the exact JSON shape so every provider returns what the schema validates.
function schemaInstruction(schema: ZodType) {
  try {
    return `Devuelve un objeto JSON que cumpla exactamente este JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
  } catch {
    return "";
  }
}

/** Multi-turn structured call: `system` holds instructions and context, `messages` the conversation. */
export async function askAIChat<T>(
  system: string,
  messages: ChatMessage[],
  schema: ZodType<T>,
  fallback: T,
): Promise<T> {
  const provider = activeProvider();
  if (!provider) {
    return schema.parse(fallback);
  }

  const fullSystem = [system, JSON_ONLY, schemaInstruction(schema)].filter(Boolean).join("\n\n");

  try {
    const text = provider === "openai"
      ? await completeWithOpenAI(fullSystem, messages)
      : await completeWithAnthropic(fullSystem, messages);
    if (!text) {
      return schema.parse(fallback);
    }
    return schema.parse(JSON.parse(text) as unknown);
  } catch (error) {
    console.error(`La respuesta IA (${provider}) no fue válida; se usará el mock.`, error);
    return schema.parse(fallback);
  }
}

export async function askAI<T>(
  prompt: string,
  schema: ZodType<T>,
  fallback: T,
): Promise<T> {
  return askAIChat("", [{ role: "user", content: prompt }], schema, fallback);
}
