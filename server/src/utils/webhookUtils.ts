import { createHmac } from "crypto";

export function createSignature(secret: string, payload: any): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

export function getWebhookEvents(webhook: any): string[] {
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

    return ["threat.created"];
  } catch (error) {
    return ["threat.created"];
  }
}

export function shouldDeliverEvent(webhook: any, eventType: string): boolean {
  const webhookEvents = getWebhookEvents(webhook);
  return webhookEvents.includes(eventType);
}

export function shouldDeliverToWebhook(
  webhookUrl: string,
  isProduction: boolean,
  _environment: string
): boolean {
  if (!isProduction) {
    if (webhookUrl.includes("webhook.site")) {
      return true;
    }

    if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
      return true;
    }

    const isTestWebhook =
      webhookUrl.includes("test") || webhookUrl.includes("mock") || webhookUrl.includes("staging");

    return isTestWebhook;
  }

  return true;
}

export function isRetryableError(error: any): boolean {
  if (error.name === "AbortError") return true;
  if (error.code === "ECONNRESET") return true;
  if (error.code === "ETIMEDOUT") return true;

  if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  if (error.statusCode === 429) return true;

  return false;
}

export function formatPayloadForDestination(
  payload: any,
  webhookUrl: string,
  threatTypeMap: any
): any {
  if (webhookUrl.includes("hooks.slack.com") && payload.event === "upload.complete") {
    const uploadData = payload.data?.upload || {};
    const summary = payload.data?.summary || {};

    if (!summary.flagged || summary.flagged === 0) {
      return null;
    }

    const primaryThreat = threatTypeMap[(summary.byRule?.[0] as any)?.rule_id] || "N/A";
    const dashboardUrl = process.env.FRONTEND_URL || "https://yourplatform.com";
    const reportId = uploadData.id || "123";

    return {
      text: `FraudLens AI Report\n\n• ${summary.totalRecords} records analyzed\n• ${
        summary.flagged
      } suspicious transaction${summary.flagged !== 1 ? "s" : ""} flagged (USD ${
        summary.flaggedValue?.toFixed(2) || "0.00"
      })\n\nDetected include: ${primaryThreat}\n\nView full details in FraudLens AI: ${dashboardUrl}/dashboard/reports/${reportId}`,
    };
  }

  if (webhookUrl.includes("hooks.slack.com") && payload.event === "threat.created") {
    return null;
  }

  return payload;
}
