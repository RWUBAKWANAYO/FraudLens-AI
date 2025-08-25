"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEmbeddingWorker = startEmbeddingWorker;
const bus_1 = require("../queue/bus");
const db_1 = require("../config/db");
const aiEmbedding_1 = require("../services/aiEmbedding");
const vectorStore_1 = require("../services/vectorStore");
const redisPublisher_1 = require("../services/redisPublisher");
const leakDetection_1 = require("../services/leakDetection");
const connectionManager_1 = require("../queue/connectionManager");
const errorHandler_1 = require("../utils/errorHandler");
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 8);
const EMBED_BATCH = Number(process.env.EMBED_BATCH || 32);
const MAX_RETRIES = 3;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
// Store interval reference
let healthCheckInterval;
// Health check interval
healthCheckInterval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHealthy = yield (0, connectionManager_1.checkConnectionHealth)();
        if (!isHealthy) {
            console.warn("RabbitMQ connection unhealthy, attempting to reconnect...");
            // The connection manager will handle reconnection automatically
        }
    }
    catch (error) {
        console.error("Health check failed:", error);
    }
}), HEALTH_CHECK_INTERVAL);
// Add graceful shutdown for this worker
process.on("SIGINT", () => {
    console.log("SIGINT received, cleaning up embedding worker...");
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
});
// Health check interval
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHealthy = yield (0, connectionManager_1.checkConnectionHealth)();
        if (!isHealthy) {
            console.warn("RabbitMQ connection unhealthy, attempting to reconnect...");
            // The connection manager will handle reconnection automatically
        }
    }
    catch (error) {
        console.error("Health check failed:", error);
    }
}), HEALTH_CHECK_INTERVAL);
function startEmbeddingWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting embedding worker with connection resilience...");
        yield (0, bus_1.consume)("embeddings.generate", (payload) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { recordIds, companyId, uploadId, originalFileName } = payload;
                console.log(`Processing upload ${uploadId}, ${recordIds.length} records`);
                yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, 0, "queued", "Upload queued for processing", {
                    totalRecords: recordIds.length,
                    fileName: originalFileName,
                    startedAt: new Date().toISOString(),
                });
                // Process embeddings with detailed progress
                yield processEmbeddingsWithProgress(recordIds, companyId, uploadId);
                // Run leak detection
                yield runLeakDetection(companyId, uploadId);
                console.log(`Successfully processed upload ${uploadId}`);
            }
            catch (error) {
                console.error(`Failed to process upload:`, error);
                // Try to get uploadId from error or payload
                const uploadId = (payload === null || payload === void 0 ? void 0 : payload.uploadId) || "unknown";
                const companyId = (payload === null || payload === void 0 ? void 0 : payload.companyId) || "unknown";
                yield redisPublisher_1.redisPublisher.publishUploadError(companyId, uploadId, errorHandler_1.ErrorHandler.getErrorMessage(error));
                // Don't nack for connection errors to avoid infinite retries during outages
                if (error instanceof Error && error.message.includes("ECONNRESET")) {
                    console.log("Connection error, message will be dead-lettered");
                    // Message will be handled by the bus layer
                }
                else {
                    // Application error, retry later
                    throw error;
                }
            }
        }));
    });
}
function processEmbeddingsWithProgress(recordIds, companyId, uploadId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Fix: Explicitly type the batches array
        const batches = [];
        for (let i = 0; i < recordIds.length; i += EMBED_BATCH) {
            batches.push(recordIds.slice(i, i + EMBED_BATCH));
        }
        yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, 10, "embeddings", "Starting embedding generation", { totalBatches: batches.length });
        for (const [batchIndex, batch] of batches.entries()) {
            const progress = 10 + Math.round((batchIndex / batches.length) * 40);
            yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, progress, "embeddings", `Processing batch ${batchIndex + 1}/${batches.length}`, {
                currentBatch: batchIndex + 1,
                totalBatches: batches.length,
                recordsInBatch: batch.length,
            });
            yield processBatchWithRetry(batch, MAX_RETRIES);
        }
        yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, 50, "embeddings_complete", "All embeddings generated successfully", { totalRecords: recordIds.length });
    });
}
function processBatchWithRetry(batch, maxRetries) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const recs = yield db_1.prisma.record.findMany({
                    where: { id: { in: batch } },
                    select: {
                        id: true,
                        normalizedPartner: true,
                        amount: true,
                        normalizedCurrency: true,
                        userKey: true,
                    },
                });
                const texts = recs.map((r) => `${r.normalizedPartner || ""} | ${r.amount || ""} ${r.normalizedCurrency || ""} | ${r.userKey || ""}`);
                const embeddings = yield (0, aiEmbedding_1.getEmbeddingsBatch)(texts);
                const savePromises = embeddings.map((emb, i) => (0, vectorStore_1.saveRecordEmbedding)(recs[i].id, emb));
                for (let i = 0; i < savePromises.length; i += CONCURRENCY) {
                    yield Promise.all(savePromises.slice(i, i + CONCURRENCY));
                }
                return;
            }
            catch (error) {
                if (attempt === maxRetries)
                    throw error;
                yield new Promise((resolve) => setTimeout(resolve, attempt * 2000));
            }
        }
    });
}
function runLeakDetection(companyId, uploadId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, 50, "detection", "Starting threat detection");
        const records = yield db_1.prisma.record.findMany({
            where: { uploadId },
            orderBy: { createdAt: "asc" },
        });
        const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)(records, uploadId, companyId, (progress, total, threats) => __awaiter(this, void 0, void 0, function* () {
            // progress is now a percentage between 50-95
            yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, progress, "detection", `Analyzing records for threats (${progress}%)`, {
                recordsProcessed: Math.round(((progress - 50) / 45) * total),
                totalRecords: total,
                threatsFound: threats,
            });
        }));
        // Final completion
        yield redisPublisher_1.redisPublisher.publishUploadProgress(companyId, uploadId, 100, "complete", "Analysis complete", {
            recordsAnalyzed: records.length,
            threatsDetected: threatsCreated.length,
        });
        yield redisPublisher_1.redisPublisher.publishUploadComplete(companyId, uploadId, {
            recordsAnalyzed: records.length,
            processingTime: Date.now() - (yield getUploadStartTime(uploadId)),
        }, threatsCreated, summary);
        return { threatsCreated, summary };
    });
}
function getUploadStartTime(uploadId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const upload = yield db_1.prisma.upload.findUnique({
            where: { id: uploadId },
            select: { createdAt: true },
        });
        return ((_a = upload === null || upload === void 0 ? void 0 : upload.createdAt) === null || _a === void 0 ? void 0 : _a.getTime()) || Date.now();
    });
}
