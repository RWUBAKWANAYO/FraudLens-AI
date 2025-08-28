import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { cosineSimilarity, parseEmbedding } from "../utils/embeddingUtils";
import { SimilarRecord } from "../types/similarity";

export async function findSimilarForEmbedding(
  companyId: string,
  uploadId: string | null,
  embedding: number[],
  k: number = 10,
  _rowCount: number = 100,
  opts?: { minScore?: number; useVectorIndex?: boolean }
): Promise<{ localPrev: SimilarRecord[]; global: SimilarRecord[]; timedOut: boolean }> {
  const minScore = opts?.minScore ?? 0.5;
  const preferVector = opts?.useVectorIndex ?? true;

  if (!embedding || embedding.length === 0) {
    return { localPrev: [], global: [], timedOut: false };
  }

  const timeoutPromise = new Promise<{
    localPrev: SimilarRecord[];
    global: SimilarRecord[];
    timedOut: boolean;
  }>((resolve) => {
    setTimeout(() => {
      resolve({ localPrev: [], global: [], timedOut: true });
    }, 600000);
  });

  const searchPromise = (async () => {
    try {
      if (preferVector) {
        try {
          const vecText = JSON.stringify(embedding);

          const [localRows, globalRows] = await Promise.all([
            prisma.$queryRaw<Array<SimilarRecord & { distance?: number }>>`
              SELECT
                id, companyId, uploadId, txId, partner, amount, date,
                1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
              FROM Record
              WHERE companyId = ${companyId}
                AND (${uploadId} IS NULL OR uploadId <> ${uploadId})
                AND embeddingVec IS NOT NULL
                AND VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) < ${1 - minScore}
              ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
              LIMIT ${k * 2}
            `.catch(() => []),
            prisma.$queryRaw<Array<SimilarRecord & { distance?: number }>>`
              SELECT
                id, companyId, uploadId, txId, partner, amount, date,
                1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
              FROM Record
              WHERE companyId <> ${companyId}
                AND embeddingVec IS NOT NULL
                AND VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) < ${1 - minScore}
              ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
              LIMIT ${k}
            `.catch(() => []),
          ]);

          const localPrev = (localRows ?? [])
            .map((r) => ({ ...r, similarity: r.similarity ?? 1 - (r as any).distance }))
            .filter((r) => r.similarity >= minScore && r.similarity < 0.9999)
            .slice(0, k);

          const global = (globalRows ?? [])
            .map((r) => ({ ...r, similarity: r.similarity ?? 1 - (r as any).distance }))
            .filter((r) => r.similarity >= minScore && r.similarity < 0.9999)
            .slice(0, k);

          if (localPrev.length > 0 || global.length > 0) {
            return { localPrev, global, timedOut: false };
          }
        } catch {
          // Vector index failed, fall back to JSON embeddings
        }
      }

      const [localCandidates, globalCandidates] = await Promise.all([
        prisma.record
          .findMany({
            where: {
              companyId,
              ...(uploadId ? { uploadId: { not: uploadId } } : {}),
              NOT: { embeddingJson: { equals: Prisma.DbNull } },
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
            take: Math.min(k * 10, 1000),
          })
          .catch(() => []),
        prisma.record
          .findMany({
            where: {
              companyId: { not: companyId },
              NOT: { embeddingJson: { equals: Prisma.DbNull } },
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
            take: Math.min(k * 5, 500),
          })
          .catch(() => []),
      ]);

      const localPrev = localCandidates
        .map((r) => {
          const emb = parseEmbedding(r.embeddingJson);
          if (!emb) return null;
          return {
            id: r.id,
            companyId: r.companyId,
            uploadId: r.uploadId,
            txId: r.txId,
            partner: r.partner,
            amount: r.amount,
            date: r.date,
            similarity: cosineSimilarity(embedding, emb),
          } as SimilarRecord;
        })
        .filter((x): x is SimilarRecord => !!x && x.similarity >= minScore && x.similarity < 0.9999)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

      const global = globalCandidates
        .map((r) => {
          const emb = parseEmbedding(r.embeddingJson);
          if (!emb) return null;
          return {
            id: r.id,
            companyId: r.companyId,
            uploadId: r.uploadId,
            txId: r.txId,
            partner: r.partner,
            amount: r.amount,
            date: r.date,
            similarity: cosineSimilarity(embedding, emb),
          } as SimilarRecord;
        })
        .filter((x): x is SimilarRecord => !!x && x.similarity >= minScore && x.similarity < 0.9999)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

      return { localPrev, global, timedOut: false };
    } catch {
      return { localPrev: [], global: [], timedOut: false };
    }
  })();

  return Promise.race([searchPromise, timeoutPromise]);
}

export async function findSimilarWithRetry(
  companyId: string,
  uploadId: string | null,
  embedding: number[],
  k: number = 10,
  rowCount: number = 100,
  maxRetries: number = 2,
  opts?: { minScore?: number; useVectorIndex?: boolean }
): Promise<{ localPrev: SimilarRecord[]; global: SimilarRecord[]; timedOut: boolean }> {
  let lastResult: {
    localPrev: SimilarRecord[];
    global: SimilarRecord[];
    timedOut: boolean;
  } | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await findSimilarForEmbedding(
        companyId,
        uploadId,
        embedding,
        k,
        rowCount,
        opts
      );

      if (result.localPrev.length > 0 || result.global.length > 0 || attempt === maxRetries) {
        return result;
      }

      lastResult = result;
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (lastResult) {
    return lastResult;
  }

  throw lastError || new Error("Similarity search failed after retries");
}

export async function batchSimilaritySearch(
  companyId: string,
  uploadId: string | null,
  embeddings: number[][],
  k: number = 10,
  opts?: { minScore?: number; useVectorIndex?: boolean }
): Promise<{ results: SimilarRecord[][]; timedOutCount: number }> {
  const results: SimilarRecord[][] = [];
  let timedOutCount = 0;

  for (let i = 0; i < embeddings.length; i++) {
    try {
      const result = await findSimilarWithRetry(
        companyId,
        uploadId,
        embeddings[i],
        k,
        embeddings.length,
        opts as any
      );

      results.push([...result.localPrev, ...result.global]);

      if (result.timedOut) {
        timedOutCount++;
      }
    } catch {
      results.push([]);
    }
  }

  return { results, timedOutCount };
}
