import { prisma } from "../config/db";
import type { Record as PrismaRecord } from "@prisma/client";
import { IsolationForest } from "isolation-forest";
import { generateThreatExplanation, type ThreatContext } from "./aiExplanation";
import { findSimilarForEmbedding } from "./similaritySearch";
import { evaluateRules } from "./rulesEngine";
import { createAndDispatchAlert } from "./alerts";
import { dispatchEnterpriseWebhooks } from "./webhooks";

export async function detectLeaks(records: PrismaRecord[], uploadId: string, companyId: string) {
  const threatsCreated: any[] = [];
  const flaggedRecordIds = new Set<string>();
  const duplicateGroups = new Map<string, string[]>(); // Track duplicate groups

  const positiveAmounts = records.map((r) => r.amount ?? 0).filter((a) => a > 0);
  const avgAmount = positiveAmounts.length
    ? positiveAmounts.reduce((s, a) => s + a, 0) / positiveAmounts.length
    : 0;
  const maxAmount = positiveAmounts.length ? Math.max(...positiveAmounts) : 0;

  const baseStats = { mean: avgAmount, max: maxAmount, totalRecords: records.length };

  // 1) Duplicate txId - Create ONE threat per duplicate group
  const byTx = new Map<string, PrismaRecord[]>();
  for (const r of records) {
    if (!r.txId) continue;
    const list = byTx.get(r.txId) || [];
    list.push(r);
    byTx.set(r.txId, list);
  }

  for (const [txId, list] of byTx.entries()) {
    if (list.length > 1) {
      duplicateGroups.set(
        txId,
        list.map((r) => r.id)
      );

      const context: ThreatContext = {
        threatType: "duplicate_tx",
        amount: list[0].amount,
        partner: list[0].partner,
        txId,
        datasetStats: baseStats,
        additionalContext: {
          count: list.length,
          duplicateIds: list.map((r) => r.id),
        },
      };

      const t = await createAIContextualizedThreat(
        companyId,
        uploadId,
        list[0].id,
        "duplicate_tx",
        0.9,
        context
      );

      threatsCreated.push(t);
      list.forEach((r) => flaggedRecordIds.add(r.id));
    }
  }

  // 2) Amount outliers (z-score)
  const amounts = records.map((r) => r.amount ?? 0).filter((a) => a > 0);
  if (amounts.length >= 5) {
    const mean = avgAmount;
    const std =
      amounts.length > 1
        ? Math.sqrt(amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / (amounts.length - 1))
        : 0;

    const zThreshold = amounts.length >= 10 ? 3 : 4;

    for (const r of records) {
      if (flaggedRecordIds.has(r.id) || !r.amount || r.amount <= 0) continue;

      const z = std === 0 ? 0 : Math.abs((r.amount - mean) / std);
      if (z > zThreshold) {
        const context: ThreatContext = {
          threatType: "amount_outlier",
          amount: r.amount,
          partner: r.partner,
          txId: r.txId,
          datasetStats: { ...baseStats, std },
          additionalContext: { zScore: z },
        };
        const conf = z > 5 ? 0.95 : 0.75;
        const t = await createAIContextualizedThreat(
          companyId,
          uploadId,
          r.id,
          "amount_outlier",
          conf,
          context
        );
        threatsCreated.push(t);
        flaggedRecordIds.add(r.id);
      }
    }
  }

  // 3) Invalid amounts
  for (const r of records) {
    if (flaggedRecordIds.has(r.id)) continue;

    if (r.amount !== null && r.amount <= 0) {
      const context: ThreatContext = {
        threatType: "invalid_amount",
        amount: r.amount,
        partner: r.partner,
        txId: r.txId,
        datasetStats: baseStats,
      };
      const t = await createAIContextualizedThreat(
        companyId,
        uploadId,
        r.id,
        "invalid_amount",
        0.8,
        context
      );
      threatsCreated.push(t);
      flaggedRecordIds.add(r.id);
    }
  }

  // 4) Isolation Forest - Skip for small datasets
  if (amounts.length > 25) {
    const iso = new IsolationForest();
    const X = records
      .filter((r) => !flaggedRecordIds.has(r.id) && r.amount !== null)
      .map((r) => ({ amount: r.amount as number }));

    if (X.length > 25) {
      iso.fit(X);
      const scores = iso.scores();
      for (let i = 0; i < scores.length; i++) {
        const s = scores[i];
        if (s > 0.6) {
          const r = records[i];
          if (flaggedRecordIds.has(r.id)) continue;

          const context: ThreatContext = {
            threatType: "ml_outlier",
            amount: r.amount,
            partner: r.partner,
            txId: r.txId,
            datasetStats: baseStats,
            additionalContext: { anomalyScore: s },
          };
          const t = await createAIContextualizedThreat(
            companyId,
            uploadId,
            r.id,
            "suspicious_pattern",
            0.7,
            context
          );
          threatsCreated.push(t);
          flaggedRecordIds.add(r.id);
        }
      }
    }
  }

  // 5) Similarity search - CRITICAL FIX: Exclude same-batch matches
  const currentUploadIds = new Set(records.map((r) => r.id));

  for (const r of records) {
    if (flaggedRecordIds.has(r.id) || !r.embeddingJson) continue;

    const emb: number[] = (r.embeddingJson as any) || [];
    if (!emb.length) continue;

    const { local, global } = await findSimilarForEmbedding(companyId, emb);

    const localThreshold = records.length > 50 ? 0.08 : 0.05;
    const globalThreshold = records.length > 50 ? 0.06 : 0.04;

    // Filter out matches from the same upload batch
    const validLocalMatches = local.filter(
      (n) => n.id !== r.id && n.distance < localThreshold && !currentUploadIds.has(n.id)
    );

    const validGlobalMatches = global.filter(
      (n) =>
        n.companyId !== companyId && n.distance < globalThreshold && !currentUploadIds.has(n.id)
    );

    // Only create threat if we have valid matches
    if (validLocalMatches.length > 0 || validGlobalMatches.length > 0) {
      const context: ThreatContext = {
        threatType: "similar_to_known_fraud",
        amount: r.amount,
        partner: r.partner,
        txId: r.txId,
        datasetStats: baseStats,
        additionalContext: {
          localMatches: validLocalMatches,
          globalMatches: validGlobalMatches,
        },
      };
      const t = await createAIContextualizedThreat(
        companyId,
        uploadId,
        r.id,
        "similarity_match",
        0.85,
        context
      );
      threatsCreated.push(t);
      flaggedRecordIds.add(r.id);
    }
  }

  // 6) Rules engine
  const rules = await prisma.rule.findMany({ where: { companyId, enabled: true } });
  for (const r of records) {
    if (flaggedRecordIds.has(r.id)) continue;

    const hits = evaluateRules(rules as any, {
      amount: r.amount,
      currency: r.currency,
      partner: r.partner,
      mcc: (r as any).mcc,
    });
    for (const h of hits) {
      const context: ThreatContext = {
        threatType: "rule_trigger",
        amount: r.amount,
        partner: r.partner,
        txId: r.txId,
        datasetStats: baseStats,
        additionalContext: { ruleId: h.ruleId, reason: h.reason },
      };
      const t = await createAIContextualizedThreat(
        companyId,
        uploadId,
        r.id,
        "rule_trigger",
        0.8,
        context
      );
      threatsCreated.push(t);
      flaggedRecordIds.add(r.id);
    }
  }

  // CORRECTED SUMMARY CALCULATION
  const total = records.length;

  // Count unique records that have threats, not total threats
  const uniqueFlaggedRecords = new Set(threatsCreated.map((t) => t.recordId));
  const flagged = uniqueFlaggedRecords.size;

  // Calculate value based on unique flagged records
  const flaggedValue = Array.from(uniqueFlaggedRecords).reduce((sum, recordId) => {
    const record = records.find((r) => r.id === recordId);
    return sum + (record?.amount ?? 0);
  }, 0);

  const summary = {
    totalRecords: total,
    flagged,
    flaggedValue,
    message: `Analyzed ${total} rows → flagged ${flagged} suspicious (${(
      (flagged / total) *
      100
    ).toFixed(1)}%), worth ~$${flaggedValue.toFixed(2)}.`,
  };

  // Create Alerts
  for (const t of threatsCreated) {
    const title = `${t.threatType.replace(/_/g, " ")}`;
    const summaryTxt = t.description.slice(0, 240);
    await createAndDispatchAlert({
      companyId,
      recordId: t.recordId,
      threatId: t.id,
      title,
      summary: summaryTxt,
      severity: "high",
      payload: t,
    });
    await dispatchEnterpriseWebhooks(companyId, { type: "threat.created", data: t });
  }

  return { threatsCreated, summary };
}

async function createAIContextualizedThreat(
  companyId: string,
  uploadId: string,
  recordId: string,
  threatType: string,
  confidenceScore: number,
  context: ThreatContext
) {
  const aiExplanation = await generateThreatExplanation(context);
  return prisma.threat.create({
    data: {
      companyId,
      uploadId,
      recordId,
      threatType,
      description: aiExplanation,
      confidenceScore,
    },
  });
}
