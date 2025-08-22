import { knnByVector, knnGlobal } from "./vectorStore";

export type SimilarNeighbor = {
  id: string;
  companyId: string;
  partner: string | null;
  amount: number | null;
  date: Date | null;
  distance: number;
};

export async function findSimilarForEmbedding(companyId: string, emb: number[]) {
  const local = await knnByVector(companyId, emb, 25);
  const global = await knnGlobal(emb, 25);
  return { local: local as SimilarNeighbor[], global: global as SimilarNeighbor[] };
}
