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
const db_1 = require("../config/db");
const leakDetection_1 = require("./leakDetection");
const uploadUtils_1 = require("../utils/uploadUtils");
const uploadService_1 = require("./uploadService");
const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";
function processJsonData(jsonData_1, companyId_1) {
    return __awaiter(this, arguments, void 0, function* (jsonData, companyId, sourceName = "direct-data-upload") {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        const dataHash = (0, uploadUtils_1.sha256)(Buffer.from(JSON.stringify(dataArray)));
        // Check for duplicate data processing (optional)
        const duplicateResult = yield (0, uploadService_1.checkDuplicateUpload)(companyId, dataHash);
        if (duplicateResult) {
            return duplicateResult;
        }
        // Create data processing record (not a file upload)
        const dataProcess = yield (0, uploadService_1.createUploadRecord)(companyId, sourceName, undefined, dataHash);
        const parsed = parseJsonData(dataArray);
        const recordsToInsert = parsed.map((record) => (0, uploadUtils_1.prepareRecordData)(record, companyId, dataProcess.id, "direct-json"));
        yield (0, uploadService_1.bulkInsertRecords)(recordsToInsert);
        if (dataArray.length > 100 || EMBEDDINGS_ASYNC) {
            yield queueAsyncDataProcessing(companyId, dataProcess.id, recordsToInsert.map((r) => r.id), sourceName);
            return {
                dataUploadId: dataProcess.id,
                recordsProcessed: dataArray.length,
                threatsDetected: 0,
                summary: {
                    totalRecords: dataArray.length,
                    flagged: 0,
                    flaggedValue: 0,
                },
                processingMode: "async",
            };
        }
        // Synchronous processing
        const insertedRecords = yield db_1.prisma.record.findMany({
            where: { dataProcessId: dataProcess.id },
            orderBy: { createdAt: "asc" },
        });
        yield (0, uploadService_1.generateEmbeddingsForRecords)(insertedRecords);
        const recordsWithEmbeddings = yield db_1.prisma.record.findMany({
            where: { dataProcessId: dataProcess.id },
            orderBy: { createdAt: "asc" },
        });
        const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)(recordsWithEmbeddings, dataProcess.id, companyId);
        return {
            dataUploadId: dataProcess.id,
            recordsProcessed: insertedRecords.length,
            threatsDetected: threatsCreated.length,
            summary,
            processingMode: "sync",
        };
    });
}
// async function checkDuplicateDataProcessing(companyId: string, dataHash: string) {
//   const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
//   const previousProcess = await prisma.dataProcess.findFirst({
//     where: {
//       companyId,
//       dataHash,
//       createdAt: { gte: dedupeSince },
//     },
//     include: {
//       records: {
//         include: {
//           threats: true,
//         },
//       },
//     },
//   });
//   if (!previousProcess) return null;
//   const threats = previousProcess.records.flatMap((record) => record.threats);
//   const uniqueFlagged = new Set(threats.map((t) => t.recordId).filter(Boolean) as string[]);
//   const flaggedValue = previousProcess.records
//     .filter((record) => uniqueFlagged.has(record.id))
//     .reduce((sum, record) => sum + (record.amount ?? 0), 0);
//   return {
//     dataUploadId: previousProcess.id,
//     recordsProcessed: previousProcess.records.length,
//     threatsDetected: threats.length,
//     summary: {
//       totalRecords: previousProcess.records.length,
//       flagged: uniqueFlagged.size,
//       flaggedValue,
//       message: `Reused prior results from data processing ${previousProcess.id}.`,
//     },
//     processingMode: "duplicate" as const,
//   };
// }
// async function createUploadRecord(
//   companyId: string,
//   sourceName: string,
//   dataHash: string,
//   recordCount: number
// ) {
//   return prisma.dataProcess.create({
//     data: {
//       companyId,
//       sourceName,
//       dataHash,
//       recordCount,
//       status: "processing",
//     },
//   });
// }
function queueAsyncDataProcessing(companyId, dataProcessId, recordIds, sourceName) {
    return __awaiter(this, void 0, void 0, function* () {
        // Your queue implementation
        yield publish("data.process", {
            companyId,
            dataProcessId,
            recordIds,
            sourceName,
        });
    });
}
// Reuse existing functions with modifications
function parseJsonData(data) {
    return data.map((item, index) => ({
        txId: item.txId || `json-${Date.now()}-${index}`,
        partner: item.partner,
        amount: typeof item.amount === "string"
            ? parseFloat(item.amount.replace(/[^\d.-]/g, ""))
            : Number(item.amount) || 0,
        date: item.date ? new Date(item.date).toISOString() : undefined,
        currency: item.currency || "USD",
        ip: item.ip,
        device: item.device,
        raw: item,
        embeddingJson: null,
    }));
}
