import {
  checkDuplicateUpload,
  createUploadRecord,
  bulkInsertRecords,
  generateEmbeddingsForRecords,
  queueAsyncProcessing,
} from "./uploadService";
import { detectLeaks } from "../services/leakDetection";
import { parseJsonData, prepareRecordData, sha256 } from "../utils/uploadUtils";
import { prisma } from "../config/db";
import { Parsed } from "../types/fileParser";

const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";

export async function processJsonData(
  jsonData: Parsed[] | Parsed,
  companyId: string,
  fileName: string
) {
  const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
  const dataHash = sha256(Buffer.from(JSON.stringify(dataArray)));

  const duplicateResult = await checkDuplicateUpload(companyId, dataHash);
  if (duplicateResult) {
    return duplicateResult;
  }

  const upload = await createUploadRecord({
    companyId,
    fileName: fileName,
    fileHash: dataHash,
  });

  let parsed = parseJsonData(dataArray);
  const recordsToInsert = parsed.map((record) => prepareRecordData(record, companyId, upload.id));

  await bulkInsertRecords(recordsToInsert);

  if (parsed.length > 100 || EMBEDDINGS_ASYNC) {
    await queueAsyncProcessing(
      companyId,
      upload.id,
      recordsToInsert.map((r) => r.id),
      fileName
    );

    return {
      uploadId: upload.id,
      recordsAnalyzed: parsed.length,
      threats: [],
      summary: { totalRecords: parsed.length, flagged: 0, flaggedValue: 0 },
      processingAsync: true,
    };
  }

  const insertedRecords = await prisma.record.findMany({
    where: { uploadId: upload.id },
    orderBy: { createdAt: "asc" },
  });

  await generateEmbeddingsForRecords(insertedRecords);

  const recordsWithEmbeddings = await prisma.record.findMany({
    where: { uploadId: upload.id },
    orderBy: { createdAt: "asc" },
  });

  const { threatsCreated, summary } = await detectLeaks(
    recordsWithEmbeddings,
    upload.id,
    companyId
  );

  return {
    uploadId: upload.id,
    recordsAnalyzed: insertedRecords.length,
    threats: threatsCreated,
    summary,
    processingMode: EMBEDDINGS_ASYNC ? "async" : "sync",
    downloadUrl: `/api/uploads/download/${upload.id}`,
  };
}
