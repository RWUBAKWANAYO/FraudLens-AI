import amqp from "amqplib";
import { prisma } from "../src/config/db";
import { saveRecordEmbedding } from "../src/services/vectorStore";
import { getEmbedding } from "../src/services/aiEmbedding";
import { enrich } from "../src/services/enrichment";
import { detectLeaks } from "../src/services/leakDetection";

async function main() {
  const conn = await amqp.connect(process.env.RABBIT_URL || "amqp://localhost");
  const ch = await conn.createChannel();
  const q = "transactions";
  await ch.assertQueue(q, { durable: true });
  ch.consume(q, async (msg) => {
    if (!msg) return;
    const evt = JSON.parse(msg.content.toString());
    const companyId = evt.companyId;
    const upload = await prisma.upload.create({
      data: {
        companyId,
        fileName: `rabbit-${Date.now()}`,
        fileType: "application/json",
        source: "rabbit",
      },
    });
    const meta = await enrich(evt);
    const rec = await prisma.record.create({
      data: {
        companyId,
        uploadId: upload.id,
        txId: evt.txId ?? null,
        partner: evt.partner ?? null,
        amount: evt.amount ?? null,
        currency: evt.currency ?? null,
        date: evt.date ? new Date(evt.date) : new Date(),
        raw: evt,
        ...meta,
      },
    });
    try {
      const emb = await getEmbedding(`${rec.txId ?? ""} ${rec.partner ?? ""} ${rec.amount ?? ""}`);
      await saveRecordEmbedding(rec.id, emb);
    } catch {}
    await detectLeaks([rec], upload.id, companyId);
    ch.ack(msg);
  });
}
main().catch(console.error);
