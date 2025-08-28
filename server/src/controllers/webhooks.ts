import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db";

import crypto from "crypto";

export const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, events, secret } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid authorization" });
    }

    const webhook = await prisma.webhookSubscription.create({
      data: {
        companyId,
        url,
        events,
        secret: secret || crypto.randomBytes(32).toString("hex"),
      },
    });

    res.status(201).json({
      ...webhook,
      events: Array.isArray(webhook.events) ? webhook.events : JSON.parse(webhook.events as string),
    });
  } catch (error) {
    next(error);
  }
};

export async function listWebhooks(req: Request, res: Response) {
  try {
    const { companyId } = req.query;
    const userCompanyId = req.user?.companyId;

    if (companyId !== userCompanyId) {
      return res.status(403).json({
        error: "Access denied",
        message: "You can only access webhooks from your own company",
      });
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
      const validEvents = Array.isArray(events)
        ? events.filter((event) => typeof event === "string")
        : ["threat.created"];
      updateData.events = validEvents;
    }

    const webhook = await prisma.webhookSubscription.update({
      where: { id: webhookId },
      data: updateData,
    });

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
