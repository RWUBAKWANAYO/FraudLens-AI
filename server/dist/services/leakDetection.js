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
const isolation_forest_1 = require("isolation-forest");
const aiExplanation_1 = require("./aiExplanation");
const similaritySearch_1 = require("./similaritySearch");
const rulesEngine_1 = require("./rulesEngine");
const alerts_1 = require("./alerts");
const webhooks_1 = require("./webhooks");
function detectLeaks(records, uploadId, companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const threatsCreated = [];
        const flaggedRecordIds = new Set();
        const duplicateGroups = new Map(); // Track duplicate groups
        const positiveAmounts = records.map((r) => { var _a; return (_a = r.amount) !== null && _a !== void 0 ? _a : 0; }).filter((a) => a > 0);
        const avgAmount = positiveAmounts.length
            ? positiveAmounts.reduce((s, a) => s + a, 0) / positiveAmounts.length
            : 0;
        const maxAmount = positiveAmounts.length ? Math.max(...positiveAmounts) : 0;
        const baseStats = { mean: avgAmount, max: maxAmount, totalRecords: records.length };
        // 1) Duplicate txId - Create ONE threat per duplicate group
        const byTx = new Map();
        for (const r of records) {
            if (!r.txId)
                continue;
            const list = byTx.get(r.txId) || [];
            list.push(r);
            byTx.set(r.txId, list);
        }
        for (const [txId, list] of byTx.entries()) {
            if (list.length > 1) {
                duplicateGroups.set(txId, list.map((r) => r.id));
                const context = {
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
                const t = yield createAIContextualizedThreat(companyId, uploadId, list[0].id, "duplicate_tx", 0.9, context);
                threatsCreated.push(t);
                list.forEach((r) => flaggedRecordIds.add(r.id));
            }
        }
        // 2) Amount outliers (z-score)
        const amounts = records.map((r) => { var _a; return (_a = r.amount) !== null && _a !== void 0 ? _a : 0; }).filter((a) => a > 0);
        if (amounts.length >= 5) {
            const mean = avgAmount;
            const std = amounts.length > 1
                ? Math.sqrt(amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / (amounts.length - 1))
                : 0;
            const zThreshold = amounts.length >= 10 ? 3 : 4;
            for (const r of records) {
                if (flaggedRecordIds.has(r.id) || !r.amount || r.amount <= 0)
                    continue;
                const z = std === 0 ? 0 : Math.abs((r.amount - mean) / std);
                if (z > zThreshold) {
                    const context = {
                        threatType: "amount_outlier",
                        amount: r.amount,
                        partner: r.partner,
                        txId: r.txId,
                        datasetStats: Object.assign(Object.assign({}, baseStats), { std }),
                        additionalContext: { zScore: z },
                    };
                    const conf = z > 5 ? 0.95 : 0.75;
                    const t = yield createAIContextualizedThreat(companyId, uploadId, r.id, "amount_outlier", conf, context);
                    threatsCreated.push(t);
                    flaggedRecordIds.add(r.id);
                }
            }
        }
        // 3) Invalid amounts
        for (const r of records) {
            if (flaggedRecordIds.has(r.id))
                continue;
            if (r.amount !== null && r.amount <= 0) {
                const context = {
                    threatType: "invalid_amount",
                    amount: r.amount,
                    partner: r.partner,
                    txId: r.txId,
                    datasetStats: baseStats,
                };
                const t = yield createAIContextualizedThreat(companyId, uploadId, r.id, "invalid_amount", 0.8, context);
                threatsCreated.push(t);
                flaggedRecordIds.add(r.id);
            }
        }
        // 4) Isolation Forest - Skip for small datasets
        if (amounts.length > 25) {
            const iso = new isolation_forest_1.IsolationForest();
            const X = records
                .filter((r) => !flaggedRecordIds.has(r.id) && r.amount !== null)
                .map((r) => ({ amount: r.amount }));
            if (X.length > 25) {
                iso.fit(X);
                const scores = iso.scores();
                for (let i = 0; i < scores.length; i++) {
                    const s = scores[i];
                    if (s > 0.6) {
                        const r = records[i];
                        if (flaggedRecordIds.has(r.id))
                            continue;
                        const context = {
                            threatType: "ml_outlier",
                            amount: r.amount,
                            partner: r.partner,
                            txId: r.txId,
                            datasetStats: baseStats,
                            additionalContext: { anomalyScore: s },
                        };
                        const t = yield createAIContextualizedThreat(companyId, uploadId, r.id, "suspicious_pattern", 0.7, context);
                        threatsCreated.push(t);
                        flaggedRecordIds.add(r.id);
                    }
                }
            }
        }
        // 5) Similarity search - CRITICAL FIX: Exclude same-batch matches
        const currentUploadIds = new Set(records.map((r) => r.id));
        for (const r of records) {
            if (flaggedRecordIds.has(r.id) || !r.embeddingJson)
                continue;
            const emb = r.embeddingJson || [];
            if (!emb.length)
                continue;
            const { local, global } = yield (0, similaritySearch_1.findSimilarForEmbedding)(companyId, emb);
            const localThreshold = records.length > 50 ? 0.08 : 0.05;
            const globalThreshold = records.length > 50 ? 0.06 : 0.04;
            // Filter out matches from the same upload batch
            const validLocalMatches = local.filter((n) => n.id !== r.id && n.distance < localThreshold && !currentUploadIds.has(n.id));
            const validGlobalMatches = global.filter((n) => n.companyId !== companyId && n.distance < globalThreshold && !currentUploadIds.has(n.id));
            // Only create threat if we have valid matches
            if (validLocalMatches.length > 0 || validGlobalMatches.length > 0) {
                const context = {
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
                const t = yield createAIContextualizedThreat(companyId, uploadId, r.id, "similarity_match", 0.85, context);
                threatsCreated.push(t);
                flaggedRecordIds.add(r.id);
            }
        }
        // 6) Rules engine
        const rules = yield db_1.prisma.rule.findMany({ where: { companyId, enabled: true } });
        for (const r of records) {
            if (flaggedRecordIds.has(r.id))
                continue;
            const hits = (0, rulesEngine_1.evaluateRules)(rules, {
                amount: r.amount,
                currency: r.currency,
                partner: r.partner,
                mcc: r.mcc,
            });
            for (const h of hits) {
                const context = {
                    threatType: "rule_trigger",
                    amount: r.amount,
                    partner: r.partner,
                    txId: r.txId,
                    datasetStats: baseStats,
                    additionalContext: { ruleId: h.ruleId, reason: h.reason },
                };
                const t = yield createAIContextualizedThreat(companyId, uploadId, r.id, "rule_trigger", 0.8, context);
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
            var _a;
            const record = records.find((r) => r.id === recordId);
            return sum + ((_a = record === null || record === void 0 ? void 0 : record.amount) !== null && _a !== void 0 ? _a : 0);
        }, 0);
        const summary = {
            totalRecords: total,
            flagged,
            flaggedValue,
            message: `Analyzed ${total} rows → flagged ${flagged} suspicious (${((flagged / total) *
                100).toFixed(1)}%), worth ~$${flaggedValue.toFixed(2)}.`,
        };
        // Create Alerts
        for (const t of threatsCreated) {
            const title = `${t.threatType.replace(/_/g, " ")}`;
            const summaryTxt = t.description.slice(0, 240);
            yield (0, alerts_1.createAndDispatchAlert)({
                companyId,
                recordId: t.recordId,
                threatId: t.id,
                title,
                summary: summaryTxt,
                severity: "high",
                payload: t,
            });
            yield (0, webhooks_1.dispatchEnterpriseWebhooks)(companyId, { type: "threat.created", data: t });
        }
        return { threatsCreated, summary };
    });
}
function createAIContextualizedThreat(companyId, uploadId, recordId, threatType, confidenceScore, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const aiExplanation = yield (0, aiExplanation_1.generateThreatExplanation)(context);
        return db_1.prisma.threat.create({
            data: {
                companyId,
                uploadId,
                recordId,
                threatType,
                description: aiExplanation,
                confidenceScore,
            },
        });
    });
}
