import { parseBuffer } from "../utils/fileParser";
import {
  checkDuplicateUpload,
  createUploadRecord,
  bulkInsertRecords,
  generateEmbeddingsForRecords,
  queueAsyncProcessing,
} from "./uploadService";
import { detectLeaks } from "../services/leakDetection";
import { prepareRecordData, sha256, validateFileExtension } from "../utils/uploadUtils";
import { prisma } from "../config/db";

const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";

export async function processUpload(file: Express.Multer.File, companyId: string) {
  const { buffer, originalname: fileName, mimetype: fileType } = file;

  validateFileExtension(fileName);

  const fileHash = sha256(buffer);
  const duplicateResult = await checkDuplicateUpload(companyId, fileHash);
  if (duplicateResult) {
    return duplicateResult;
  }

  const upload = await createUploadRecord(companyId, fileName, fileType, fileHash);
  const parsed = await parseBuffer(buffer, fileName);

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
      summary: {
        totalRecords: parsed.length,
        flagged: 0,
        flaggedValue: 0,
        message: `File uploaded successfully. ${parsed.length} records queued for processing. Threats will be detected asynchronously.`,
      },
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
    embeddingsQueued: EMBEDDINGS_ASYNC,
    processingMode: EMBEDDINGS_ASYNC ? "async" : "sync",
    message: EMBEDDINGS_ASYNC
      ? "File uploaded successfully. Records queued for async processing. Threats will be detected shortly."
      : "File processed synchronously. All threats detected.",
  };
}
