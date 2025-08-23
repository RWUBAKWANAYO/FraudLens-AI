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
exports.generateThreatExplanation = generateThreatExplanation;
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;
const openaiClient = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
function generateThreatExplanation(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1) Deterministic evidence message (always present, business-grade & specific)
        const evidence = buildEvidenceMessage(context);
        // 2) Optional LLM polish
        try {
            const prompt = buildOpenAIPrompt(context, evidence);
            const text = yield callLLM(prompt);
            // Combine: evidence first (facts), then 2–3 sentence executive summary
            return `${evidence}\n\n${text}`;
        }
        catch (err) {
            console.error("AI explanation failed:", err);
            return evidence; // evidence is sufficient
        }
    });
}
// -------- Evidence templates (no randomness) --------
function buildEvidenceMessage(ctx) {
    var _a, _b;
    const t = ctx.threatType;
    const a = ctx.additionalContext || {};
    const money = (v, cur) => v != null ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A";
    switch (t) {
        case "DUP_IN_BATCH__TXID":
            return (`Transaction ID ${ctx.txId} appears ${a.countInUpload} times in the current upload (records: ${(_a = a.recordIds) === null || _a === void 0 ? void 0 : _a.join(", ")}). ` +
                `First seen ${toIso(a.firstTs)}, last seen ${toIso(a.lastTs)}. Total impacted value: ${money(a.sumAmountInUpload, a.currency)}.`);
        case "DUP_IN_DB__TXID":
            return (`Transaction ID ${ctx.txId} previously occurred ${a.priorCount} times in the last 7 days. ` +
                `This upload adds ${a.newCount} occurrence(s). Cluster size is now ${a.clusterSize}. ` +
                `Window: ${toIso(a.firstSeen)} → ${toIso(a.lastSeen)}. Total impacted value across cluster: ${money(a.clusterSum, a.currency)}.`);
        case "DUP_IN_BATCH__CANONICAL":
            return (`Same user/partner/amount within ${a.timeBucketSeconds}s detected ${a.countInUpload} times in this upload ` +
                `(records: ${(_b = a.recordIds) === null || _b === void 0 ? void 0 : _b.join(", ")}). User: ${a.userKey || "N/A"}, Partner: ${a.partner || "N/A"}, ` +
                `Amount: ${money(a.amount, a.currency)}. Window: ${toIso(a.firstTs)} → ${toIso(a.lastTs)}.`);
        case "DUP_IN_DB__CANONICAL":
            return (`Repeated payment pattern in history for the same user/partner/amount within 30 minutes. ` +
                `Prior: ${a.priorCount}, New: ${a.newCount}, Cluster: ${a.clusterSize}. ` +
                `Window: ${toIso(a.firstSeen)} → ${toIso(a.lastSeen)}. Total impacted value: ${money(a.clusterSum, a.currency)}.`);
        case "SAME_USER_SAME_AMOUNT_FAST":
            return (`User ${a.userKey || "N/A"} attempted ${a.countInWindow} payment(s) of ${money(a.amount, a.currency)} within ${a.windowSeconds}s ` +
                `(${(a.times || []).join(", ")}). Records: ${(a.recordIds || []).join(", ")}.`);
        case "SAME_ACCOUNT_MULTIPLE_USERS_24H":
            return (`Account ${a.accountMasked || "****"} used by ${a.userCount} distinct users in the last 24h: ${(a.distinctUsers || []).join(", ")}. ` +
                `Recent record IDs: ${(a.recentTxnIds || []).join(", ")}.`);
        case "USER_VELOCITY_1MIN":
            return `User ${a.userKey || "N/A"} made ${a.count} transactions in the last ${a.windowSeconds}s.`;
        case "SIMILARITY_MATCH":
            return `This record is highly similar to prior labeled fraud (top matches: ${(a.topMatches || [])
                .map((m) => `${m.id} (sim=${(m.similarity || 0).toFixed(2)})`)
                .join(", ")}).`;
        default:
            return `Suspicious activity detected for transaction ${ctx.txId || "N/A"}.`;
    }
}
function toIso(d) {
    try {
        return new Date(d).toISOString();
    }
    catch (_a) {
        return String(d !== null && d !== void 0 ? d : "N/A");
    }
}
// -------- LLM prompt (optional polish) --------
function buildOpenAIPrompt(context, evidence) {
    var _a, _b, _c, _d;
    const { datasetStats } = context;
    return `You are a financial risk analyst. Based on the structured evidence below, write a concise, business-friendly explanation (2–3 sentences) that:
- Summarizes the issue in plain language,
- States why it was flagged,
- Recommends the next step (investigate/refund/hold).

Evidence:
${evidence}

Dataset context: avg=${(_b = (_a = datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.mean) === null || _a === void 0 ? void 0 : _a.toFixed(2)) !== null && _b !== void 0 ? _b : "N/A"}, max=${(_c = datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.max) !== null && _c !== void 0 ? _c : "N/A"}, size=${(_d = datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.totalRecords) !== null && _d !== void 0 ? _d : "N/A"}.`;
}
function callLLM(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (USE_LOCAL_AI) {
            const res = yield (0, node_fetch_1.default)(`${LOCAL_AI_URL}/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "local-model",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 140,
                    temperature: 0.2,
                }),
            });
            const data = yield res.json();
            return ((_d = (_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
        }
        else {
            const response = yield openaiClient.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 140,
                temperature: 0.2,
            });
            return ((_h = (_g = (_f = (_e = response.choices) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content) === null || _h === void 0 ? void 0 : _h.trim()) || "";
        }
    });
}
