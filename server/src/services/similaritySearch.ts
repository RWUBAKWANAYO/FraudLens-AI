// server/src/services/similaritySearch.ts
import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";

export type SimilarRecord = {
  id: string;
  companyId: string;
  uploadId: string;
  txId: string | null;
  partner: string | null;
  amount: number | null;
  date: Date | null;
  similarity: number;
};

/** Cosine similarity */
function cosineSimilarity(a: number[], b: number[]): number {
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

/** Parse embedding stored in Prisma JsonValue into number[] safely */
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

/**
 * Vector search using TiDB VEC_COSINE_DISTANCE with safe fallback.
 */
export async function findSimilarForEmbedding(
  companyId: string,
  uploadId: string | null,
  embedding: number[],
  k: number = 10,
  opts?: { minScore?: number; useVectorIndex?: boolean }
): Promise<{ localPrev: SimilarRecord[]; global: SimilarRecord[] }> {
  const minScore = opts?.minScore ?? 0.5;
  const preferVector = opts?.useVectorIndex ?? true;

  console.log(
    `[SIMILARITY_SEARCH] Starting for company ${companyId}, embedding length: ${embedding.length}`
  );

  // ---- Prefer native vector index if available ----
  if (preferVector) {
    try {
      console.log("[SIMILARITY_SEARCH] Attempting TiDB vector search...");
      const vecText = JSON.stringify(embedding);

      const localRows = await prisma.$queryRaw<Array<SimilarRecord & { distance?: number }>>`
        SELECT
          id, companyId, uploadId, txId, partner, amount, date,
          1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
        FROM Record
        WHERE companyId = ${companyId}
          AND (${uploadId} IS NULL OR uploadId <> ${uploadId})
          AND embeddingVec IS NOT NULL
        ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
        LIMIT ${k}
      `;

      console.log(`[SIMILARITY_SEARCH] TiDB local search returned ${localRows?.length || 0} rows`);

      const localPrev = (localRows ?? [])
        .map((r) => ({ ...r, similarity: r.similarity ?? 1 - (r as any).distance }))
        .filter((r) => r.similarity >= minScore && r.similarity < 0.9999);

      const globalRows = await prisma.$queryRaw<Array<SimilarRecord & { distance?: number }>>`
        SELECT
          id, companyId, uploadId, txId, partner, amount, date,
          1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
        FROM Record
        WHERE companyId <> ${companyId}
          AND embeddingVec IS NOT NULL
        ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
        LIMIT ${k}
      `;

      console.log(
        `[SIMILARITY_SEARCH] TiDB global search returned ${globalRows?.length || 0} rows`
      );

      const global = (globalRows ?? [])
        .map((r) => ({ ...r, similarity: r.similarity ?? 1 - (r as any).distance }))
        .filter((r) => r.similarity >= minScore && r.similarity < 0.9999);

      console.log(
        `[SIMILARITY_SEARCH] TiDB results - local: ${localPrev.length}, global: ${global.length}`
      );
      return { localPrev, global };
    } catch (err) {
      console.warn("[SIMILARITY_SEARCH] TiDB vector search failed; falling back:", err);
    }
  }

  // ---- Fallback: compute cosine over JSON embeddings ----
  console.log("[SIMILARITY_SEARCH] Using fallback JSON embedding search");

  const localCandidates = await prisma.record.findMany({
    where: {
      companyId,
      ...(uploadId ? { uploadId: { not: uploadId } } : {}),
      NOT: { embeddingJson: { equals: null } },
    },
    select: {
      id: true,
      companyId: true,
      uploadId: true,
      txId: true,
      partner: true,
      amount: true,
      date: true,
      embeddingJson: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  console.log(
    `[SIMILARITY_SEARCH] Found ${localCandidates.length} local candidates with embeddings`
  );

  const localPrev = localCandidates
    .map((r) => {
      const emb = parseEmbedding(r.embeddingJson);
      if (!emb) return null;
      const similarity = cosineSimilarity(embedding, emb);
      return {
        id: r.id,
        companyId: r.companyId,
        uploadId: r.uploadId,
        txId: r.txId,
        partner: r.partner,
        amount: r.amount,
        date: r.date,
        similarity,
      } as SimilarRecord;
    })
    .filter((x): x is SimilarRecord => !!x && x.similarity >= minScore && x.similarity < 0.9999)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  const globalCandidates = await prisma.record.findMany({
    where: { companyId: { not: companyId }, NOT: { embeddingJson: { equals: null } } },
    select: {
      id: true,
      companyId: true,
      uploadId: true,
      txId: true,
      partner: true,
      amount: true,
      date: true,
      embeddingJson: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  console.log(
    `[SIMILARITY_SEARCH] Found ${globalCandidates.length} global candidates with embeddings`
  );

  const global = globalCandidates
    .map((r) => {
      const emb = parseEmbedding(r.embeddingJson);
      if (!emb) return null;
      const similarity = cosineSimilarity(embedding, emb);
      return {
        id: r.id,
        companyId: r.companyId,
        uploadId: r.uploadId,
        txId: r.txId,
        partner: r.partner,
        amount: r.amount,
        date: r.date,
        similarity,
      } as SimilarRecord;
    })
    .filter((x): x is SimilarRecord => !!x && x.similarity >= minScore && x.similarity < 0.9999)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  console.log(
    `[SIMILARITY_SEARCH] Fallback results - local: ${localPrev.length}, global: ${global.length}`
  );
  return { localPrev, global };
}
