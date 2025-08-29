import {
  checkDuplicateUpload,
  createUploadRecord,
  bulkInsertRecords,
  generateEmbeddingsForRecords,
  queueAsyncProcessing,
} from "./uploadService";
import { detectLeaks } from "../services/leakDetection";
import { prepareRecordData, sha256 } from "../utils/uploadUtils";
import { prisma } from "../config/db";
import { Parsed } from "../types/fileParser";

const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";

export async function processJsonData(
  jsonData: Parsed[] | Parsed,
  companyId: string,
  fileName: string = "direct-upload.json"
) {
  // Normalize input to array
  const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

  // Generate hash from the JSON data for deduplication
  const jsonString = JSON.stringify(dataArray);
  const fileHash = sha256(Buffer.from(jsonString));

  // Check for duplicates
  const duplicateResult = await checkDuplicateUpload(companyId, fileHash);
  if (duplicateResult) {
    return duplicateResult;
  }

  // Create upload record
  const upload = await createUploadRecord(companyId, fileName, "application/json", fileHash);

  // Parse JSON data into standardized format
  const parsed = parseJsonData(dataArray);

  const recordsToInsert = parsed.map((record) => prepareRecordData(record, companyId, upload.id));

  await bulkInsertRecords(recordsToInsert);

  // Handle async/sync processing based on record count
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
    embeddingsQueued: EMBEDDINGS_ASYNC,
    processingMode: EMBEDDINGS_ASYNC ? "async" : "sync",
    source: "json",
    message: EMBEDDINGS_ASYNC
      ? "JSON data processed successfully. Records queued for async processing. Threats will be detected shortly."
      : "JSON data processed synchronously. All threats detected.",
  };
}

function parseJsonData(data: Parsed[]): Parsed[] {
  return data.map((item, index) => {
    const amount =
      typeof item.amount === "string"
        ? parseFloat((item.amount as string).replace(/[^\d.-]/g, ""))
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
