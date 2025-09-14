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
// server/src/services/aiExplanation.ts
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;
const openaiClient = USE_LOCAL_AI
    ? null
    : new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
// Static explanation templates - no AI calls
function generateStaticExplanation(context) {
    const { threatType, additionalContext: a = {} } = context;
    const money = (v, cur) => v != null ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A";
    const templates = {
        DUP_IN_BATCH__TXID: () => `Duplicate transaction ID ${context.txId} detected ${a.countInUpload} times. ` +
            `Total: ${money(a.fullAmountSum, a.currency)}.`,
        DUP_IN_DB__TXID: () => `Transaction ID ${context.txId} matches ${a.priorCount} previous records. ` +
            `Cluster value: ${money(a.fullAmountSum, a.currency)}.`,
        DUP_IN_BATCH__CANONICAL: () => `Similar payment pattern detected ${a.countInUpload} times. ` +
            `Total: ${money(a.fullAmountSum, a.currency)}.`,
        DUP_IN_DB__CANONICAL: () => `Payment pattern matches ${a.priorCount} historical records. ` +
            `Cluster value: ${money(a.fullAmountSum, a.currency)}.`,
        SIMILARITY_MATCH: () => { var _a; return `Transaction resembles known patterns (similarity: ${((_a = a.similarity) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || "high"}).`; },
        RULE_TRIGGER: () => `Triggered custom rule: ${a.ruleName || "unknown rule"}.`,
        default: () => `Suspicious activity detected for transaction ${context.txId || "N/A"}.`,
    };
    return (templates[threatType] || templates.default)();
}
// AI explanation ONLY for on-demand detailed view
function generateDetailedExplanation(context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const evidence = buildEvidenceMessage(context);
            const prompt = buildOpenAIPrompt(context, evidence);
            const aiText = yield callLLM(prompt);
            return `${evidence}\n\n${aiText}`;
        }
        catch (error) {
            console.error("AI detailed explanation failed:", error);
            return generateStaticExplanation(context); // Fallback to static
        }
    });
}
// Helper functions (keep these private)
function buildEvidenceMessage(ctx) {
    const { threatType, additionalContext: a = {} } = ctx;
    const money = (v, cur) => v != null ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A";
    switch (threatType) {
        case "DUP_IN_BATCH__TXID":
            return `Duplicate TX ${ctx.txId} found ${a.countInUpload} times. Value: ${money(a.fullAmountSum, a.currency)}.`;
        case "DUP_IN_DB__TXID":
            return `TX ${ctx.txId} matches ${a.priorCount} prior records. Cluster: ${money(a.fullAmountSum, a.currency)}.`;
        // ... other cases
        default:
            return `Suspicious activity detected for ${ctx.txId || "transaction"}.`;
    }
}
function buildOpenAIPrompt(context, evidence) {
    return `As a financial risk analyst, provide a comprehensive 3-4 sentence analysis:

EVIDENCE: ${evidence}

ANALYSIS: Explain the risk, investigation steps, and recommended actions.`;
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
