import { prisma } from "../config/db";
import { Record } from "@prisma/client";
import { getEmbeddingsBatch } from "../services/aiEmbedding";
import { publish } from "../queue/bus";
import { QueryBuilder } from "../utils/queryBuilder";

export interface CreateUploadRecordOptions {
  companyId: string;
  fileName: string;
  fileHash: string;
  fileType?: string;
  fileSize?: number;
  publicId?: string;
  secureUrl?: string;
  resourceType?: string;
  source?: string;
  status?: string;
}

const CREATE_MANY_CHUNK = Number(process.env.CREATE_MANY_CHUNK || 2000);
const EMBED_BATCH = Number(process.env.EMBED_BATCH || 50);

export async function checkDuplicateUpload(companyId: string, fileHash: string) {
  const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const prev = await prisma.upload.findFirst({
    where: { companyId, fileHash, createdAt: { gte: dedupeSince } },
    select: { id: true },
  });

  if (!prev) return null;

  const [prevThreats, recs] = await Promise.all([
    prisma.threat.findMany({ where: { uploadId: prev.id } }),
    prisma.record.findMany({ where: { uploadId: prev.id } }),
  ]);

  const uniqueFlagged = new Set(prevThreats.map((t) => t.recordId).filter(Boolean) as string[]);
  const flaggedValue = Array.from(uniqueFlagged).reduce((sum, rid) => {
    const r = recs.find((x) => x.id === rid);
    return sum + (r?.amount ?? 0);
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
}

export async function createUploadRecord(options: CreateUploadRecordOptions) {
  const {
    companyId,
    fileName,
    fileType = null,
    fileHash,
    fileSize = 0,
    publicId = null,
    secureUrl = null,
    resourceType = null,
    source = "batch",
    status = "pending",
  } = options;

  return prisma.upload.create({
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
}
export async function getUploadsList(companyId: string, options: any = {}) {
  const { page = 1, limit = 50, sortBy, sortOrder = "desc", searchTerm, filters = {} } = options;

  const pagination = QueryBuilder.buildPagination(page, limit);

  let where: any = {
    companyId,
    OR: [{ fileSize: { gt: 1 } }, { fileName: { not: "direct-data-upload" } }],
  };

  where = QueryBuilder.buildWhere(where, filters, ["fileName", "fileType"], searchTerm);

  if (filters.createdAtMin || filters.createdAtMax) {
    where = QueryBuilder.buildDateRange(
      where,
      filters.createdAtMin,
      filters.createdAtMax,
      "createdAt"
    );
  }

  if (filters.completedAtMin || filters.completedAtMax) {
    where = QueryBuilder.buildDateRange(
      where,
      filters.completedAtMin,
      filters.completedAtMax,
      "completedAt"
    );
  }

  const validSortFields = [
    "fileName",
    "fileType",
    "fileSize",
    "status",
    "createdAt",
    "completedAt",
  ];
  const orderBy = QueryBuilder.buildSort(sortBy, sortOrder, {
    validSortFields,
    defaultSort: "createdAt",
  });

  const [uploads, _totalCount] = await Promise.all([
    prisma.upload.findMany({
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
    prisma.upload.count({ where }),
  ]);

  // Build pagination result
  const paginationResult = await QueryBuilder.buildPaginationResult(
    prisma.upload,
    where,
    pagination.page,
    pagination.limit
  );

  return {
    uploads,
    pagination: paginationResult,
  };
}

export async function bulkInsertRecords(records: any[]) {
  for (let i = 0; i < records.length; i += CREATE_MANY_CHUNK) {
    const chunk = records.slice(i, i + CREATE_MANY_CHUNK);
    await prisma.record.createMany({ data: chunk });

    if (i % 5000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export async function generateEmbeddingsForRecords(records: Record[]) {
  const batches: Record[][] = [];
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
      const embeddings = await getEmbeddingsBatch(texts);
      const updatePromises = batch.map((record, index) => {
        if (index < embeddings.length) {
          const embedding = embeddings[index];
          const embeddingJson = JSON.stringify(embedding);

          return prisma.$executeRaw`
            UPDATE Record 
            SET embeddingJson = ${embeddingJson}, 
                embeddingVec = ${embeddingJson}
            WHERE id = ${record.id}
          `;
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error(`Failed to process batch ${batchIndex + 1}:`, error);
    }
  }
}

export async function queueAsyncProcessing(
  companyId: string,
  uploadId: string,
  recordIds: string[],
  fileName: string
) {
  await publish("embeddings.generate", {
    companyId,
    uploadId: uploadId,
    recordIds,
    originalFileName: fileName,
  });
}
