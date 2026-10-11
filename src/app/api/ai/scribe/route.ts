import{clinicalScribe}from"@/lib/ai/scribe";export async function POST(req:Request){const{text}=await req.json();return Response.json(await clinicalScribe(String(text||"")));}
