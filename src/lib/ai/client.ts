import Anthropic from "@anthropic-ai/sdk";
export const AI_MODEL=process.env.AI_MODEL||"claude-sonnet-5-5";
export async function askAI<T>(prompt:string,fallback:T):Promise<T>{if(!process.env.ANTHROPIC_API_KEY)return fallback;try{const client=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});const r=await client.messages.create({model:AI_MODEL,max_tokens:1200,messages:[{role:"user",content:`Responde exclusivamente JSON válido. ${prompt}`}]});const text=r.content.find(x=>x.type==="text");return text&&text.type==="text"?JSON.parse(text.text) as T:fallback;}catch{return fallback;}}
