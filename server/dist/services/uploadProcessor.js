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
exports.processUpload = processUpload;
const fileParser_1 = require("../utils/fileParser");
const uploadService_1 = require("./uploadService");
const leakDetection_1 = require("../services/leakDetection");
const uploadUtils_1 = require("../utils/uploadUtils");
const db_1 = require("../config/db");
const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";
function processUpload(file, companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { buffer, originalname: fileName, mimetype: fileType } = file;
        (0, uploadUtils_1.validateFileExtension)(fileName);
        const fileHash = (0, uploadUtils_1.sha256)(buffer);
        const duplicateResult = yield (0, uploadService_1.checkDuplicateUpload)(companyId, fileHash);
        if (duplicateResult) {
            return duplicateResult;
        }
        const upload = yield (0, uploadService_1.createUploadRecord)(companyId, fileName, fileType, fileHash);
        const parsed = yield (0, fileParser_1.parseBuffer)(buffer, fileName);
        const recordsToInsert = parsed.map((record) => (0, uploadUtils_1.prepareRecordData)(record, companyId, upload.id));
        yield (0, uploadService_1.bulkInsertRecords)(recordsToInsert);
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
                    message: `File uploaded successfully. ${parsed.length} records queued for processing. Threats will be detected asynchronously.`,
                },
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
            embeddingsQueued: EMBEDDINGS_ASYNC,
            processingMode: EMBEDDINGS_ASYNC ? "async" : "sync",
            message: EMBEDDINGS_ASYNC
                ? "File uploaded successfully. Records queued for async processing. Threats will be detected shortly."
                : "File processed synchronously. All threats detected.",
        };
    });
}
