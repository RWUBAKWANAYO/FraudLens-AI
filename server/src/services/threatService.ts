import { prisma } from "../config/db";
import { QueryBuilder } from "../utils/queryBuilder";
import { ThreatQueryParams } from "../types/threat";
import { PaginationResult } from "../types/queryBuilder";
import { THREAT_INCLUDE, VALID_THREAT_SORT_FIELDS } from "../utils/constants";

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
}
