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
exports.ingestEventWebhook = ingestEventWebhook;
const db_1 = require("../config/db");
const aiEmbedding_1 = require("../services/aiEmbedding");
const enrichment_1 = require("../services/enrichment");
const vectorStore_1 = require("../services/vectorStore");
const leakDetection_1 = require("../services/leakDetection");
function ingestEventWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const companyId = req.query.companyId; // or from auth
        if (!companyId)
            return res.status(400).json({ error: "companyId required" });
        const event = req.body; // {txId, partner, amount, currency, date, ip, device, ...}
        // Create pseudo-upload to bucket events by day/hour
        const upload = yield db_1.prisma.upload.create({
            data: {
                companyId,
                fileName: `webhook-${Date.now()}.json`,
                fileType: "application/json",
                source: "webhook",
            },
        });
        const meta = yield (0, enrichment_1.enrich)(event);
        const rec = yield db_1.prisma.record.create({
            data: {
                companyId,
                uploadId: upload.id,
                txId: (_a = event.txId) !== null && _a !== void 0 ? _a : null,
                partner: (_b = event.partner) !== null && _b !== void 0 ? _b : null,
                amount: (_c = event.amount) !== null && _c !== void 0 ? _c : null,
                currency: (_d = event.currency) !== null && _d !== void 0 ? _d : null,
                date: event.date ? new Date(event.date) : new Date(),
                raw: event,
                ip: meta.ip,
                device: meta.device,
                geoCountry: meta.geoCountry,
                geoCity: meta.geoCity,
                mcc: meta.mcc,
                channel: (_e = meta.channel) !== null && _e !== void 0 ? _e : "api",
            },
        });
        try {
            const emb = yield (0, aiEmbedding_1.getEmbedding)(`${(_f = rec.txId) !== null && _f !== void 0 ? _f : ""} ${(_g = rec.partner) !== null && _g !== void 0 ? _g : ""} ${(_h = rec.amount) !== null && _h !== void 0 ? _h : ""}`);
            yield (0, vectorStore_1.saveRecordEmbedding)(rec.id, emb);
        }
        catch (_j) { }
        const { threatsCreated, summary } = yield (0, leakDetection_1.detectLeaks)([rec], upload.id, companyId);
        res.json({ ok: true, threats: threatsCreated, summary });
    });
}
