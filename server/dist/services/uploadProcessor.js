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
exports.processFileUpload = processFileUpload;
const fileParser_1 = require("../utils/fileParser");
const uploadService_1 = require("./uploadService");
const leakDetection_1 = require("../services/leakDetection");
const uploadUtils_1 = require("../utils/uploadUtils");
const db_1 = require("../config/db");
const cloudinaryService_1 = require("./cloudinaryService");
const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";
function processFileUpload(file, companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { buffer, originalname: fileName, mimetype: fileType, size: fileSize } = file;
        (0, uploadUtils_1.validateFileExtension)(fileName);
        const fileHash = (0, uploadUtils_1.sha256)(buffer);
        const duplicateResult = yield (0, uploadService_1.checkDuplicateUpload)(companyId, fileHash);
        if (duplicateResult) {
            return duplicateResult;
        }
        const cloudinaryResponse = yield cloudinaryService_1.CloudinaryService.uploadBuffer(buffer, fileName, `company/${companyId}/uploads`);
        const upload = yield (0, uploadService_1.createUploadRecord)({
            companyId,
            fileName,
            fileType,
            fileHash,
            fileSize,
            publicId: cloudinaryResponse.public_id,
            secureUrl: cloudinaryResponse.secure_url,
        });
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
                },
                processingAsync: true,
                downloadUrl: `/api/uploads/download/${upload.id}`,
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
