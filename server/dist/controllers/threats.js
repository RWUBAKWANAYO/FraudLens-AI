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
exports.listThreats = listThreats;
exports.getThreatDetails = getThreatDetails;
const threatService_1 = require("../services/threatService");
const queryBuilder_1 = require("../utils/queryBuilder");
const errorHandler_1 = require("../utils/errorHandler");
const leakExplanation_1 = require("../services/leakExplanation");
const db_1 = require("../config/db");
function listThreats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ error: "Missing companyId" });
        }
        try {
            const queryCompanyId = queryBuilder_1.QueryBuilder.validateCompanyId(companyId);
            const queryParams = {
                status: req.query.status,
                threatType: req.query.threatType,
                recordId: req.query.recordId,
                uploadId: req.query.uploadId,
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
            };
            if (req.query.confidenceMin) {
                queryParams.confidenceMin = parseFloat(req.query.confidenceMin);
            }
            if (req.query.confidenceMax) {
                queryParams.confidenceMax = parseFloat(req.query.confidenceMax);
            }
            if (req.query.startDate)
                queryParams.startDate = req.query.startDate;
            if (req.query.endDate)
                queryParams.endDate = req.query.endDate;
            const result = yield threatService_1.ThreatService.findMany(queryCompanyId, queryParams);
            res.json(result);
        }
        catch (error) {
            (0, errorHandler_1.handleError)(error, res);
        }
    });
}
function getThreatDetails(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const { threatId } = req.params;
            const threat = yield threatService_1.ThreatService.findById(threatId);
            if (!threat) {
                throw new errorHandler_1.ValidationError("Threat not found");
            }
            const metadata = threat.metadata;
            if (metadata === null || metadata === void 0 ? void 0 : metadata.aiExplanation) {
                return res.json({
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
                });
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
            res.json({
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
            });
        }
        catch (error) {
            (0, errorHandler_1.handleError)(error, res);
        }
    });
}
