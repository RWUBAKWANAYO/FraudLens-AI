// server/src/workers/index.ts
import { startEmbeddingWorker } from "./embeddingWorker";
import { getChannel, checkConnectionHealth, gracefulShutdown } from "../queue/connectionManager";

(async function main() {
  console.log("Starting workers with connection resilience...");

  let retryCount = 0;
  const MAX_RETRIES = 10;

  while (retryCount < MAX_RETRIES) {
    try {
      await getChannel();
      await Promise.all([startEmbeddingWorker()]);
      console.log("Workers running: embeddings.generate, threat.explain");
      break;
    } catch (error) {
      retryCount++;
      console.error(`Failed to start workers (attempt ${retryCount}/${MAX_RETRIES}):`, error);

      if (retryCount >= MAX_RETRIES) {
        console.error("Max retry attempts reached. Exiting.");
        process.exit(1);
      }

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Periodic health checks
  const healthCheckInterval = setInterval(async () => {
    try {
      const isHealthy = await checkConnectionHealth();
      if (!isHealthy) {
        console.warn("Connection health check failed");
      }
    } catch (error) {
      console.error("Health check error:", error);
    }
  }, 30000); // Check every 30 seconds

  // Graceful shutdown handling
  const shutdownSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
  shutdownSignals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`${signal} received, shutting down gracefully...`);

      // Clear intervals
      clearInterval(healthCheckInterval);

      // Close connections
      await gracefulShutdown();

      console.log("Graceful shutdown complete. Exiting.");
      process.exit(0);
    });
  });
})();
