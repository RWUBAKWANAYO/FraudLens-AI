import * as amqp from "amqplib";

// Type assertions for the connection and channel
interface ExtendedConnection extends amqp.Connection {
  createChannel(): Promise<amqp.Channel>;
}

let conn: ExtendedConnection | null = null;
let ch: amqp.Channel | null = null;

export async function getChannel(): Promise<amqp.Channel> {
  if (ch) return ch;

  const url = process.env.RABBIT_URL!;
  conn = (await amqp.connect(url)) as ExtendedConnection;
  ch = await conn.createChannel();

  await ch.prefetch(Number(process.env.WORKER_PREFETCH || 8));
  return ch;
}

export async function publish(queue: string, msg: any) {
  const channel = await getChannel();
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), { persistent: true });
}

export async function consume(queue: string, handler: (payload: any) => Promise<void>) {
  const channel = await getChannel();
  await channel.assertQueue(queue, { durable: true });
  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`[worker:${queue}]`, err);
      channel.nack(msg, false, false); // dead-letter on failure
    }
  });
}
