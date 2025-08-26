// server/src/queue/connectionManager.ts
import * as amqp from "amqplib";

interface RabbitMQConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
  on(event: string, callback: (error: any) => void): void;
}

interface RabbitMQChannel extends amqp.Channel {}

let conn: RabbitMQConnection | null = null;
let ch: RabbitMQChannel | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

// Add this flag to prevent reconnection during shutdown
let isShuttingDown = false;

// Connection state monitoring
let connectionState: "connected" | "disconnected" | "connecting" = "disconnected";

export async function getChannel(): Promise<RabbitMQChannel> {
  if (ch && connectionState === "connected") {
    return ch;
  }

  if (isConnecting) {
    // Wait for ongoing connection attempt
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (ch && connectionState === "connected") return ch;
  }

  return await establishConnection();
}

async function establishConnection(): Promise<RabbitMQChannel> {
  if (isConnecting || isShuttingDown) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (ch) return ch;
    throw new Error("Connection attempt aborted during shutdown");
  }

  isConnecting = true;
  connectionState = "connecting";

  try {
    const url = process.env.RABBIT_URL;
    if (!url) throw new Error("RABBIT_URL is not set");

    console.log("Connecting to RabbitMQ...");

    // Close existing connection if any
    await closeConnections();

    // Connect without type casting first
    const connection = await amqp.connect(url);

    // Now cast to our custom type
    conn = connection as unknown as RabbitMQConnection;

    // Enhanced error handling
    conn.on("error", (error) => {
      console.error("RabbitMQ connection error:", error.message);
      connectionState = "disconnected";
      if (!isShuttingDown) {
        scheduleReconnection();
      }
    });

    conn.on("close", () => {
      console.log("RabbitMQ connection closed");
      connectionState = "disconnected";
      if (!isShuttingDown) {
        scheduleReconnection();
      }
    });

    // Create channel
    const channel = await conn.createChannel();
    ch = channel as unknown as RabbitMQChannel;

    // Channel error handling
    ch.on("error", (error) => {
      console.error("RabbitMQ channel error:", error.message);
    });

    ch.on("close", () => {
      console.log("RabbitMQ channel closed");
    });

    await ch.prefetch(Number(process.env.WORKER_PREFETCH || 8));

    console.log("RabbitMQ connected successfully");
    connectionState = "connected";
    reconnectAttempts = 0;
    isConnecting = false;

    return ch;
  } catch (error) {
    isConnecting = false;
    connectionState = "disconnected";
    console.error("Failed to connect to RabbitMQ:", error);
    if (!isShuttingDown) {
      scheduleReconnection();
    }
    throw error;
  }
}

function scheduleReconnection() {
  if (isShuttingDown || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached. Giving up.");
    }
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000);

  console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${delay}ms`);

  setTimeout(() => {
    if (!isConnecting && connectionState !== "connected" && !isShuttingDown) {
      establishConnection().catch(console.error);
    }
  }, delay);
}

export async function closeConnections() {
  isConnecting = false;
  connectionState = "disconnected";
  isShuttingDown = true; // Prevent reconnections

  if (ch) {
    try {
      await ch.close();
    } catch (error) {
      console.warn("Error closing channel:", error);
    } finally {
      ch = null;
    }
  }

  if (conn) {
    try {
      await conn.close();
    } catch (error) {
      console.warn("Error closing connection:", error);
    } finally {
      conn = null;
    }
  }
}

// Enhanced health check
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    if (connectionState !== "connected" || !conn || !ch) return false;

    // Quick ping test
    await ch.assertQueue("health_check", {
      durable: false,
      autoDelete: true,
      messageTtl: 1000,
    });
    await ch.deleteQueue("health_check");

    return true;
  } catch (error) {
    console.warn("Connection health check failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function gracefulShutdown() {
  console.log("Performing graceful shutdown of RabbitMQ connections...");
  isShuttingDown = true; // Prevent any reconnection attempts
  await closeConnections();
}
