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
exports.queueWebhook = queueWebhook;
exports.startWebhookConsumer = startWebhookConsumer;
const bus_1 = require("./bus");
const webhooks_1 = require("../services/webhooks");
const db_1 = require("../config/db");
const errorHandler_1 = require("../utils/errorHandler");
const constants_1 = require("../utils/constants");
function queueWebhook(webhookId, companyId, event, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            webhookId,
            companyId,
            event,
            data,
            attempt: 0,
            environment: process.env.NODE_ENV,
        };
        return (0, bus_1.publish)(constants_1.WEBHOOK_QUEUE, message);
    });
}
function startWebhookConsumer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, bus_1.consume)(constants_1.WEBHOOK_QUEUE, (message, _channel, _msg) => __awaiter(this, void 0, void 0, function* () {
            const context = `WebhookQueueConsumer-${message.webhookId}-${message.event}`;
            const result = yield (0, errorHandler_1.safeTry)(() => __awaiter(this, void 0, void 0, function* () {
                const webhook = yield db_1.prisma.webhookSubscription.findUnique({
                    where: { id: message.webhookId },
                });
                if (!webhook || !webhook.active) {
                    console.log(`Webhook ${message.webhookId} not found or inactive - will ack and drop`);
                    return;
                }
                yield webhooks_1.webhookService.deliverWithRetry(webhook, {
                    event: message.event,
                    data: message.data,
                });
            }), context);
            if (result.error) {
                yield handleWebhookError(result.error, message);
            }
        }), {
            consumerId: "webhook.deliveries.consumer",
            prefetch: Number(process.env.WEBHOOK_PREFETCH || 5),
            requeueOnError: false,
        });
        yield (0, bus_1.consume)(constants_1.WEBHOOK_RETRY_QUEUE, (message) => __awaiter(this, void 0, void 0, function* () {
            yield (0, bus_1.publish)(constants_1.WEBHOOK_QUEUE, message);
        }), {
            consumerId: "webhook.retries.consumer",
            prefetch: 1,
            requeueOnError: false,
        });
    });
}
function handleWebhookError(error, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentAttempt = message.attempt || 0;
        const maxAttempts = 5;
        errorHandler_1.ErrorHandler.logError(error, `WebhookDelivery-${message.webhookId}`);
        const shouldRetry = currentAttempt < maxAttempts && errorHandler_1.ErrorHandler.isRetryable(error);
        if (shouldRetry) {
            yield scheduleRetry(error, message, currentAttempt);
        }
        else {
            yield moveToDeadLetterQueue(error, message, currentAttempt);
        }
    });
}
function scheduleRetry(_error, message, currentAttempt) {
    return __awaiter(this, void 0, void 0, function* () {
        const nextAttempt = currentAttempt + 1;
        const retryMessage = Object.assign(Object.assign({}, message), { attempt: nextAttempt });
        const delay = Math.min(Math.pow(2, nextAttempt) * 1000, 60000);
        console.log(`Scheduling retry ${nextAttempt}/5 for webhook ${message.webhookId} in ${delay}ms`);
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, bus_1.publish)(constants_1.WEBHOOK_RETRY_QUEUE, retryMessage);
            }
            catch (publishError) {
                errorHandler_1.ErrorHandler.logError(publishError, "WebhookRetryPublish");
            }
        }), delay);
    });
}
function moveToDeadLetterQueue(error, message, finalAttempt) {
    return __awaiter(this, void 0, void 0, function* () {
        console.error(`Max retries exceeded for webhook ${message.webhookId}`);
        const errorMessage = errorHandler_1.ErrorHandler.getErrorMessage(error);
        const errorCode = errorHandler_1.ErrorHandler.getErrorCode(error);
        try {
            yield (0, bus_1.publish)(constants_1.WEBHOOK_DLQ, Object.assign(Object.assign({}, message), { error: errorMessage, errorCode,
                finalAttempt, timestamp: new Date().toISOString() }));
        }
        catch (dlqError) {
            errorHandler_1.ErrorHandler.logError(dlqError, "WebhookDLQCritical");
            console.error("CRITICAL: Failed to publish to dead letter queue:", {
                originalError: errorMessage,
                dlqError: errorHandler_1.ErrorHandler.getErrorMessage(dlqError),
                messageId: message.webhookId,
            });
        }
    });
}
