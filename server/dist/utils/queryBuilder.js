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
exports.QueryBuilder = void 0;
class QueryBuilder {
    static buildPagination(page = 1, limit = 50) {
        const pageNum = Math.max(1, page);
        const limitNum = Math.min(Math.max(1, limit), 100);
        const skip = (pageNum - 1) * limitNum;
        return { skip, take: limitNum, page: pageNum, limit: limitNum };
    }
    static buildSort(sortBy, sortOrder, options) {
        const validSort = options.validSortFields.includes(sortBy || "")
            ? sortBy
            : options.defaultSort || options.validSortFields[0];
        return { [validSort]: sortOrder || "desc" };
    }
    static buildWhere(baseWhere, filters, searchFields, searchTerm) {
        const where = Object.assign({}, baseWhere);
        const dateRangeParams = ["startDate", "endDate"];
        const regularFilters = Object.assign({}, filters);
        dateRangeParams.forEach((param) => {
            delete regularFilters[param];
        });
        for (const [key, value] of Object.entries(regularFilters)) {
            if (value !== undefined && value !== null && value !== "") {
                if (key.includes("Min") || key.includes("Max")) {
                    const field = key.replace(/(Min|Max)$/, "");
                    const operator = key.endsWith("Min") ? "gte" : "lte";
                    if (!where[field])
                        where[field] = {};
                    where[field][operator] = value;
                }
                else if (typeof value === "boolean" || value === "true" || value === "false") {
                    where[key] = value === "true" ? true : value === "false" ? false : value;
                }
                else {
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
    static buildDateRange(where, startDate, endDate, field = "createdAt") {
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
    static buildPaginationResult(model, where, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalCount = yield model.count({ where });
            const totalPages = Math.ceil(totalCount / limit);
            return {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            };
        });
    }
    static validateCompanyId(companyId) {
        if (!companyId) {
            throw new Error("companyId is required");
        }
        return companyId;
    }
}
exports.QueryBuilder = QueryBuilder;
