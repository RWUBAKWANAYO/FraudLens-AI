import * as amqp from "amqplib";
import { getChannel, createConsumerChannel, closeConnections } from "./connectionManager";

const MAX_PUBLISH_RETRIES = 4;
const PUBLISH_RETRY_BASE_MS = 500;

export async function publish(queue: string, msg: any, retryCount = 0): Promise<boolean> {
  try {
    const channel = await getChannel();

    await channel.assertQueue(queue, { durable: true });

    const ok = channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), {
      persistent: true,
      contentType: "application/json",
    });

    if (!ok) {
      throw new Error("Message not queued (flow control)");
    }

    return true;
  } catch (error) {
    console.error(
      `Failed to publish to ${queue} (attempt ${retryCount + 1}):`,
      error && (error as Error).message
    );
    if (retryCount < MAX_PUBLISH_RETRIES) {
      const delay = PUBLISH_RETRY_BASE_MS * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return publish(queue, msg, retryCount + 1);
    }

    return false;
  }
}

export async function consume(
  queue: string,
  handler: (payload: any, channel: amqp.Channel, msg: amqp.Message) => Promise<void>,
  opts: {
    consumerId?: string;
    prefetch?: number;
    requeueOnError?: boolean;
  } = {}
) {
  const consumerId = opts.consumerId || `${queue}-${Math.floor(Math.random() * 10000)}`;
  const prefetch = typeof opts.prefetch === "number" ? opts.prefetch : undefined;
  const requeueOnError = !!opts.requeueOnError;

  async function start() {
    try {
      const ch = await createConsumerChannel(consumerId, prefetch);
      await ch.assertQueue(queue, { durable: true });

      console.log(`Starting consumer ${consumerId} for queue: ${queue}`);

      ch.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          let payload: any;
          try {
            payload = JSON.parse(msg.content.toString());
          } catch (err) {
            console.error("Failed to parse message JSON; acking to drop:", err);
            safeAck(ch, msg);
            return;
          }

          try {
            await handler(payload, ch, msg);
            safeAck(ch, msg);
          } catch (err) {
            console.error(
              `Error processing message from ${queue}:`,
              (err && (err as Error).message) || err
            );
            safeNack(ch, msg, requeueOnError);
          }
        },
        { noAck: false }
      );

      ch.on("close", () => {
        console.warn(`Consumer channel ${consumerId} closed; restarting in 2s`);
        setTimeout(start, 2000);
      });

      ch.on("error", (err) => {
        console.error(
          `Consumer channel ${consumerId} error:`,
          (err && (err as Error).message) || err
        );
      });
    } catch (err) {
      console.error(`Failed to start consumer ${consumerId} for ${queue}:`, err);
      setTimeout(start, 2000);
    }
  }

  start();
}

function safeAck(channel: amqp.Channel, msg: amqp.Message) {
  try {
    if (channel && (channel as any).connection) {
      channel.ack(msg);
    } else {
      console.warn("Attempted to ack on closed channel — skipping");
    }
  } catch (err) {
    console.warn(
      "Failed to ack message (channel may be closed):",
      (err && (err as Error).message) || err
    );
  }
}

function safeNack(channel: amqp.Channel, msg: amqp.Message, requeue = false) {
  try {
    if (channel && (channel as any).connection) {
      channel.nack(msg, false, requeue);
    } else {
      console.warn("Attempted to nack on closed channel — skipping");
    }
  } catch (err) {
    console.warn(
      "Failed to nack message (channel may be closed):",
      (err && (err as Error).message) || err
    );
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing RabbitMQ connections");
  await closeConnections();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing RabbitMQ connections");
  await closeConnections();
});
