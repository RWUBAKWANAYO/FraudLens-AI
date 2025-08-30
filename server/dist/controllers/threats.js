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
        try {
            const { threatId } = req.params;
            if (!threatId) {
                throw new errorHandler_1.ValidationError("Threat ID is required");
            }
            const threatDetails = yield threatService_1.ThreatService.getThreatDetails(threatId);
            res.json(threatDetails);
        }
        catch (error) {
            (0, errorHandler_1.handleError)(error, res);
        }
    });
}
