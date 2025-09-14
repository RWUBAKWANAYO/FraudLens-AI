import "./globalProcessHandlers";
import { consume } from "../queue/bus";
import { prisma } from "../config/db";
import { getEmbeddingsBatch } from "../services/aiEmbedding";
import { saveRecordEmbedding } from "../services/vectorStore";
import { redisPublisher } from "../services/redisPublisher";
import { detectLeaks } from "../services/leakDetection";
import { checkConnectionHealth } from "../queue/connectionManager";
import { ErrorHandler } from "../utils/errorHandler";
import type * as amqp from "amqplib";
import { acquireLock, releaseLock } from "../config/redis";
import { createBatches, calculateProgress } from "../utils/embeddingWorkerUtils";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 8);
const EMBED_BATCH = Number(process.env.EMBED_BATCH || 32);
const MAX_RETRIES = 3;
const HEALTH_CHECK_INTERVAL = 30000;
const UPLOAD_LOCK_TTL_SEC = 3600;

let healthCheckInterval: NodeJS.Timeout;

healthCheckInterval = setInterval(async () => {
  try {
    await checkConnectionHealth();
  } catch (error) {}
}, HEALTH_CHECK_INTERVAL);

process.on("SIGINT", () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
});

export async function startEmbeddingWorker() {
  await consume(
    "embeddings.generate",
    async (payload: any, _channel: amqp.Channel, _msg: amqp.Message) => {
      const { recordIds, companyId, uploadId, originalFileName } = payload as {
        recordIds: string[];
        companyId: string;
        uploadId: string;
        originalFileName?: string;
      };

      if (!uploadId || !companyId) {
        return;
      }

      const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
      if (!upload) {
        return;
      }
      if (upload.status === "completed" || upload.status === "processing") {
        return;
      }

      const lockKey = `lock:upload:${uploadId}`;
      const lockToken = await acquireLock(lockKey, UPLOAD_LOCK_TTL_SEC);
      if (!lockToken) {
        return;
      }

      try {
        await prisma.upload.update({
          where: { id: uploadId },
          data: { status: "processing", startedAt: new Date(), error: null },
        });

        await redisPublisher.publishUploadProgress(
          companyId,
          uploadId,
          0,
          "queued",
          "Upload queued for processing",
          {
            totalRecords: recordIds.length,
            fileName: originalFileName,
            startedAt: new Date().toISOString(),
          }
        );

        await processEmbeddingsWithProgress(recordIds, companyId, uploadId);
        await runLeakDetection(companyId, uploadId);

        await prisma.upload.update({
          where: { id: uploadId },
          data: { status: "completed", completedAt: new Date() },
        });
      } catch (error) {
        await redisPublisher.publishUploadError(
          companyId,
          uploadId,
          ErrorHandler.getErrorMessage(error)
        );

        await prisma.upload.update({
          where: { id: uploadId },
          data: {
            status: "failed",
            error: ErrorHandler.getErrorMessage(error),
          },
        });
        return;
      } finally {
        try {
          await releaseLock(lockKey, lockToken);
        } catch (e) {}
      }
    },
    {
      requeueOnError: false,
    }
  );
}

async function processEmbeddingsWithProgress(
  recordIds: string[],
  companyId: string,
  uploadId: string
) {
  const batches = createBatches(recordIds, EMBED_BATCH);

  await redisPublisher.publishUploadProgress(
    companyId,
    uploadId,
    10,
    "embeddings",
    "Starting embedding generation",
    { totalBatches: batches.length }
  );

  for (const [batchIndex, batch] of batches.entries()) {
    const progress = calculateProgress(batchIndex, batches.length, 10, 40);

    await redisPublisher.publishUploadProgress(
      companyId,
      uploadId,
      Math.min(progress, 50),
      "embeddings",
      `Processing batch ${batchIndex + 1}/${batches.length}`,
      {
        currentBatch: batchIndex + 1,
        totalBatches: batches.length,
        recordsInBatch: batch.length,
      }
    );

    await processBatchWithRetry(batch, MAX_RETRIES);
  }

  await redisPublisher.publishUploadProgress(
    companyId,
    uploadId,
    50,
    "embeddings_complete",
    "All embeddings generated successfully",
    { totalRecords: recordIds.length }
  );
}

async function processBatchWithRetry(batch: string[], maxRetries: number) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const recs = await prisma.record.findMany({
        where: { id: { in: batch } },
        select: {
          id: true,
          normalizedPartner: true,
          amount: true,
          normalizedCurrency: true,
          userKey: true,
        },
      });

      const texts = recs.map(
        (r) =>
          `${r.normalizedPartner || ""} | ${r.amount || ""} ${r.normalizedCurrency || ""} | ${
            r.userKey || ""
          }`
      );

      const embeddings = await getEmbeddingsBatch(texts);

      const savePromises = embeddings.map((emb, i) => saveRecordEmbedding(recs[i].id, emb));

      for (let i = 0; i < savePromises.length; i += CONCURRENCY) {
        await Promise.all(savePromises.slice(i, i + CONCURRENCY));
      }

      return;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

async function runLeakDetection(companyId: string, uploadId: string) {
  await redisPublisher.publishUploadProgress(
    companyId,
    uploadId,
    50,
    "detection",
    "Starting threat detection"
  );

  const records = await prisma.record.findMany({
    where: { uploadId },
    orderBy: { createdAt: "asc" },
  });

  const { threatsCreated, summary } = await detectLeaks(
    records,
    uploadId,
    companyId,
    async (progress, total, threats) => {
      await redisPublisher.publishUploadProgress(
        companyId,
        uploadId,
        progress,
        "detection",
        `Analyzing records for threats (${progress}%)`,
        {
          recordsProcessed: Math.round(((progress - 50) / 45) * total),
          totalRecords: total,
          threatsFound: threats,
        }
      );
    }
  );

  await redisPublisher.publishUploadProgress(
    companyId,
    uploadId,
    100,
    "complete",
    "Analysis complete",
    {
      recordsAnalyzed: records.length,
      threatsDetected: threatsCreated.length,
    }
  );

  await redisPublisher.publishUploadComplete(
    companyId,
    uploadId,
    {
      recordsAnalyzed: records.length,
      processingTime: Date.now() - (await getUploadStartTime(uploadId)),
    },
    threatsCreated,
    summary
  );

  return { threatsCreated, summary };
}

async function getUploadStartTime(uploadId: string): Promise<number> {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    select: { createdAt: true },
  });
  return upload?.createdAt?.getTime() || Date.now();
}
