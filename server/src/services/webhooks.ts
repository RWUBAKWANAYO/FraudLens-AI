// server/src/services/webhooks.ts
import { prisma } from "../config/db";
import { createHmac } from "crypto";
import { WebhookError } from "../types/error";
import { getRedis } from "../config/redis";

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhookId: string;
  environment: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retryable: boolean;
  responseTime?: number;
}

export class WebhookService {
  private static instance: WebhookService;
  private retryDelays = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff
  private maxRetries = 5;
  private isProduction = process.env.NODE_ENV === "production";
  private environment = process.env.NODE_ENV || "development";

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  private createSignature(secret: string, payload: any): string {
    const hmac = createHmac("sha256", secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest("hex");
  }

  private getWebhookEvents(webhook: any): string[] {
    try {
      if (Array.isArray(webhook.events)) {
        return webhook.events;
      }

      if (typeof webhook.events === "string") {
        return JSON.parse(webhook.events);
      }

      if (webhook.events && typeof webhook.events === "object") {
        return Object.values(webhook.events) as string[];
      }

      return ["threat.created"]; // default event
    } catch (error) {
      console.error("Error parsing webhook events:", error);
      return ["threat.created"];
    }
  }

  private shouldDeliverEvent(webhook: any, eventType: string): boolean {
    const webhookEvents = this.getWebhookEvents(webhook);

    // Check if webhook is subscribed to this event type
    const shouldDeliver = webhookEvents.includes(eventType);

    if (!shouldDeliver) {
      console.log(
        `Webhook ${webhook.id} not subscribed to event ${eventType}. Subscribed events:`,
        webhookEvents
      );
    }

    return shouldDeliver;
  }

  private shouldDeliverToWebhook(webhookUrl: string): boolean {
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
      const isTestWebhook =
        webhookUrl.includes("test") ||
        webhookUrl.includes("mock") ||
        webhookUrl.includes("staging");

      return isTestWebhook;
    }

    // In production, deliver to all webhooks
    return true;
  }

  private rateLimitConfig = {
    maxRequests: 100,
    timeWindow: 60 * 1000, // 1 minute
  };

  private async checkRateLimit(webhookUrl: string): Promise<boolean> {
    try {
      // Get the Redis client
      const redis = await getRedis();

      const key = `rate_limit:${webhookUrl}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, this.rateLimitConfig.timeWindow / 1000);
      }

      return current <= this.rateLimitConfig.maxRequests;
    } catch (error) {
      // If Redis is unavailable, allow the request to proceed
      console.error("Redis rate limiting failed, allowing request:", error);
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
      // Check rate limit
      if (!(await this.checkRateLimit(webhook.url))) {
        throw new WebhookError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, true);
      }

      // Check if we should deliver to this webhook based on environment
      if (!this.shouldDeliverToWebhook(webhook.url)) {
        console.log(
          `Skipping webhook delivery to ${webhook.url} in ${this.environment} environment`
        );
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

      // ✅ CRITICAL: Add this line to format the payload for the destination
      const formattedPayload = this.formatPayloadForDestination(enhancedPayload, webhook.url);

      const response = await fetch(webhook.url, {
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
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return {
        success: true,
        statusCode: response.status,
        retryable: false,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
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
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx errors
    if (error.name === "AbortError") return true;
    if (error.code === "ECONNRESET") return true;
    if (error.code === "ETIMEDOUT") return true;

    if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }

    if (error.statusCode === 429) return true;

    return false;
  }

  // Add this method to your WebhookService class
  private formatPayloadForDestination(payload: any, webhookUrl: string): any {
    // Format for Slack
    if (webhookUrl.includes("hooks.slack.com")) {
      const threatData = payload.data?.threat || {};
      const recordData = payload.data?.record || {};

      return {
        text: `🚨 Fraud Detection Alert: ${threatData.type || "Unknown threat"} - ${
          recordData.txId || "No TX ID"
        }`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 Fraud Detection Alert",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Type:*\n${threatData.type || "Unknown"}`,
              },
              {
                type: "mrkdwn",
                text: `*Confidence:*\n${
                  threatData.confidence ? Math.round(threatData.confidence * 100) + "%" : "N/A"
                }`,
              },
            ],
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Transaction ID:*\n${recordData.txId || "N/A"}`,
              },
              {
                type: "mrkdwn",
                text: `*Amount:*\n${recordData.amount || "N/A"} ${recordData.currency || ""}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Description:*\n${threatData.description || "No description available"}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Detected at: ${payload.timestamp || new Date().toISOString()}`,
              },
            ],
          },
        ],
      };
    }
    return payload;
  }

  async deliverWithRetry(webhook: any, payload: any): Promise<void> {
    // Check if webhook is subscribed to this event type
    if (!this.shouldDeliverEvent(webhook, payload.event)) {
      console.log(`Skipping delivery for event ${payload.event} to webhook ${webhook.id}`);
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
    } catch (logError) {
      console.error("Failed to log webhook delivery:", logError);
    }
  }

  async getActiveWebhooks(companyId: string): Promise<any[]> {
    const webhooks = await prisma.webhookSubscription.findMany({
      where: {
        companyId,
        active: true,
      },
    });

    // Parse events for each webhook
    return webhooks.map((webhook) => ({
      ...webhook,
      events: this.getWebhookEvents(webhook),
    }));
  }

  // Update getMockWebhooks to include events
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
