// config/redis.ts
import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;
let isReconnecting = false;
const MAX_RECONNECT_ATTEMPTS = 10;

export async function getRedis() {
  if (redisClient && redisClient.isOpen) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");

  try {
    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > MAX_RECONNECT_ATTEMPTS) {
            console.error("Max Redis reconnection attempts reached");
            return false;
          }
          const delay = Math.min(retries * 1000, 5000);
          console.log(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
    }) as RedisClientType;

    redisClient.on("error", (err) => console.error("Redis client error:", err.message));
    redisClient.on("connect", () => console.log("Redis client connected"));
    redisClient.on("ready", () => console.log("Redis client ready"));
    redisClient.on("reconnecting", () => console.log("Redis client reconnecting"));
    redisClient.on("end", () => console.log("Redis client disconnected"));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    throw error;
  }
}

export async function getRedisPubSub() {
  if (pubClient && subClient && pubClient.isOpen && subClient.isOpen) {
    return { pubClient, subClient };
  }

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");

  if (isReconnecting) {
    // Wait for ongoing reconnection
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (pubClient && subClient && pubClient.isOpen && subClient.isOpen) {
      return { pubClient, subClient };
    }
  }

  isReconnecting = true;

  try {
    // Close existing connections properly
    await closeRedisPubSubConnections();

    // Create new connections with enhanced reconnection strategy
    pubClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > MAX_RECONNECT_ATTEMPTS) return false;
          return Math.min(retries * 1000, 5000);
        },
      },
    }) as RedisClientType;

    subClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > MAX_RECONNECT_ATTEMPTS) return false;
          return Math.min(retries * 1000, 5000);
        },
      },
    }) as RedisClientType;

    const setupClientHandlers = (client: RedisClientType, type: string) => {
      client.on("error", (err) => console.error(`Redis ${type} error:`, err.message));
      client.on("connect", () => console.log(`Redis ${type} connected`));
      client.on("ready", () => console.log(`Redis ${type} ready`));
      client.on("reconnecting", () => console.log(`Redis ${type} reconnecting`));
      client.on("end", () => {
        console.log(`Redis ${type} disconnected`);
        // Trigger reconnection
        setTimeout(() => getRedisPubSub().catch(console.error), 5000);
      });
    };

    setupClientHandlers(pubClient, "pub");
    setupClientHandlers(subClient, "sub");

    await Promise.all([pubClient.connect(), subClient.connect()]);

    isReconnecting = false;
    return { pubClient, subClient };
  } catch (error) {
    isReconnecting = false;
    console.error("Failed to connect to Redis pub/sub:", error);

    // Schedule retry
    setTimeout(() => getRedisPubSub().catch(console.error), 5000);
    throw error;
  }
}

async function closeRedisPubSubConnections() {
  const clients = [pubClient, subClient].filter(Boolean);
  await Promise.allSettled(
    clients.map(async (client) => {
      try {
        if (client && client.isOpen) {
          await client.quit();
        }
      } catch (error) {
        console.warn("Error closing Redis client:", error);
      }
    })
  );
  pubClient = null;
  subClient = null;
}

export async function closeRedisConnections() {
  const clients = [redisClient, pubClient, subClient].filter(Boolean);
  await Promise.allSettled(
    clients.map(async (client) => {
      try {
        if (client && client.isOpen) {
          await client.quit();
        }
      } catch (error) {
        console.warn("Error closing Redis client:", error);
      }
    })
  );
  redisClient = null;
  pubClient = null;
  subClient = null;
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedis();
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}
