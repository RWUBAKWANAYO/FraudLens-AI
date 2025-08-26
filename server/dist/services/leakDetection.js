"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLeaks = detectLeaks;
// server/src/services/leakDetection.ts
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const leakExplanation_1 = require("./leakExplanation");
const similaritySearch_1 = require("./similaritySearch");
const webhookQueue_1 = require("../queue/webhookQueue");
const webhooks_1 = require("./webhooks");
const redisPublisher_1 = require("./redisPublisher");
// --- Severities & Rule IDs ---
const SEVERITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" };
const RULE = {
    DUP_IN_BATCH__TXID: "DUP_IN_BATCH__TXID",
    DUP_IN_DB__TXID: "DUP_IN_DB__TXID",
    DUP_IN_BATCH__CANONICAL: "DUP_IN_BATCH__CANONICAL",
    DUP_IN_DB__CANONICAL: "DUP_IN_DB__CANONICAL",
    RULE_TRIGGER: "RULE_TRIGGER",
    SIMILARITY_MATCH: "SIMILARITY_MATCH",
};
// --- Tunable thresholds (env) ---
const TS_TOLERANCE_SEC = Number((_a = process.env.DUP_TS_TOLERANCE_SEC) !== null && _a !== void 0 ? _a : 30);
const AMOUNT_TOLERANCE_CENTS = Number((_b = process.env.DUP_AMOUNT_TOLERANCE_CENTS) !== null && _b !== void 0 ? _b : 0);
const SIMILARITY_DUP_THRESHOLD = Number((_c = process.env.SIM_DUP_THRESHOLD) !== null && _c !== void 0 ? _c : 0.85);
const SIMILARITY_SUSPICIOUS_THRESHOLD = Number((_d = process.env.SIM_SUS_THRESHOLD) !== null && _d !== void 0 ? _d : 0.75);
// --- Performance settings ---
const SIMILARITY_SEARCH_LIMIT = Number(process.env.SIMILARITY_SEARCH_LIMIT || 50);
const SIMILARITY_BATCH_SIZE = Number(process.env.SIMILARITY_BATCH_SIZE || 10);
// --- Local helpers ---
function parseEmbedding(json) {
    if (json == null)
        return null;
    if (Array.isArray(json)) {
        const arr = json.map(Number);
        return arr.every(Number.isFinite) ? arr : null;
    }
    if (typeof json === "string") {
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed))
                return null;
            const arr = parsed.map((x) => Number(x));
            return arr.every(Number.isFinite) ? arr : null;
        }
        catch (_a) {
            return null;
        }
    }
    if (typeof json === "object") {
        const arr = Object.values(json).map((v) => Number(v));
        return arr.every(Number.isFinite) ? arr : null;
    }
    return null;
}
function cents(amt) {
    if (amt == null)
        return null;
    return Math.round(amt * 100);
}
function amountEq(a, b, tolCents = AMOUNT_TOLERANCE_CENTS) {
    const ca = cents(a);
    const cb = cents(b);
    if (ca == null || cb == null)
        return ca === cb;
    return Math.abs(ca - cb) <= tolCents;
}
function normCur(cur) {
    return (cur || "USD").toUpperCase().trim();
}
function strEq(a, b) {
    return (a || "") === (b || "");
}
function datesClose(a, b, tolSec = TS_TOLERANCE_SEC) {
    if (!a || !b)
        return true;
    const diff = Math.abs(a.getTime() - b.getTime());
    if (diff <= tolSec * 1000)
        return true;
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
/** All attributes must match (with tolerances) for a strict duplicate */
function isStrictDuplicate(a, b) {
    const aCur = a.normalizedCurrency || a.currency;
    const bCur = b.normalizedCurrency || b.currency;
    return (strEq(a.normalizedPartner || a.partner, b.normalizedPartner || b.partner) &&
        amountEq(a.amount, b.amount) &&
        strEq(normCur(aCur), normCur(bCur)) &&
        datesClose(a.date, b.date));
}
function detectLeaks(records, uploadId, companyId, onProgress) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        console.time("Total leak detection time");
        console.log(`[DETECT_LEAKS] Starting for upload ${uploadId}, company ${companyId}, ${records.length} records`);
        console.log("======== LEAK DETECTION STARTED =======");
        console.log("Records:", records.length);
        console.log("Progress callback:", !!onProgress);
        const threatsCreated = [];
        const flaggedByRule = new Map();
        const byRuleClusters = new Map();
        // Track duplicates to avoid double counting across rules
        const alreadyFlaggedRecordIds = new Set();
        const emittedClusterKeys = new Set();
        const total = records.length;
        const positive = records.filter((r) => { var _a; return ((_a = r.amount) !== null && _a !== void 0 ? _a : 0) > 0; }).map((r) => r.amount);
        const mean = positive.length ? positive.reduce((a, b) => a + b) / positive.length : 0;
        const max = positive.length ? Math.max(...positive) : 0;
        const baseStats = { mean, max, totalRecords: total };
        // SIMPLIFIED PROGRESS TRACKING - 4 main stages
        const TOTAL_STAGES = 4;
        let currentStage = 0;
        let stageProgress = 0;
        function updateStageProgress(increment, stage) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log(`================ Progress: Stage ${stage}, Progress ${stageProgress}, currentStage ${currentStage}========================`);
                if (stage !== currentStage) {
                    currentStage = stage;
                    stageProgress = 0;
                }
                stageProgress += increment;
                if (onProgress) {
                    // Calculate overall progress: 50% base + 45% for detection stages
                    const stageWeight = 45 / TOTAL_STAGES; // 45% divided among stages
                    const overallProgress = 50 + currentStage * stageWeight + stageProgress * stageWeight;
                    yield onProgress(Math.min(95, Math.round(overallProgress)), total, threatsCreated.length);
                }
            });
        }
        function emit(ruleId, recordsToFlag, context, confidence, severity, clusterKey, meta) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (recordsToFlag.length === 0)
                    return;
                if (emittedClusterKeys.has(`${ruleId}:${clusterKey}`))
                    return;
                console.log(`[EMIT] Creating threat for rule ${ruleId}, cluster ${clusterKey}, ${recordsToFlag.length} records`);
                const anchor = recordsToFlag[0];
                const t = yield createAIContextualizedThreat(companyId, uploadId, anchor.id, ruleId, confidence, Object.assign(Object.assign({}, context), { additionalContext: Object.assign(Object.assign({}, context.additionalContext), { clusterTotalRecords: meta === null || meta === void 0 ? void 0 : meta.fullCount, clusterRecordIds: meta === null || meta === void 0 ? void 0 : meta.fullRecordIds, clusterTotalAmount: meta === null || meta === void 0 ? void 0 : meta.fullAmountSum, flaggedRecordIds: recordsToFlag.map((r) => r.id) }) }));
                emittedClusterKeys.add(`${ruleId}:${clusterKey}`);
                threatsCreated.push(t);
                if (!flaggedByRule.has(ruleId))
                    flaggedByRule.set(ruleId, new Set());
                const set = flaggedByRule.get(ruleId);
                let impact = 0;
                for (const r of recordsToFlag) {
                    set.add(r.id);
                    alreadyFlaggedRecordIds.add(r.id);
                    impact += (_a = r.amount) !== null && _a !== void 0 ? _a : 0;
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
                    cluster_total_records: meta === null || meta === void 0 ? void 0 : meta.fullCount,
                });
                byRuleClusters.set(ruleId, agg);
                const summaryTxt = t.description || "";
                // Create alert in database
                const alert = yield db_1.prisma.alert.create({
                    data: {
                        companyId,
                        recordId: anchor.id,
                        threatId: t.id,
                        title: ruleId.replace(/_/g, " "),
                        summary: summaryTxt,
                        severity: SEVERITY[severity],
                        payload: { ruleId, clusterKey, context: t },
                    },
                });
                console.log("ALERT CREATED:", alert.id, "for company:", companyId);
                // Use Redis for real-time updates instead of direct socket
                yield redisPublisher_1.redisPublisher.publishAlert(companyId, {
                    type: "alert_created",
                    alertId: alert.id,
                    threatId: t.id,
                    recordId: anchor.id,
                    title: alert.title,
                    severity: alert.severity,
                    summary: alert.summary,
                    timestamp: new Date().toISOString(),
                    uploadId,
                });
                // Webhook dispatch (with better error handling)
                console.log("=== WEBHOOK PROCESSING STARTED ===");
                console.log(`Company: ${companyId}, Threat: ${t.id}`);
                try {
                    const webhooks = yield webhooks_1.webhookService.getMockWebhooks(companyId);
                    console.log(`Found ${webhooks.length} webhooks for company ${companyId}`);
                    for (const webhook of webhooks) {
                        console.log(`Processing webhook: ${webhook.id}, URL: ${webhook.url}`);
                        console.log(`Webhook events: ${JSON.stringify(webhook.events)}`);
                        console.log(`Should deliver threat.created: ${webhook.events.includes("threat.created")}`);
                        if (webhook.events.includes("threat.created")) {
                            console.log("Queueing webhook for delivery...");
                            const queued = yield (0, webhookQueue_1.queueWebhook)(webhook.id, companyId, "threat.created", {
                                threat: {
                                    id: t.id,
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
                                    totalRecords: meta === null || meta === void 0 ? void 0 : meta.fullCount,
                                    totalAmount: meta === null || meta === void 0 ? void 0 : meta.fullAmountSum,
                                },
                                context: {
                                    uploadId,
                                    detectedAt: new Date().toISOString(),
                                },
                            });
                            console.log(`Webhook queued result: ${queued}`);
                        }
                    }
                }
                catch (webhookError) {
                    console.error("Webhook queueing failed:", webhookError);
                }
            });
        }
        // ------------------ DEBUG: Check embeddings first ------------------
        const recordsWithEmbeddings = records.filter((r) => r.embeddingJson);
        console.log(`[SIMILARITY] Total records: ${records.length}, with embeddings: ${recordsWithEmbeddings.length}`);
        if (recordsWithEmbeddings.length === 0) {
            console.log("[SIMILARITY] WARNING: No records have embeddings! Similarity search will not work.");
        }
        // Check if we have previous records to compare against
        const previousRecordCount = yield db_1.prisma.record.count({
            where: {
                companyId,
                uploadId: { not: uploadId },
                embeddingJson: { not: client_1.Prisma.JsonNull },
            },
        });
        console.log(`[SIMILARITY] Previous records with embeddings: ${previousRecordCount}`);
        // --- Bulk fetch existing TXIDs and Canonical Keys for duplicate detection ---
        console.time("Bulk duplicate check preparation");
        const existingTxIds = new Set();
        const existingCanonicalKeys = new Set();
        // Fetch existing records in bulk
        const txIds = records.map((r) => r.txId).filter(Boolean);
        const canonicalKeys = records.map((r) => r.canonicalKey).filter(Boolean);
        if (txIds.length > 0) {
            const existingTxRecords = yield db_1.prisma.record.findMany({
                where: {
                    companyId,
                    txId: { in: txIds },
                    uploadId: { not: uploadId },
                },
                select: { txId: true, id: true },
                take: 1000,
            });
            existingTxRecords.forEach((r) => existingTxIds.add(r.txId));
        }
        if (canonicalKeys.length > 0) {
            const existingCanonicalRecords = yield db_1.prisma.record.findMany({
                where: {
                    companyId,
                    canonicalKey: { in: canonicalKeys },
                    uploadId: { not: uploadId },
                },
                select: { canonicalKey: true, id: true },
                take: 1000,
            });
            existingCanonicalRecords.forEach((r) => existingCanonicalKeys.add(r.canonicalKey));
        }
        console.timeEnd("Bulk duplicate check preparation");
        // Stage 1: Indexing and setup
        console.log("[PROGRESS] Stage 1: Indexing records");
        const byTxId = new Map();
        const byCanonical = new Map();
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
            yield updateStageProgress(100 / records.length, 0);
        }
        // ---------------- Stage 2: Historical (DB) strict duplicates ----------------
        console.time("Historical duplicate detection");
        console.log("[PROGRESS] Stage 2: Historical duplicate detection");
        // Pre-identify potential duplicates using bulk data
        const historicalDuplicates = [];
        for (const rec of records) {
            if (alreadyFlaggedRecordIds.has(rec.id))
                continue;
            // Quick pre-check before expensive database query
            if (rec.txId && existingTxIds.has(rec.txId)) {
                historicalDuplicates.push(rec);
            }
            else if (rec.canonicalKey && existingCanonicalKeys.has(rec.canonicalKey)) {
                historicalDuplicates.push(rec);
            }
            yield updateStageProgress(100 / records.length, 1);
        }
        // Process historical duplicates
        for (const rec of historicalDuplicates) {
            if (rec.txId && !alreadyFlaggedRecordIds.has(rec.id)) {
                const prev = yield db_1.prisma.record.findMany({
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
                    yield emit(RULE.DUP_IN_DB__TXID, [rec], {
                        threatType: RULE.DUP_IN_DB__TXID,
                        amount: (_a = rec.amount) !== null && _a !== void 0 ? _a : null,
                        partner: (_b = rec.partner) !== null && _b !== void 0 ? _b : null,
                        txId: (_c = rec.txId) !== null && _c !== void 0 ? _c : null,
                        datasetStats: baseStats,
                        additionalContext: {
                            scope: "db_prior_same_txid",
                            priorCount: matches.length,
                            priorIds: matches.slice(0, 5).map((m) => m.id),
                        },
                    }, 0.98, "HIGH", `dbtx:${rec.txId}:${rec.id}`);
                }
            }
            if (rec.canonicalKey && !alreadyFlaggedRecordIds.has(rec.id)) {
                const prev = yield db_1.prisma.record.findMany({
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
                    yield emit(RULE.DUP_IN_DB__CANONICAL, [rec], {
                        threatType: RULE.DUP_IN_DB__CANONICAL,
                        amount: (_d = rec.amount) !== null && _d !== void 0 ? _d : null,
                        partner: (_e = rec.partner) !== null && _e !== void 0 ? _e : null,
                        txId: (_f = rec.txId) !== null && _f !== void 0 ? _f : null,
                        datasetStats: baseStats,
                        additionalContext: {
                            scope: "db_prior_same_canonical",
                            canonicalKey: rec.canonicalKey,
                            priorCount: prev.length,
                            priorIds: prev.slice(0, 5).map((m) => m.id),
                        },
                    }, 0.95, "HIGH", `dbcanon:${rec.canonicalKey}:${rec.id}`);
                }
            }
            yield updateStageProgress(100 / historicalDuplicates.length, 1);
        }
        console.timeEnd("Historical duplicate detection");
        // ---------------- Stage 3: Batch (current upload) strict duplicates ----------------
        console.time("Batch duplicate detection");
        console.log("[PROGRESS] Stage 3: Batch duplicate detection");
        // B1. TXID clusters
        const totalBatches = byTxId.size + byCanonical.size;
        let batchesProcessed = 0;
        for (const [txId, list] of byTxId.entries()) {
            if (list.length < 2)
                continue;
            const sorted = list.slice().sort((a, b) => { var _a, _b; return (((_a = a.date) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) - (((_b = b.date) === null || _b === void 0 ? void 0 : _b.getTime()) || 0); });
            const [head, ...rest] = sorted;
            const duplicates = rest.filter((r) => isStrictDuplicate(r, head) && !alreadyFlaggedRecordIds.has(r.id));
            if (duplicates.length === 0)
                continue;
            yield emit(RULE.DUP_IN_BATCH__TXID, duplicates, {
                threatType: RULE.DUP_IN_BATCH__TXID,
                amount: (_g = head.amount) !== null && _g !== void 0 ? _g : null,
                partner: (_h = head.partner) !== null && _h !== void 0 ? _h : null,
                txId,
                datasetStats: baseStats,
                additionalContext: {
                    scope: "current_upload",
                    countInUpload: list.length,
                    firstTs: head.date || head.createdAt,
                    lastTs: sorted[sorted.length - 1].date || sorted[sorted.length - 1].createdAt,
                    currency: head.normalizedCurrency || head.currency || "USD",
                },
            }, 0.97, "HIGH", `txid_batch:${txId}`, {
                fullCount: sorted.length,
                fullRecordIds: sorted.map((x) => x.id),
                fullAmountSum: sorted.reduce((s, r) => { var _a; return s + ((_a = r.amount) !== null && _a !== void 0 ? _a : 0); }, 0),
            });
            batchesProcessed++;
            yield updateStageProgress(100 / totalBatches, 2);
        }
        // B2. Canonical clusters
        for (const [canon, list] of byCanonical.entries()) {
            if (list.length < 2)
                continue;
            const sorted = list.slice().sort((a, b) => { var _a, _b; return (((_a = a.date) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) - (((_b = b.date) === null || _b === void 0 ? void 0 : _b.getTime()) || 0); });
            const duplicates = sorted.slice(1).filter((r) => !alreadyFlaggedRecordIds.has(r.id));
            if (duplicates.length === 0)
                continue;
            const head = sorted[0];
            yield emit(RULE.DUP_IN_BATCH__CANONICAL, duplicates, {
                threatType: RULE.DUP_IN_BATCH__CANONICAL,
                amount: (_j = head.amount) !== null && _j !== void 0 ? _j : null,
                partner: (_k = head.partner) !== null && _k !== void 0 ? _k : null,
                txId: (_l = head.txId) !== null && _l !== void 0 ? _l : null,
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
            }, 0.93, "HIGH", `canon_batch:${canon}`, {
                fullCount: sorted.length,
                fullRecordIds: sorted.map((x) => x.id),
                fullAmountSum: sorted.reduce((s, r) => { var _a; return s + ((_a = r.amount) !== null && _a !== void 0 ? _a : 0); }, 0),
            });
            batchesProcessed++;
            yield updateStageProgress(100 / totalBatches, 2);
        }
        console.timeEnd("Batch duplicate detection");
        // ------------------ Stage 4: Vector similarity with batching ----------------
        console.time("Similarity detection");
        console.log("[PROGRESS] Stage 4: Similarity detection");
        // Track which records have already been flagged by similarity to prevent double-counting
        const similarityFlaggedRecordIds = new Set();
        if (recordsWithEmbeddings.length > 0) {
            yield processSimilarityInBatches(records.filter((r) => !alreadyFlaggedRecordIds.has(r.id) && r.embeddingJson), companyId, uploadId, alreadyFlaggedRecordIds, similarityFlaggedRecordIds, emit, (processed, totalSimilarity, threats) => __awaiter(this, void 0, void 0, function* () {
                yield updateStageProgress((100 * processed) / totalSimilarity, 3);
            }));
        }
        else {
            // Skip similarity stage if no embeddings
            yield updateStageProgress(100, 3);
        }
        console.timeEnd("Similarity detection");
        // ---------------- Summary ----------------
        const uniqueFlaggedRecords = new Set(Array.from(flaggedByRule.values()).flatMap((s) => Array.from(s)));
        const flagged = uniqueFlaggedRecords.size;
        const flaggedValue = Array.from(uniqueFlaggedRecords).reduce((sum, recordId) => {
            var _a;
            const record = records.find((r) => r.id === recordId);
            return sum + ((_a = record === null || record === void 0 ? void 0 : record.amount) !== null && _a !== void 0 ? _a : 0);
        }, 0);
        const byRule = Array.from(byRuleClusters.entries()).map(([rule_id, agg]) => {
            var _a;
            const detailsSorted = agg.details.sort((a, b) => b.total_amount - a.total_amount).slice(0, 5);
            return {
                rule_id,
                clusters: agg.clusters,
                records_impacted: ((_a = flaggedByRule.get(rule_id)) === null || _a === void 0 ? void 0 : _a.size) || 0,
                impacted_value: agg.impact,
                top_clusters: detailsSorted,
            };
        });
        console.log(`[SUMMARY] Total records: ${total}, Flagged: ${flagged}, By rule:`, byRule);
        const summary = {
            totalRecords: total,
            flagged,
            flaggedValue,
            message: `Analyzed ${total} rows → flagged ${flagged} unique records (${((flagged / Math.max(total, 1)) *
                100).toFixed(1)}%), worth ~${flaggedValue.toFixed(2)}.`,
            byRule,
        };
        console.timeEnd("Total leak detection time");
        return { threatsCreated, summary };
    });
}
function processSimilarityInBatches(records, companyId, uploadId, alreadyFlaggedRecordIds, similarityFlaggedRecordIds, emit, onProgress) {
    return __awaiter(this, void 0, void 0, function* () {
        const batches = [];
        for (let i = 0; i < records.length; i += SIMILARITY_BATCH_SIZE) {
            batches.push(records.slice(i, i + SIMILARITY_BATCH_SIZE));
        }
        console.log(`Processing similarity in ${batches.length} batches`);
        let similarityProcessed = 0;
        const totalSimilarity = records.length;
        for (const [batchIndex, batch] of batches.entries()) {
            console.log(`Similarity batch ${batchIndex + 1}/${batches.length}`);
            const batchPromises = batch.map((rec) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                if (alreadyFlaggedRecordIds.has(rec.id) || similarityFlaggedRecordIds.has(rec.id)) {
                    similarityProcessed++;
                    if (onProgress) {
                        yield onProgress(similarityProcessed, totalSimilarity, 0);
                    }
                    return;
                }
                const embedding = parseEmbedding(rec.embeddingJson);
                if (!embedding) {
                    similarityProcessed++;
                    if (onProgress) {
                        yield onProgress(similarityProcessed, totalSimilarity, 0);
                    }
                    return;
                }
                try {
                    const { localPrev, global } = yield (0, similaritySearch_1.findSimilarForEmbedding)(companyId, uploadId, embedding, SIMILARITY_SEARCH_LIMIT, { minScore: 0.5, useVectorIndex: true });
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
                        similarityFlaggedRecordIds.add(rec.id);
                        console.log(`[SIMILARITY] FOUND LOCAL MATCH: ${rec.id} -> ${bestLocal.id} (similarity: ${bestLocal.similarity.toFixed(4)})`);
                        yield emit(RULE.SIMILARITY_MATCH, [rec], {
                            threatType: RULE.SIMILARITY_MATCH,
                            amount: (_a = rec.amount) !== null && _a !== void 0 ? _a : null,
                            partner: (_b = rec.partner) !== null && _b !== void 0 ? _b : null,
                            txId: (_c = rec.txId) !== null && _c !== void 0 ? _c : null,
                            datasetStats: {
                                mean: 0,
                                max: 0,
                                totalRecords: 0,
                            },
                            additionalContext: {
                                scope: "vector_local_prev",
                                neighborId: bestLocal.id,
                                neighborPartner: bestLocal.partner,
                                neighborAmount: bestLocal.amount,
                                similarity: bestLocal.similarity,
                            },
                        }, 0.96, "HIGH", `vecdup_prev:${rec.id}->${bestLocal.id}`);
                    }
                    else if (bestGlobal) {
                        similarityFlaggedRecordIds.add(rec.id);
                        console.log(`[SIMILARITY] FOUND GLOBAL MATCH: ${rec.id} -> ${bestGlobal.id} (similarity: ${bestGlobal.similarity.toFixed(4)})`);
                        yield emit(RULE.SIMILARITY_MATCH, [rec], {
                            threatType: RULE.SIMILARITY_MATCH,
                            amount: (_d = rec.amount) !== null && _d !== void 0 ? _d : null,
                            partner: (_e = rec.partner) !== null && _e !== void 0 ? _e : null,
                            txId: (_f = rec.txId) !== null && _f !== void 0 ? _f : null,
                            datasetStats: {
                                mean: 0,
                                max: 0,
                                totalRecords: 0,
                            },
                            additionalContext: {
                                scope: "vector_global",
                                neighborId: bestGlobal.id,
                                neighborCompany: bestGlobal.companyId,
                                neighborPartner: bestGlobal.partner,
                                neighborAmount: bestGlobal.amount,
                                similarity: bestGlobal.similarity,
                            },
                        }, 0.87, "MEDIUM", `vecsim:${rec.id}->${bestGlobal.id}`);
                    }
                }
                catch (error) {
                    console.error(`Similarity search failed for record ${rec.id}:`, error);
                }
                finally {
                    similarityProcessed++;
                    if (onProgress) {
                        yield onProgress(similarityProcessed, totalSimilarity, 0);
                    }
                }
            }));
            // Process batch with timeout
            yield Promise.allSettled(batchPromises);
        }
    });
}
function createAIContextualizedThreat(companyId, uploadId, recordId, threatType, confidenceScore, context) {
    return __awaiter(this, void 0, void 0, function* () {
        // Use ONLY static explanation - no AI calls
        const staticExplanation = (0, leakExplanation_1.generateStaticExplanation)(context);
        const threat = yield db_1.prisma.threat.create({
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
    });
}
