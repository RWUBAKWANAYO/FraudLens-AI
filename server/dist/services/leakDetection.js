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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLeaks = detectLeaks;
const db_1 = require("../config/db");
const leakExplanation_1 = require("./leakExplanation");
const similaritySearch_1 = require("./similaritySearch");
const webhookQueue_1 = require("../queue/webhookQueue");
const webhooks_1 = require("./webhooks");
const redisPublisher_1 = require("./redisPublisher");
const leakDetectionUtils_1 = require("../utils/leakDetectionUtils");
const constants_1 = require("../utils/constants");
function detectLeaks(records, uploadId, companyId, onProgress) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const startTime = Date.now();
        const threatsCreated = [];
        const flaggedByRule = new Map();
        const byRuleClusters = new Map();
        const alreadyFlaggedRecordIds = new Set();
        const emittedClusterKeys = new Set();
        const total = records.length;
        const positive = records.filter((r) => { var _a; return ((_a = r.amount) !== null && _a !== void 0 ? _a : 0) > 0; }).map((r) => r.amount);
        const mean = positive.length ? positive.reduce((a, b) => a + b) / positive.length : 0;
        const max = positive.length ? Math.max(...positive) : 0;
        const baseStats = { mean, max, totalRecords: total };
        const TOTAL_STAGES = 4;
        let currentStage = 0;
        let stageProgress = 0;
        function updateStageProgress(increment, stage) {
            return __awaiter(this, void 0, void 0, function* () {
                if (stage !== currentStage) {
                    currentStage = stage;
                    stageProgress = 0;
                }
                stageProgress += increment;
                if (onProgress) {
                    const stageWeight = 45 / TOTAL_STAGES;
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
                const alert = yield db_1.prisma.alert.create({
                    data: {
                        companyId,
                        recordId: anchor.id,
                        threatId: t.id,
                        title: ruleId.replace(/_/g, " "),
                        summary: t.description || "",
                        severity: constants_1.SEVERITY[severity],
                        payload: { ruleId, clusterKey, context: t },
                    },
                });
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
                try {
                    const webhooks = yield webhooks_1.webhookService.getMockWebhooks(companyId);
                    for (const webhook of webhooks) {
                        if (webhook.events.includes("threat.created")) {
                            yield (0, webhookQueue_1.queueWebhook)(webhook.id, companyId, "threat.created", {
                                threat: {
                                    id: t.id,
                                    type: t.threatType,
                                    confidence: t.confidenceScore,
                                    description: t.description,
                                    ruleId,
                                    severity: constants_1.SEVERITY[severity],
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
                        }
                    }
                }
                catch (error) {
                    console.error("Webhook queueing failed:", error);
                }
            });
        }
        const recordsWithEmbeddings = records.filter((r) => r.embeddingJson);
        const existingTxIds = new Set();
        const existingCanonicalKeys = new Set();
        const txIds = records.map((r) => r.txId).filter(Boolean);
        const canonicalKeys = records.map((r) => r.canonicalKey).filter(Boolean);
        if (txIds.length > 0) {
            const existingTxRecords = yield db_1.prisma.record.findMany({
                where: {
                    companyId,
                    txId: { in: txIds },
                    uploadId: { not: uploadId },
                },
                select: { txId: true },
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
                select: { canonicalKey: true },
                take: 1000,
            });
            existingCanonicalRecords.forEach((r) => existingCanonicalKeys.add(r.canonicalKey));
        }
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
        const historicalDuplicates = [];
        for (const rec of records) {
            if (alreadyFlaggedRecordIds.has(rec.id))
                continue;
            if (rec.txId && existingTxIds.has(rec.txId)) {
                historicalDuplicates.push(rec);
            }
            else if (rec.canonicalKey && existingCanonicalKeys.has(rec.canonicalKey)) {
                historicalDuplicates.push(rec);
            }
            yield updateStageProgress(100 / records.length, 1);
        }
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
                    },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });
                const matches = prev.filter((p) => (0, leakDetectionUtils_1.isStrictDuplicate)(rec, p));
                if (matches.length > 0) {
                    yield emit(constants_1.RULE.DUP_IN_DB__TXID, [rec], {
                        threatType: constants_1.RULE.DUP_IN_DB__TXID,
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
                    yield emit(constants_1.RULE.DUP_IN_DB__CANONICAL, [rec], {
                        threatType: constants_1.RULE.DUP_IN_DB__CANONICAL,
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
        const totalBatches = byTxId.size + byCanonical.size;
        let batchesProcessed = 0;
        for (const [txId, list] of byTxId.entries()) {
            if (list.length < 2)
                continue;
            const sorted = list.slice().sort((a, b) => { var _a, _b; return (((_a = a.date) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) - (((_b = b.date) === null || _b === void 0 ? void 0 : _b.getTime()) || 0); });
            const [head, ...rest] = sorted;
            const duplicates = rest.filter((r) => (0, leakDetectionUtils_1.isStrictDuplicate)(r, head) && !alreadyFlaggedRecordIds.has(r.id));
            if (duplicates.length === 0)
                continue;
            yield emit(constants_1.RULE.DUP_IN_BATCH__TXID, duplicates, {
                threatType: constants_1.RULE.DUP_IN_BATCH__TXID,
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
        for (const [canon, list] of byCanonical.entries()) {
            if (list.length < 2)
                continue;
            const sorted = list.slice().sort((a, b) => { var _a, _b; return (((_a = a.date) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) - (((_b = b.date) === null || _b === void 0 ? void 0 : _b.getTime()) || 0); });
            const duplicates = sorted.slice(1).filter((r) => !alreadyFlaggedRecordIds.has(r.id));
            if (duplicates.length === 0)
                continue;
            const head = sorted[0];
            yield emit(constants_1.RULE.DUP_IN_BATCH__CANONICAL, duplicates, {
                threatType: constants_1.RULE.DUP_IN_BATCH__CANONICAL,
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
        const similarityFlaggedRecordIds = new Set();
        if (recordsWithEmbeddings.length > 0) {
            yield processSimilarityInBatches(records.filter((r) => !alreadyFlaggedRecordIds.has(r.id) && r.embeddingJson), companyId, uploadId, alreadyFlaggedRecordIds, similarityFlaggedRecordIds, emit, (processed, totalSimilarity) => __awaiter(this, void 0, void 0, function* () {
                yield updateStageProgress((100 * processed) / totalSimilarity, 3);
            }));
        }
        else {
            yield updateStageProgress(100, 3);
        }
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
        const processingTime = Date.now() - startTime;
        try {
            const webhooks = yield webhooks_1.webhookService.getMockWebhooks(companyId);
            const threatsByType = {};
            threatsCreated.forEach((threat) => {
                threatsByType[threat.threatType] = (threatsByType[threat.threatType] || 0) + 1;
            });
            const threatSummary = Object.entries(threatsByType)
                .map(([type, count]) => `${type}: ${count}`)
                .join(", ");
            for (const webhook of webhooks) {
                if (webhook.events.includes("upload.complete")) {
                    yield (0, webhookQueue_1.queueWebhook)(webhook.id, companyId, "upload.complete", {
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
        }
        catch (error) {
            console.error("Upload complete webhook failed:", error);
        }
        return { threatsCreated, summary: { totalRecords: total, flagged, flaggedValue, byRule } };
    });
}
function processSimilarityInBatches(records, companyId, uploadId, alreadyFlaggedRecordIds, similarityFlaggedRecordIds, emit, onProgress) {
    return __awaiter(this, void 0, void 0, function* () {
        const batches = [];
        for (let i = 0; i < records.length; i += constants_1.SIMILARITY_BATCH_SIZE) {
            batches.push(records.slice(i, i + constants_1.SIMILARITY_BATCH_SIZE));
        }
        let similarityProcessed = 0;
        const totalSimilarity = records.length;
        for (const batch of batches) {
            const batchPromises = batch.map((rec) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                if (alreadyFlaggedRecordIds.has(rec.id) || similarityFlaggedRecordIds.has(rec.id)) {
                    similarityProcessed++;
                    if (onProgress)
                        yield onProgress(similarityProcessed, totalSimilarity);
                    return;
                }
                const embedding = (0, leakDetectionUtils_1.parseEmbedding)(rec.embeddingJson);
                if (!embedding) {
                    similarityProcessed++;
                    if (onProgress)
                        yield onProgress(similarityProcessed, totalSimilarity);
                    return;
                }
                try {
                    const { localPrev, global, timedOut } = yield (0, similaritySearch_1.findSimilarForEmbedding)(companyId, uploadId, embedding, constants_1.SIMILARITY_SEARCH_LIMIT, records.length, { minScore: 0.5, useVectorIndex: true });
                    if (timedOut) {
                        similarityProcessed++;
                        if (onProgress)
                            yield onProgress(similarityProcessed, totalSimilarity);
                        return;
                    }
                    const bestLocal = localPrev
                        .filter((m) => m.similarity >= constants_1.SIMILARITY_DUP_THRESHOLD)
                        .sort((a, b) => b.similarity - a.similarity)[0];
                    const bestGlobal = global
                        .filter((m) => m.similarity >= constants_1.SIMILARITY_SUSPICIOUS_THRESHOLD)
                        .sort((a, b) => b.similarity - a.similarity)[0];
                    if (bestLocal) {
                        similarityFlaggedRecordIds.add(rec.id);
                        yield emit(constants_1.RULE.SIMILARITY_MATCH, [rec], {
                            threatType: constants_1.RULE.SIMILARITY_MATCH,
                            amount: (_a = rec.amount) !== null && _a !== void 0 ? _a : null,
                            partner: (_b = rec.partner) !== null && _b !== void 0 ? _b : null,
                            txId: (_c = rec.txId) !== null && _c !== void 0 ? _c : null,
                            datasetStats: { mean: 0, max: 0, totalRecords: 0 },
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
                        yield emit(constants_1.RULE.SIMILARITY_MATCH, [rec], {
                            threatType: constants_1.RULE.SIMILARITY_MATCH,
                            amount: (_d = rec.amount) !== null && _d !== void 0 ? _d : null,
                            partner: (_e = rec.partner) !== null && _e !== void 0 ? _e : null,
                            txId: (_f = rec.txId) !== null && _f !== void 0 ? _f : null,
                            datasetStats: { mean: 0, max: 0, totalRecords: 0 },
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
                    if (onProgress)
                        yield onProgress(similarityProcessed, totalSimilarity);
                }
            }));
            yield Promise.allSettled(batchPromises);
        }
    });
}
function createAIContextualizedThreat(companyId, uploadId, recordId, threatType, confidenceScore, context) {
    return __awaiter(this, void 0, void 0, function* () {
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
