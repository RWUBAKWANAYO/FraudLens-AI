import { Router } from "express";
import { handleFileUpload } from "../controllers/upload";
import {
  createWebhook,
  listWebhooks,
  testWebhook,
  updateWebhook,
  deleteWebhook,
} from "../controllers/webhooks";
import { listAlerts } from "../controllers/alerts";
import { multerConfig } from "../middleware/multer";
import { getThreatDetails, listThreats } from "../controllers/threats";
import { findSimilarity } from "../controllers/similarity-search";
import { createRule, listRules, updateRule } from "../controllers/rules";

export const router = Router();

router.post("/upload", multerConfig, handleFileUpload);
router.get("/alerts", listAlerts);

router.get("/threats", listThreats);
router.get("/threats/:threatId/analysis", getThreatDetails);

router.post("/similarity-search", findSimilarity);

router.post("/rules", createRule);
router.get("/rules", listRules);
router.patch("/rules", updateRule);

router.post("/webhooks", createWebhook);
router.get("/webhooks", listWebhooks);
router.post("/webhooks/:webhookId/test", testWebhook);
router.put("/webhooks/:webhookId", updateWebhook);
router.delete("/webhooks/:webhookId", deleteWebhook);

export { router as auditRouter };
