// server/src/controllers/webhooks.ts
import { Request, Response } from "express";
import { prisma } from "../config/db";
import { webhookService } from "../services/webhooks";
import crypto from "crypto";

export async function createWebhook(req: Request, res: Response) {
  try {
    const { companyId, url, secret, events = ["threat.created"] } = req.body;

    // Validate and format events as JSON array
    const validEvents = Array.isArray(events)
      ? events.filter((event) => typeof event === "string")
      : ["threat.created"];

    const webhook = await prisma.webhookSubscription.create({
      data: {
        companyId,
        url,
        secret: secret || generateRandomSecret(),
        events: validEvents, // This will be stored as JSON
        active: true,
      },
    });

    res.json(webhook);
  } catch (error) {
    console.error("Failed to create webhook:", error);
    res.status(500).json({ error: "Failed to create webhook" });
  }
}

export async function listWebhooks(req: Request, res: Response) {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const webhooks = await prisma.webhookSubscription.findMany({
      where: { companyId: companyId as string },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    // Parse events from JSON if needed
    const webhooksWithParsedEvents = webhooks.map((webhook) => ({
      ...webhook,
      events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events as string),
    }));

    res.json(webhooksWithParsedEvents);
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
}

export async function updateWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;
    const { url, secret, events, active } = req.body;

    const updateData: any = {};

    if (url) updateData.url = url;
    if (secret) updateData.secret = secret;
    if (typeof active === "boolean") updateData.active = active;

    if (events) {
      // Format events as JSON array
      const validEvents = Array.isArray(events)
        ? events.filter((event) => typeof event === "string")
        : ["threat.created"];
      updateData.events = validEvents;
    }

    const webhook = await prisma.webhookSubscription.update({
      where: { id: webhookId },
      data: updateData,
    });

    // Parse events for response
    const responseWebhook = {
      ...webhook,
      events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events as string),
    };

    res.json(responseWebhook);
  } catch (error) {
    console.error("Failed to update webhook:", error);
    res.status(500).json({ error: "Failed to update webhook" });
  }
}

export async function testWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;

    const webhook = await prisma.webhookSubscription.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const testPayload = {
      event: "test",
      data: {
        message: "Test webhook delivery",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    };

    const result = await webhookService.deliverWebhook(webhook, testPayload);

    res.json({
      success: result.success,
      status: result.statusCode,
      message: result.success ? "Webhook test successful" : "Webhook test failed",
      error: result.error,
      responseTime: result.responseTime,
    });
  } catch (error) {
    console.error("Webhook test failed:", error);
    res.status(500).json({ error: "Webhook test failed" });
  }
}

export async function deleteWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;

    await prisma.webhookSubscription.delete({
      where: { id: webhookId },
    });

    res.json({ success: true, message: "Webhook deleted successfully" });
  } catch (error) {
    console.error("Failed to delete webhook:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
}

function generateRandomSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}
