// server/src/services/aiExplanation.ts
import OpenAI from "openai";
import fetch from "node-fetch";

const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;

const openaiClient = USE_LOCAL_AI
  ? null
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

export type ThreatContext = {
  threatType: string;
  amount: number | null;
  partner: string | null;
  txId: string | null;
  datasetStats?: { mean: number; max: number; totalRecords: number };
  additionalContext?: any;
};

// Static explanation templates - no AI calls
export function generateStaticExplanation(context: ThreatContext): string {
  const { threatType, additionalContext: a = {} } = context;

  const money = (v: any, cur?: string) =>
    v != null ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A";

  const templates = {
    DUP_IN_BATCH__TXID: () =>
      `Duplicate transaction ID ${context.txId} detected ${a.countInUpload} times. ` +
      `Total: ${money(a.fullAmountSum, a.currency)}.`,

    DUP_IN_DB__TXID: () =>
      `Transaction ID ${context.txId} matches ${a.priorCount} previous records. ` +
      `Cluster value: ${money(a.fullAmountSum, a.currency)}.`,

    DUP_IN_BATCH__CANONICAL: () =>
      `Similar payment pattern detected ${a.countInUpload} times. ` +
      `Total: ${money(a.fullAmountSum, a.currency)}.`,

    DUP_IN_DB__CANONICAL: () =>
      `Payment pattern matches ${a.priorCount} historical records. ` +
      `Cluster value: ${money(a.fullAmountSum, a.currency)}.`,

    SIMILARITY_MATCH: () =>
      `Transaction resembles known patterns (similarity: ${a.similarity?.toFixed(2) || "high"}).`,

    RULE_TRIGGER: () => `Triggered custom rule: ${a.ruleName || "unknown rule"}.`,

    default: () => `Suspicious activity detected for transaction ${context.txId || "N/A"}.`,
  };

  return (templates[threatType as keyof typeof templates] || templates.default)();
}

// AI explanation ONLY for on-demand detailed view
export async function generateDetailedExplanation(context: ThreatContext): Promise<string> {
  try {
    const evidence = buildEvidenceMessage(context);
    const prompt = buildOpenAIPrompt(context, evidence);
    const aiText = await callLLM(prompt);

    return `${evidence}\n\n${aiText}`;
  } catch (error) {
    console.error("AI detailed explanation failed:", error);
    return generateStaticExplanation(context); // Fallback to static
  }
}

// Helper functions (keep these private)
function buildEvidenceMessage(ctx: ThreatContext): string {
  const { threatType, additionalContext: a = {} } = ctx;
  const money = (v: any, cur?: string) =>
    v != null ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A";

  switch (threatType) {
    case "DUP_IN_BATCH__TXID":
      return `Duplicate TX ${ctx.txId} found ${a.countInUpload} times. Value: ${money(
        a.fullAmountSum,
        a.currency
      )}.`;
    case "DUP_IN_DB__TXID":
      return `TX ${ctx.txId} matches ${a.priorCount} prior records. Cluster: ${money(
        a.fullAmountSum,
        a.currency
      )}.`;
    // ... other cases
    default:
      return `Suspicious activity detected for ${ctx.txId || "transaction"}.`;
  }
}

function buildOpenAIPrompt(context: ThreatContext, evidence: string): string {
  return `As a financial risk analyst, provide a comprehensive 3-4 sentence analysis:

EVIDENCE: ${evidence}

ANALYSIS: Explain the risk, investigation steps, and recommended actions.`;
}

async function callLLM(prompt: string): Promise<string> {
  if (USE_LOCAL_AI) {
    const res = await fetch(`${LOCAL_AI_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } else {
    const response = await openaiClient!.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    });
    return response.choices?.[0]?.message?.content?.trim() || "";
  }
}
