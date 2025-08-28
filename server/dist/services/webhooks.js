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
exports.webhookService = exports.WebhookService = void 0;
// server/src/services/webhooks.ts
const db_1 = require("../config/db");
const crypto_1 = require("crypto");
const error_1 = require("../types/error");
const redis_1 = require("../config/redis");
const THREAT_TYPE_MAP = {
    DUP_IN_BATCH__TXID: "Duplicate transaction ID used multiple times",
    DUP_IN_DB__TXID: "Duplicate transaction ID found in historical data",
    DUP_IN_BATCH__CANONICAL: "Suspicious payment pattern detected",
    DUP_IN_DB__CANONICAL: "Historical suspicious payment pattern",
    SIMILARITY_MATCH: "Pattern matching known fraudulent activity",
    RULE_TRIGGER: "Custom security rule violation",
    AMOUNT_ANOMALY: "Unusual transaction amount",
    VELOCITY_ANOMALY: "Unusual transaction frequency",
    GEO_ANOMALY: "Suspicious geographic activity",
    TIME_ANOMALY: "Unusual transaction timing",
};
class WebhookService {
    constructor() {
        this.retryDelays = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff
        this.maxRetries = 5;
        this.isProduction = process.env.NODE_ENV === "production";
        this.environment = process.env.NODE_ENV || "development";
        this.rateLimitConfig = {
            maxRequests: 100,
            timeWindow: 60 * 1000, // 1 minute
        };
    }
    static getInstance() {
        if (!WebhookService.instance) {
            WebhookService.instance = new WebhookService();
        }
        return WebhookService.instance;
    }
    createSignature(secret, payload) {
        const hmac = (0, crypto_1.createHmac)("sha256", secret);
        hmac.update(JSON.stringify(payload));
        return hmac.digest("hex");
    }
    getWebhookEvents(webhook) {
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
            return ["threat.created"]; // default event
        }
        catch (error) {
            console.error("Error parsing webhook events:", error);
            return ["threat.created"];
        }
    }
    shouldDeliverEvent(webhook, eventType) {
        const webhookEvents = this.getWebhookEvents(webhook);
        // Check if webhook is subscribed to this event type
        const shouldDeliver = webhookEvents.includes(eventType);
        if (!shouldDeliver) {
            console.log(`Webhook ${webhook.id} not subscribed to event ${eventType}. Subscribed events:`, webhookEvents);
        }
        return shouldDeliver;
    }
    shouldDeliverToWebhook(webhookUrl) {
        // In development, only deliver to webhooks that are explicitly allowed
        if (!this.isProduction) {
            // Allow webhook.site URLs for testing
            if (webhookUrl.includes("webhook.site")) {
                return true;
            }
            // Allow localhost URLs for development
            if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
                return true;
            }
            // Check if this is a test webhook (you can add more patterns)
            const isTestWebhook = webhookUrl.includes("test") ||
                webhookUrl.includes("mock") ||
                webhookUrl.includes("staging");
            return isTestWebhook;
        }
        // In production, deliver to all webhooks
        return true;
    }
    checkRateLimit(webhookUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the Redis client
                const redis = yield (0, redis_1.getRedis)();
                const key = `rate_limit:${webhookUrl}`;
                const current = yield redis.incr(key);
                if (current === 1) {
                    yield redis.expire(key, this.rateLimitConfig.timeWindow / 1000);
                }
                return current <= this.rateLimitConfig.maxRequests;
            }
            catch (error) {
                // If Redis is unavailable, allow the request to proceed
                console.error("Redis rate limiting failed, allowing request:", error);
                return true;
            }
        });
    }
    deliverWebhook(webhook_1, payload_1) {
        return __awaiter(this, arguments, void 0, function* (webhook, payload, attempt = 0) {
            const startTime = Date.now();
            try {
                // Check rate limit
                if (!(yield this.checkRateLimit(webhook.url))) {
                    throw new error_1.WebhookError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, true);
                }
                // Check if we should deliver to this webhook based on environment
                if (!this.shouldDeliverToWebhook(webhook.url)) {
                    console.log(`Skipping webhook delivery to ${webhook.url} in ${this.environment} environment`);
                    return {
                        success: true,
                        statusCode: 200,
                        retryable: false,
                        responseTime: Date.now() - startTime,
                    };
                }
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const enhancedPayload = Object.assign(Object.assign({}, payload), { environment: this.environment, webhookId: webhook.id, timestamp: new Date().toISOString() });
                // ✅ CRITICAL: Add this line to format the payload for the destination
                const formattedPayload = this.formatPayloadForDestination(enhancedPayload, webhook.url);
                if (formattedPayload === null) {
                    console.log(`Skipping webhook delivery for event ${payload.event} to ${webhook.url}`);
                    return {
                        success: true,
                        statusCode: 200,
                        retryable: false,
                        responseTime: Date.now() - startTime,
                    };
                }
                const response = yield fetch(webhook.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": this.createSignature(webhook.secret, enhancedPayload),
                        "X-Webhook-Event": payload.event,
                        "X-Webhook-Environment": this.environment,
                        "User-Agent": "FraudDetectionWebhook/1.0",
                        "X-Attempt": attempt.toString(),
                    },
                    // ✅ Change this line: use formattedPayload instead of enhancedPayload
                    body: JSON.stringify(formattedPayload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                const isSuccess = response.status >= 200 && response.status < 300;
                if (!isSuccess) {
                    throw new Error(`HTTP ${response.status}: ${yield response.text()}`);
                }
                return {
                    success: true,
                    statusCode: response.status,
                    retryable: false,
                    responseTime: Date.now() - startTime,
                };
            }
            catch (error) {
                console.error(`Webhook delivery attempt ${attempt} failed to ${webhook.url}:`, error.message);
                const isRetryable = this.isRetryableError(error);
                const responseTime = Date.now() - startTime;
                return {
                    success: false,
                    statusCode: error.status,
                    error: error.message,
                    retryable: isRetryable && attempt < this.maxRetries,
                    responseTime,
                };
            }
        });
    }
    isRetryableError(error) {
        // Retry on network errors, timeouts, and 5xx errors
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
    // Add this method to your WebhookService class
    formatPayloadForDestination(payload, webhookUrl) {
        var _a, _b, _c, _d, _e, _f;
        // Format for Slack - UPLOAD COMPLETE (summary notification)
        if (webhookUrl.includes("hooks.slack.com") && payload.event === "upload.complete") {
            const uploadData = ((_a = payload.data) === null || _a === void 0 ? void 0 : _a.upload) || {};
            const summary = ((_b = payload.data) === null || _b === void 0 ? void 0 : _b.summary) || {};
            // Only send notification if threats were found
            if (!summary.flagged || summary.flagged === 0) {
                console.log("No threats detected, skipping Slack notification");
                return null; // Skip delivery
            }
            const primaryThreat = THREAT_TYPE_MAP[(_d = (_c = summary.byRule) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.rule_id] || "N/A";
            const dashboardUrl = process.env.FRONTEND_URL || "https://yourplatform.com";
            const reportId = uploadData.id || "123";
            return {
                text: `📊 Fraud Detection Report Complete\n\n• ${summary.totalRecords} records analyzed\n• ${summary.flagged} suspicious transaction${summary.flagged !== 1 ? "s" : ""} flagged (USD ${((_e = summary.flaggedValue) === null || _e === void 0 ? void 0 : _e.toFixed(2)) || "0.00"})\n\n⚠️ Detected include: ${primaryThreat}\n\n👉 View full details in FraudGuard: ${dashboardUrl}/dashboard/reports/${reportId}`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `📊 *Fraud Detection Report Complete*\n\n• ${summary.totalRecords} records analyzed\n• ${summary.flagged} suspicious transaction${summary.flagged !== 1 ? "s" : ""} flagged (USD ${((_f = summary.flaggedValue) === null || _f === void 0 ? void 0 : _f.toFixed(2)) || "0.00"})\n\n⚠️ *Detected:* ${primaryThreat}`,
                        },
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `👉 View full details in FraudGuard: ${dashboardUrl}/dashboard/reports/${reportId}`,
                        },
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `Completed at: ${payload.timestamp || new Date().toISOString()}`,
                            },
                        ],
                    },
                ],
            };
        }
        // For individual threats to Slack - return null to skip them
        if (webhookUrl.includes("hooks.slack.com") && payload.event === "threat.created") {
            return null; // This prevents individual threat notifications to Slack
        }
        // For other webhooks or events, return the original payload
        return payload;
    }
    deliverWithRetry(webhook, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if webhook is subscribed to this event type
            if (!this.shouldDeliverEvent(webhook, payload.event)) {
                console.log(`Skipping delivery for event ${payload.event} to webhook ${webhook.id}`);
                return;
            }
            for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                const result = yield this.deliverWebhook(webhook, payload, attempt);
                if (result.success) {
                    yield this.logWebhookDelivery(webhook.id, payload, true, attempt, result.responseTime);
                    return;
                }
                if (!result.retryable) {
                    yield this.logWebhookDelivery(webhook.id, payload, false, attempt, result.responseTime, result.error);
                    return;
                }
                const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
                yield new Promise((resolve) => setTimeout(resolve, delay));
            }
            yield this.logWebhookDelivery(webhook.id, payload, false, this.maxRetries, undefined, "Max retries exceeded");
        });
    }
    logWebhookDelivery(webhookId, payload, success, attempt, responseTime, error) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield db_1.prisma.webhookDelivery.create({
                    data: {
                        webhookId,
                        event: payload.event,
                        payload: payload,
                        success,
                        attempt,
                        error,
                        responseTime,
                        environment: this.environment,
                    },
                });
            }
            catch (logError) {
                console.error("Failed to log webhook delivery:", logError);
            }
        });
    }
    getActiveWebhooks(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const webhooks = yield db_1.prisma.webhookSubscription.findMany({
                where: {
                    companyId,
                    active: true,
                },
            });
            // Parse events for each webhook
            return webhooks.map((webhook) => (Object.assign(Object.assign({}, webhook), { events: this.getWebhookEvents(webhook) })));
        });
    }
    // Update getMockWebhooks to include events
    getMockWebhooks(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isProduction) {
                return this.getActiveWebhooks(companyId);
            }
            const mockWebhooks = [
                {
                    id: "dev-webhook-1",
                    url: "https://webhook.site/83d13f0d-0801-4b0c-875d-39730098eb44",
                    secret: "dev-test-secret",
                    companyId,
                    active: true,
                    events: ["threat.created", "alert.created"],
                },
            ];
            const activeWebhooks = yield this.getActiveWebhooks(companyId);
            return [...mockWebhooks, ...activeWebhooks];
        });
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = WebhookService.getInstance();
