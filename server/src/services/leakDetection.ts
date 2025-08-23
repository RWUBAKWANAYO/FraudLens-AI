// server/src/services/detectLeaks.ts
import { prisma } from "../config/db";
import type { Record as PrismaRecord, Prisma } from "@prisma/client";
import { generateThreatExplanation, type ThreatContext } from "./aiExplanation";
import { findSimilarForEmbedding } from "./similaritySearch";
import { createAndDispatchAlert } from "./alerts";
import { dispatchEnterpriseWebhooks } from "./webhooks";
import { publish } from "../queue/bus";

// --- Severities & Rule IDs ---
const SEVERITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;
const RULE = {
  DUP_IN_BATCH__TXID: "DUP_IN_BATCH__TXID",
  DUP_IN_DB__TXID: "DUP_IN_DB__TXID",
  DUP_IN_BATCH__CANONICAL: "DUP_IN_BATCH__CANONICAL",
  DUP_IN_DB__CANONICAL: "DUP_IN_DB__CANONICAL",
  RULE_TRIGGER: "RULE_TRIGGER",
  SIMILARITY_MATCH: "SIMILARITY_MATCH",
} as const;

// --- Tunable thresholds (env) ---
const TS_TOLERANCE_SEC = Number(process.env.DUP_TS_TOLERANCE_SEC ?? 30);
const AMOUNT_TOLERANCE_CENTS = Number(process.env.DUP_AMOUNT_TOLERANCE_CENTS ?? 0);
const SIMILARITY_DUP_THRESHOLD = Number(process.env.SIM_DUP_THRESHOLD ?? 0.85);
const SIMILARITY_SUSPICIOUS_THRESHOLD = Number(process.env.SIM_SUS_THRESHOLD ?? 0.75);

// --- CreatedThreat shape ---
type CreatedThreat = {
  id: string;
  recordId: string;
  threatType: string;
  description: string;
  confidenceScore: number;
};

// --- Local helpers ---
function parseEmbedding(json: Prisma.JsonValue | null): number[] | null {
  if (json == null) return null;
  if (Array.isArray(json)) {
    const arr = (json as unknown[]).map(Number);
    return arr.every(Number.isFinite) ? arr : null;
  }
  if (typeof json === "string") {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return null;
      const arr = parsed.map((x: unknown) => Number(x));
      return arr.every(Number.isFinite) ? arr : null;
    } catch {
      return null;
    }
  }
  if (typeof json === "object") {
    const arr = Object.values(json as Record<string, unknown>).map((v) => Number(v));
    return arr.every(Number.isFinite) ? arr : null;
  }
  return null;
}

