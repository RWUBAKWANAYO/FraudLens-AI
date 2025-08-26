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
exports.requireWebhookManagement = exports.requireWebhookOwnership = exports.webhookIdValidation = exports.webhookListValidation = exports.webhookUpdateValidation = exports.webhookCreateValidation = void 0;
const express_validator_1 = require("express-validator");
const db_1 = require("../config/db");
exports.webhookCreateValidation = [
    (0, express_validator_1.body)("url")
        .isURL()
        .withMessage("Valid URL is required")
        .custom((url) => {
        // Prevent internal URLs in production
        if (process.env.NODE_ENV === "production") {
            const parsedUrl = new URL(url);
            if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname)) {
                throw new Error("Internal URLs are not allowed in production");
            }
        }
        return true;
    }),
    (0, express_validator_1.body)("events")
        .isArray()
        .withMessage("Events must be an array")
        .custom((events) => {
        const validEvents = ["threat.created", "upload.complete", "upload.progress"];
        if (!events.every((event) => validEvents.includes(event))) {
            throw new Error(`Invalid event types. Allowed: ${validEvents.join(", ")}`);
        }
        return true;
    }),
    (0, express_validator_1.body)("secret")
        .optional()
        .isLength({ min: 16 })
        .withMessage("Secret must be at least 16 characters"),
];
exports.webhookUpdateValidation = [
    (0, express_validator_1.param)("webhookId").isUUID().withMessage("Valid webhook ID is required"),
    (0, express_validator_1.body)("url").optional().isURL().withMessage("Valid URL is required"),
    (0, express_validator_1.body)("events")
        .optional()
        .isArray()
        .withMessage("Events must be an array")
        .custom((events) => {
        const validEvents = ["threat.created", "upload.complete", "upload.progress"];
        if (!events.every((event) => validEvents.includes(event))) {
            throw new Error(`Invalid event types. Allowed: ${validEvents.join(", ")}`);
        }
        return true;
    }),
    (0, express_validator_1.body)("secret")
        .optional()
        .isLength({ min: 16 })
        .withMessage("Secret must be at least 16 characters"),
    (0, express_validator_1.body)("active").optional().isBoolean().withMessage("Active must be a boolean"),
];
exports.webhookListValidation = [
    (0, express_validator_1.query)("companyId").isUUID().withMessage("Valid company ID is required"),
];
exports.webhookIdValidation = [
    (0, express_validator_1.param)("webhookId").isUUID().withMessage("Valid webhook ID is required"),
];
// Middleware to check if user owns the webhook
const requireWebhookOwnership = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { webhookId } = req.params;
        const userCompanyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId;
        if (!userCompanyId) {
            return res.status(401).json({ error: "Authentication required" });
        }
        const webhook = yield db_1.prisma.webhookSubscription.findUnique({
            where: { id: webhookId },
            select: { companyId: true },
        });
        if (!webhook) {
            return res.status(404).json({ error: "Webhook not found" });
        }
        if (webhook.companyId !== userCompanyId) {
            return res.status(403).json({
                error: "Access denied",
                message: "You can only access webhooks from your own company",
            });
        }
        next();
    }
    catch (error) {
        console.error("Webhook ownership check failed:", error);
        res.status(500).json({ error: "Server error during access validation" });
    }
});
exports.requireWebhookOwnership = requireWebhookOwnership;
// Middleware to check if user can manage webhooks (ADMIN or MANAGER)
const requireWebhookManagement = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    const allowedRoles = ["ADMIN", "MANAGER"];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: "Insufficient permissions",
            message: "Only ADMIN and MANAGER roles can manage webhooks",
            requiredRoles: allowedRoles,
            userRole: req.user.role,
        });
    }
    next();
};
exports.requireWebhookManagement = requireWebhookManagement;
