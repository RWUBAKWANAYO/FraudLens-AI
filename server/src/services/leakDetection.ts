import { prisma } from "../config/db";
import type { Record as PrismaRecord } from "@prisma/client";

type SimpleRecord = PrismaRecord & {
  // Prisma record type fields available
};

function zScore(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return { mean, std };
}

export async function detectLeaks(records: SimpleRecord[], uploadId: string) {
  const threatsCreated: any[] = [];
  // --- 1) duplicate txId detection ---
  const byTx = new Map<string, SimpleRecord[]>();
  for (const r of records) {
    if (!r.txId) continue;
    const list = byTx.get(r.txId) || [];
    list.push(r);
    byTx.set(r.txId, list);
  }
  for (const [txId, list] of byTx.entries()) {
    if (list.length > 1) {
      const description = `Duplicate transaction/invoice ${txId} appears ${list.length} times.`;
      const t = await prisma.threat.create({
        data: {
          uploadId,
          recordId: list[0].id,
          threatType: "duplicate_tx",
          description,
          confidenceScore: 0.9,
        },
      });
      threatsCreated.push(t);
    }
  }

  // --- 2) partner anomalies: new / rare partners (appears only once) ---
  const partnerCount = new Map<string, number>();
  for (const r of records) {
    const p = (r.partner || "UNKNOWN").toString().trim();
    partnerCount.set(p, (partnerCount.get(p) || 0) + 1);
  }
  for (const r of records) {
    const p = (r.partner || "UNKNOWN").toString().trim();
    if (partnerCount.get(p) === 1) {
      const t = await prisma.threat.create({
        data: {
          uploadId,
          recordId: r.id,
          threatType: "rare_partner",
          description: `Partner '${p}' appears once in file — possible fake/one-time vendor.`,
          confidenceScore: 0.6,
        },
      });
      threatsCreated.push(t);
    }
  }

  // --- 3) amount outlier detection (z-score) ---
  const amounts = records.map((r) => r.amount ?? 0).filter((a) => a > 0);
  if (amounts.length >= 5) {
    const { mean, std } = zScore(amounts);
    for (const r of records) {
      if (!r.amount || r.amount <= 0) continue;
      const z = std === 0 ? 0 : Math.abs((r.amount - mean) / std);
      if (z > 3) {
        const t = await prisma.threat.create({
          data: {
            uploadId,
            recordId: r.id,
            threatType: "amount_outlier",
            description: `Amount ${r.amount} is an outlier (z=${z.toFixed(1)}, mean=${mean.toFixed(
              2
            )}).`,
            confidenceScore: z > 5 ? 0.95 : 0.75,
          },
        });
        threatsCreated.push(t);
      }
    }
  }

  // Return detected threats
  return threatsCreated;
}
