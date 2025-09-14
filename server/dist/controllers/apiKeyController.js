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
exports.ApiKeyController = void 0;
const apiKeyService_1 = require("../services/apiKeyService");
class ApiKeyController {
    static createApiKey(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, expiresInDays } = req.body;
                const companyId = req.user.companyId;
                const userId = req.user.id;
                const { apiKey, secret } = yield apiKeyService_1.ApiKeyService.createApiKey(companyId, userId, name, expiresInDays);
                res.status(201).json({
                    id: apiKey.id,
                    key: apiKey.key,
                    secret,
                    name: apiKey.name,
                    expiresAt: apiKey.expiresAt,
                    createdAt: apiKey.createdAt,
                    enabled: apiKey.enabled,
                });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static listApiKeys(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companyId = req.user.companyId;
                const apiKeys = yield apiKeyService_1.ApiKeyService.listApiKeys(companyId);
                res.json(apiKeys);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    static revokeApiKey(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const companyId = req.user.companyId;
                yield apiKeyService_1.ApiKeyService.revokeApiKey(id, companyId);
                res.json({
                    message: "API key revoked successfully",
                    revokedAt: new Date(),
                });
            }
            catch (error) {
                const status = error.message.includes("not found") ? 404 : 400;
                res.status(status).json({ error: error.message });
            }
        });
    }
    static reactivateApiKey(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const companyId = req.user.companyId;
                yield apiKeyService_1.ApiKeyService.reactivateApiKey(id, companyId);
                res.json({
                    message: "API key reactivated successfully",
                    reactivatedAt: new Date(),
                });
            }
            catch (error) {
                const status = error.message.includes("not found") ? 404 : 400;
                res.status(status).json({ error: error.message });
            }
        });
    }
    static rotateApiKeySecret(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const companyId = req.user.companyId;
                const newSecret = yield apiKeyService_1.ApiKeyService.rotateApiKeySecret(id, companyId);
                res.json({
                    message: "API key secret rotated successfully",
                    secret: newSecret,
                    rotatedAt: new Date(),
                });
            }
            catch (error) {
                const status = error.message.includes("not found") ? 404 : 400;
                res.status(status).json({ error: error.message });
            }
        });
    }
    static getApiKeyDetails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const companyId = req.user.companyId;
                const apiKey = yield apiKeyService_1.ApiKeyService.getApiKeyDetails(id, companyId);
                res.json(apiKey);
            }
            catch (error) {
                res.status(404).json({ error: error.message });
            }
        });
    }
    static deleteApiKey(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const companyId = req.user.companyId;
                yield apiKeyService_1.ApiKeyService.deleteApiKey(id, companyId);
                res.json({
                    message: "API key permanently deleted successfully",
                    deletedAt: new Date(),
                });
            }
            catch (error) {
                res.status(404).json({ error: error.message });
            }
        });
    }
}
exports.ApiKeyController = ApiKeyController;