function cents(amt?: number | null): number | null {
  if (amt == null) return null;
  return Math.round(amt * 100);
}
function amountEq(
  a?: number | null,
  b?: number | null,
  tolCents = AMOUNT_TOLERANCE_CENTS
): boolean {
  const ca = cents(a);
  const cb = cents(b);
  if (ca == null || cb == null) return ca === cb;
  return Math.abs(ca - cb) <= tolCents;
}
function normCur(cur?: string | null): string {
  return (cur || "USD").toUpperCase().trim();
}
function strEq(a?: string | null, b?: string | null): boolean {
  return (a || "") === (b || "");
}
function datesClose(a?: Date | null, b?: Date | null, tolSec = TS_TOLERANCE_SEC): boolean {
  if (!a || !b) return true;
  const diff = Math.abs(a.getTime() - b.getTime());
  if (diff <= tolSec * 1000) return true;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/** All attributes must match (with tolerances) for a strict duplicate */
function isStrictDuplicate(a: PrismaRecord, b: PrismaRecord): boolean {
  const aCur = a.normalizedCurrency || a.currency;
  const bCur = b.normalizedCurrency || b.currency;
  return (
    strEq(a.normalizedPartner || a.partner, b.normalizedPartner || b.partner) &&
    amountEq(a.amount, b.amount) &&
    strEq(normCur(aCur), normCur(bCur)) &&
    datesClose(a.date, b.date)
  );
}

export async function detectLeaks(records: PrismaRecord[], uploadId: string, companyId: string) {
  console.log(
    `[DETECT_LEAKS] Starting for upload ${uploadId}, company ${companyId}, ${records.length} records`
  );

  const threatsCreated: CreatedThreat[] = [];
  const flaggedByRule: Map<string, Set<string>> = new Map();
  const byRuleClusters: Map<string, { impact: number; clusters: number; details: any[] }> =
    new Map();

  // Track duplicates to avoid double counting across rules
  const alreadyFlaggedRecordIds = new Set<string>();
  const emittedClusterKeys = new Set<string>();

  const total = records.length;
  const positive = records.filter((r) => (r.amount ?? 0) > 0).map((r) => r.amount as number);
  const mean = positive.length ? positive.reduce((a, b) => a + b) / positive.length : 0;
  const max = positive.length ? Math.max(...positive) : 0;
  const baseStats = { mean, max, totalRecords: total };

  // Index current upload for batch-level passes
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
  }

  /**
   * Emit helper that bookkeeps ONLY the provided recordsToFlag (duplicates),
   * while the context can still describe the whole cluster.
   */
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

    console.log(
      `[EMIT] Creating threat for rule ${ruleId}, cluster ${clusterKey}, ${recordsToFlag.length} records`
    );

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

    const agg = byRuleClusters.get(ruleId) || { impact: 0, clusters: 0, details: [] as any[] };
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

    const summaryTxt = t.description || "";
    await createAndDispatchAlert({
      companyId,
      recordId: anchor.id,
      threatId: (t as any).id,
      title: ruleId.replace(/_/g, " "),
      summary: summaryTxt,
      severity: SEVERITY[severity],
      payload: { ruleId, clusterKey, context: t },
    });
    await dispatchEnterpriseWebhooks(companyId, { type: "threat.created", data: t });
  }

  // ------------------ DEBUG: Check embeddings first ------------------
  const recordsWithEmbeddings = records.filter((r) => r.embeddingJson);
  console.log(
    `[SIMILARITY] Total records: ${records.length}, with embeddings: ${recordsWithEmbeddings.length}`
  );

  if (recordsWithEmbeddings.length === 0) {
    console.log(
      "[SIMILARITY] WARNING: No records have embeddings! Similarity search will not work."
    );
  }

  // Check if we have previous records to compare against
  const previousRecordCount = await prisma.record.count({
    where: {
      companyId,
      uploadId: { not: uploadId },
      embeddingJson: { not: null },
    },
  });
  console.log(`[SIMILARITY] Previous records with embeddings: ${previousRecordCount}`);

  // ---------------- Stage A: Historical (DB) strict duplicates ----------------
  console.log("[DUPLICATES] Starting historical duplicate detection...");
  // A1. Same TXID + same attributes (strict) in PRIOR uploads of the SAME company
  for (const rec of records) {
    if (!rec.txId || alreadyFlaggedRecordIds.has(rec.id)) continue;

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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const matches = prev.filter((p) => isStrictDuplicate(rec, p));
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

  // A2. Same Canonical Key (strict tuple) in PRIOR uploads of the SAME company
  for (const rec of records) {
    if (!rec.canonicalKey || alreadyFlaggedRecordIds.has(rec.id)) continue;

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

  // ---------------- Stage B: Batch (current upload) strict duplicates ----------------
  console.log("[BATCH] Starting batch duplicate detection...");
  // B1. TXID clusters
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
  }

  // B2. Canonical clusters
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
  }

  // ------------------ Stage C: Vector similarity FIRST ----------------
  console.log("[SIMILARITY] Starting similarity detection...");
  let similarityChecks = 0;
  let similarityMatches = 0;

  // Track which records have already been flagged by similarity to prevent double-counting
  const similarityFlaggedRecordIds = new Set<string>();

  for (const rec of records) {
    if (alreadyFlaggedRecordIds.has(rec.id) || similarityFlaggedRecordIds.has(rec.id)) continue;

    const embedding = parseEmbedding(rec.embeddingJson);
    if (!embedding) {
      console.log(`[SIMILARITY] Record ${rec.id} has no valid embedding`);
      continue;
    }

    similarityChecks++;
    console.log(`[SIMILARITY] Checking record ${rec.id} with embedding length ${embedding.length}`);

    const { localPrev, global } = await findSimilarForEmbedding(
      companyId,
      uploadId,
      embedding,
      10,
      { minScore: 0.5, useVectorIndex: true }
    );

    console.log(
      `[SIMILARITY] Record ${rec.id} - local matches: ${localPrev.length}, global: ${global.length}`
    );

    // Local near-duplicate
    const bestLocal = localPrev
      .filter((m) => m.similarity >= SIMILARITY_DUP_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)[0];

    // Global suspicious similarity
    const bestGlobal = global
      .filter((m) => m.similarity >= SIMILARITY_SUSPICIOUS_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)[0];

    // Prioritize local duplicates over global similarities
    if (bestLocal) {
      similarityMatches++;
      similarityFlaggedRecordIds.add(rec.id); // Mark as flagged by similarity
      console.log(
        `[SIMILARITY] FOUND LOCAL MATCH: ${rec.id} -> ${
          bestLocal.id
        } (similarity: ${bestLocal.similarity.toFixed(4)})`
      );
      await emit(
        RULE.SIMILARITY_MATCH,
        [rec],
        {
          threatType: RULE.SIMILARITY_MATCH,
          amount: rec.amount ?? null,
          partner: rec.partner ?? null,
          txId: rec.txId ?? null,
          datasetStats: baseStats,
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
      similarityMatches++;
      similarityFlaggedRecordIds.add(rec.id); // Mark as flagged by similarity
      console.log(
        `[SIMILARITY] FOUND GLOBAL MATCH: ${rec.id} -> ${
          bestGlobal.id
        } (similarity: ${bestGlobal.similarity.toFixed(4)})`
      );
      await emit(
        RULE.SIMILARITY_MATCH,
        [rec],
        {
          threatType: RULE.SIMILARITY_MATCH,
          amount: rec.amount ?? null,
          partner: rec.partner ?? null,
          txId: rec.txId ?? null,
          datasetStats: baseStats,
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
  }

  console.log(
    `[SIMILARITY] Completed: ${similarityChecks} checks, ${similarityMatches} matches found`
  );

  // ---------------- Summary ----------------
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

  console.log(`[SUMMARY] Total records: ${total}, Flagged: ${flagged}, By rule:`, byRule);

  const summary = {
    totalRecords: total,
    flagged,
    flaggedValue,
    message: `Analyzed ${total} rows → flagged ${flagged} unique records (${(
      (flagged / Math.max(total, 1)) *
      100
    ).toFixed(1)}%), worth ~${flaggedValue.toFixed(2)}.`,
    byRule,
  };

  return { threatsCreated, summary };
}

const AI_EXPLAIN_ASYNC = process.env.AI_EXPLAIN_ASYNC !== "false";

async function createAIContextualizedThreat(
  companyId: string,
  uploadId: string,
  recordId: string,
  threatType: string,
  confidenceScore: number,
  context: ThreatContext
) {
  if (AI_EXPLAIN_ASYNC) {
    const short = `[${threatType}] ${JSON.stringify(context.additionalContext).slice(0, 180)}...`;
    const t = await prisma.threat.create({
      data: { companyId, uploadId, recordId, threatType, description: short, confidenceScore },
    });
    await publish("threat.explain", { threatId: t.id, context });
    return t;
  } else {
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
}
