import OpenAI from "openai";
import fetch from "node-fetch";

const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ThreatContext = {
  threatType: string;
  amount: number | null;
  partner: string | null;
  txId: string | null;
  datasetStats?: { mean: number; std?: number; max: number; totalRecords: number };
  additionalContext?: any; // rule-specific evidence
};

export async function generateThreatExplanation(context: ThreatContext): Promise<string> {
  // 1) Deterministic evidence message (always present, business-grade & specific)
  const evidence = buildEvidenceMessage(context);

  // 2) Optional LLM polish
  try {
    const prompt = buildOpenAIPrompt(context, evidence);
    const text = await callLLM(prompt);
    // Combine: evidence first (facts), then 2–3 sentence executive summary
    return `${evidence}\n\n${text}`;
  } catch (err) {
    console.error("AI explanation failed:", err);
    return evidence; // evidence is sufficient
  }
}

// -------- Evidence templates (no randomness) --------
function buildEvidenceMessage(ctx: ThreatContext): string {
  const t = ctx.threatType;
  const a = ctx.additionalContext || {};
  const money = (v: any, cur?: string) =>
    v != null ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A";

  switch (t) {
    case "DUP_IN_BATCH__TXID":
      return (
        `Transaction ID ${ctx.txId} appears ${
          a.countInUpload
        } times in the current upload (records: ${a.recordIds?.join(", ")}). ` +
        `First seen ${toIso(a.firstTs)}, last seen ${toIso(
          a.lastTs
        )}. Total impacted value: ${money(a.sumAmountInUpload, a.currency)}.`
      );

    case "DUP_IN_DB__TXID":
      return (
        `Transaction ID ${ctx.txId} previously occurred ${a.priorCount} times in the last 7 days. ` +
        `This upload adds ${a.newCount} occurrence(s). Cluster size is now ${a.clusterSize}. ` +
        `Window: ${toIso(a.firstSeen)} → ${toIso(
          a.lastSeen
        )}. Total impacted value across cluster: ${money(a.clusterSum, a.currency)}.`
      );

    case "DUP_IN_BATCH__CANONICAL":
      return (
        `Same user/partner/amount within ${a.timeBucketSeconds}s detected ${a.countInUpload} times in this upload ` +
        `(records: ${a.recordIds?.join(", ")}). User: ${a.userKey || "N/A"}, Partner: ${
          a.partner || "N/A"
        }, ` +
        `Amount: ${money(a.amount, a.currency)}. Window: ${toIso(a.firstTs)} → ${toIso(a.lastTs)}.`
      );

    case "DUP_IN_DB__CANONICAL":
      return (
        `Repeated payment pattern in history for the same user/partner/amount within 30 minutes. ` +
        `Prior: ${a.priorCount}, New: ${a.newCount}, Cluster: ${a.clusterSize}. ` +
        `Window: ${toIso(a.firstSeen)} → ${toIso(a.lastSeen)}. Total impacted value: ${money(
          a.clusterSum,
          a.currency
        )}.`
      );

    case "SAME_USER_SAME_AMOUNT_FAST":
      return (
        `User ${a.userKey || "N/A"} attempted ${a.countInWindow} payment(s) of ${money(
          a.amount,
          a.currency
        )} within ${a.windowSeconds}s ` +
        `(${(a.times || []).join(", ")}). Records: ${(a.recordIds || []).join(", ")}.`
      );

    case "SAME_ACCOUNT_MULTIPLE_USERS_24H":
      return (
        `Account ${a.accountMasked || "****"} used by ${
          a.userCount
        } distinct users in the last 24h: ${(a.distinctUsers || []).join(", ")}. ` +
        `Recent record IDs: ${(a.recentTxnIds || []).join(", ")}.`
      );

    case "USER_VELOCITY_1MIN":
      return `User ${a.userKey || "N/A"} made ${a.count} transactions in the last ${
        a.windowSeconds
      }s.`;

    case "SIMILARITY_MATCH":
      return `This record is highly similar to prior labeled fraud (top matches: ${(
        a.topMatches || []
      )
        .map((m: any) => `${m.id} (sim=${(m.similarity || 0).toFixed(2)})`)
        .join(", ")}).`;

    default:
      return `Suspicious activity detected for transaction ${ctx.txId || "N/A"}.`;
  }
}

function toIso(d: any) {
  try {
    return new Date(d).toISOString();
  } catch {
    return String(d ?? "N/A");
  }
}

// -------- LLM prompt (optional polish) --------
function buildOpenAIPrompt(context: ThreatContext, evidence: string) {
  const { datasetStats } = context;
  return `You are a financial risk analyst. Based on the structured evidence below, write a concise, business-friendly explanation (2–3 sentences) that:
- Summarizes the issue in plain language,
- States why it was flagged,
- Recommends the next step (investigate/refund/hold).

Evidence:
${evidence}

Dataset context: avg=${datasetStats?.mean?.toFixed(2) ?? "N/A"}, max=${
    datasetStats?.max ?? "N/A"
  }, size=${datasetStats?.totalRecords ?? "N/A"}.`;
}

async function callLLM(prompt: string): Promise<string> {
  if (USE_LOCAL_AI) {
    const res = await fetch(`${LOCAL_AI_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 140,
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } else {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 140,
      temperature: 0.2,
    });
    return response.choices?.[0]?.message?.content?.trim() || "";
  }
}
