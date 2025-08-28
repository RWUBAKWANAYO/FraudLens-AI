import { Router } from "express";
import { createWebhook, listWebhooks, updateWebhook, deleteWebhook } from "../controllers/webhooks";
import { authenticateToken } from "../middleware/auth";
import {
  webhookCreateValidation,
  webhookUpdateValidation,
  webhookListValidation,
  webhookIdValidation,
  requireWebhookOwnership,
  requireWebhookManagement,
} from "../middleware/webhookValidation";
import { validateRequest } from "../middleware/validation";

const router = Router();

router.use(authenticateToken);
router.post("/", requireWebhookManagement, webhookCreateValidation, validateRequest, createWebhook);
router.get("/", webhookListValidation, validateRequest, listWebhooks);

router.put(
  "/:webhookId",
  webhookIdValidation,
  webhookUpdateValidation,
  validateRequest,
  requireWebhookOwnership,
  requireWebhookManagement,
  updateWebhook
);

router.delete(
  "/:webhookId",
  webhookIdValidation,
  validateRequest,
  requireWebhookOwnership,
  requireWebhookManagement,
  deleteWebhook
);

export { router as webhookRouter };
