import { createClient, RedisClientType } from "redis";
import { randomBytes } from "crypto";

let redisClient: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;
let isReconnecting = false;
const MAX_RECONNECT_ATTEMPTS = Number(process.env.REDIS_MAX_RECONNECT || 10);

function attachCommonHandlers(client: RedisClientType, name: string) {
  client.on("error", (err) => {
    try {
      console.error(`[redis:${name}] error`, err && err.message ? err.message : err);
    } catch (e) {
      console.error(`[redis:${name}] error handler failed`, e);
    }
  });

  client.on("connect", () => {
    console.info(`[redis:${name}] connect`);
  });

  client.on("ready", () => {
    console.info(`[redis:${name}] ready`);
  });

  client.on("end", () => {
    console.warn(`[redis:${name}] connection ended`);
  });

  client.on("reconnecting", (delay) => {
    console.warn(`[redis:${name}] reconnecting in ${delay}ms`);
  });
}

export async function getRedis() {
  if (redisClient && redisClient.isOpen) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");

  try {
    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries >= MAX_RECONNECT_ATTEMPTS) return false;
          return Math.min(retries * 1000, 5000);
        },
      },
    }) as RedisClientType;

    attachCommonHandlers(redisClient, "client");

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    try {
      if (redisClient) {
        await redisClient.disconnect().catch(() => {});
      }
    } catch {}
    redisClient = null;
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
    await new Promise((resolve) => setTimeout(resolve, 500));
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
        reconnectStrategy: (retries: number) => {
          if (retries >= MAX_RECONNECT_ATTEMPTS) return false;
          return Math.min(retries * 1000, 5000);
        },
      },
    }) as RedisClientType;

    subClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries >= MAX_RECONNECT_ATTEMPTS) return false;
          return Math.min(retries * 1000, 5000);
        },
      },
    }) as RedisClientType;

    attachCommonHandlers(pubClient, "pub");
    attachCommonHandlers(subClient, "sub");

    await Promise.all([pubClient.connect(), subClient.connect()]);

    isReconnecting = false;
    return { pubClient, subClient };
  } catch (error) {
    isReconnecting = false;
    await closeRedisPubSubConnections();
    throw error;
  }
}

async function closeRedisPubSubConnections() {
  const clients = [pubClient, subClient].filter(Boolean) as RedisClientType[];
  await Promise.allSettled(
    clients.map(async (client) => {
      try {
        if (client.isOpen) {
          await client.quit();
        }
      } catch (err) {
        try {
          await client.disconnect();
        } catch {}
      }
    })
  );
  pubClient = null;
  subClient = null;
}

export async function closeRedisConnections() {
  const clients = [redisClient, pubClient, subClient].filter(Boolean) as RedisClientType[];
  await Promise.allSettled(
    clients.map(async (client) => {
      try {
        if (client.isOpen) {
          await client.quit();
        }
      } catch (error) {
        try {
          await client.disconnect();
        } catch {}
      }
    })
  );
  redisClient = null;
  pubClient = null;
  subClient = null;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedis();
    const res = await client.ping();
    return res === "PONG" || res === "OK";
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
