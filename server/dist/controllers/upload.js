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
const vectorStore_1 = require("../services/vectorStore");
const enrichment_1 = require("../services/enrichment");
function handleFileUpload(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            if (!req.file)
                return res.status(400).json({ error: "No file uploaded" });
            const companyId = req.body.companyId; // from auth/session in real app
            if (!companyId)
                return res.status(400).json({ error: "Missing companyId" });
            const buffer = req.file.buffer;
            const fileName = req.file.originalname;
            const fileType = req.file.mimetype;
            const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
                return res
                    .status(400)
                    .json({ error: "Unsupported file format. Please upload CSV or Excel files only." });
            }
            const upload = yield db_1.prisma.upload.create({
                data: { companyId, fileName, fileType, source: "batch" },
            });
            const parsedRecords = yield (0, fileParser_1.parseBuffer)(buffer, fileName);
            const created = [];
            for (const r of parsedRecords) {
                const meta = yield (0, enrichment_1.enrich)(r);
                const rec = yield db_1.prisma.record.create({
                    data: {
                        companyId,
                        uploadId: upload.id,
                        txId: (_b = r.txId) !== null && _b !== void 0 ? _b : null,
                        partner: (_c = r.partner) !== null && _c !== void 0 ? _c : null,
                        amount: (_d = r.amount) !== null && _d !== void 0 ? _d : null,
                        currency: (_e = r.currency) !== null && _e !== void 0 ? _e : null,
                        date: r.date ? new Date(r.date) : null,
                        raw: (_f = r.raw) !== null && _f !== void 0 ? _f : {},
                        ip: meta.ip,
                        device: meta.device,
                        geoCountry: meta.geoCountry,
                        geoCity: meta.geoCity,
                        mcc: meta.mcc,
                        channel: meta.channel,
                    },
                });
                created.push(rec);
            }
            // Embeddings in small batches to respect rate limits
            for (const rec of created) {
                const text = `${(_g = rec.txId) !== null && _g !== void 0 ? _g : ""} ${(_h = rec.partner) !== null && _h !== void 0 ? _h : ""} ${(_j = rec.amount) !== null && _j !== void 0 ? _j : ""}`;
                try {
                    const vector = yield (0, aiEmbedding_1.getEmbedding)(text);
                    yield (0, vectorStore_1.saveRecordEmbedding)(rec.id, vector);
                }
                catch (err) {
                    console.error("Embedding failed for record:", rec.id, err);
                }
            }
            // Fetch back (with embeddings) for analysis
            const inserted = yield db_1.prisma.record.findMany({
                where: { uploadId: upload.id },
                orderBy: { createdAt: "asc" },
            });
            const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)(inserted, upload.id, companyId);
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
