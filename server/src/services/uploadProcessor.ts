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
import { CloudinaryService } from "./cloudinaryService";

const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";

export async function processFileUpload(file: Express.Multer.File, companyId: string) {
  const { buffer, originalname: fileName, mimetype: fileType, size: fileSize } = file;

  validateFileExtension(fileName);

  const fileHash = sha256(buffer);
  const duplicateResult = await checkDuplicateUpload(companyId, fileHash);
  if (duplicateResult) {
    return duplicateResult;
  }

  const cloudinaryResponse = await CloudinaryService.uploadBuffer(
    buffer,
    fileName,
    `company/${companyId}/uploads`
  );

  const upload = await createUploadRecord({
    companyId,
    fileName,
    fileType,
    fileHash,
    fileSize,
    publicId: cloudinaryResponse.public_id,
    secureUrl: cloudinaryResponse.secure_url,
  });

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
      },
      processingAsync: true,
      downloadUrl: `/api/uploads/download/${upload.id}`,
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
