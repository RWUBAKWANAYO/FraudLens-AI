import { startEmbeddingWorker } from "./embeddingWorker";
import { startWebhookConsumer } from "../queue/webhookQueue";
import { getChannel, checkConnectionHealth, gracefulShutdown } from "../queue/connectionManager";

(async function main() {
  let retryCount = 0;
  const MAX_RETRIES = 10;

  while (retryCount < MAX_RETRIES) {
    try {
      await getChannel();

      await Promise.all([startEmbeddingWorker(), startWebhookConsumer()]);

      break;
    } catch (error) {
      retryCount++;

      if (retryCount >= MAX_RETRIES) {
        process.exit(1);
      }

      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const healthCheckInterval = setInterval(async () => {
    try {
      await checkConnectionHealth();
    } catch (error) {}
  }, 30000);

  const shutdownSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
  shutdownSignals.forEach((signal) => {
    process.on(signal, async () => {
      clearInterval(healthCheckInterval);
      await gracefulShutdown();
      process.exit(0);
    });
  });
})();
