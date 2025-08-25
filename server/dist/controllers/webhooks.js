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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhook = createWebhook;
exports.listWebhooks = listWebhooks;
exports.updateWebhook = updateWebhook;
exports.testWebhook = testWebhook;
exports.deleteWebhook = deleteWebhook;
const db_1 = require("../config/db");
const webhooks_1 = require("../services/webhooks");
const crypto_1 = __importDefault(require("crypto"));
function createWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { companyId, url, secret, events = ["threat.created"] } = req.body;
            // Validate and format events as JSON array
            const validEvents = Array.isArray(events)
                ? events.filter((event) => typeof event === "string")
                : ["threat.created"];
            const webhook = yield db_1.prisma.webhookSubscription.create({
                data: {
                    companyId,
                    url,
                    secret: secret || generateRandomSecret(),
                    events: validEvents, // This will be stored as JSON
                    active: true,
                },
            });
            res.json(webhook);
        }
        catch (error) {
            console.error("Failed to create webhook:", error);
            res.status(500).json({ error: "Failed to create webhook" });
        }
    });
}
function listWebhooks(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { companyId } = req.query;
            if (!companyId) {
                return res.status(400).json({ error: "companyId is required" });
            }
            const webhooks = yield db_1.prisma.webhookSubscription.findMany({
                where: { companyId: companyId },
                include: {
                    deliveries: {
                        orderBy: { createdAt: "desc" },
                        take: 10,
                    },
                },
            });
            // Parse events from JSON if needed
            const webhooksWithParsedEvents = webhooks.map((webhook) => (Object.assign(Object.assign({}, webhook), { events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events) })));
            res.json(webhooksWithParsedEvents);
        }
        catch (error) {
            console.error("Failed to fetch webhooks:", error);
            res.status(500).json({ error: "Failed to fetch webhooks" });
        }
    });
}
function updateWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { webhookId } = req.params;
            const { url, secret, events, active } = req.body;
            const updateData = {};
            if (url)
                updateData.url = url;
            if (secret)
                updateData.secret = secret;
            if (typeof active === "boolean")
                updateData.active = active;
            if (events) {
                // Format events as JSON array
                const validEvents = Array.isArray(events)
                    ? events.filter((event) => typeof event === "string")
                    : ["threat.created"];
                updateData.events = validEvents;
            }
            const webhook = yield db_1.prisma.webhookSubscription.update({
                where: { id: webhookId },
                data: updateData,
            });
            // Parse events for response
            const responseWebhook = Object.assign(Object.assign({}, webhook), { events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events) });
            res.json(responseWebhook);
        }
        catch (error) {
            console.error("Failed to update webhook:", error);
            res.status(500).json({ error: "Failed to update webhook" });
        }
    });
}
function testWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { webhookId } = req.params;
            const webhook = yield db_1.prisma.webhookSubscription.findUnique({
                where: { id: webhookId },
            });
            if (!webhook) {
                return res.status(404).json({ error: "Webhook not found" });
            }
            const testPayload = {
                event: "test",
                data: {
                    message: "Test webhook delivery",
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV,
                },
            };
            const result = yield webhooks_1.webhookService.deliverWebhook(webhook, testPayload);
            res.json({
                success: result.success,
                status: result.statusCode,
                message: result.success ? "Webhook test successful" : "Webhook test failed",
                error: result.error,
                responseTime: result.responseTime,
            });
        }
        catch (error) {
            console.error("Webhook test failed:", error);
            res.status(500).json({ error: "Webhook test failed" });
        }
    });
}
function deleteWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { webhookId } = req.params;
            yield db_1.prisma.webhookSubscription.delete({
                where: { id: webhookId },
            });
            res.json({ success: true, message: "Webhook deleted successfully" });
        }
        catch (error) {
            console.error("Failed to delete webhook:", error);
            res.status(500).json({ error: "Failed to delete webhook" });
        }
    });
}
function generateRandomSecret() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
