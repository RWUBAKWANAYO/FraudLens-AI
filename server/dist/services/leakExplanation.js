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
exports.generateStaticExplanation = generateStaticExplanation;
exports.generateDetailedExplanation = generateDetailedExplanation;
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;
const openaiClient = USE_LOCAL_AI
    ? null
    : new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
const money = (v, cur) => (v ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A");
const explanationMap = {
    DUP_IN_BATCH__TXID: (ctx) => {
        const a = ctx.additionalContext || {};
        return {
            evidence: `Duplicate TX ${ctx.txId} found ${a.countInUpload || a.priorCount} times. Value: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
            static: `Duplicate transaction ID ${ctx.txId} detected ${a.countInUpload || a.priorCount} times. Total: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
        };
    },
    DUP_IN_DB__TXID: (ctx) => {
        const a = ctx.additionalContext || {};
        return {
            evidence: `TX ${ctx.txId} matches ${a.priorCount} prior records. Cluster: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
            static: `Transaction ID ${ctx.txId} matches ${a.priorCount} previous records. Cluster value: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
        };
    },
    DUP_IN_BATCH__CANONICAL: (ctx) => {
        const a = ctx.additionalContext || {};
        return {
            evidence: `Similar payment pattern detected ${a.countInUpload || a.priorCount} times. Value: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
            static: `Similar payment pattern detected ${a.countInUpload || a.priorCount} times. Total: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
        };
    },
    DUP_IN_DB__CANONICAL: (ctx) => {
        const a = ctx.additionalContext || {};
        return {
            evidence: `Payment pattern matches ${a.countInUpload || a.priorCount} historical records. Cluster: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
            static: `Payment pattern matches ${a.countInUpload || a.priorCount} historical records. Cluster value: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
        };
    },
    SIMILARITY_MATCH: (ctx) => {
        var _a;
        const a = ctx.additionalContext || {};
        const sim = ((_a = a.similarity) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || "high";
        return {
            evidence: `Transaction resembles known patterns (similarity: ${sim}).`,
            static: `Transaction resembles known patterns (similarity: ${sim}).`,
        };
    },
    RULE_TRIGGER: (ctx) => {
        const a = ctx.additionalContext || {};
        return {
            evidence: `Triggered custom rule: ${a.ruleName || "unknown rule"}.`,
            static: `Triggered custom rule: ${a.ruleName || "unknown rule"}.`,
        };
    },
    default: (ctx) => ({
        evidence: `Suspicious activity detected for ${ctx.txId || "transaction"}.`,
        static: `Suspicious activity detected for ${ctx.txId || "transaction"}.`,
    }),
};
function generateStaticExplanation(context) {
    const formatter = explanationMap[context.threatType] || explanationMap.default;
    return formatter(context).static;
}
function generateDetailedExplanation(context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const evidence = buildEvidenceMessage(Object.assign(Object.assign({}, context.record), { threatType: (_a = context.threat) === null || _a === void 0 ? void 0 : _a.threatType, additionalContext: context.additionalContext }));
            const prompt = buildOpenAIPrompt(context, evidence);
            const aiText = yield callLLM(prompt);
            return `${evidence}\n\n${aiText}`;
        }
        catch (error) {
            console.error("AI detailed explanation failed:", error);
            return generateStaticExplanation(context);
        }
    });
}
function buildEvidenceMessage(ctx) {
    const formatter = explanationMap[ctx.threatType] || explanationMap.default;
    return formatter(ctx).evidence;
}
function buildOpenAIPrompt(context, evidence) {
    const safe = (obj) => JSON.stringify(obj !== null && obj !== void 0 ? obj : {}, null, 2);
    return `You are a senior financial risk analyst writing for an investigations dashboard used by fraud and compliance teams.

Use ONLY the information in EVIDENCE, THREAT, RECORD, CONTEXT, and UPLOAD. 
- Do NOT invent missing facts. If a value is missing or null, write “Unknown”.
- Keep the tone concise and professional, free of hedging or disclaimers.
- Dates must be ISO 8601. Currency: use the currency provided, otherwise “USD”.
- Audience: risk analysts and ops. Focus on why it was flagged and what to do next.

EVIDENCE:
${evidence}

THREAT (JSON):
${safe(context === null || context === void 0 ? void 0 : context.threat)}

RECORD (JSON):
${safe(context === null || context === void 0 ? void 0 : context.record)}

UPLOAD (JSON):
${safe(context === null || context === void 0 ? void 0 : context.upload)}

ADDITIONAL CONTEXT (JSON):
${safe(context === null || context === void 0 ? void 0 : context.additionalContext)}

Output STRICTLY in GitHub-flavored Markdown with the following sections and nothing else (no preamble, no code fences):

## Summary
• One-sentence plain-English reason this was flagged (reference txId, threatType, and where duplicates were found).

## Why this was flagged
• Bullet points citing the exact facts (e.g., priorCount, priorIds (redact to last 6 chars), amount, currency, partner, datasetStats (mean, max, totalRecords), and any cluster/aggregate values present).

## Risk & Severity
• Severity = start from confidenceScore:
  - >= 0.95 → Critical
  - 0.85–0.94 → High
  - 0.70–0.84 → Medium
  - < 0.70 → Low
• Adjust +1 level if (priorCount ≥ 3) OR (amount > 2 × datasetStats.mean). 
• Adjust −1 level if (priorCount = 1) AND (amount < 0.25 × datasetStats.mean).
• State final severity and a one-line rationale referencing concrete values.

## Recommended actions (priority)
1) Immediate containment (e.g., hold/suspend related transactions tied to txId/partner if policy allows).
2) Dedup validation (search for same txId across recent uploads and historical DB; confirm if legitimate reprocessing/refund).
3) Merchant/partner checks (review Partner controls, recent incident tickets, allowlist/rollback procedures).
4) Data quality & rule tuning (confirm canonicalization and txId normalization; review dedup window and thresholds).
5) Logging & audit (link recordId, upload fileName, time; add case note and assign owner).

## False-positive checks
• Common benign reasons this alert could appear (e.g., batch retries, settlement replays, partial-capture workflows, test transactions), and how to quickly confirm/clear them using available fields.

## Evidence (verbatim)
• txId: <value>
• threatType: <value>
• confidenceScore: <value 0–1>
• amount & currency: <value>
• partner: <value>
• priorCount: <value>
• priorIds (redacted to last 6 chars): <values or “Unknown”>
• cluster/aggregate value (if provided): <value or “Unknown”>
• datasetStats: mean=<value>, max=<value>, totalRecords=<value>
• recordId: <value>
• upload.fileName: <value or “Unknown”>

Word limit: 180–230 words total. 
Never include backticks or any text outside the sections above.`;
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
                    max_tokens: 200,
                    temperature: 0.3,
                }),
            });
            const data = yield res.json();
            return ((_d = (_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
        }
        else {
            const response = yield openaiClient.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 200,
                temperature: 0.3,
            });
            return ((_h = (_g = (_f = (_e = response.choices) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content) === null || _h === void 0 ? void 0 : _h.trim()) || "";
        }
    });
}
