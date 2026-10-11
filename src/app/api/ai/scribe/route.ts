import { z } from "zod";
import { clinicalScribe } from "@/lib/ai/scribe";

const RequestSchema = z.object({ text: z.string().max(20_000) });

export async function POST(request: Request) {
  const { text } = RequestSchema.parse(await request.json());
  return Response.json(await clinicalScribe(text));
}
