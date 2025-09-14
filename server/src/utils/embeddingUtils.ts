import { Prisma } from "@prisma/client";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0,
    na = 0,
    nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function parseEmbedding(json: Prisma.JsonValue | null): number[] | null {
  if (json == null) return null;

  if (Array.isArray(json)) {
    const arr = (json as unknown[]).map((x) => Number(x));
    return arr.every(Number.isFinite) ? arr : null;
  }

  if (typeof json === "string") {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return null;
      const arr = parsed.map((x: unknown) => Number(x));
      return arr.every(Number.isFinite) ? arr : null;
    } catch {
      return null;
    }
  }

  if (typeof json === "object") {
    const arr = Object.values(json as Record<string, unknown>).map((v) => Number(v));
    return arr.every(Number.isFinite) ? arr : null;
  }

  return null;
}
