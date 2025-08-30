import { prisma } from "../config/db";
import { Record as PrismaRecord } from "@prisma/client";
import { generateStaticExplanation } from "./leakExplanation";
import { findSimilarForEmbedding } from "./similaritySearch";
import { queueWebhook } from "../queue/webhookQueue";
import { webhookService } from "./webhooks";
import { redisPublisher } from "./redisPublisher";
import { parseEmbedding, isStrictDuplicate } from "../utils/leakDetectionUtils";
import {
  SEVERITY,
  RULE,
  SIMILARITY_DUP_THRESHOLD,
  SIMILARITY_SUSPICIOUS_THRESHOLD,
  SIMILARITY_SEARCH_LIMIT,
  SIMILARITY_BATCH_SIZE,
} from "../utils/constants";
import { ThreatContext, ProgressCallback, CreatedThreat, EmitFunction } from "../types/leakTypes";

export async function detectLeaks(
  records: PrismaRecord[],
  uploadId: string,
  companyId: string,
  onProgress?: ProgressCallback
) {
  const startTime = Date.now();
  const threatsCreated: CreatedThreat[] = [];
  const flaggedByRule: Map<string, Set<string>> = new Map();
  const byRuleClusters: Map<string, { impact: number; clusters: number; details: any[] }> =
    new Map();
  const alreadyFlaggedRecordIds = new Set<string>();
  const emittedClusterKeys = new Set<string>();

  const total = records.length;
  const positive = records.filter((r) => (r.amount ?? 0) > 0).map((r) => r.amount as number);
  const mean = positive.length ? positive.reduce((a, b) => a + b) / positive.length : 0;
  const max = positive.length ? Math.max(...positive) : 0;
  const baseStats = { mean, max, totalRecords: total };

  const TOTAL_STAGES = 4;
  let currentStage = 0;
  let stageProgress = 0;

  async function updateStageProgress(increment: number, stage: number) {
    if (stage !== currentStage) {
      currentStage = stage;
      stageProgress = 0;
    }
    stageProgress += increment;

    if (onProgress) {
      const stageWeight = 45 / TOTAL_STAGES;
      const overallProgress = 50 + currentStage * stageWeight + stageProgress * stageWeight;
      await onProgress(Math.min(95, Math.round(overallProgress)), total, threatsCreated.length);
    }
  }

  async function emit(
    ruleId: string,
    recordsToFlag: PrismaRecord[],
    context: ThreatContext,
    confidence: number,
    severity: keyof typeof SEVERITY,
    clusterKey: string,
    meta?: { fullCount?: number; fullRecordIds?: string[]; fullAmountSum?: number }
  ) {
    if (recordsToFlag.length === 0) return;
    if (emittedClusterKeys.has(`${ruleId}:${clusterKey}`)) return;

    const anchor = recordsToFlag[0];
    const t = await createAIContextualizedThreat(
      companyId,
      uploadId,
      anchor.id,
      ruleId,
      confidence,
      {
        ...context,
        additionalContext: {
          ...context.additionalContext,
          clusterTotalRecords: meta?.fullCount,
          clusterRecordIds: meta?.fullRecordIds,
          clusterTotalAmount: meta?.fullAmountSum,
          flaggedRecordIds: recordsToFlag.map((r) => r.id),
        },
      }
    );

    emittedClusterKeys.add(`${ruleId}:${clusterKey}`);
    threatsCreated.push(t as CreatedThreat);

    if (!flaggedByRule.has(ruleId)) flaggedByRule.set(ruleId, new Set());
    const set = flaggedByRule.get(ruleId)!;
    let impact = 0;
    for (const r of recordsToFlag) {
      set.add(r.id);
      alreadyFlaggedRecordIds.add(r.id);
      impact += r.amount ?? 0;
    }

    const agg = byRuleClusters.get(ruleId) || { impact: 0, clusters: 0, details: [] };
    agg.impact += impact;
    agg.clusters += 1;
    agg.details.push({
      key: clusterKey,
      count: recordsToFlag.length,
      total_amount: impact,
      example_txIds: recordsToFlag
        .map((r) => r.txId)
        .filter(Boolean)
        .slice(0, 5),
      record_ids: recordsToFlag.map((r) => r.id),
      cluster_total_records: meta?.fullCount,
    });
    byRuleClusters.set(ruleId, agg);

    const alert = await prisma.alert.create({
      data: {
        companyId,
        recordId: anchor.id,
        threatId: (t as any).id,
        title: ruleId.replace(/_/g, " "),
        summary: t.description || "",
        severity: SEVERITY[severity],
        payload: { ruleId, clusterKey, context: t },
      },
    });

    await redisPublisher.publishAlert(companyId, {
      type: "alert_created",
      alertId: alert.id,
      threatId: (t as any).id,
      recordId: anchor.id,
      title: alert.title,
      severity: alert.severity,
      summary: alert.summary,
      timestamp: new Date().toISOString(),
      uploadId,
    });

    try {
      const webhooks = await webhookService.getMockWebhooks(companyId);
      for (const webhook of webhooks) {
        if (webhook.events.includes("threat.created")) {
          await queueWebhook(webhook.id, companyId, "threat.created", {
            threat: {
              id: (t as any).id,
              type: t.threatType,
              confidence: t.confidenceScore,
              description: t.description,
              ruleId,
              severity: SEVERITY[severity],
            },
            record: {
              id: anchor.id,
              txId: anchor.txId,
              amount: anchor.amount,
              currency: anchor.currency,
              partner: anchor.partner,
            },
            cluster: {
              key: clusterKey,
              totalRecords: meta?.fullCount,
              totalAmount: meta?.fullAmountSum,
            },
            context: {
              uploadId,
              detectedAt: new Date().toISOString(),
            },
          });
        }
      }
    } catch (error) {
      console.error("Webhook queueing failed:", error);
    }
  }

  const recordsWithEmbeddings = records.filter((r) => r.embeddingJson);

  const existingTxIds = new Set<string>();
  const existingCanonicalKeys = new Set<string>();
  const txIds = records.map((r) => r.txId).filter(Boolean) as string[];
  const canonicalKeys = records.map((r) => r.canonicalKey).filter(Boolean) as string[];

  if (txIds.length > 0) {
    const existingTxRecords = await prisma.record.findMany({
      where: {
        companyId,
        txId: { in: txIds },
        uploadId: { not: uploadId },
      },
      select: { txId: true },
      take: 1000,
    });
    existingTxRecords.forEach((r) => existingTxIds.add(r.txId as string));
  }

  if (canonicalKeys.length > 0) {
    const existingCanonicalRecords = await prisma.record.findMany({
      where: {
        companyId,
        canonicalKey: { in: canonicalKeys },
        uploadId: { not: uploadId },
      },
      select: { canonicalKey: true },
      take: 1000,
    });
    existingCanonicalRecords.forEach((r) => existingCanonicalKeys.add(r.canonicalKey as string));
  }

  const byTxId = new Map<string, PrismaRecord[]>();
  const byCanonical = new Map<string, PrismaRecord[]>();
  for (const r of records) {
    if (r.txId) {
      const arr = byTxId.get(r.txId) || [];
      arr.push(r);
      byTxId.set(r.txId, arr);
    }
    if (r.canonicalKey) {
      const arr = byCanonical.get(r.canonicalKey) || [];
      arr.push(r);
      byCanonical.set(r.canonicalKey, arr);
    }
    await updateStageProgress(100 / records.length, 0);
  }

  // ---------------- Stage 1: Historical (DB) strict duplicates ----------------

  const historicalDuplicates: PrismaRecord[] = [];
  for (const rec of records) {
    if (alreadyFlaggedRecordIds.has(rec.id)) continue;
    if (rec.txId && existingTxIds.has(rec.txId)) {
      historicalDuplicates.push(rec);
    } else if (rec.canonicalKey && existingCanonicalKeys.has(rec.canonicalKey)) {
      historicalDuplicates.push(rec);
    }
    await updateStageProgress(100 / records.length, 1);
  }

  for (const rec of historicalDuplicates) {
    if (rec.txId && !alreadyFlaggedRecordIds.has(rec.id)) {
      const prev = await prisma.record.findMany({
        where: {
          companyId,
          txId: rec.txId,
          uploadId: { not: uploadId },
        },
        select: {
          id: true,
          txId: true,
          partner: true,
          normalizedPartner: true,
          amount: true,
          currency: true,
          normalizedCurrency: true,
          date: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const matches = prev.filter((p: any) => isStrictDuplicate(rec, p));
      if (matches.length > 0) {
        await emit(
          RULE.DUP_IN_DB__TXID,
          [rec],
          {
            threatType: RULE.DUP_IN_DB__TXID,
            amount: rec.amount ?? null,
            partner: rec.partner ?? null,
            txId: rec.txId ?? null,
            datasetStats: baseStats,
            additionalContext: {
              scope: "db_prior_same_txid",
              priorCount: matches.length,
              priorIds: matches.slice(0, 5).map((m) => m.id),
            },
          },
          0.98,
          "HIGH",
          `dbtx:${rec.txId}:${rec.id}`
        );
      }
    }

    if (rec.canonicalKey && !alreadyFlaggedRecordIds.has(rec.id)) {
      const prev = await prisma.record.findMany({
        where: {
          companyId,
          canonicalKey: rec.canonicalKey,
          uploadId: { not: uploadId },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (prev.length > 0) {
        await emit(
          RULE.DUP_IN_DB__CANONICAL,
          [rec],
          {
            threatType: RULE.DUP_IN_DB__CANONICAL,
            amount: rec.amount ?? null,
            partner: rec.partner ?? null,
            txId: rec.txId ?? null,
            datasetStats: baseStats,
            additionalContext: {
              scope: "db_prior_same_canonical",
              canonicalKey: rec.canonicalKey,
              priorCount: prev.length,
              priorIds: prev.slice(0, 5).map((m) => m.id),
            },
          },
          0.95,
          "HIGH",
          `dbcanon:${rec.canonicalKey}:${rec.id}`
        );
      }
    }
    await updateStageProgress(100 / historicalDuplicates.length, 1);
  }

  // ---------------- Stage 2: Batch (current upload) strict duplicates ----------------

  const totalBatches = byTxId.size + byCanonical.size;
  let batchesProcessed = 0;

  for (const [txId, list] of byTxId.entries()) {
    if (list.length < 2) continue;
    const sorted = list.slice().sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
    const [head, ...rest] = sorted;
    const duplicates = rest.filter(
      (r) => isStrictDuplicate(r, head) && !alreadyFlaggedRecordIds.has(r.id)
    );

    if (duplicates.length === 0) continue;
    await emit(
      RULE.DUP_IN_BATCH__TXID,
      duplicates,
      {
        threatType: RULE.DUP_IN_BATCH__TXID,
        amount: head.amount ?? null,
        partner: head.partner ?? null,
        txId,
        datasetStats: baseStats,
        additionalContext: {
          scope: "current_upload",
          countInUpload: list.length,
          firstTs: head.date || head.createdAt,
          lastTs: sorted[sorted.length - 1].date || sorted[sorted.length - 1].createdAt,
          currency: head.normalizedCurrency || head.currency || "USD",
        },
      },
      0.97,
      "HIGH",
      `txid_batch:${txId}`,
      {
        fullCount: sorted.length,
        fullRecordIds: sorted.map((x) => x.id),
        fullAmountSum: sorted.reduce((s, r) => s + (r.amount ?? 0), 0),
      }
    );

    batchesProcessed++;
    await updateStageProgress(100 / totalBatches, 2);
  }

  for (const [canon, list] of byCanonical.entries()) {
    if (list.length < 2) continue;
    const sorted = list.slice().sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
    const duplicates = sorted.slice(1).filter((r) => !alreadyFlaggedRecordIds.has(r.id));
    if (duplicates.length === 0) continue;

    const head = sorted[0];
    await emit(
      RULE.DUP_IN_BATCH__CANONICAL,
      duplicates,
      {
        threatType: RULE.DUP_IN_BATCH__CANONICAL,
        amount: head.amount ?? null,
        partner: head.partner ?? null,
        txId: head.txId ?? null,
        datasetStats: baseStats,
        additionalContext: {
          scope: "current_upload",
          canonicalKey: canon,
          userKey: head.userKey,
          partner: head.normalizedPartner || head.partner,
          amount: head.amount,
          currency: head.normalizedCurrency || head.currency,
          timeBucketSeconds: 30,
        },
      },
      0.93,
      "HIGH",
      `canon_batch:${canon}`,
      {
        fullCount: sorted.length,
        fullRecordIds: sorted.map((x) => x.id),
        fullAmountSum: sorted.reduce((s, r) => s + (r.amount ?? 0), 0),
      }
    );

    batchesProcessed++;
    await updateStageProgress(100 / totalBatches, 2);
  }

  // ------------------ Stage 3: Vector similarity with batching ----------------

  const similarityFlaggedRecordIds = new Set<string>();
  if (recordsWithEmbeddings.length > 0) {
    await processSimilarityInBatches(
      records.filter((r) => !alreadyFlaggedRecordIds.has(r.id) && r.embeddingJson),
      companyId,
      uploadId,
      alreadyFlaggedRecordIds,
      similarityFlaggedRecordIds,
      emit,
      async (processed, totalSimilarity) => {
        await updateStageProgress((100 * processed) / totalSimilarity, 3);
      }
    );
  } else {
    await updateStageProgress(100, 3);
  }

  const uniqueFlaggedRecords = new Set<string>(
    Array.from(flaggedByRule.values()).flatMap((s) => Array.from(s))
  );
  const flagged = uniqueFlaggedRecords.size;
  const flaggedValue = Array.from(uniqueFlaggedRecords).reduce((sum, recordId) => {
    const record = records.find((r) => r.id === recordId);
    return sum + (record?.amount ?? 0);
  }, 0);

  const byRule = Array.from(byRuleClusters.entries()).map(([rule_id, agg]) => {
    const detailsSorted = agg.details.sort((a, b) => b.total_amount - a.total_amount).slice(0, 5);
    return {
      rule_id,
      clusters: agg.clusters,
      records_impacted: flaggedByRule.get(rule_id)?.size || 0,
      impacted_value: agg.impact,
      top_clusters: detailsSorted,
    };
  });

  const processingTime = Date.now() - startTime;
  try {
    const webhooks = await webhookService.getMockWebhooks(companyId);
    const threatsByType: Record<string, number> = {};
    threatsCreated.forEach((threat) => {
      threatsByType[threat.threatType] = (threatsByType[threat.threatType] || 0) + 1;
    });

    const threatSummary = Object.entries(threatsByType)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ");

    for (const webhook of webhooks) {
      if (webhook.events.includes("upload.complete")) {
        await queueWebhook(webhook.id, companyId, "upload.complete", {
          upload: {
            id: uploadId,
            processingTime,
            status: "complete",
            recordsAnalyzed: total,
            threatsDetected: flagged,
          },
          summary: {
            totalRecords: total,
            flagged,
            flaggedValue,
            byRule,
          },
          threats: threatsCreated.slice(0, 10),
          threatSummary,
        });
      }
    }
  } catch (error) {
    console.error("Upload complete webhook failed:", error);
  }

  return { threatsCreated, summary: { totalRecords: total, flagged, flaggedValue, byRule } };
}

async function processSimilarityInBatches(
  records: PrismaRecord[],
  companyId: string,
  uploadId: string,
  alreadyFlaggedRecordIds: Set<string>,
  similarityFlaggedRecordIds: Set<string>,
  emit: EmitFunction,
  onProgress?: (processed: number, total: number) => Promise<void>
) {
  const batches: PrismaRecord[][] = [];
  for (let i = 0; i < records.length; i += SIMILARITY_BATCH_SIZE) {
    batches.push(records.slice(i, i + SIMILARITY_BATCH_SIZE));
  }

  let similarityProcessed = 0;
  const totalSimilarity = records.length;

  for (const batch of batches) {
    const batchPromises = batch.map(async (rec) => {
      if (alreadyFlaggedRecordIds.has(rec.id) || similarityFlaggedRecordIds.has(rec.id)) {
        similarityProcessed++;
        if (onProgress) await onProgress(similarityProcessed, totalSimilarity);
        return;
      }

      const embedding = parseEmbedding(rec.embeddingJson);
      if (!embedding) {
        similarityProcessed++;
        if (onProgress) await onProgress(similarityProcessed, totalSimilarity);
        return;
      }

      try {
        const { localPrev, global, timedOut } = await findSimilarForEmbedding(
          companyId,
          uploadId,
          embedding,
          SIMILARITY_SEARCH_LIMIT,
          records.length,
          { minScore: 0.5, useVectorIndex: true }
        );

        if (timedOut) {
          similarityProcessed++;
          if (onProgress) await onProgress(similarityProcessed, totalSimilarity);
          return;
        }

        const bestLocal = localPrev
          .filter((m) => m.similarity >= SIMILARITY_DUP_THRESHOLD)
          .sort((a, b) => b.similarity - a.similarity)[0];

        const bestGlobal = global
          .filter((m) => m.similarity >= SIMILARITY_SUSPICIOUS_THRESHOLD)
          .sort((a, b) => b.similarity - a.similarity)[0];

        if (bestLocal) {
          similarityFlaggedRecordIds.add(rec.id);
          await emit(
            RULE.SIMILARITY_MATCH,
            [rec],
            {
              threatType: RULE.SIMILARITY_MATCH,
              amount: rec.amount ?? null,
              partner: rec.partner ?? null,
              txId: rec.txId ?? null,
              datasetStats: { mean: 0, max: 0, totalRecords: 0 },
              additionalContext: {
                scope: "vector_local_prev",
                neighborId: bestLocal.id,
                neighborPartner: bestLocal.partner,
                neighborAmount: bestLocal.amount,
                similarity: bestLocal.similarity,
              },
            },
            0.96,
            "HIGH",
            `vecdup_prev:${rec.id}->${bestLocal.id}`
          );
        } else if (bestGlobal) {
          similarityFlaggedRecordIds.add(rec.id);
          await emit(
            RULE.SIMILARITY_MATCH,
            [rec],
            {
              threatType: RULE.SIMILARITY_MATCH,
              amount: rec.amount ?? null,
              partner: rec.partner ?? null,
              txId: rec.txId ?? null,
              datasetStats: { mean: 0, max: 0, totalRecords: 0 },
              additionalContext: {
                scope: "vector_global",
                neighborId: bestGlobal.id,
                neighborCompany: bestGlobal.companyId,
                neighborPartner: bestGlobal.partner,
                neighborAmount: bestGlobal.amount,
                similarity: bestGlobal.similarity,
              },
            },
            0.87,
            "MEDIUM",
            `vecsim:${rec.id}->${bestGlobal.id}`
          );
        }
      } catch (error) {
        console.error(`Similarity search failed for record ${rec.id}:`, error);
      } finally {
        similarityProcessed++;
        if (onProgress) await onProgress(similarityProcessed, totalSimilarity);
      }
    });

    await Promise.allSettled(batchPromises);
  }
}

async function createAIContextualizedThreat(
  companyId: string,
  uploadId: string,
  recordId: string,
  threatType: string,
  confidenceScore: number,
  context: ThreatContext
) {
  const staticExplanation = generateStaticExplanation(context);

  const threat = await prisma.threat.create({
    data: {
      companyId,
      uploadId,
      recordId,
      threatType,
      description: staticExplanation,
      confidenceScore,
      metadata: {
        aiContext: context,
      },
    },
  });

  return threat;
}
