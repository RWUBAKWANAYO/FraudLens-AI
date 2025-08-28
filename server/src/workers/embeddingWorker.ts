// =============================================
// server/src/workers/embeddingWorker.ts
// =============================================
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

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 8);
const EMBED_BATCH = Number(process.env.EMBED_BATCH || 32);
const MAX_RETRIES = 3;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const UPLOAD_LOCK_TTL_SEC = 60 * 60; // 1 hour per upload (adjust as needed)

// Store interval reference
let healthCheckInterval: NodeJS.Timeout;

// Health check interval
healthCheckInterval = setInterval(async () => {
  try {
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy) {
      console.warn("RabbitMQ connection unhealthy, attempting to reconnect...");
      // The connection manager will handle reconnection automatically
    }
  } catch (error) {
    console.error("Health check failed:", error);
  }
}, HEALTH_CHECK_INTERVAL);

// Add graceful shutdown for this worker
process.on("SIGINT", () => {
  console.log("SIGINT received, cleaning up embedding worker...");
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
});

export async function startEmbeddingWorker() {
  console.log("Starting embedding worker with idempotency & centralized ACKs...");

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
        console.warn("Missing uploadId/companyId; skipping.");
        return; // centralized ACK will ack the message
      }

      // 🔐 Idempotency 1: Skip if upload already completed
      const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
      if (!upload) {
        console.warn(`Upload ${uploadId} not found; skipping.`);
        return;
      }
      if (upload.status === "completed") {
        console.log(`Upload ${uploadId} already completed; skipping.`);
        return;
      }
      if (upload.status === "processing") {
        console.log(`Upload ${uploadId} already processing; skipping.`);
        return;
      }

      // 🔐 Idempotency 2: Acquire a distributed lock to ensure single processing
      const lockKey = `lock:upload:${uploadId}`;
      const lockToken = await acquireLock(lockKey, UPLOAD_LOCK_TTL_SEC);
      if (!lockToken) {
        console.log(`Could not acquire lock for ${uploadId}; another worker is processing.`);
        return;
      }

      try {
        // Mark upload as processing
        await prisma.upload.update({
          where: { id: uploadId },
          data: { status: "processing", startedAt: new Date(), error: null },
        });

        console.log(`Processing upload ${uploadId}, ${recordIds.length} records`);

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

        // Process embeddings with detailed progress
        await processEmbeddingsWithProgress(recordIds, companyId, uploadId);

        // Run leak detection
        await runLeakDetection(companyId, uploadId);

        console.log(`Successfully processed upload ${uploadId}`);

        // Mark upload as completed
        await prisma.upload.update({
          where: { id: uploadId },
          data: { status: "completed", completedAt: new Date() },
        });
      } catch (error) {
        console.error(`Failed to process upload ${uploadId}:`, error);

        // Publish error to clients
        await redisPublisher.publishUploadError(
          companyId,
          uploadId,
          ErrorHandler.getErrorMessage(error)
        );

        // Record failure in DB (don’t requeue; we’ll keep a record)
        await prisma.upload.update({
          where: { id: uploadId },
          data: {
            status: "failed",
            error: ErrorHandler.getErrorMessage(error),
          },
        });

        // Re-throwing would NACK the message (centralized) -> duplicate later.
        // We return to ACK and avoid reprocessing old work on restart.
        return;
      } finally {
        // Always release the distributed lock
        try {
          await releaseLock(lockKey, lockToken);
        } catch (e) {
          console.warn(`Failed to release lock for ${uploadId}:`, e);
        }
      }
    },
    {
      // Don’t requeue on error; we persist failure status and avoid duplicates
      requeueOnError: false,
    }
  );
}

async function processEmbeddingsWithProgress(
  recordIds: string[],
  companyId: string,
  uploadId: string
) {
  // Create batches
  const batches: string[][] = [];
  for (let i = 0; i < recordIds.length; i += EMBED_BATCH) {
    batches.push(recordIds.slice(i, i + EMBED_BATCH));
  }

  await redisPublisher.publishUploadProgress(
    companyId,
    uploadId,
    10,
    "embeddings",
    "Starting embedding generation",
    { totalBatches: batches.length }
  );

  for (const [batchIndex, batch] of batches.entries()) {
    const progress = 10 + Math.round(((batchIndex + 1) / batches.length) * 40);

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
      // progress is now a percentage between 50-95
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

  // Final completion
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
