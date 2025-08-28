// =============================================
// server/src/queue/connectionManager.ts
// =============================================
// @ts-nocheck

import * as amqp from "amqplib";

type RabbitConn = amqp.Connection | null;
type RabbitCh = amqp.Channel | null;

let connection: RabbitConn = null;
let publisherChannel: RabbitCh = null;
const consumerChannels = new Map<string, RabbitCh>();

let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = Number(process.env.RABBIT_MAX_RECONNECT || 10);
const BASE_RECONNECT_DELAY = Number(process.env.RABBIT_RECONNECT_BASE_MS || 1000);

let isShuttingDown = false;

// Connection state
let connectionState: "connected" | "disconnected" | "connecting" = "disconnected";
export async function getConnection(): Promise<amqp.Connection> {
  if (connection && connection.connection && connectionState === "connected") {
    return connection;
  }

  if (isConnecting) {
    await new Promise((r) => setTimeout(r, 500));
    if (connection && connection.connection && connectionState === "connected") return connection;
  }

  return await establishConnection();
}

async function establishConnection(): Promise<amqp.Connection> {
  if (isConnecting) {
    await new Promise((r) => setTimeout(r, 500));
    if (connection && connectionState === "connected") return connection;
  }

  if (isShuttingDown) throw new Error("Shutting down; not creating new connections");

  isConnecting = true;
  connectionState = "connecting";

  try {
    const url = process.env.RABBIT_URL;
    if (!url) throw new Error("RABBIT_URL is not set");

    const conn = await amqp.connect(url);

    conn.on("error", (err) => {
      // amqplib emits 'error' on connection; log and trigger reconnection
      console.error("RabbitMQ connection error:", err && (err as Error).message);
      connectionState = "disconnected";
      scheduleReconnect();
    });

    conn.on("close", () => {
      console.warn("RabbitMQ connection closed");
      connectionState = "disconnected";
      scheduleReconnect();
    });

    connection = conn;
    connectionState = "connected";
    reconnectAttempts = 0;
    isConnecting = false;

    console.log("RabbitMQ connection established");
    return connection;
  } catch (err) {
    isConnecting = false;
    connectionState = "disconnected";
    reconnectAttempts++;
    console.error(`Failed to connect to RabbitMQ (attempt ${reconnectAttempts}):`, err);

    if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000);
      console.log(`Retrying RabbitMQ connect in ${delay}ms`);
      setTimeout(() => establishConnection().catch(console.error), delay);
    }

    throw err;
  }
}

function scheduleReconnect() {
  if (isShuttingDown) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("Max RabbitMQ reconnection attempts reached");
    return;
  }
  reconnectAttempts++;
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000);
  console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${delay}ms`);
  setTimeout(() => establishConnection().catch(console.error), delay);
}

/**
 * Return a publisher channel (single long-lived channel used for publishing).
 * If channel is closed, a new one is created.
 */
export async function getChannel(): Promise<amqp.Channel> {
  try {
    if (publisherChannel && publisherChannel.connection) {
      return publisherChannel;
    }

    const conn = await getConnection();
    publisherChannel = await conn.createChannel();

    // publisher channel error/close handlers: close and allow recreation
    publisherChannel.on("error", (err) => {
      console.error("Publisher channel error:", (err && (err as Error).message) || err);
      try {
        publisherChannel && publisherChannel.close().catch(() => {});
      } finally {
        publisherChannel = null;
      }
    });

    publisherChannel.on("close", () => {
      console.warn("Publisher channel closed");
      publisherChannel = null;
    });

    return publisherChannel;
  } catch (err) {
    publisherChannel = null;
    throw err;
  }
}

/**
 * Create (and return) a fresh consumer channel for a single consumer.
 * Consumer channel should be used exclusively by that consumer.
 */
export async function createConsumerChannel(
  consumerId: string,
  prefetch = Number(process.env.WORKER_PREFETCH || 8)
): Promise<amqp.Channel> {
  // If we already have one for this id and it's open, return it
  const existing = consumerChannels.get(consumerId);
  if (existing && existing.connection) {
    return existing;
  }

  const conn = await getConnection();
  const ch = await conn.createChannel();
  if (prefetch > 0) {
    await ch.prefetch(prefetch);
  }

  ch.on("error", (err) => {
    console.error(
      `Consumer channel (${consumerId}) error:`,
      (err && (err as Error).message) || err
    );
  });

  ch.on("close", () => {
    console.warn(`Consumer channel (${consumerId}) closed`);
    consumerChannels.set(consumerId, null);
  });

  consumerChannels.set(consumerId, ch);
  return ch;
}

/**
 * Health check for current connection & channels.
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    if (!connection || connectionState !== "connected") return false;
    // Try a lightweight operation: create a temporary channel, assert/delete a temporary queue
    const ch = await connection.createChannel();
    try {
      const q = `health_check_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await ch.assertQueue(q, { durable: false, autoDelete: true, messageTtl: 1000 });
      await ch.deleteQueue(q);
      await ch.close();
      return true;
    } catch (err) {
      try {
        await ch.close();
      } catch (_) {}
      return false;
    }
  } catch (err) {
    return false;
  }
}

/**
 * Close channels and connection gracefully.
 */
export async function closeConnections(): Promise<void> {
  isShuttingDown = true;
  // Close consumer channels
  await Promise.allSettled(
    Array.from(consumerChannels.values()).map(async (ch) => {
      if (ch && ch.close) {
        try {
          await ch.close();
        } catch (e) {
          console.warn("Error closing consumer channel:", e);
        }
      }
    })
  );

  consumerChannels.clear();

  // Close publisher channel
  if (publisherChannel) {
    try {
      await publisherChannel.close();
    } catch (e) {
      console.warn("Error closing publisher channel:", e);
    }
    publisherChannel = null;
  }

  if (connection) {
    try {
      await connection.close();
    } catch (e) {
      console.warn("Error closing connection:", e);
    }
    connection = null;
  }

  connectionState = "disconnected";
  isConnecting = false;
}

/**
 * Graceful shutdown helper for process signals
 */
export async function gracefulShutdown(): Promise<void> {
  console.log("Performing graceful RabbitMQ shutdown...");
  isShuttingDown = true;
  await closeConnections();
}

export default {
  getConnection,
  getChannel,
  createConsumerChannel,
  checkConnectionHealth,
  closeConnections,
  gracefulShutdown,
};
