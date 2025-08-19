"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const upload_1 = require("../controllers/upload");
const multer_1 = require("../middleware/multer");
const router = (0, express_1.Router)();
exports.uploadRouter = router;
router.post("/", multer_1.multerConfig, upload_1.handleFileUpload);
