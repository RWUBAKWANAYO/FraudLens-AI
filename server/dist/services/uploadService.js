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
exports.checkDuplicateUpload = checkDuplicateUpload;
exports.createUploadRecord = createUploadRecord;
exports.getUploadsList = getUploadsList;
exports.bulkInsertRecords = bulkInsertRecords;
exports.generateEmbeddingsForRecords = generateEmbeddingsForRecords;
exports.queueAsyncProcessing = queueAsyncProcessing;
const db_1 = require("../config/db");
const aiEmbedding_1 = require("../services/aiEmbedding");
const bus_1 = require("../queue/bus");
const queryBuilder_1 = require("../utils/queryBuilder");
const CREATE_MANY_CHUNK = Number(process.env.CREATE_MANY_CHUNK || 2000);
const EMBED_BATCH = Number(process.env.EMBED_BATCH || 50);
function checkDuplicateUpload(companyId, fileHash) {
    return __awaiter(this, void 0, void 0, function* () {
        const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const prev = yield db_1.prisma.upload.findFirst({
            where: { companyId, fileHash, createdAt: { gte: dedupeSince } },
            select: { id: true },
        });
        if (!prev)
            return null;
        const [prevThreats, recs] = yield Promise.all([
            db_1.prisma.threat.findMany({ where: { uploadId: prev.id } }),
            db_1.prisma.record.findMany({ where: { uploadId: prev.id } }),
        ]);
        const uniqueFlagged = new Set(prevThreats.map((t) => t.recordId).filter(Boolean));
        const flaggedValue = Array.from(uniqueFlagged).reduce((sum, rid) => {
            var _a;
            const r = recs.find((x) => x.id === rid);
            return sum + ((_a = r === null || r === void 0 ? void 0 : r.amount) !== null && _a !== void 0 ? _a : 0);
        }, 0);
        return {
            uploadId: prev.id,
            reuploadOf: prev.id,
            recordsAnalyzed: recs.length,
            threats: prevThreats,
            summary: {
                totalRecords: recs.length,
                flagged: uniqueFlagged.size,
                flaggedValue,
                message: `Reused prior results from upload ${prev.id}.`,
            },
        };
    });
}
function createUploadRecord(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId, fileName, fileType = null, fileHash, fileSize = 0, publicId = null, secureUrl = null, resourceType = null, source = "batch", status = "pending", } = options;
        return db_1.prisma.upload.create({
            data: {
                companyId,
                fileName,
                fileType,
                source,
                fileHash,
                fileSize,
                publicId,
                secureUrl,
                resourceType,
                status,
            },
        });
    });
}
function getUploadsList(companyId_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, options = {}) {
        const { page = 1, limit = 50, sortBy, sortOrder = "desc", searchTerm, filters = {} } = options;
        const pagination = queryBuilder_1.QueryBuilder.buildPagination(page, limit);
        let where = {
            companyId,
            OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
        };
        where = queryBuilder_1.QueryBuilder.buildWhere(where, filters, ["fileName", "fileType"], searchTerm);
        if (filters.createdAtMin || filters.createdAtMax) {
            where = queryBuilder_1.QueryBuilder.buildDateRange(where, filters.createdAtMin, filters.createdAtMax, "createdAt");
        }
        if (filters.completedAtMin || filters.completedAtMax) {
            where = queryBuilder_1.QueryBuilder.buildDateRange(where, filters.completedAtMin, filters.completedAtMax, "completedAt");
        }
        const validSortFields = [
            "fileName",
            "fileType",
            "fileSize",
            "status",
            "createdAt",
            "completedAt",
        ];
        const orderBy = queryBuilder_1.QueryBuilder.buildSort(sortBy, sortOrder, {
            validSortFields,
            defaultSort: "createdAt",
        });
        const [uploads, _totalCount] = yield Promise.all([
            db_1.prisma.upload.findMany({
                where,
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                    status: true,
                    createdAt: true,
                    completedAt: true,
                    publicId: true,
                    resourceType: true,
                    _count: {
                        select: {
                            records: true,
                            threats: true,
                        },
                    },
                },
                orderBy,
                skip: pagination.skip,
                take: pagination.take,
            }),
            db_1.prisma.upload.count({ where }),
        ]);
        // Build pagination result
        const paginationResult = yield queryBuilder_1.QueryBuilder.buildPaginationResult(db_1.prisma.upload, where, pagination.page, pagination.limit);
        return {
            uploads,
            pagination: paginationResult,
        };
    });
}
function bulkInsertRecords(records) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < records.length; i += CREATE_MANY_CHUNK) {
            const chunk = records.slice(i, i + CREATE_MANY_CHUNK);
            yield db_1.prisma.record.createMany({ data: chunk });
            if (i % 5000 === 0) {
                yield new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
    });
}
function generateEmbeddingsForRecords(records) {
    return __awaiter(this, void 0, void 0, function* () {
        const batches = [];
        for (let i = 0; i < records.length; i += EMBED_BATCH) {
            batches.push(records.slice(i, i + EMBED_BATCH));
        }
        for (const [batchIndex, batch] of batches.entries()) {
            const texts = batch
                .map((record) => {
                return [
                    record.partner,
                    record.amount,
                    record.currency,
                    record.txId,
                    record.normalizedPartner,
                    record.normalizedCurrency,
                ]
                    .filter(Boolean)
                    .join(" ");
            })
                .filter((text) => text.trim());
            if (texts.length === 0) {
                continue;
            }
            try {
                const embeddings = yield (0, aiEmbedding_1.getEmbeddingsBatch)(texts);
                const updatePromises = batch.map((record, index) => {
                    if (index < embeddings.length) {
                        const embedding = embeddings[index];
                        const embeddingJson = JSON.stringify(embedding);
                        return db_1.prisma.$executeRaw `
            UPDATE Record 
            SET embeddingJson = ${embeddingJson}, 
                embeddingVec = ${embeddingJson}
            WHERE id = ${record.id}
          `;
                    }
                    return Promise.resolve();
                });
                yield Promise.all(updatePromises);
            }
            catch (error) {
                console.error(`Failed to process batch ${batchIndex + 1}:`, error);
            }
        }
    });
}
function queueAsyncProcessing(companyId, uploadId, recordIds, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, bus_1.publish)("embeddings.generate", {
            companyId,
            uploadId: uploadId,
            recordIds,
            originalFileName: fileName,
        });
    });
}
