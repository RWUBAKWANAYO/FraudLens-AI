"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignature = createSignature;
exports.getWebhookEvents = getWebhookEvents;
exports.shouldDeliverEvent = shouldDeliverEvent;
exports.shouldDeliverToWebhook = shouldDeliverToWebhook;
exports.isRetryableError = isRetryableError;
exports.formatPayloadForDestination = formatPayloadForDestination;
const crypto_1 = require("crypto");
function createSignature(secret, payload) {
    const hmac = (0, crypto_1.createHmac)("sha256", secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest("hex");
}
function getWebhookEvents(webhook) {
    try {
        if (Array.isArray(webhook.events)) {
            return webhook.events;
        }
        if (typeof webhook.events === "string") {
            return JSON.parse(webhook.events);
        }
        if (webhook.events && typeof webhook.events === "object") {
            return Object.values(webhook.events);
        }
        return ["threat.created"];
    }
    catch (error) {
        return ["threat.created"];
    }
}
function shouldDeliverEvent(webhook, eventType) {
    const webhookEvents = getWebhookEvents(webhook);
    return webhookEvents.includes(eventType);
}
function shouldDeliverToWebhook(webhookUrl, isProduction, _environment) {
    if (!isProduction) {
        if (webhookUrl.includes("webhook.site")) {
            return true;
        }
        if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
            return true;
        }
        const isTestWebhook = webhookUrl.includes("test") || webhookUrl.includes("mock") || webhookUrl.includes("staging");
        return isTestWebhook;
    }
    return true;
}
function isRetryableError(error) {
    if (error.name === "AbortError")
        return true;
    if (error.code === "ECONNRESET")
        return true;
    if (error.code === "ETIMEDOUT")
        return true;
    if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
        return true;
    }
    if (error.statusCode === 429)
        return true;
    return false;
}
function formatPayloadForDestination(payload, webhookUrl, threatTypeMap) {
    var _a, _b, _c, _d, _e;
    if (webhookUrl.includes("hooks.slack.com") && payload.event === "upload.complete") {
        const uploadData = ((_a = payload.data) === null || _a === void 0 ? void 0 : _a.upload) || {};
        const summary = ((_b = payload.data) === null || _b === void 0 ? void 0 : _b.summary) || {};
        if (!summary.flagged || summary.flagged === 0) {
            return null;
        }
        const primaryThreat = threatTypeMap[(_d = (_c = summary.byRule) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.rule_id] || "N/A";
        const dashboardUrl = process.env.FRONTEND_URL || "https://yourplatform.com";
        const reportId = uploadData.id || "123";
        return {
            text: `Fraud Detection Report\n\n• ${summary.totalRecords} records analyzed\n• ${summary.flagged} suspicious transaction${summary.flagged !== 1 ? "s" : ""} flagged (USD ${((_e = summary.flaggedValue) === null || _e === void 0 ? void 0 : _e.toFixed(2)) || "0.00"})\n\nDetected include: ${primaryThreat}\n\nView full details in FraudGuard: ${dashboardUrl}/dashboard/reports/${reportId}`,
        };
    }
    if (webhookUrl.includes("hooks.slack.com") && payload.event === "threat.created") {
        return null;
    }
    return payload;
}
