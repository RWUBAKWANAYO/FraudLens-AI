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
exports.processJsonData = processJsonData;
const uploadService_1 = require("./uploadService");
const leakDetection_1 = require("../services/leakDetection");
const uploadUtils_1 = require("../utils/uploadUtils");
const db_1 = require("../config/db");
const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";
function processJsonData(jsonData_1, companyId_1) {
    return __awaiter(this, arguments, void 0, function* (jsonData, companyId, fileName = "direct-upload.json") {
        // Normalize input to array
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        // Generate hash from the JSON data for deduplication
        const jsonString = JSON.stringify(dataArray);
        const fileHash = (0, uploadUtils_1.sha256)(Buffer.from(jsonString));
        // Check for duplicates
        const duplicateResult = yield (0, uploadService_1.checkDuplicateUpload)(companyId, fileHash);
        if (duplicateResult) {
            return duplicateResult;
        }
        // Create upload record
        const upload = yield (0, uploadService_1.createUploadRecord)(companyId, fileName, "application/json", fileHash);
        // Parse JSON data into standardized format
        const parsed = parseJsonData(dataArray);
        const recordsToInsert = parsed.map((record) => (0, uploadUtils_1.prepareRecordData)(record, companyId, upload.id));
        yield (0, uploadService_1.bulkInsertRecords)(recordsToInsert);
        // Handle async/sync processing based on record count
        if (parsed.length > 100 || EMBEDDINGS_ASYNC) {
            yield (0, uploadService_1.queueAsyncProcessing)(companyId, upload.id, recordsToInsert.map((r) => r.id), fileName);
            return {
                uploadId: upload.id,
                recordsAnalyzed: parsed.length,
                threats: [],
                summary: {
                    totalRecords: parsed.length,
                    flagged: 0,
                    flaggedValue: 0,
                    message: `JSON data processed successfully. ${parsed.length} records queued for processing. Threats will be detected asynchronously.`,
                },
                processingAsync: true,
                source: "json",
            };
        }
        // Synchronous processing for small datasets
        const insertedRecords = yield db_1.prisma.record.findMany({
            where: { uploadId: upload.id },
            orderBy: { createdAt: "asc" },
        });
        yield (0, uploadService_1.generateEmbeddingsForRecords)(insertedRecords);
        const recordsWithEmbeddings = yield db_1.prisma.record.findMany({
            where: { uploadId: upload.id },
            orderBy: { createdAt: "asc" },
        });
        const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)(recordsWithEmbeddings, upload.id, companyId);
        return {
            uploadId: upload.id,
            recordsAnalyzed: insertedRecords.length,
            threats: threatsCreated,
            summary,
            embeddingsQueued: EMBEDDINGS_ASYNC,
            processingMode: EMBEDDINGS_ASYNC ? "async" : "sync",
            source: "json",
            message: EMBEDDINGS_ASYNC
                ? "JSON data processed successfully. Records queued for async processing. Threats will be detected shortly."
                : "JSON data processed synchronously. All threats detected.",
        };
    });
}
function parseJsonData(data) {
    return data.map((item, index) => {
        const amount = typeof item.amount === "string"
            ? parseFloat(item.amount.replace(/[^\d.-]/g, ""))
            : Number(item.amount) || 0;
        const date = item.date ? new Date(item.date).toISOString() : undefined;
        return {
            txId: item.txId || `json-${Date.now()}-${index}`,
            partner: item.partner || undefined,
            amount,
            date,
            email: item.email || undefined,
            currency: item.currency || "USD",
            description: item.description || undefined,
            status: item.status || undefined,
            user_id: item.user_id || undefined,
            account: item.account || undefined,
            card: item.card || undefined,
            bank_account: item.bank_account || undefined,
            account_number: item.account_number || undefined,
            ip: item.ip || undefined,
            device: item.device || undefined,
            raw: item,
            embeddingJson: null,
        };
    });
}
