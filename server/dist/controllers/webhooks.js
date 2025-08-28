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
exports.createWebhook = void 0;
exports.listWebhooks = listWebhooks;
exports.updateWebhook = updateWebhook;
exports.deleteWebhook = deleteWebhook;
const db_1 = require("../config/db");
const crypto_1 = __importDefault(require("crypto"));
const createWebhook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { url, events, secret } = req.body;
        const companyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId;
        if (!companyId) {
            return res.status(401).json({ error: "Invalid authorization" });
        }
        const webhook = yield db_1.prisma.webhookSubscription.create({
            data: {
                companyId,
                url,
                events,
                secret: secret || crypto_1.default.randomBytes(32).toString("hex"),
            },
        });
        res.status(201).json(Object.assign(Object.assign({}, webhook), { events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events) }));
    }
    catch (error) {
        next(error);
    }
});
exports.createWebhook = createWebhook;
function listWebhooks(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { companyId } = req.query;
            const userCompanyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId;
            if (companyId !== userCompanyId) {
                return res.status(403).json({
                    error: "Access denied",
                    message: "You can only access webhooks from your own company",
                });
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
                const validEvents = Array.isArray(events)
                    ? events.filter((event) => typeof event === "string")
                    : ["threat.created"];
                updateData.events = validEvents;
            }
            const webhook = yield db_1.prisma.webhookSubscription.update({
                where: { id: webhookId },
                data: updateData,
            });
            const responseWebhook = Object.assign(Object.assign({}, webhook), { events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events) });
            res.json(responseWebhook);
        }
        catch (error) {
            console.error("Failed to update webhook:", error);
            res.status(500).json({ error: "Failed to update webhook" });
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
