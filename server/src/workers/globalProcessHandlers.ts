import { gracefulShutdown } from "../queue/connectionManager";
import { closeRedisConnections } from "../config/redis";

async function safeShutdown(code = 1, reason?: string) {
  try {
    console.error("Shutting down due to:", reason || "unknown");
    await Promise.allSettled([gracefulShutdown(), closeRedisConnections()]);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
  } finally {
    process.exit(code);
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection at:", reason);
  safeShutdown(1, `unhandledRejection: ${String(reason)}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  safeShutdown(1, `uncaughtException: ${err && err.message}`);
});

process.once("SIGUSR2", () => {
  safeShutdown(0, "SIGUSR2");
});
