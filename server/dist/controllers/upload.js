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
exports.handleFileUpload = handleFileUpload;
exports.uploadList = uploadList;
const uploadProcessor_1 = require("../services/uploadProcessor");
const jsonProcessor_1 = require("../services/jsonProcessor");
const errorHandler_1 = require("../utils/errorHandler");
const uploadService_1 = require("../services/uploadService");
const uploadUtils_1 = require("../utils/uploadUtils");
function handleFileUpload(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const companyId = req.user.companyId || null;
            if (!companyId) {
                return res.status(400).json({ error: "Missing companyId" });
            }
            if (req.body.data) {
                try {
                    const data = (0, uploadUtils_1.parseJsonData)(req.body.data);
                    const result = yield (0, jsonProcessor_1.processJsonData)(data, companyId, req.body.fileName || "direct-data-upload");
                    return res.json(result);
                }
                catch (error) {
                    return res
                        .status(400)
                        .json({ error: "Invalid JSON data", details: errorHandler_1.ErrorHandler.getErrorMessage(error) });
                }
            }
            const validationError = (0, uploadUtils_1.validateUploadFile)(req.file, req.body.data);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
            const result = yield (0, uploadProcessor_1.processFileUpload)(req.file, companyId);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    });
}
function uploadList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const companyId = req.user.companyId;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const sortBy = req.query.sortBy;
            const sortOrder = req.query.sortOrder;
            const searchTerm = req.query.search;
            const filters = {
                status: req.query.status,
                fileType: req.query.fileType,
                fileName: req.query.fileName,
                createdAtMin: req.query.createdAtMin,
                createdAtMax: req.query.createdAtMax,
                completedAtMin: req.query.completedAtMin,
                completedAtMax: req.query.completedAtMax,
            };
            const result = yield (0, uploadService_1.getUploadsList)(companyId, {
                page,
                limit,
                sortBy,
                sortOrder,
                searchTerm,
                filters,
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
}
