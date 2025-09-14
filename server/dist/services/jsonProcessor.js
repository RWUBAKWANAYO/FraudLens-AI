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
function processJsonData(jsonData, companyId, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        const dataHash = (0, uploadUtils_1.sha256)(Buffer.from(JSON.stringify(dataArray)));
        const duplicateResult = yield (0, uploadService_1.checkDuplicateUpload)(companyId, dataHash);
        if (duplicateResult) {
            return duplicateResult;
        }
        const upload = yield (0, uploadService_1.createUploadRecord)({
            companyId,
            fileName: fileName,
            fileHash: dataHash,
        });
        let parsed = (0, uploadUtils_1.parseJsonData)(dataArray);
        const recordsToInsert = parsed.map((record) => (0, uploadUtils_1.prepareRecordData)(record, companyId, upload.id));
        yield (0, uploadService_1.bulkInsertRecords)(recordsToInsert);
        if (parsed.length > 100 || EMBEDDINGS_ASYNC) {
            yield (0, uploadService_1.queueAsyncProcessing)(companyId, upload.id, recordsToInsert.map((r) => r.id), fileName);
            return {
                uploadId: upload.id,
                recordsAnalyzed: parsed.length,
                threats: [],
                summary: { totalRecords: parsed.length, flagged: 0, flaggedValue: 0 },
                processingAsync: true,
            };
        }
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
            processingMode: EMBEDDINGS_ASYNC ? "async" : "sync",
            downloadUrl: `/api/uploads/download/${upload.id}`,
        };
    });
}
