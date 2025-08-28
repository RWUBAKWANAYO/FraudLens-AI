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
const db_1 = require("../config/db");
const error_1 = require("../types/error");
const redis_1 = require("../config/redis");
const constants_1 = require("../utils/constants");
const webhookUtils_1 = require("../utils/webhookUtils");
class WebhookService {
    constructor() {
        this.retryDelays = [1000, 5000, 15000, 30000, 60000];
        this.maxRetries = 5;
        this.isProduction = process.env.NODE_ENV === "production";
        this.environment = process.env.NODE_ENV || "development";
        this.rateLimitConfig = {
            maxRequests: 100,
            timeWindow: 60000,
        };
    }
    static getInstance() {
        if (!WebhookService.instance) {
            WebhookService.instance = new WebhookService();
        }
        return WebhookService.instance;
    }
    checkRateLimit(webhookUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const redis = yield (0, redis_1.getRedis)();
                const key = `rate_limit:${webhookUrl}`;
                const current = yield redis.incr(key);
                if (current === 1) {
                    yield redis.expire(key, this.rateLimitConfig.timeWindow / 1000);
                }
                return current <= this.rateLimitConfig.maxRequests;
            }
            catch (error) {
                return true;
            }
        });
    }
    deliverWebhook(webhook_1, payload_1) {
        return __awaiter(this, arguments, void 0, function* (webhook, payload, attempt = 0) {
            const startTime = Date.now();
            try {
                if (!(yield this.checkRateLimit(webhook.url))) {
                    throw new error_1.WebhookError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, true);
                }
                if (!(0, webhookUtils_1.shouldDeliverToWebhook)(webhook.url, this.isProduction, this.environment)) {
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
                const formattedPayload = (0, webhookUtils_1.formatPayloadForDestination)(enhancedPayload, webhook.url, constants_1.THREAT_TYPE_MAP);
                if (formattedPayload === null) {
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
                        "X-Webhook-Signature": (0, webhookUtils_1.createSignature)(webhook.secret, enhancedPayload),
                        "X-Webhook-Event": payload.event,
                        "X-Webhook-Environment": this.environment,
                        "User-Agent": "FraudDetectionWebhook/1.0",
                        "X-Attempt": attempt.toString(),
                    },
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
                const isRetryable = (0, webhookUtils_1.isRetryableError)(error);
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
    deliverWithRetry(webhook, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, webhookUtils_1.shouldDeliverEvent)(webhook, payload.event)) {
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
            catch (logError) { }
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
            return webhooks.map((webhook) => (Object.assign(Object.assign({}, webhook), { events: (0, webhookUtils_1.getWebhookEvents)(webhook) })));
        });
    }
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
