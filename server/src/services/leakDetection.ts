import { prisma } from "../config/db";
import type { Record as PrismaRecord } from "@prisma/client";
import { IsolationForest } from "isolation-forest";
import { generateThreatExplanation, type ThreatContext } from "./aiExplanation"; // Import the new service

type SimpleRecord = PrismaRecord & {
  // Prisma record type fields available
};

function zScore(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return { mean, std };
}

// Helper function to create threat with AI explanation
async function createAIContextualizedThreat(
  uploadId: string,
  recordId: string,
  threatType: string,
  confidenceScore: number,
  context: ThreatContext
) {
  const aiExplanation = await generateThreatExplanation(context);

  return prisma.threat.create({
    data: {
      uploadId,
      recordId,
      threatType,
      description: aiExplanation,
      confidenceScore,
    },
  });
}

export async function detectLeaks(records: SimpleRecord[], uploadId: string) {
  const threatsCreated: any[] = [];

  // Pre-calculate dataset statistics for context
  const positiveAmounts = records.map((r) => r.amount ?? 0).filter((a) => a > 0);
  const avgAmount =
    positiveAmounts.length > 0
      ? positiveAmounts.reduce((sum, a) => sum + a, 0) / positiveAmounts.length
      : 0;
  const maxAmount = positiveAmounts.length > 0 ? Math.max(...positiveAmounts) : 0;

  const baseStats = {
    mean: avgAmount,
    max: maxAmount,
    totalRecords: records.length,
  };

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
      const context: ThreatContext = {
        threatType: "duplicate_tx",
        amount: list[0].amount,
        partner: list[0].partner,
        txId,
        datasetStats: baseStats,
        additionalContext: { count: list.length },
      };

      const t = await createAIContextualizedThreat(
        uploadId,
        list[0].id,
        "duplicate_tx",
        0.9,
        context
      );
      threatsCreated.push(t);
    }
  }

  // --- 2) amount outlier detection (z-score) ---
  const amounts = records.map((r) => r.amount ?? 0).filter((a) => a > 0);
  if (amounts.length >= 5) {
    const { mean, std } = zScore(amounts);
    for (const r of records) {
      if (!r.amount || r.amount <= 0) continue;
      const z = std === 0 ? 0 : Math.abs((r.amount - mean) / std);
      if (z > 3) {
        const context: ThreatContext = {
          threatType: "amount_outlier",
          amount: r.amount,
          partner: r.partner,
          txId: r.txId,
          datasetStats: { ...baseStats, std },
          additionalContext: { zScore: z },
        };

        const confidence = z > 5 ? 0.95 : 0.75;
        const t = await createAIContextualizedThreat(
          uploadId,
          r.id,
          "amount_outlier",
          confidence,
          context
        );
        threatsCreated.push(t);
      }
    }
  }

  // --- 3) Negative or zero amounts ---
  for (const r of records) {
    if (r.amount !== null && r.amount <= 0) {
      const context: ThreatContext = {
        threatType: "invalid_amount",
        amount: r.amount,
        partner: r.partner,
        txId: r.txId,
        datasetStats: baseStats,
      };

      const t = await createAIContextualizedThreat(uploadId, r.id, "invalid_amount", 0.8, context);
      threatsCreated.push(t);
    }
  }

  // --- 4) Isolation Forest (ML anomaly detection) ---
  if (amounts.length > 20) {
    const iso = new IsolationForest();
    const X = records.filter((r) => r.amount !== null).map((r) => ({ amount: r.amount as number }));
    iso.fit(X);
    const scores = iso.scores();

    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      if (s > 0.6) {
        const r = records[i];
        const context: ThreatContext = {
          threatType: "ml_outlier",
          amount: r.amount,
          partner: r.partner,
          txId: r.txId,
          datasetStats: baseStats,
          additionalContext: { anomalyScore: s },
        };

        const t = await createAIContextualizedThreat(
          uploadId,
          r.id,
          "suspicious_pattern", // More user-friendly name
          0.7,
          context
        );
        threatsCreated.push(t);
      }
    }
  }

  // Return detected threats
  const total = records.length;
  const flagged = threatsCreated.length;
  const flaggedValue = records
    .filter((r) => threatsCreated.find((t) => t.recordId === r.id))
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const summary = {
    totalRecords: total,
    flagged,
    flaggedValue,
    message: `Analyzed ${total} rows → flagged ${flagged} suspicious (${(
      (flagged / total) *
      100
    ).toFixed(1)}%), worth ~$${flaggedValue.toFixed(2)}.`,
  };

  return { threatsCreated, summary };
}
