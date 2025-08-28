import { createClient, RedisClientType } from "redis";
import { randomBytes } from "crypto";

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
            return false;
          }
          return Math.min(retries * 1000, 5000);
        },
      },
    }) as RedisClientType;

    await redisClient.connect();
    return redisClient;
  } catch (error) {
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (pubClient && subClient && pubClient.isOpen && subClient.isOpen) {
      return { pubClient, subClient };
    }
  }

  isReconnecting = true;

  try {
    await closeRedisPubSubConnections();

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

    await Promise.all([pubClient.connect(), subClient.connect()]);

    isReconnecting = false;
    return { pubClient, subClient };
  } catch (error) {
    isReconnecting = false;
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
      } catch (error) {}
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
      } catch (error) {}
    })
  );
  redisClient = null;
  pubClient = null;
  subClient = null;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedis();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

export async function acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
  const client = await getRedis();
  const token = randomBytes(16).toString("hex");
  const res = await client.set(key, token, { NX: true, EX: ttlSeconds });
  return res === "OK" ? token : null;
}

export async function releaseLock(key: string, token: string): Promise<void> {
  const client = await getRedis();
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  await client.eval(script, { keys: [key], arguments: [token] });
}
