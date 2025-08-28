import { Router } from "express";
import { handleFileUpload } from "../controllers/upload";
import { listAlerts } from "../controllers/alerts";
import { multerConfig } from "../middleware/multer";
import { getThreatDetails, listThreats } from "../controllers/threats";
import { createRule, listRules, updateRule } from "../controllers/rules";
import { authenticateTokenOrApiKey, requireRole } from "../middleware/auth";

export const router = Router();

router.post("/upload", authenticateTokenOrApiKey, multerConfig, handleFileUpload);
router.get("/alerts", authenticateTokenOrApiKey, listAlerts);
router.get("/threats", authenticateTokenOrApiKey, listThreats);
router.get("/threats/:threatId/analysis", authenticateTokenOrApiKey, getThreatDetails);

router.post("/rules", authenticateTokenOrApiKey, requireRole(["ADMIN", "MANAGER"]), createRule);
router.get("/rules", authenticateTokenOrApiKey, listRules);
router.patch("/rules", authenticateTokenOrApiKey, requireRole(["ADMIN", "MANAGER"]), updateRule);

export { router as auditRouter };
