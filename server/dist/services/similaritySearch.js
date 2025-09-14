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
exports.findSimilarForEmbedding = findSimilarForEmbedding;
exports.findSimilarWithRetry = findSimilarWithRetry;
exports.batchSimilaritySearch = batchSimilaritySearch;
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const embeddingUtils_1 = require("../utils/embeddingUtils");
function findSimilarForEmbedding(companyId_1, uploadId_1, embedding_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, uploadId, embedding, k = 10, _rowCount = 100, opts) {
        var _a, _b;
        const minScore = (_a = opts === null || opts === void 0 ? void 0 : opts.minScore) !== null && _a !== void 0 ? _a : 0.5;
        const preferVector = (_b = opts === null || opts === void 0 ? void 0 : opts.useVectorIndex) !== null && _b !== void 0 ? _b : true;
        if (!embedding || embedding.length === 0) {
            return { localPrev: [], global: [], timedOut: false };
        }
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve({ localPrev: [], global: [], timedOut: true });
            }, 600000);
        });
        const searchPromise = (() => __awaiter(this, void 0, void 0, function* () {
            try {
                if (preferVector) {
                    try {
                        const vecText = JSON.stringify(embedding);
                        const [localRows, globalRows] = yield Promise.all([
                            db_1.prisma.$queryRaw `
              SELECT
                id, companyId, uploadId, txId, partner, amount, date,
                1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
              FROM Record
              WHERE companyId = ${companyId}
                AND (${uploadId} IS NULL OR uploadId <> ${uploadId})
                AND embeddingVec IS NOT NULL
                AND VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) < ${1 - minScore}
              ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
              LIMIT ${k * 2}
            `.catch(() => []),
                            db_1.prisma.$queryRaw `
              SELECT
                id, companyId, uploadId, txId, partner, amount, date,
                1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
              FROM Record
              WHERE companyId <> ${companyId}
                AND embeddingVec IS NOT NULL
                AND VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) < ${1 - minScore}
              ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
              LIMIT ${k}
            `.catch(() => []),
                        ]);
                        const localPrev = (localRows !== null && localRows !== void 0 ? localRows : [])
                            .map((r) => { var _a; return (Object.assign(Object.assign({}, r), { similarity: (_a = r.similarity) !== null && _a !== void 0 ? _a : 1 - r.distance })); })
                            .filter((r) => r.similarity >= minScore && r.similarity < 0.9999)
                            .slice(0, k);
                        const global = (globalRows !== null && globalRows !== void 0 ? globalRows : [])
                            .map((r) => { var _a; return (Object.assign(Object.assign({}, r), { similarity: (_a = r.similarity) !== null && _a !== void 0 ? _a : 1 - r.distance })); })
                            .filter((r) => r.similarity >= minScore && r.similarity < 0.9999)
                            .slice(0, k);
                        if (localPrev.length > 0 || global.length > 0) {
                            return { localPrev, global, timedOut: false };
                        }
                    }
                    catch (_a) {
                        // Vector index failed, fall back to JSON embeddings
                    }
                }
                const [localCandidates, globalCandidates] = yield Promise.all([
                    db_1.prisma.record
                        .findMany({
                        where: Object.assign(Object.assign({ companyId }, (uploadId ? { uploadId: { not: uploadId } } : {})), { NOT: { embeddingJson: { equals: client_1.Prisma.DbNull } } }),
                        select: {
                            id: true,
                            companyId: true,
                            uploadId: true,
                            txId: true,
                            partner: true,
                            amount: true,
                            date: true,
                            embeddingJson: true,
                        },
                        orderBy: { createdAt: "desc" },
                        take: Math.min(k * 10, 1000),
                    })
                        .catch(() => []),
                    db_1.prisma.record
                        .findMany({
                        where: {
                            companyId: { not: companyId },
                            NOT: { embeddingJson: { equals: client_1.Prisma.DbNull } },
                        },
                        select: {
                            id: true,
                            companyId: true,
                            uploadId: true,
                            txId: true,
                            partner: true,
                            amount: true,
                            date: true,
                            embeddingJson: true,
                        },
                        orderBy: { createdAt: "desc" },
                        take: Math.min(k * 5, 500),
                    })
                        .catch(() => []),
                ]);
                const localPrev = localCandidates
                    .map((r) => {
                    const emb = (0, embeddingUtils_1.parseEmbedding)(r.embeddingJson);
                    if (!emb)
                        return null;
                    return {
                        id: r.id,
                        companyId: r.companyId,
                        uploadId: r.uploadId,
                        txId: r.txId,
                        partner: r.partner,
                        amount: r.amount,
                        date: r.date,
                        similarity: (0, embeddingUtils_1.cosineSimilarity)(embedding, emb),
                    };
                })
                    .filter((x) => !!x && x.similarity >= minScore && x.similarity < 0.9999)
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, k);
                const global = globalCandidates
                    .map((r) => {
                    const emb = (0, embeddingUtils_1.parseEmbedding)(r.embeddingJson);
                    if (!emb)
                        return null;
                    return {
                        id: r.id,
                        companyId: r.companyId,
                        uploadId: r.uploadId,
                        txId: r.txId,
                        partner: r.partner,
                        amount: r.amount,
                        date: r.date,
                        similarity: (0, embeddingUtils_1.cosineSimilarity)(embedding, emb),
                    };
                })
                    .filter((x) => !!x && x.similarity >= minScore && x.similarity < 0.9999)
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, k);
                return { localPrev, global, timedOut: false };
            }
            catch (_b) {
                return { localPrev: [], global: [], timedOut: false };
            }
        }))();
        return Promise.race([searchPromise, timeoutPromise]);
    });
}
function findSimilarWithRetry(companyId_1, uploadId_1, embedding_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, uploadId, embedding, k = 10, rowCount = 100, maxRetries = 2, opts) {
        let lastResult = null;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = yield findSimilarForEmbedding(companyId, uploadId, embedding, k, rowCount, opts);
                if (result.localPrev.length > 0 || result.global.length > 0 || attempt === maxRetries) {
                    return result;
                }
                lastResult = result;
                const delay = Math.pow(2, attempt - 1) * 1000;
                yield new Promise((resolve) => setTimeout(resolve, delay));
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    yield new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        if (lastResult) {
            return lastResult;
        }
        throw lastError || new Error("Similarity search failed after retries");
    });
}
function batchSimilaritySearch(companyId_1, uploadId_1, embeddings_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, uploadId, embeddings, k = 10, opts) {
        const results = [];
        let timedOutCount = 0;
        for (let i = 0; i < embeddings.length; i++) {
            try {
                const result = yield findSimilarWithRetry(companyId, uploadId, embeddings[i], k, embeddings.length, opts);
                results.push([...result.localPrev, ...result.global]);
                if (result.timedOut) {
                    timedOutCount++;
                }
            }
            catch (_a) {
                results.push([]);
            }
        }
        return { results, timedOutCount };
    });
}
