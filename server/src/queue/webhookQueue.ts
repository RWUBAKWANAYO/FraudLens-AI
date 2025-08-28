// =============================================
// server/src/queue/webhookQueue.ts
// =============================================
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

/**
 * Start the consumer for webhook deliveries.
 * Uses consume() which creates a dedicated consumer channel and restarts on close.
 */
export async function startWebhookConsumer() {
  await consume(
    WEBHOOK_QUEUE,
    async (message: WebhookMessage, channel: any, msg: any) => {
      const context = `WebhookQueueConsumer-${message.webhookId}-${message.event}`;

      const result = await safeTry(async () => {
        const webhook = await prisma.webhookSubscription.findUnique({
          where: { id: message.webhookId },
        });

        if (!webhook || !webhook.active) {
          console.log(`Webhook ${message.webhookId} not found or inactive - will ack and drop`);
          return;
        }

        await webhookService.deliverWithRetry(webhook, {
          event: message.event,
          data: message.data,
        });

        // On success we return; consume() will ack
      }, context);

      if (result.error) {
        // Centralized error handling: decide to retry or DLQ
        await handleWebhookError(result.error, message);
        // consume() will nack for us (requeueOnError default false). But we persisted error/handled accordingly.
      }
    },
    {
      consumerId: "webhook.deliveries.consumer",
      prefetch: Number(process.env.WEBHOOK_PREFETCH || 5),
      requeueOnError: false, // don't requeue indefinitely
    }
  );

  // Also start retry queue consumer which republishes messages back to main queue with a delay logic
  await consume(
    WEBHOOK_RETRY_QUEUE,
    async (message: WebhookMessage) => {
      // simple republish to main queue; if you want delayed retry use TTL queues or setTimeout + publish
      await publish(WEBHOOK_QUEUE, message);
    },
    {
      consumerId: "webhook.retries.consumer",
      prefetch: 1,
      requeueOnError: false,
    }
  );
}

async function handleWebhookError(error: unknown, message: WebhookMessage): Promise<void> {
  const currentAttempt = message.attempt || 0;
  const maxAttempts = 5;

  // Log the error with context
  ErrorHandler.logError(error, `WebhookDelivery-${message.webhookId}`);

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
  const delay = Math.min(Math.pow(2, nextAttempt) * 1000, 60000);

  console.log(`Scheduling retry ${nextAttempt}/5 for webhook ${message.webhookId} in ${delay}ms`);

  // Using setTimeout to enqueue into retry queue after a delay
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
    ErrorHandler.logError(dlqError, "WebhookDLQCritical");
    console.error("CRITICAL: Failed to publish to dead letter queue:", {
      originalError: errorMessage,
      dlqError: ErrorHandler.getErrorMessage(dlqError),
      messageId: message.webhookId,
    });
  }
}
