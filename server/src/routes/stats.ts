import { Router } from "express";
import { authenticateTokenOrApiKey } from "../middleware/auth";
import { getCompanyStats } from "../controllers/stats";

export const router = Router();

router.get("/company", authenticateTokenOrApiKey, getCompanyStats);

export { router as statsRouter };
