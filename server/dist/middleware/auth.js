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
exports.requireRole = exports.authenticateToken = void 0;
const auth_1 = require("../utils/auth");
const db_1 = require("../config/db");
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Authorization header required" });
        }
        const [bearer, token] = authHeader.split(" ");
        if (bearer !== "Bearer" || !token) {
            return res.status(401).json({ error: "Invalid authorization format. Use: Bearer <token>" });
        }
        const payload = auth_1.AuthUtils.verifyToken(token);
        // Verify user still exists and is active
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
        // Add user to request object
        req.user = {
            id: user.id,
            email: user.email,
            companyId: user.companyId,
            role: user.role,
        };
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(500).json({ error: "Authentication failed" });
    }
});
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: "Insufficient permissions",
                requiredRoles: roles,
                userRole: req.user.role,
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
