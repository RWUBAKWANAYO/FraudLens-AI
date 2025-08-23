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
exports.parseEmbedding = parseEmbedding;
exports.findSimilarForEmbedding = findSimilarForEmbedding;
// server/src/services/similaritySearch.ts
const db_1 = require("../config/db");
/** Cosine similarity */
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0)
        return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}
/** Parse embedding stored in Prisma JsonValue into number[] safely */
function parseEmbedding(json) {
    if (json == null)
        return null;
    if (Array.isArray(json)) {
        const arr = json.map((x) => Number(x));
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
/**
 * Vector search using TiDB VEC_COSINE_DISTANCE with safe fallback.
 */
function findSimilarForEmbedding(companyId_1, uploadId_1, embedding_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, uploadId, embedding, k = 10, opts) {
        var _a, _b;
        const minScore = (_a = opts === null || opts === void 0 ? void 0 : opts.minScore) !== null && _a !== void 0 ? _a : 0.5;
        const preferVector = (_b = opts === null || opts === void 0 ? void 0 : opts.useVectorIndex) !== null && _b !== void 0 ? _b : true;
        console.log(`[SIMILARITY_SEARCH] Starting for company ${companyId}, embedding length: ${embedding.length}`);
        // ---- Prefer native vector index if available ----
        if (preferVector) {
            try {
                console.log("[SIMILARITY_SEARCH] Attempting TiDB vector search...");
                const vecText = JSON.stringify(embedding);
                const localRows = yield db_1.prisma.$queryRaw `
        SELECT
          id, companyId, uploadId, txId, partner, amount, date,
          1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
        FROM Record
        WHERE companyId = ${companyId}
          AND (${uploadId} IS NULL OR uploadId <> ${uploadId})
          AND embeddingVec IS NOT NULL
        ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
        LIMIT ${k}
      `;
                console.log(`[SIMILARITY_SEARCH] TiDB local search returned ${(localRows === null || localRows === void 0 ? void 0 : localRows.length) || 0} rows`);
                const localPrev = (localRows !== null && localRows !== void 0 ? localRows : [])
                    .map((r) => { var _a; return (Object.assign(Object.assign({}, r), { similarity: (_a = r.similarity) !== null && _a !== void 0 ? _a : 1 - r.distance })); })
                    .filter((r) => r.similarity >= minScore && r.similarity < 0.9999);
                const globalRows = yield db_1.prisma.$queryRaw `
        SELECT
          id, companyId, uploadId, txId, partner, amount, date,
          1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
        FROM Record
        WHERE companyId <> ${companyId}
          AND embeddingVec IS NOT NULL
        ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
        LIMIT ${k}
      `;
                console.log(`[SIMILARITY_SEARCH] TiDB global search returned ${(globalRows === null || globalRows === void 0 ? void 0 : globalRows.length) || 0} rows`);
                const global = (globalRows !== null && globalRows !== void 0 ? globalRows : [])
                    .map((r) => { var _a; return (Object.assign(Object.assign({}, r), { similarity: (_a = r.similarity) !== null && _a !== void 0 ? _a : 1 - r.distance })); })
                    .filter((r) => r.similarity >= minScore && r.similarity < 0.9999);
                console.log(`[SIMILARITY_SEARCH] TiDB results - local: ${localPrev.length}, global: ${global.length}`);
                return { localPrev, global };
            }
            catch (err) {
                console.warn("[SIMILARITY_SEARCH] TiDB vector search failed; falling back:", err);
            }
        }
        // ---- Fallback: compute cosine over JSON embeddings ----
        console.log("[SIMILARITY_SEARCH] Using fallback JSON embedding search");
        const localCandidates = yield db_1.prisma.record.findMany({
            where: Object.assign(Object.assign({ companyId }, (uploadId ? { uploadId: { not: uploadId } } : {})), { NOT: { embeddingJson: { equals: null } } }),
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
            take: 1000,
        });
        console.log(`[SIMILARITY_SEARCH] Found ${localCandidates.length} local candidates with embeddings`);
        const localPrev = localCandidates
            .map((r) => {
            const emb = parseEmbedding(r.embeddingJson);
            if (!emb)
                return null;
            const similarity = cosineSimilarity(embedding, emb);
            return {
                id: r.id,
                companyId: r.companyId,
                uploadId: r.uploadId,
                txId: r.txId,
                partner: r.partner,
                amount: r.amount,
                date: r.date,
                similarity,
            };
        })
            .filter((x) => !!x && x.similarity >= minScore && x.similarity < 0.9999)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);
        const globalCandidates = yield db_1.prisma.record.findMany({
            where: { companyId: { not: companyId }, NOT: { embeddingJson: { equals: null } } },
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
            take: 1000,
        });
        console.log(`[SIMILARITY_SEARCH] Found ${globalCandidates.length} global candidates with embeddings`);
        const global = globalCandidates
            .map((r) => {
            const emb = parseEmbedding(r.embeddingJson);
            if (!emb)
                return null;
            const similarity = cosineSimilarity(embedding, emb);
            return {
                id: r.id,
                companyId: r.companyId,
                uploadId: r.uploadId,
                txId: r.txId,
                partner: r.partner,
                amount: r.amount,
                date: r.date,
                similarity,
            };
        })
            .filter((x) => !!x && x.similarity >= minScore && x.similarity < 0.9999)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);
        console.log(`[SIMILARITY_SEARCH] Fallback results - local: ${localPrev.length}, global: ${global.length}`);
        return { localPrev, global };
    });
}
