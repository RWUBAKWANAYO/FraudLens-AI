import { prisma } from "../config/db";
import { QueryBuilder } from "../utils/queryBuilder";
import { ThreatQueryParams } from "../types/threat";
import { PaginationResult } from "../types/queryBuilder";
import { THREAT_INCLUDE, VALID_THREAT_SORT_FIELDS } from "../utils/constants";
import { generateDetailedExplanation } from "./leakExplanation";

export class ThreatService {
  static async findMany(
    companyId: string,
    params: ThreatQueryParams
  ): Promise<{ data: any[]; pagination: PaginationResult }> {
    const { sortBy, sortOrder, page = 1, limit = 50, search, ...filters } = params;

    const where = QueryBuilder.buildWhere(
      { companyId },
      filters,
      ["description", "threatType"],
      search
    );

    QueryBuilder.buildDateRange(where, params.startDate, params.endDate);

    const pagination = QueryBuilder.buildPagination(page, limit);

    const orderBy = QueryBuilder.buildSort(sortBy, sortOrder, {
      validSortFields: VALID_THREAT_SORT_FIELDS,
      defaultSort: "createdAt",
    });

    const [data, _totalCount] = await Promise.all([
      prisma.threat.findMany({
        where,
        include: THREAT_INCLUDE,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.threat.count({ where }),
    ]);

    const paginationResult = await QueryBuilder.buildPaginationResult(
      prisma.threat,
      where,
      pagination.page,
      pagination.limit
    );

    return { data, pagination: paginationResult };
  }

  static async findById(threatId: string) {
    return prisma.threat.findUnique({
      where: { id: threatId },
      include: THREAT_INCLUDE,
    });
  }

  static async getThreatDetails(threatId: string) {
    const threat = await this.findById(threatId);

    if (!threat) {
      throw new Error("Threat not found");
    }

    const metadata = threat.metadata as any;

    if (metadata?.aiExplanation) {
      return threat;
    }

    const context = {
      threat: {
        threatType: threat?.threatType,
        description: threat?.description,
        confidenceScore: threat?.confidenceScore,
        recordId: threat?.recordId,
        uploadId: threat?.uploadId,
      },
      record: threat.record,
      upload: threat.upload,
      additionalContext: metadata?.aiContext?.additionalContext as any,
    };

    const detailedExplanation = await generateDetailedExplanation(context);

    await prisma.threat.update({
      where: { id: threatId },
      data: {
        metadata: {
          ...metadata,
          aiExplanation: detailedExplanation,
          aiGeneratedAt: new Date().toISOString(),
          aiExplanationGenerated: true,
        },
      },
    });

    return {
      threat: {
        ...threat,
        metadata: {
          ...metadata,
          aiExplanation: detailedExplanation,
          aiGeneratedAt: new Date().toISOString(),
          aiExplanationGenerated: true,
        },
      },
    };
  }

  static async updateThreatMetadata(threatId: string, metadata: any) {
    return prisma.threat.update({
      where: { id: threatId },
      data: { metadata },
      include: { record: true },
    });
  }
}
