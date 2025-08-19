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
function zScore(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    return { mean, std };
}
function detectLeaks(records, uploadId) {
    return __awaiter(this, void 0, void 0, function* () {
        const threatsCreated = [];
        // --- 1) duplicate txId detection ---
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
                const description = `Duplicate transaction/invoice ${txId} appears ${list.length} times.`;
                const t = yield db_1.prisma.threat.create({
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
        const partnerCount = new Map();
        for (const r of records) {
            const p = (r.partner || "UNKNOWN").toString().trim();
            partnerCount.set(p, (partnerCount.get(p) || 0) + 1);
        }
        for (const r of records) {
            const p = (r.partner || "UNKNOWN").toString().trim();
            if (partnerCount.get(p) === 1) {
                const t = yield db_1.prisma.threat.create({
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
        const amounts = records.map((r) => { var _a; return (_a = r.amount) !== null && _a !== void 0 ? _a : 0; }).filter((a) => a > 0);
        if (amounts.length >= 5) {
            const { mean, std } = zScore(amounts);
            for (const r of records) {
                if (!r.amount || r.amount <= 0)
                    continue;
                const z = std === 0 ? 0 : Math.abs((r.amount - mean) / std);
                if (z > 3) {
                    const t = yield db_1.prisma.threat.create({
                        data: {
                            uploadId,
                            recordId: r.id,
                            threatType: "amount_outlier",
                            description: `Amount ${r.amount} is an outlier (z=${z.toFixed(1)}, mean=${mean.toFixed(2)}).`,
                            confidenceScore: z > 5 ? 0.95 : 0.75,
                        },
                    });
                    threatsCreated.push(t);
                }
            }
        }
        // Return detected threats
        return threatsCreated;
    });
}
