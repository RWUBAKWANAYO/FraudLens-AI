import { publish, consume } from "./bus";
import { webhookService } from "../services/webhooks";
import { prisma } from "../config/db";
import { ErrorHandler, safeTry } from "../utils/errorHandler";
import { WEBHOOK_QUEUE, WEBHOOK_RETRY_QUEUE, WEBHOOK_DLQ } from "../utils/constants";
import { WebhookMessage } from "../types/webhook";

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
  await consume(
    WEBHOOK_QUEUE,
    async (message: WebhookMessage, _channel: any, _msg: any) => {
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
      }, context);

      if (result.error) {
        await handleWebhookError(result.error, message);
      }
    },
    {
      consumerId: "webhook.deliveries.consumer",
      prefetch: Number(process.env.WEBHOOK_PREFETCH || 5),
      requeueOnError: false,
    }
  );

  await consume(
    WEBHOOK_RETRY_QUEUE,
    async (message: WebhookMessage) => {
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
  ErrorHandler.logError(error, `WebhookDelivery-${message.webhookId}`);

  const shouldRetry = currentAttempt < maxAttempts && ErrorHandler.isRetryable(error);

  if (shouldRetry) {
    await scheduleRetry(error, message, currentAttempt);
  } else {
    await moveToDeadLetterQueue(error, message, currentAttempt);
  }
}

async function scheduleRetry(
  _error: unknown,
  message: WebhookMessage,
  currentAttempt: number
): Promise<void> {
  const nextAttempt = currentAttempt + 1;
  const retryMessage = { ...message, attempt: nextAttempt };
  const delay = Math.min(Math.pow(2, nextAttempt) * 1000, 60000);

  console.log(`Scheduling retry ${nextAttempt}/5 for webhook ${message.webhookId} in ${delay}ms`);

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
