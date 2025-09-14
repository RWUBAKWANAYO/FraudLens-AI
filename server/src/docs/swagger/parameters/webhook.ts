export const webhookParameters = {
  WebhookIdParam: {
    name: "webhookId",
    in: "path",
    required: true,
    schema: {
      type: "string",
      format: "uuid",
    },
    description: "Webhook identifier",
  },
  WebhookEventParam: {
    name: "event",
    in: "query",
    required: false,
    schema: {
      type: "string",
      enum: ["THREAT_DETECTED", "ALERT_CREATED", "SCAN_COMPLETED"],
    },
    description: "Filter webhooks by event type",
  },
};
