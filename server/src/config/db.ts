// server/src/config/db.ts
import { PrismaClient } from "@prisma/client";

// Create Prisma client with proper connection configuration
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development" ? ["query", "error", "warn", "info"] : ["error", "warn"],

  // Add connection pool configuration
  datasources: {
    db: {
      // Ensure timeout parameters are included
      url:
        process.env.DATABASE_URL +
        (process.env.DATABASE_URL?.includes("?") ? "&" : "?") +
        "connection_limit=" +
        (process.env.DB_CONNECTION_LIMIT || "10") +
        "&pool_timeout=" +
        (process.env.DB_POOL_TIMEOUT || "30") +
        "&acquire_timeout=" +
        (process.env.DB_ACQUIRE_TIMEOUT || "60000") +
        "&connect_timeout=60" +
        "&socket_timeout=60",
    },
  },
});

// Database connection health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    console.error("Database health check failed:", {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

// Enhanced connectDB function with retry logic
export const connectDB = async (maxRetries = 3, retryDelay = 2000) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      console.log("✅ TiDB connected successfully");

      // Start periodic health checks
      startDatabaseHealthChecks();

      return;
    } catch (error: any) {
      retries++;

      // Handle specific connection errors
      if (error.code === "P1001" || error.code === "P2024") {
        console.error(`❌ TiDB connection attempt ${retries}/${maxRetries} failed:`, error.message);
      } else {
        console.error(`❌ TiDB connection attempt ${retries}/${maxRetries} failed:`, error);
      }

      if (retries >= maxRetries) {
        console.error("Max connection retries reached. Exiting.");
        process.exit(1);
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, retries - 1);
      console.log(`Retrying connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Utility function for safe database operations with retry
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;

      // Only retry on connection/timeout errors
      if (error.code === "P1001" || error.code === "P2024") {
        console.warn(
          `Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
}

// Periodic health checks
let healthCheckInterval: NodeJS.Timeout | null = null;

function startDatabaseHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    try {
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn("Database connection health check failed");
      }
    } catch (error) {
      console.error("Database health check error:", error);
    }
  }, 30000); // Check every 30 seconds
}

// Graceful shutdown
export async function disconnectDB() {
  try {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    await prisma.$disconnect();
    console.log("✅ TiDB disconnected gracefully");
  } catch (error) {
    console.error("❌ Error disconnecting from TiDB:", error);
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log("SIGINT received, closing database connections...");
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing database connections...");
  await disconnectDB();
  process.exit(0);
});
