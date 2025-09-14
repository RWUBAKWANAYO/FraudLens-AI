import { z } from "zod";

export const webhookEventSchema = z.enum(["threat.created", "upload.complete", "upload.progress"]);

export const createWebhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Invalid URL format").min(1, "URL is required"),
  events: z.array(webhookEventSchema).min(1, "At least one event is required"),
  secret: z.string().min(1, "Secret is required"),
});

export const updateWebhookSchema = z.object({
  active: z.boolean(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type CreateWebhookFormData = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookFormData = z.infer<typeof updateWebhookSchema>;
