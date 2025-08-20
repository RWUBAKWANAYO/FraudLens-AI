"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFileUpload = handleFileUpload;
const db_1 = require("../config/db");
const fileParser_1 = require("../services/fileParser");
const leakDetection_1 = require("../services/leakDetection");
const aiEmbedding_1 = require("../services/aiEmbedding");
function handleFileUpload(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }
            const buffer = req.file.buffer;
            const fileName = req.file.originalname;
            const fileType = req.file.mimetype;
            console.log({ fileName, fileType, bufferLength: buffer.length });
            // Validate file type
            const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
                return res.status(400).json({
                    error: "Unsupported file format. Please upload CSV or Excel files only.",
                });
            }
            // Create Upload record
            const upload = yield db_1.prisma.upload.create({
                data: { fileName, fileType },
            });
            // Parse file into normalized records
            const parsedRecords = yield (0, fileParser_1.parseBuffer)(buffer, fileName);
            const toCreate = [];
            for (const r of parsedRecords) {
                const text = `${(_b = r.txId) !== null && _b !== void 0 ? _b : ""} ${(_c = r.partner) !== null && _c !== void 0 ? _c : ""} ${(_d = r.amount) !== null && _d !== void 0 ? _d : ""}`;
                let vector = [];
                try {
                    vector = yield (0, aiEmbedding_1.getEmbedding)(text);
                }
                catch (err) {
                    console.error("Embedding failed for record:", r, err);
                    vector = [];
                }
                toCreate.push({
                    uploadId: upload.id,
                    txId: (_e = r.txId) !== null && _e !== void 0 ? _e : null,
                    partner: (_f = r.partner) !== null && _f !== void 0 ? _f : null,
                    amount: (_g = r.amount) !== null && _g !== void 0 ? _g : null,
                    date: r.date ? new Date(r.date) : null,
                    raw: (_h = r.raw) !== null && _h !== void 0 ? _h : {},
                    embeddingJson: vector,
                });
            }
            if (toCreate.length > 0) {
                yield db_1.prisma.record.createMany({ data: toCreate });
            }
            // Fetch back inserted records for analysis
            const inserted = yield db_1.prisma.record.findMany({
                where: { uploadId: upload.id },
                take: 10000, // safe upper limit
                orderBy: { createdAt: "asc" },
            });
            // Run leak detection
            const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)(inserted, upload.id);
            return res.json({
                uploadId: upload.id,
                recordsAnalyzed: inserted.length,
                threats: threatsCreated,
                summary,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
