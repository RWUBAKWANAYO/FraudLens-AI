import { Request, Response } from "express";
import { prisma } from "../config/db";
import { getEmbedding } from "../services/aiEmbedding";
import { enrich } from "../services/enrichment";
import { saveRecordEmbedding } from "../services/vectorStore";
import { detectLeaks } from "../services/leakDetection";

export async function ingestEventWebhook(req: Request, res: Response) {
  const companyId = req.query.companyId as string; // or from auth
  if (!companyId) return res.status(400).json({ error: "companyId required" });

  const event = req.body; // {txId, partner, amount, currency, date, ip, device, ...}

  // Create pseudo-upload to bucket events by day/hour
  const upload = await prisma.upload.create({
    data: {
      companyId,
      fileName: `webhook-${Date.now()}.json`,
      fileType: "application/json",
      source: "webhook",
    },
  });

  const meta = await enrich(event);
  const rec = await prisma.record.create({
    data: {
      companyId,
      uploadId: upload.id,
      txId: event.txId ?? null,
      partner: event.partner ?? null,
      amount: event.amount ?? null,
      currency: event.currency ?? null,
      date: event.date ? new Date(event.date) : new Date(),
      raw: event,
      ip: meta.ip,
      device: meta.device,
      geoCountry: meta.geoCountry,
      geoCity: meta.geoCity,
      mcc: meta.mcc,
      channel: meta.channel ?? "api",
    },
  });

  try {
    const emb = await getEmbedding(`${rec.txId ?? ""} ${rec.partner ?? ""} ${rec.amount ?? ""}`);
    await saveRecordEmbedding(rec.id, emb);
  } catch {}

  const { threatsCreated, summary } = await detectLeaks([rec], upload.id, companyId);

  res.json({ ok: true, threats: threatsCreated, summary });
}
