import { Router } from "express";
import { ApiKeyController } from "../controllers/apiKeyController";
import { authenticateTokenOrApiKey, requireRole } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.createApiKey
);

router.get(
  "/",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.listApiKeys
);

router.get(
  "/:id",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.getApiKeyDetails
);

router.patch(
  "/:id/revoke",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.revokeApiKey
);

router.patch(
  "/:id/reactivate",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.reactivateApiKey
);

router.patch(
  "/:id/rotate-secret",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.rotateApiKeySecret
);

router.delete(
  "/:id",
  authenticateTokenOrApiKey,
  requireRole(["ADMIN", "MANAGER"]),
  ApiKeyController.deleteApiKey
);

export { router as apiKeyRouter };
