// server/src/queue/bus.ts

import * as amqp from "amqplib";
import { getChannel, closeConnections } from "./connectionManager";

const MAX_PUBLISH_RETRIES = 3;
const PUBLISH_RETRY_DELAY = 1000;

export async function publish(queue: string, msg: any, retryCount = 0): Promise<boolean> {
  try {
    const channel = await getChannel();
    await channel.assertQueue(queue, { durable: true });

    const success = channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), {
      persistent: true,
    });

    if (!success) {
      throw new Error("Message not queued (flow control)");
    }

    return true;
  } catch (error) {
    console.error(`Failed to publish to ${queue} (attempt ${retryCount + 1}):`, error);

    if (retryCount < MAX_PUBLISH_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, PUBLISH_RETRY_DELAY * (retryCount + 1)));
      return publish(queue, msg, retryCount + 1);
    }

    return false;
  }
}

export async function consume(
  queue: string,
  handler: (payload: any, channel: amqp.Channel, msg: amqp.Message) => Promise<void>
) {
  try {
    const channel = await getChannel();
    await channel.assertQueue(queue, { durable: true });

    console.log(`Starting consumer for queue: ${queue}`);

    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload, channel, msg); // Pass channel and msg
        } catch (error) {
          console.error(`Error processing message from ${queue}:`, error);
          // Handle errors appropriately
        }
      },
      { noAck: false } // Important: Manual acknowledgment
    );
  } catch (error) {
    console.error(`Failed to start consumer for ${queue}:`, error);
    setTimeout(() => consume(queue, handler), 5000);
  }
}

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing RabbitMQ connections");
  await closeConnections();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing RabbitMQ connections");
  await closeConnections();
});
