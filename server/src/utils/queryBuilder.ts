import { BuildQueryOptions, PaginationResult } from "../types/queryBuilder";

export class QueryBuilder {
  static buildPagination(page: number = 1, limit: number = 50) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const skip = (pageNum - 1) * limitNum;

    return { skip, take: limitNum, page: pageNum, limit: limitNum };
  }

  static buildSort(
    sortBy: string | undefined,
    sortOrder: "asc" | "desc" | undefined,
    options: BuildQueryOptions
  ) {
    const validSort = options.validSortFields.includes(sortBy || "")
      ? sortBy
      : options.defaultSort || options.validSortFields[0];

    return { [validSort!]: sortOrder || "desc" };
  }

  static buildWhere(
    baseWhere: any,
    filters: Record<string, any>,
    searchFields?: string[],
    searchTerm?: string
  ) {
    const where = { ...baseWhere };

    const dateRangeParams = ["startDate", "endDate"];
    const regularFilters = { ...filters };

    dateRangeParams.forEach((param) => {
      delete regularFilters[param];
    });

    for (const [key, value] of Object.entries(regularFilters)) {
      if (value !== undefined && value !== null && value !== "") {
        if (key.includes("Min") || key.includes("Max")) {
          const field = key.replace(/(Min|Max)$/, "");
          const operator = key.endsWith("Min") ? "gte" : "lte";

          if (!where[field]) where[field] = {};
          where[field][operator] = value;
        } else if (typeof value === "boolean" || value === "true" || value === "false") {
          where[key] = value === "true" ? true : value === "false" ? false : value;
        } else {
          where[key] = value;
        }
      }
    }

    if (searchTerm && searchFields && searchFields.length > 0) {
      where.OR = searchFields.map((field) => ({
        [field]: { contains: searchTerm },
      }));
    }

    return where;
  }

  static buildDateRange(
    where: any,
    startDate?: string,
    endDate?: string,
    field: string = "createdAt"
  ) {
    if (startDate || endDate) {
      where[field] = where[field] || {};
      if (startDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        where[field].gte = startDateObj;
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        where[field].lte = endDateObj;
      }
    }
    return where;
  }

  static async buildPaginationResult(
    model: any,
    where: any,
    page: number,
    limit: number
  ): Promise<PaginationResult> {
    const totalCount = await model.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    return {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  static validateCompanyId(companyId: string | undefined): string {
    if (!companyId) {
      throw new Error("companyId is required");
    }
    return companyId as string;
  }
}
