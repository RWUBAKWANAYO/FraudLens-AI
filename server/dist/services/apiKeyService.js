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
exports.ApiKeyService = void 0;
const db_1 = require("../config/db");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
class ApiKeyService {
    static createApiKey(companyId, userId, name, expiresInDays) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingActiveKeys = yield db_1.prisma.apiKey.count({
                where: { companyId, enabled: true },
            });
            if (existingActiveKeys >= this.MAX_KEYS) {
                throw new Error(`Maximum of ${this.MAX_KEYS} active API keys allowed`);
            }
            const key = `ak_${(0, uuid_1.v4)().replace(/-/g, "")}`;
            const secret = (0, uuid_1.v4)().replace(/-/g, "");
            const hashedSecret = this.hashSecret(secret);
            const expiresAt = expiresInDays
                ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
                : null;
            const apiKey = yield db_1.prisma.apiKey.create({
                data: {
                    companyId,
                    name,
                    key,
                    secret: hashedSecret,
                    expiresAt,
                    createdBy: userId,
                    enabled: true,
                },
            });
            return { apiKey, secret };
        });
    }
    static listApiKeys(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            return db_1.prisma.apiKey.findMany({
                where: { companyId },
                orderBy: { createdAt: "desc" },
            });
        });
    }
    static revokeApiKey(id, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield db_1.prisma.apiKey.updateMany({
                where: { id, companyId, enabled: true },
                data: { enabled: false, lastUsedAt: new Date() },
            });
            if (result.count === 0) {
                throw new Error("API key not found or already revoked");
            }
        });
    }
    static reactivateApiKey(id, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingActiveKeys = yield db_1.prisma.apiKey.count({
                where: { companyId, enabled: true },
            });
            if (existingActiveKeys >= this.MAX_KEYS) {
                throw new Error(`Maximum of ${this.MAX_KEYS} active API keys allowed`);
            }
            const result = yield db_1.prisma.apiKey.updateMany({
                where: { id, companyId, enabled: false },
                data: { enabled: true },
            });
            if (result.count === 0) {
                throw new Error("API key not found or already active");
            }
        });
    }
    static rotateApiKeySecret(id, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const newSecret = (0, uuid_1.v4)().replace(/-/g, "");
            const hashedSecret = this.hashSecret(newSecret);
            const result = yield db_1.prisma.apiKey.updateMany({
                where: { id, companyId, enabled: true },
                data: { secret: hashedSecret, lastUsedAt: new Date() },
            });
            if (result.count === 0) {
                throw new Error("API key not found or revoked");
            }
            return newSecret;
        });
    }
    static getApiKeyDetails(id, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = yield db_1.prisma.apiKey.findFirst({
                where: { id, companyId },
                select: {
                    id: true,
                    name: true,
                    key: true,
                    enabled: true,
                    expiresAt: true,
                    lastUsedAt: true,
                    createdAt: true,
                },
            });
            if (!apiKey) {
                throw new Error("API key not found");
            }
            return apiKey;
        });
    }
    static deleteApiKey(id, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield db_1.prisma.apiKey.deleteMany({
                where: { id, companyId },
            });
            if (result.count === 0) {
                throw new Error("API key not found");
            }
        });
    }
    static hashSecret(secret) {
        return (0, crypto_1.createHmac)("sha256", this.SALT).update(secret).digest("hex");
    }
}
exports.ApiKeyService = ApiKeyService;
ApiKeyService.SALT = process.env.API_KEY_SECRET_SALT || "default-salt";
ApiKeyService.MAX_KEYS = parseInt(process.env.MAX_API_KEYS_PER_COMPANY || "10");
