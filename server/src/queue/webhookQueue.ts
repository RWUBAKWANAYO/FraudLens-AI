// server/src/queue/webhookQueue.ts
import { publish, consume } from "./bus";
import { webhookService } from "../services/webhooks";
import { prisma } from "../config/db";
import { ErrorHandler, safeTry } from "../utils/errorHandler";
import { createAppError } from "../types/error";

const WEBHOOK_QUEUE = "webhook.deliveries";
const WEBHOOK_RETRY_QUEUE = "webhook.retries";
const WEBHOOK_DLQ = "webhook.dead_letter";

interface WebhookMessage {
  webhookId: string;
  companyId: string;
  event: string;
  data: any;
  attempt?: number;
  environment?: string;
}

export async function queueWebhook(
  webhookId: string,
  companyId: string,
  event: string,
  data: any
): Promise<boolean> {
  const message: WebhookMessage = {
    webhookId,
    companyId,
    event,
    data,
    attempt: 0,
    environment: process.env.NODE_ENV,
  };

  return publish(WEBHOOK_QUEUE, message);
}

export async function startWebhookConsumer() {
  await consume(WEBHOOK_QUEUE, async (message: WebhookMessage, channel: any, msg: any) => {
    const result = await safeTry(async () => {
      const webhook = await prisma.webhookSubscription.findUnique({
        where: { id: message.webhookId },
      });

      if (!webhook || !webhook.active) {
        console.log(`Webhook ${message.webhookId} not found or inactive - acknowledging message`);
        channel.ack(msg); // ✅ CRITICAL: Acknowledge the message even if webhook not found
        return;
      }

      await webhookService.deliverWithRetry(webhook, {
        event: message.event,
        data: message.data,
      });

      channel.ack(msg); // Acknowledge successful processing
    }, "WebhookQueueConsumer");

    if (result.error) {
      await handleWebhookError(result.error, message);
      channel.ack(msg); // Still acknowledge to prevent infinite retries
    }
  });

  // Start retry queue consumer
  await consume(WEBHOOK_RETRY_QUEUE, async (message: WebhookMessage) => {
    await publish(WEBHOOK_QUEUE, message);
  });
}

async function handleWebhookError(error: unknown, message: WebhookMessage): Promise<void> {
  const currentAttempt = message.attempt || 0;
  const maxAttempts = 5;

  // Log the error with context
  ErrorHandler.logError(error, `WebhookDelivery-${message.webhookId}`);

  // Check if we should retry
  const shouldRetry = currentAttempt < maxAttempts && ErrorHandler.isRetryable(error);

  if (shouldRetry) {
    await scheduleRetry(error, message, currentAttempt);
  } else {
    await moveToDeadLetterQueue(error, message, currentAttempt);
  }
}

async function scheduleRetry(
  error: unknown,
  message: WebhookMessage,
  currentAttempt: number
): Promise<void> {
  const nextAttempt = currentAttempt + 1;
  const retryMessage = { ...message, attempt: nextAttempt };
  const delay = Math.pow(2, nextAttempt) * 1000;

  console.log(`Scheduling retry ${nextAttempt}/5 for webhook ${message.webhookId} in ${delay}ms`);

  // Use setTimeout with error handling
  setTimeout(async () => {
    try {
      await publish(WEBHOOK_RETRY_QUEUE, retryMessage);
    } catch (publishError) {
      ErrorHandler.logError(publishError, "WebhookRetryPublish");
    }
  }, delay);
}

async function moveToDeadLetterQueue(
  error: unknown,
  message: WebhookMessage,
  finalAttempt: number
): Promise<void> {
  console.error(`Max retries exceeded for webhook ${message.webhookId}`);

  const errorMessage = ErrorHandler.getErrorMessage(error);
  const errorCode = ErrorHandler.getErrorCode(error);

  try {
    await publish(WEBHOOK_DLQ, {
      ...message,
      error: errorMessage,
      errorCode,
      finalAttempt,
      timestamp: new Date().toISOString(),
    });
  } catch (dlqError) {
    // If we can't even publish to DLQ, log it critically
    ErrorHandler.logError(dlqError, "WebhookDLQCritical");
    console.error("CRITICAL: Failed to publish to dead letter queue:", {
      originalError: errorMessage,
      dlqError: ErrorHandler.getErrorMessage(dlqError),
      messageId: message.webhookId,
    });
  }
}

// Optional: Enhanced version with more detailed error handling
export async function startWebhookConsumerEnhanced() {
  await consume(WEBHOOK_QUEUE, async (message: WebhookMessage) => {
    const context = `Webhook-${message.webhookId}-${message.event}`;

    const result = await safeTry(async () => {
      const webhook = await prisma.webhookSubscription.findUnique({
        where: { id: message.webhookId },
        include: {
          deliveries: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!webhook) {
        throw createAppError(`Webhook ${message.webhookId} not found`, {
          code: "WEBHOOK_NOT_FOUND",
          statusCode: 404,
        });
      }

      if (!webhook.active) {
        console.log(`Webhook ${message.webhookId} is inactive`);
        return;
      }

      // Check if webhook is subscribed to this event
      const webhookEvents = Array.isArray(webhook.events)
        ? webhook.events
        : JSON.parse(webhook.events as string);

      if (!webhookEvents.includes(message.event)) {
        console.log(`Webhook ${message.webhookId} not subscribed to event ${message.event}`);
        return;
      }

      await webhookService.deliverWithRetry(webhook, {
        event: message.event,
        data: message.data,
      });
    }, context);

    if (result.error) {
      await handleWebhookError(result.error, message);
    }
  });

  // Enhanced retry queue consumer with error handling
  await consume(WEBHOOK_RETRY_QUEUE, async (message: WebhookMessage) => {
    const result = await safeTry(async () => {
      await publish(WEBHOOK_QUEUE, message);
    }, "WebhookRetryConsumer");

    if (result.error) {
      ErrorHandler.logError(result.error, "WebhookRetryPublish");

      // If retry publishing fails, try again with exponential backoff
      const currentAttempt = message.attempt || 0;
      if (currentAttempt < 10) {
        const nextAttempt = currentAttempt + 1;
        const retryMessage = { ...message, attempt: nextAttempt };
        const delay = Math.pow(2, nextAttempt) * 1000;

        setTimeout(async () => {
          await publish(WEBHOOK_RETRY_QUEUE, retryMessage);
        }, delay);
      }
    }
  });
}
