import { Request, Response, NextFunction } from "express";
import { body, query, param } from "express-validator";
import { prisma } from "../config/db";

export const webhookCreateValidation = [
  body("url")
    .isURL()
    .withMessage("Valid URL is required")
    .custom((url) => {
      if (process.env.NODE_ENV === "production") {
        const parsedUrl = new URL(url);
        if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname)) {
          throw new Error("Internal URLs are not allowed in production");
        }
      }
      return true;
    }),
  body("events")
    .isArray()
    .withMessage("Events must be an array")
    .custom((events) => {
      const validEvents = ["threat.created", "upload.complete", "upload.progress"];
      if (!events.every((event: string) => validEvents.includes(event))) {
        throw new Error(`Invalid event types. Allowed: ${validEvents.join(", ")}`);
      }
      return true;
    }),
  body("secret")
    .optional()
    .isLength({ min: 16 })
    .withMessage("Secret must be at least 16 characters"),
];

export const webhookUpdateValidation = [
  param("webhookId").isUUID().withMessage("Valid webhook ID is required"),
  body("url").optional().isURL().withMessage("Valid URL is required"),
  body("events")
    .optional()
    .isArray()
    .withMessage("Events must be an array")
    .custom((events) => {
      const validEvents = ["threat.created", "upload.complete", "upload.progress"];
      if (!events.every((event: string) => validEvents.includes(event))) {
        throw new Error(`Invalid event types. Allowed: ${validEvents.join(", ")}`);
      }
      return true;
    }),
  body("secret")
    .optional()
    .isLength({ min: 16 })
    .withMessage("Secret must be at least 16 characters"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean"),
];

export const webhookListValidation = [
  query("companyId").isUUID().withMessage("Valid company ID is required"),
];

export const webhookIdValidation = [
  param("webhookId").isUUID().withMessage("Valid webhook ID is required"),
];

export const requireWebhookOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webhookId } = req.params;
    const userCompanyId = req.user?.companyId;

    if (!userCompanyId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const webhook = await prisma.webhookSubscription.findUnique({
      where: { id: webhookId },
      select: { companyId: true },
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    if (webhook.companyId !== userCompanyId) {
      return res.status(403).json({
        error: "Access denied",
        message: "You can only access webhooks from your own company",
      });
    }

    next();
  } catch (error) {
    console.error("Webhook ownership check failed:", error);
    res.status(500).json({ error: "Server error during access validation" });
  }
};

export const requireWebhookManagement = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const allowedRoles = ["ADMIN", "MANAGER"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Insufficient permissions",
      message: "Only ADMIN and MANAGER roles can manage webhooks",
      requiredRoles: allowedRoles,
      userRole: req.user.role,
    });
  }

  next();
};
