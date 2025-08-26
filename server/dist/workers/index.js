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
// server/src/workers/index.ts
const embeddingWorker_1 = require("./embeddingWorker");
const webhookQueue_1 = require("../queue/webhookQueue"); // Add this import
const connectionManager_1 = require("../queue/connectionManager");
(function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting workers with connection resilience...");
        let retryCount = 0;
        const MAX_RETRIES = 10;
        while (retryCount < MAX_RETRIES) {
            try {
                yield (0, connectionManager_1.getChannel)();
                // Start ALL workers including webhook consumer
                yield Promise.all([
                    (0, embeddingWorker_1.startEmbeddingWorker)(),
                    (0, webhookQueue_1.startWebhookConsumer)(), // Add this line
                ]);
                console.log("Workers running: embeddings.generate, threat.explain, webhook.deliveries");
                break;
            }
            catch (error) {
                retryCount++;
                console.error(`Failed to start workers (attempt ${retryCount}/${MAX_RETRIES}):`, error);
                if (retryCount >= MAX_RETRIES) {
                    console.error("Max retry attempts reached. Exiting.");
                    process.exit(1);
                }
                // Exponential backoff
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`Retrying in ${delay}ms...`);
                yield new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        // Periodic health checks
        const healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const isHealthy = yield (0, connectionManager_1.checkConnectionHealth)();
                if (!isHealthy) {
                    console.warn("Connection health check failed");
                }
            }
            catch (error) {
                console.error("Health check error:", error);
            }
        }), 30000); // Check every 30 seconds
        // Graceful shutdown handling
        const shutdownSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
        shutdownSignals.forEach((signal) => {
            process.on(signal, () => __awaiter(this, void 0, void 0, function* () {
                console.log(`${signal} received, shutting down gracefully...`);
                // Clear intervals
                clearInterval(healthCheckInterval);
                // Close connections
                yield (0, connectionManager_1.gracefulShutdown)();
                console.log("Graceful shutdown complete. Exiting.");
                process.exit(0);
            }));
        });
    });
})();
