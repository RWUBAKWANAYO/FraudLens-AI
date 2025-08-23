import { consume } from "../queue/bus";
import { prisma } from "../config/db";
import { getEmbeddingsBatch } from "../services/aiEmbedding";
import { saveRecordEmbedding } from "../services/vectorStore";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 6);

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function startEmbeddingWorker() {
  await consume("embeddings.generate", async (payload) => {
    const { recordIds } = payload as { recordIds: string[] };

    // Grab only what we need to build the embedding text
    const recs = await prisma.record.findMany({
      where: { id: { in: recordIds } },
      select: {
        id: true,
        normalizedPartner: true,
        amount: true,
        normalizedCurrency: true,
        userKey: true,
      },
    });

    const texts = recs.map((r) => {
      return `${r.normalizedPartner ?? ""} | ${r.amount ?? ""} ${r.normalizedCurrency ?? ""} | ${
        r.userKey ?? ""
      }`;
    });

    // Batch call embedding API
    const embeddings = await getEmbeddingsBatch(texts);

    // Persist (limited parallelism)
    const tasks = embeddings.map((emb, i) => async () => {
      await saveRecordEmbedding(recs[i].id, emb);
    });

    const groups = chunk(tasks, CONCURRENCY);
    for (const g of groups) {
      await Promise.all(g.map((fn) => fn()));
    }
  });
}
