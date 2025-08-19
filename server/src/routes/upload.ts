import { Router } from "express";
import { handleFileUpload } from "../controllers/upload";
import { multerConfig } from "../middleware/multer";

const router = Router();
router.post("/", multerConfig, handleFileUpload);

export { router as uploadRouter };
