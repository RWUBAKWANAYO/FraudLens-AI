import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn", "info"] : ["error", "warn"],
  datasources: {
    db: {
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
        "&socket_timeout=120" +
        "&transaction_isolation=REPEATABLE_READ",
    },
  },
});

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    return false;
  }
}

export const connectDB = async (maxRetries = 3, retryDelay = 2000) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      startDatabaseHealthChecks();
      return;
    } catch (error: any) {
      retries++;

      if (retries >= maxRetries) {
        process.exit(1);
      }

      const delay = retryDelay * Math.pow(2, retries - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

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

      if (error.code === "P1001" || error.code === "P2024") {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
}

let healthCheckInterval: NodeJS.Timeout | null = null;

function startDatabaseHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    try {
      await checkDatabaseHealth();
    } catch (error) {}
  }, 30000);
}

export async function disconnectDB() {
  try {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    await prisma.$disconnect();
  } catch (error) {}
}

process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});
