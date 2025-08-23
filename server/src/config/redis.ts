import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (client && client.isOpen) return client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set");
  client = createClient({ url });
  client.on("error", (e) => console.error("Redis error:", e));
  await client.connect();
  return client;
}
