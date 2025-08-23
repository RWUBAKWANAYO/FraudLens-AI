import OpenAI from "openai";
import fetch from "node-fetch";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || "http://localhost:5001";

// simple promise pool so we don’t overwhelm local endpoints
async function pPool<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>) {
  const ret: R[] = new Array(items.length) as any;
  let i = 0,
    inFlight = 0;
  return await new Promise<R[]>((resolve, reject) => {
    const kick = () => {
      if (i === items.length && inFlight === 0) return resolve(ret);
      while (inFlight < limit && i < items.length) {
        const idx = i++;
        inFlight++;
        fn(items[idx])
          .then((res) => {
            ret[idx] = res;
          })
          .catch(reject)
          .finally(() => {
            inFlight--;
            kick();
          });
      }
    };
    kick();
  });
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (USE_LOCAL_AI) {
    const res = await fetch(`${LOCAL_AI_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Local embed failed: ${res.status}`);
    const data = await res.json();
    return data.embedding;
  } else {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding as unknown as number[];
  }
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  if (USE_LOCAL_AI) {
    // try a local batch endpoint if available
    try {
      const res = await fetch(`${LOCAL_AI_URL}/embed/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embeddings)) return data.embeddings;
      }
      // fallthrough to per-item if batch not supported
    } catch {
      // ignore and fall back
    }
    // Per-item with a small concurrency
    return pPool(texts, 6, (t) => getEmbedding(t));
  } else {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map((d) => d.embedding as unknown as number[]);
  }
}
