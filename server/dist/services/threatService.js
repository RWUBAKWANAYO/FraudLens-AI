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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatService = void 0;
const db_1 = require("../config/db");
const queryBuilder_1 = require("../utils/queryBuilder");
const constants_1 = require("../utils/constants");
const leakExplanation_1 = require("./leakExplanation");
class ThreatService {
    static findMany(companyId, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sortBy, sortOrder, page = 1, limit = 50, search } = params, filters = __rest(params, ["sortBy", "sortOrder", "page", "limit", "search"]);
            const where = queryBuilder_1.QueryBuilder.buildWhere({ companyId }, filters, ["description", "threatType"], search);
            queryBuilder_1.QueryBuilder.buildDateRange(where, params.startDate, params.endDate);
            const pagination = queryBuilder_1.QueryBuilder.buildPagination(page, limit);
            const orderBy = queryBuilder_1.QueryBuilder.buildSort(sortBy, sortOrder, {
                validSortFields: constants_1.VALID_THREAT_SORT_FIELDS,
                defaultSort: "createdAt",
            });
            const [data, _totalCount] = yield Promise.all([
                db_1.prisma.threat.findMany({
                    where,
                    include: constants_1.THREAT_INCLUDE,
                    orderBy,
                    skip: pagination.skip,
                    take: pagination.take,
                }),
                db_1.prisma.threat.count({ where }),
            ]);
            const paginationResult = yield queryBuilder_1.QueryBuilder.buildPaginationResult(db_1.prisma.threat, where, pagination.page, pagination.limit);
            return { data, pagination: paginationResult };
        });
    }
    static findById(threatId) {
        return __awaiter(this, void 0, void 0, function* () {
            return db_1.prisma.threat.findUnique({
                where: { id: threatId },
                include: constants_1.THREAT_INCLUDE,
            });
        });
    }
    static getThreatDetails(threatId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const threat = yield this.findById(threatId);
            if (!threat) {
                throw new Error("Threat not found");
            }
            const metadata = threat.metadata;
            if (metadata === null || metadata === void 0 ? void 0 : metadata.aiExplanation) {
                return {
                    threat: {
                        id: threat.id,
                        threatType: threat.threatType,
                        confidenceScore: threat.confidenceScore,
                        createdAt: threat.createdAt,
                        description: threat.description,
                    },
                    explanation: metadata.aiExplanation,
                    record: threat.record,
                    source: "cached",
                };
            }
            const context = (metadata === null || metadata === void 0 ? void 0 : metadata.aiContext) || {
                threatType: threat.threatType,
                amount: (_a = threat.record) === null || _a === void 0 ? void 0 : _a.amount,
                partner: (_b = threat.record) === null || _b === void 0 ? void 0 : _b.partner,
                txId: (_c = threat.record) === null || _c === void 0 ? void 0 : _c.txId,
                additionalContext: metadata === null || metadata === void 0 ? void 0 : metadata.context,
            };
            const detailedExplanation = yield (0, leakExplanation_1.generateDetailedExplanation)(context);
            const updatedThreat = yield db_1.prisma.threat.update({
                where: { id: threatId },
                data: {
                    metadata: Object.assign(Object.assign({}, metadata), { aiExplanation: detailedExplanation, aiGeneratedAt: new Date().toISOString(), aiExplanationGenerated: true }),
                },
                include: { record: true },
            });
            return {
                threat: {
                    id: updatedThreat.id,
                    threatType: updatedThreat.threatType,
                    confidenceScore: updatedThreat.confidenceScore,
                    createdAt: updatedThreat.createdAt,
                    description: updatedThreat.description,
                },
                explanation: detailedExplanation,
                record: updatedThreat.record,
                source: "generated",
            };
        });
    }
    static updateThreatMetadata(threatId, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            return db_1.prisma.threat.update({
                where: { id: threatId },
                data: { metadata },
                include: { record: true },
            });
        });
    }
}
exports.ThreatService = ThreatService;
