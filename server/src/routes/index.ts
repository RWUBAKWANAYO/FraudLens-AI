import { Router } from "express";
import { handleFileUpload } from "../controllers/upload";
import { ingestEventWebhook } from "../controllers/ingestWebhook";
import { listAlerts } from "../controllers/alerts";
import { multerConfig } from "../middleware/multer";
import { listThreats } from "../controllers/threats";
import { findSimilarity } from "../controllers/similarity-search";
import { createRule, listRules, updateRule } from "../controllers/rules";

export const router = Router();

router.post("/upload", multerConfig, handleFileUpload);
router.post("/ingest/webhook", ingestEventWebhook);
router.get("/alerts", listAlerts);
router.get("/threats", listThreats);
router.post("/similarity-search", findSimilarity);
router.post("/rules", createRule);
router.get("/rules", listRules);
router.patch("/rules", updateRule);
