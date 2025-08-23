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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFileUpload = handleFileUpload;
const db_1 = require("../config/db");
const fileParser_1 = require("../services/fileParser");
const leakDetection_1 = require("../services/leakDetection");
const crypto_1 = __importDefault(require("crypto"));
const bus_1 = require("../queue/bus");
const aiEmbedding_1 = require("../services/aiEmbedding");
function sha256(buf) {
    return crypto_1.default.createHash("sha256").update(buf).digest("hex");
}
function normalizeCurrency(cur) {
    return (cur || "USD").toUpperCase().trim();
}
function normalizePartner(p) {
    return (p || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function maskAccount(a) {
    if (!a)
        return null;
    const s = String(a).replace(/\s+/g, "");
    return `****${s.slice(-4)}`;
}
function timeBucket(ts, seconds) {
    const ms = ts ? ts.getTime() : Date.now();
    return Math.floor(ms / (seconds * 1000));
}
function safeDate(d) {
    if (!d)
        return null;
    const dt = typeof d === "string" ? new Date(d) : d;
    return isNaN(dt.getTime()) ? null : dt;
}
function mkCanonicalKey(args) {
    const s = [
        args.userKey || "",
        args.normalizedPartner || "",
        args.amount == null ? "" : String(args.amount),
        args.currency || "",
        args.bucket30s == null ? "" : String(args.bucket30s),
    ].join("|");
    return sha256(s);
}
function mkRecordSignature(args) {
    const rounded = args.date ? new Date(Math.floor(args.date.getTime() / 1000) * 1000) : null;
    const s = [
        args.txId || "",
        args.amount == null ? "" : String(args.amount),
        args.normalizedPartner || "",
        args.currency || "",
        rounded ? rounded.toISOString() : "",
    ].join("|");
    return sha256(s);
}
const CREATE_MANY_CHUNK = Number(process.env.CREATE_MANY_CHUNK || 1000);
const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";
function handleFileUpload(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (!req.file)
                return res.status(400).json({ error: "No file uploaded" });
            const companyId = req.body.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: "Missing companyId" });
            const buffer = req.file.buffer;
            const fileName = req.file.originalname;
            const fileType = req.file.mimetype;
            const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (!ext || !["csv", "xlsx", "xls", "pdf", "txt"].includes(ext)) {
                return res.status(400).json({ error: "Unsupported file format. Upload CSV/Excel/PDF only." });
            }
            // --- Upload-level idempotency (24h) ---
            const fileHash = sha256(buffer);
            const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const prev = yield db_1.prisma.upload.findFirst({
                where: { companyId, fileHash, createdAt: { gte: dedupeSince } },
                select: { id: true },
            });
            if (prev) {
                const prevThreats = yield db_1.prisma.threat.findMany({ where: { uploadId: prev.id } });
                const recs = yield db_1.prisma.record.findMany({ where: { uploadId: prev.id } });
                const uniqueFlagged = new Set(prevThreats.map((t) => t.recordId).filter(Boolean));
                const flaggedValue = Array.from(uniqueFlagged).reduce((sum, rid) => {
                    var _a;
                    const r = recs.find((x) => x.id === rid);
                    return sum + ((_a = r === null || r === void 0 ? void 0 : r.amount) !== null && _a !== void 0 ? _a : 0);
                }, 0);
                return res.json({
                    uploadId: prev.id,
                    reuploadOf: prev.id,
                    message: "This file matches a recent upload (same content hash). Reusing prior analysis.",
                    recordsAnalyzed: recs.length,
                    threats: prevThreats,
                    summary: {
                        totalRecords: recs.length,
                        flagged: uniqueFlagged.size,
                        flaggedValue,
                        message: `Reused prior results from upload ${prev.id}.`,
                    },
                });
            }
            // --- Create upload row ---
            const upload = yield db_1.prisma.upload.create({
                data: { companyId, fileName, fileType, source: "batch", fileHash },
            });
            // --- Parse rows ---
            const parsed = yield (0, fileParser_1.parseBuffer)(buffer, fileName);
            // --- Prepare rows for bulk insert (no per-row awaits) ---
            const toInsert = parsed.map((r) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const normalizedCurrency = normalizeCurrency(r.currency);
                const normalizedPartner = normalizePartner(r.partner);
                const txnDate = safeDate(r.date);
                const userKey = r.user_id || r.email || r.device || r.ip || null;
                const accountRaw = r.account ||
                    r.card ||
                    r.bank_account ||
                    r.account_number ||
                    null;
                const accountKey = accountRaw ? String(accountRaw) : null;
                const accountMasked = maskAccount(accountRaw);
                const bucket30 = timeBucket(txnDate, 30);
                const bucket60 = timeBucket(txnDate, 60);
                const canonicalKey = mkCanonicalKey({
                    userKey,
                    normalizedPartner,
                    amount: (_a = r.amount) !== null && _a !== void 0 ? _a : null,
                    currency: normalizedCurrency,
                    bucket30s: bucket30,
                });
                const recordSignature = mkRecordSignature({
                    txId: (_b = r.txId) !== null && _b !== void 0 ? _b : null,
                    amount: (_c = r.amount) !== null && _c !== void 0 ? _c : null,
                    normalizedPartner,
                    currency: normalizedCurrency,
                    date: txnDate,
                });
                return {
                    id: crypto_1.default.randomUUID(),
                    companyId,
                    uploadId: upload.id,
                    txId: (_d = r.txId) !== null && _d !== void 0 ? _d : null,
                    partner: (_e = r.partner) !== null && _e !== void 0 ? _e : null,
                    amount: (_f = r.amount) !== null && _f !== void 0 ? _f : null,
                    currency: (_g = r.currency) !== null && _g !== void 0 ? _g : null,
                    date: txnDate,
                    raw: (_h = r.raw) !== null && _h !== void 0 ? _h : {},
                    // "enrichment" from provided fields (avoid async on hot path)
                    ip: r.ip || null,
                    device: r.device || null,
                    geoCountry: r.geoCountry || null,
                    geoCity: r.geoCity || null,
                    mcc: r.mcc || null,
                    channel: r.channel || null,
                    // derived
                    normalizedPartner,
                    normalizedCurrency,
                    userKey,
                    accountKey,
                    accountMasked,
                    timeBucket30s: bucket30,
                    timeBucket60s: bucket60,
                    canonicalKey,
                    recordSignature,
                };
            });
            // --- Bulk insert in chunks inside a single transaction ---
            yield db_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < toInsert.length; i += CREATE_MANY_CHUNK) {
                    const chunk = toInsert.slice(i, i + CREATE_MANY_CHUNK);
                    yield tx.record.createMany({ data: chunk });
                }
            }));
            // --- Pull inserted rows (id + fields) for analysis & embedding job ---
            const inserted = yield db_1.prisma.record.findMany({
                where: { uploadId: upload.id },
                orderBy: { createdAt: "asc" },
            });
            // --- Kick embeddings to background (fast path), or do nothing if disabled ---
            if (EMBEDDINGS_ASYNC) {
                yield (0, bus_1.publish)("embeddings.generate", {
                    companyId,
                    uploadId: upload.id,
                    recordIds: inserted.map((r) => r.id),
                });
            }
            else {
                // 🔥 NEW: Synchronous embedding generation
                console.log("Generating embeddings synchronously...");
                yield generateEmbeddingsForRecords(inserted);
            }
            function generateEmbeddingsForRecords(records) {
                return __awaiter(this, void 0, void 0, function* () {
                    console.log(`Starting embedding generation for ${records.length} records`);
                    for (const record of records) {
                        try {
                            // Create text for embedding
                            const text = [
                                record.partner,
                                record.amount,
                                record.currency,
                                record.txId,
                                record.normalizedPartner,
                                record.normalizedCurrency,
                            ]
                                .filter(Boolean)
                                .join(" ");
                            if (text.trim()) {
                                const embedding = yield (0, aiEmbedding_1.getEmbedding)(text);
                                const embeddingJson = JSON.stringify(embedding);
                                // Update using raw SQL to handle both columns
                                yield db_1.prisma.$executeRaw `
          UPDATE Record 
          SET embeddingJson = ${embeddingJson}, 
              embeddingVec = ${embeddingJson}
          WHERE id = ${record.id}
        `;
                                console.log(`Generated embedding for record ${record.id}`);
                            }
                            else {
                                console.log(`Skipping embedding for record ${record.id} - no text content`);
                            }
                        }
                        catch (error) {
                            console.error(`Failed to generate embedding for record ${record.id}:`, error);
                        }
                    }
                    console.log(`Completed embedding generation`);
                });
            }
            const recordsWithEmbeddings = yield db_1.prisma.record.findMany({
                where: { uploadId: upload.id },
                orderBy: { createdAt: "asc" },
            });
            // --- Run detection synchronously (keeps your existing API contract fast) ---
            const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)(recordsWithEmbeddings, upload.id, companyId);
            return res.json({
                uploadId: upload.id,
                recordsAnalyzed: inserted.length,
                threats: threatsCreated,
                summary,
                embeddingsQueued: EMBEDDINGS_ASYNC,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
