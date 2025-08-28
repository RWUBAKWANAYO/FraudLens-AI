import { prisma } from "../config/db";
import { WebhookError } from "../types/error";
import { getRedis } from "../config/redis";
import { THREAT_TYPE_MAP } from "../utils/constants";
import { WebhookPayload, WebhookDeliveryResult } from "../types/webhook";
import {
  createSignature,
  getWebhookEvents,
  shouldDeliverEvent,
  isRetryableError,
  shouldDeliverToWebhook,
  formatPayloadForDestination,
} from "../utils/webhookUtils";

export class WebhookService {
  private static instance: WebhookService;
  private retryDelays = [1000, 5000, 15000, 30000, 60000];
  private maxRetries = 5;
  private isProduction = process.env.NODE_ENV === "production";
  private environment = process.env.NODE_ENV || "development";

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  private rateLimitConfig = {
    maxRequests: 100,
    timeWindow: 60000,
  };

  private async checkRateLimit(webhookUrl: string): Promise<boolean> {
    try {
      const redis = await getRedis();
      const key = `rate_limit:${webhookUrl}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, this.rateLimitConfig.timeWindow / 1000);
      }

      return current <= this.rateLimitConfig.maxRequests;
    } catch (error) {
      return true;
    }
  }

  async deliverWebhook(
    webhook: any,
    payload: any,
    attempt: number = 0
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();

    try {
      if (!(await this.checkRateLimit(webhook.url))) {
        throw new WebhookError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, true);
      }

      if (!shouldDeliverToWebhook(webhook.url, this.isProduction, this.environment)) {
        return {
          success: true,
          statusCode: 200,
          retryable: false,
          responseTime: Date.now() - startTime,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const enhancedPayload: WebhookPayload = {
        ...payload,
        environment: this.environment,
        webhookId: webhook.id,
        timestamp: new Date().toISOString(),
      };

      const formattedPayload = formatPayloadForDestination(
        enhancedPayload,
        webhook.url,
        THREAT_TYPE_MAP
      );

      if (formattedPayload === null) {
        return {
          success: true,
          statusCode: 200,
          retryable: false,
          responseTime: Date.now() - startTime,
        };
      }

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": createSignature(webhook.secret, enhancedPayload),
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
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return {
        success: true,
        statusCode: response.status,
        retryable: false,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      const isRetryable = isRetryableError(error);
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        statusCode: error.status,
        error: error.message,
        retryable: isRetryable && attempt < this.maxRetries,
        responseTime,
      };
    }
  }

  async deliverWithRetry(webhook: any, payload: any): Promise<void> {
    if (!shouldDeliverEvent(webhook, payload.event)) {
      return;
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const result = await this.deliverWebhook(webhook, payload, attempt);

      if (result.success) {
        await this.logWebhookDelivery(webhook.id, payload, true, attempt, result.responseTime);
        return;
      }

      if (!result.retryable) {
        await this.logWebhookDelivery(
          webhook.id,
          payload,
          false,
          attempt,
          result.responseTime,
          result.error
        );
        return;
      }

      const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await this.logWebhookDelivery(
      webhook.id,
      payload,
      false,
      this.maxRetries,
      undefined,
      "Max retries exceeded"
    );
  }

  private async logWebhookDelivery(
    webhookId: string,
    payload: any,
    success: boolean,
    attempt: number,
    responseTime?: number,
    error?: string
  ): Promise<void> {
    try {
      await prisma.webhookDelivery.create({
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
    } catch (logError) {}
  }

  async getActiveWebhooks(companyId: string): Promise<any[]> {
    const webhooks = await prisma.webhookSubscription.findMany({
      where: {
        companyId,
        active: true,
      },
    });

    return webhooks.map((webhook) => ({
      ...webhook,
      events: getWebhookEvents(webhook),
    }));
  }

  async getMockWebhooks(companyId: string): Promise<any[]> {
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

    const activeWebhooks = await this.getActiveWebhooks(companyId);
    return [...mockWebhooks, ...activeWebhooks];
  }
}

export const webhookService = WebhookService.getInstance();
