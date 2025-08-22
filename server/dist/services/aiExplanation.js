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
// Configuration - same pattern as AIEmbedding.ts
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;
const openaiClient = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
function generateThreatExplanation(context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        // Build the prompt based on threat type and whether we're using local AI
        const prompt = buildPrompt(context, USE_LOCAL_AI);
        if (USE_LOCAL_AI) {
            try {
                // Call your local AI server's chat endpoint
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
                if (!res.ok) {
                    throw new Error(`Local AI server error: ${res.statusText}`);
                }
                const data = yield res.json();
                return ((_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || fallbackExplanation(context);
            }
            catch (error) {
                console.error("Local AI explanation failed:", error);
                return fallbackExplanation(context);
            }
        }
        else {
            // Use OpenAI
            try {
                const response = yield openaiClient.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 200,
                    temperature: 0.3,
                });
                return ((_d = (_c = response.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || fallbackExplanation(context);
            }
            catch (error) {
                console.error("OpenAI explanation failed:", error);
                return fallbackExplanation(context);
            }
        }
    });
}
function buildPrompt(context, forLocalAI = false) {
    const { amount, partner, txId } = context;
    // Collect transaction details
    const transactionDetails = [];
    if (amount !== null && amount !== undefined) {
        transactionDetails.push(`Amount: $${amount}`);
    }
    if (partner) {
        transactionDetails.push(`Vendor/Partner: ${partner}`);
    }
    if (txId) {
        transactionDetails.push(`Transaction ID: ${txId}`);
    }
    if (forLocalAI) {
        // SIMPLIFIED PROMPT for local models
        return buildLocalAIPrompt(context, transactionDetails);
    }
    else {
        // COMPREHENSIVE PROMPT for OpenAI
        return buildOpenAIPrompt(context, transactionDetails);
    }
}
function buildLocalAIPrompt(context, transactionDetails) {
    var _a;
    const { threatType, datasetStats, additionalContext } = context;
    let issueDescription = "";
    switch (threatType) {
        case "duplicate_tx":
            issueDescription = `This transaction appears ${additionalContext === null || additionalContext === void 0 ? void 0 : additionalContext.count} times (duplicate detected).`;
            break;
        case "amount_outlier":
            issueDescription = `Unusually large amount. Average is $${(_a = datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.mean) === null || _a === void 0 ? void 0 : _a.toFixed(2)}, this is much higher.`;
            break;
        case "invalid_amount":
            issueDescription = `Invalid amount (zero or negative value).`;
            break;
        case "ml_outlier":
            issueDescription = `Suspicious pattern detected compared to normal transactions.`;
            break;
        default:
            issueDescription = `Suspicious activity detected.`;
    }
    return `Write a short business explanation about this transaction:

Transaction: ${transactionDetails.join(", ")}

Problem: ${issueDescription}

Explain why this looks suspicious, what risk it could cause, and what should be done about it. Use simple business language.`;
}
function buildOpenAIPrompt(context, transactionDetails) {
    var _a;
    const { threatType, amount, datasetStats, additionalContext } = context;
    // Base role instruction (comprehensive for OpenAI)
    const basePrompt = `You are an expert financial risk analyst preparing a leak detection report for business leaders. 
Your job: write a clear, professional explanation of a suspicious transaction. 
ALWAYS include:
1. A short summary of the issue in plain language.  
2. The reason why it was flagged (duplicate, unusually high, invalid, unusual pattern, etc.).  
3. The potential business impact (e.g., risk of revenue loss, overpayment, fraud).  
4. A recommended next step for the finance team.  
Keep it concise (3–5 sentences). Avoid technical jargon like "algorithm" or "model".`;
    // Context-specific snippets
    let specificPrompt = "";
    switch (threatType) {
        case "duplicate_tx":
            specificPrompt = `\n\nISSUE: This transaction ID appears ${additionalContext === null || additionalContext === void 0 ? void 0 : additionalContext.count} times in the dataset. 
POSSIBLE RISK: Duplicate billing or accidental multiple payments.`;
            break;
        case "amount_outlier":
            specificPrompt = `\n\nISSUE: The transaction amount is far outside the normal range.  
DATASET CONTEXT:
- Average transaction: $${datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.mean.toFixed(2)}
- This transaction is ${((_a = additionalContext === null || additionalContext === void 0 ? void 0 : additionalContext.zScore) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || "many"} standard deviations away from the mean.
- Largest historical transaction: $${datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.max}`;
            break;
        case "invalid_amount":
            specificPrompt = `\n\nISSUE: Transaction amount is $${amount}, which is invalid (zero or negative).  
POSSIBLE RISK: Data entry error, refund misclassification, or system issue.`;
            break;
        case "ml_outlier":
            specificPrompt = `\n\nISSUE: This payment stands out compared to others based on anomaly analysis.  
DATASET CONTEXT:
- Average transaction: $${datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.mean.toFixed(2)}
- Largest transaction: $${datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.max}
- Dataset size: ${datasetStats === null || datasetStats === void 0 ? void 0 : datasetStats.totalRecords} transactions.`;
            break;
        default:
            specificPrompt = `\n\nISSUE: This transaction has been flagged as potentially suspicious.`;
    }
    return `${basePrompt}

TRANSACTION DETAILS:
${transactionDetails.length > 0
        ? transactionDetails.join("\n")
        : "No transaction details available."}

${specificPrompt}

Please write a short, business-friendly explanation (3–5 sentences) that states the issue, explains why it was flagged, highlights the business impact, and recommends what action should be taken.`;
}
function fallbackExplanation(context) {
    // Build transaction info dynamically for fallback too
    const transactionInfo = [];
    if (context.txId) {
        transactionInfo.push(`Transaction ID: ${context.txId}`);
    }
    if (context.amount !== null && context.amount !== undefined) {
        transactionInfo.push(`Amount: $${context.amount}`);
    }
    if (context.partner) {
        transactionInfo.push(`Partner: ${context.partner}`);
    }
    const transactionPrefix = transactionInfo.length > 0 ? transactionInfo.join(", ") + ". " : "";
    // Simple fallback explanations if AI fails
    switch (context.threatType) {
        case "duplicate_tx":
            return `${transactionPrefix}Duplicate transaction detected. This transaction ID appears multiple times, which could indicate duplicate billing or a system error that needs investigation.`;
        case "amount_outlier":
            return `${transactionPrefix}Unusually large amount detected. This transaction is significantly higher than typical values in your dataset and should be verified for accuracy.`;
        case "invalid_amount":
            return `${transactionPrefix}Invalid transaction amount. The value is not valid for a financial transaction and may indicate a data entry error or system issue.`;
        case "ml_outlier":
            return `${transactionPrefix}Suspicious transaction pattern detected. This payment stands out as unusual compared to all other transactions and warrants further review for potential fraud or error.`;
        default:
            return `${transactionPrefix}Suspicious activity detected that requires review.`;
    }
}
