import { prisma } from "../config/db";

export async function saveRecordEmbedding(recordId: string, embedding: number[]) {
  const vecText = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE Record SET embeddingJson = CAST(? AS JSON), embeddingVec = VEC_FROM_TEXT(?) WHERE id = ?`,
    JSON.stringify(embedding),
    vecText,
    recordId
  );
}

export async function knnByVector(companyId: string, embedding: number[], k = 20) {
  const vecText = `[${embedding.join(",")}]`;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, companyId, partner, amount, date,
            VEC_COSINE_DISTANCE(embeddingVec, ?) AS distance
       FROM Record
      WHERE companyId = ? AND embeddingVec IS NOT NULL
      ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ?)
      LIMIT ?`,
    vecText,
    companyId,
    vecText,
    k
  );
  return rows;
}

export async function knnGlobal(embedding: number[], k = 20) {
  const vecText = `[${embedding.join(",")}]`;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, companyId, partner, amount, date,
            VEC_COSINE_DISTANCE(embeddingVec, ?) AS distance
       FROM Record
      WHERE embeddingVec IS NOT NULL
      ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ?)
      LIMIT ?`,
    vecText,
    vecText,
    k
  );
  return rows;
}
