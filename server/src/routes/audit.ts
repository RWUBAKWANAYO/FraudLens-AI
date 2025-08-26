// server/src/routes/audit.ts
import { Router } from "express";
import { handleFileUpload } from "../controllers/upload";
import { listAlerts } from "../controllers/alerts";
import { multerConfig } from "../middleware/multer";
import { getThreatDetails, listThreats } from "../controllers/threats";
import { findSimilarity } from "../controllers/similarity-search";
import { createRule, listRules, updateRule } from "../controllers/rules";
import { authenticateToken } from "../middleware/auth";

export const router = Router();

router.post("/upload", authenticateToken, multerConfig, handleFileUpload);
router.get("/alerts", listAlerts);

router.get("/threats", listThreats);
router.get("/threats/:threatId/analysis", getThreatDetails);

router.post("/similarity-search", findSimilarity);

router.post("/rules", createRule);
router.get("/rules", listRules);
router.patch("/rules", updateRule);

export { router as auditRouter };
