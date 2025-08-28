import { prisma } from "../config/db";
import { Record } from "@prisma/client";
import { getEmbeddingsBatch } from "../services/aiEmbedding";
import { publish } from "../queue/bus";

const CREATE_MANY_CHUNK = Number(process.env.CREATE_MANY_CHUNK || 2000);
const EMBED_BATCH = Number(process.env.EMBED_BATCH || 50);

export async function checkDuplicateUpload(companyId: string, fileHash: string) {
  const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const prev = await prisma.upload.findFirst({
    where: { companyId, fileHash, createdAt: { gte: dedupeSince } },
    select: { id: true },
  });

  if (!prev) return null;

  const [prevThreats, recs] = await Promise.all([
    prisma.threat.findMany({ where: { uploadId: prev.id } }),
    prisma.record.findMany({ where: { uploadId: prev.id } }),
  ]);

  const uniqueFlagged = new Set(prevThreats.map((t) => t.recordId).filter(Boolean) as string[]);
  const flaggedValue = Array.from(uniqueFlagged).reduce((sum, rid) => {
    const r = recs.find((x) => x.id === rid);
    return sum + (r?.amount ?? 0);
  }, 0);

  return {
    uploadId: prev.id,
    reuploadOf: prev.id,
    recordsAnalyzed: recs.length,
    threats: prevThreats,
    summary: {
      totalRecords: recs.length,
      flagged: uniqueFlagged.size,
      flaggedValue,
      message: `Reused prior results from upload ${prev.id}.`,
    },
  };
}

export async function createUploadRecord(
  companyId: string,
  fileName: string,
  fileType: string,
  fileHash: string
) {
  return prisma.upload.create({
    data: { companyId, fileName, fileType, source: "batch", fileHash },
  });
}

export async function bulkInsertRecords(records: any[]) {
  for (let i = 0; i < records.length; i += CREATE_MANY_CHUNK) {
    const chunk = records.slice(i, i + CREATE_MANY_CHUNK);
    await prisma.record.createMany({ data: chunk });

    if (i % 5000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export async function generateEmbeddingsForRecords(records: Record[]) {
  const batches: Record[][] = [];
  for (let i = 0; i < records.length; i += EMBED_BATCH) {
    batches.push(records.slice(i, i + EMBED_BATCH));
  }

  for (const [batchIndex, batch] of batches.entries()) {
    const texts = batch
      .map((record) => {
        return [
          record.partner,
          record.amount,
          record.currency,
          record.txId,
          record.normalizedPartner,
          record.normalizedCurrency,
        ]
          .filter(Boolean)
          .join(" ");
      })
      .filter((text) => text.trim());

    if (texts.length === 0) {
      continue;
    }

    try {
      const embeddings = await getEmbeddingsBatch(texts);
      const updatePromises = batch.map((record, index) => {
        if (index < embeddings.length) {
          const embedding = embeddings[index];
          const embeddingJson = JSON.stringify(embedding);

          return prisma.$executeRaw`
            UPDATE Record 
            SET embeddingJson = ${embeddingJson}, 
                embeddingVec = ${embeddingJson}
            WHERE id = ${record.id}
          `;
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error(`Failed to process batch ${batchIndex + 1}:`, error);
    }
  }
}

export async function queueAsyncProcessing(
  companyId: string,
  uploadId: string,
  recordIds: string[],
  fileName: string
) {
  await publish("embeddings.generate", {
    companyId,
    uploadId: uploadId,
    recordIds,
    originalFileName: fileName,
  });
}
