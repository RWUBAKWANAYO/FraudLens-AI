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

export interface WebhookMessage {
  webhookId: string;
  companyId: string;
  event: string;
  data: any;
  attempt?: number;
  environment?: string;
}
