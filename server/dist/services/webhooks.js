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
// services/webhooks.ts - PRODUCTION READY WITH ENV AWARENESS
const db_1 = require("../config/db");
const crypto_1 = require("crypto");
class WebhookService {
    constructor() {
        this.retryDelays = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff
        this.maxRetries = 5;
        this.isProduction = process.env.NODE_ENV === "production";
        this.environment = process.env.NODE_ENV || "development";
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
    deliverWebhook(webhook_1, payload_1) {
        return __awaiter(this, arguments, void 0, function* (webhook, payload, attempt = 0) {
            const startTime = Date.now();
            try {
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
                    body: JSON.stringify(enhancedPayload),
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
            // Return mock webhooks for development with events
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
