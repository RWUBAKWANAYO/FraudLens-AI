import OpenAI from "openai";
import fetch from "node-fetch";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const USE_LOCAL = process.env.USE_LOCAL === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;

export async function getEmbedding(text: string): Promise<number[]> {
  if (USE_LOCAL) {
    const res = await fetch(`${LOCAL_AI_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data.embedding;
  } else {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }
}
