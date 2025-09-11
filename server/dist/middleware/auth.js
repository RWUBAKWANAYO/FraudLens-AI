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
exports.requireRole = exports.authenticateTokenOrApiKey = void 0;
const auth_1 = require("../utils/auth");
const db_1 = require("../config/db");
const crypto_1 = require("crypto");
const authenticateTokenOrApiKey = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const [bearer, token] = authHeader.split(" ");
            if (bearer === "Bearer" && token) {
                return yield handleJwtAuth(req, res, next, token);
            }
            const [keyType, credentials] = authHeader.split(" ");
            if (keyType === "APIKey" && credentials) {
                return yield handleApiKeyAuth(req, res, next, credentials);
            }
        }
        const apiKey = req.headers["x-api-key"];
        const apiSecret = req.headers["x-api-secret"];
        if (apiKey && apiSecret) {
            return yield handleApiKeyAuth(req, res, next, `${apiKey}:${apiSecret}`);
        }
        if (req.query.apiKey && req.query.apiSecret) {
            return yield handleApiKeyAuth(req, res, next, `${req.query.apiKey}:${req.query.apiSecret}`);
        }
        return res.status(401).json({
            error: "Authentication required",
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Authentication failed" });
    }
});
exports.authenticateTokenOrApiKey = authenticateTokenOrApiKey;
const handleJwtAuth = (req, res, next, token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = auth_1.AuthUtils.verifyAccessToken(token);
        const user = yield db_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                isVerified: true,
                role: true,
                companyId: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        if (!user.isVerified) {
            return res.status(401).json({ error: "Please verify your email before logging in" });
        }
        req.user = {
            id: user.id,
            email: user.email,
            companyId: user.companyId,
            role: user.role,
            authMethod: "jwt",
        };
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Token expired",
                code: "TOKEN_EXPIRED",
            });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(401).json({ error: "Authentication failed" });
    }
});
const handleApiKeyAuth = (req, res, next, credentials) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [key, secret] = credentials.split(":");
        if (!key || !secret) {
            return res.status(401).json({
                error: "Invalid API key format",
            });
        }
        const hashedSecret = (0, crypto_1.createHmac)("sha256", process.env.API_KEY_SECRET_SALT || "default-salt")
            .update(secret)
            .digest("hex");
        const apiKey = yield db_1.prisma.apiKey.findFirst({
            where: {
                key,
                secret: hashedSecret,
                enabled: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
        if (!apiKey) {
            return res.status(401).json({
                error: "Invalid API credentials",
            });
        }
        yield db_1.prisma.apiKey.updateMany({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        });
        req.user = {
            id: apiKey.createdBy,
            email: `api-key-${apiKey.id}@company.com`,
            companyId: apiKey.companyId,
            role: "API_CLIENT",
            authMethod: "api_key",
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: "Authentication failed" });
    }
});
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (req.user.authMethod === "api_key") {
            const allowedApiKeyRoles = ["ADMIN", "MANAGER", "API_CLIENT"];
            if (!allowedApiKeyRoles.some((role) => roles.includes(role))) {
                return res.status(403).json({
                    error: "API key has insufficient permissions",
                });
            }
        }
        else {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    error: "Insufficient permissions",
                });
            }
        }
        next();
    };
};
exports.requireRole = requireRole;
