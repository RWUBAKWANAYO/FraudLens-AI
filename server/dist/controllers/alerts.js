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
exports.listAlerts = listAlerts;
const alertService_1 = require("../services/alertService");
const queryBuilder_1 = require("../utils/queryBuilder");
const errorHandler_1 = require("../utils/errorHandler");
function listAlerts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ error: "Missing companyId" });
        }
        try {
            const queryCompanyId = queryBuilder_1.QueryBuilder.validateCompanyId(companyId);
            const queryParams = {
                severity: req.query.severity,
                threatId: req.query.threatId,
                recordId: req.query.recordId,
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
            };
            if (req.query.delivered !== undefined) {
                queryParams.delivered = req.query.delivered === "true";
            }
            if (req.query.startDate)
                queryParams.startDate = req.query.startDate;
            if (req.query.endDate)
                queryParams.endDate = req.query.endDate;
            const result = yield alertService_1.AlertService.findMany(queryCompanyId, queryParams);
            res.json(result);
        }
        catch (error) {
            (0, errorHandler_1.handleError)(error, res);
        }
    });
}
