import { prisma } from "../config/db";
import { QueryBuilder } from "../utils/queryBuilder";
import { PaginationResult } from "../types/queryBuilder";
import { ALERT_INCLUDE, VALID_ALERT_SORT_FIELDS } from "../utils/constants";
import { AlertQueryParams } from "../types/alert";

export class AlertService {
  static async findMany(
    companyId: string,
    params: AlertQueryParams
  ): Promise<{ data: any[]; pagination: PaginationResult }> {
    const { sortBy, sortOrder, page = 1, limit = 50, search, ...filters } = params;

    const where = QueryBuilder.buildWhere({ companyId }, filters, ["title", "summary"], search);

    QueryBuilder.buildDateRange(where, params.startDate, params.endDate);

    const pagination = QueryBuilder.buildPagination(page, limit);

    const orderBy = QueryBuilder.buildSort(sortBy, sortOrder, {
      validSortFields: VALID_ALERT_SORT_FIELDS,
      defaultSort: "createdAt",
    });

    const [data, _totalCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: ALERT_INCLUDE,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.alert.count({ where }),
    ]);

    const paginationResult = await QueryBuilder.buildPaginationResult(
      prisma.alert,
      where,
      pagination.page,
      pagination.limit
    );

    return { data, pagination: paginationResult };
  }
}
