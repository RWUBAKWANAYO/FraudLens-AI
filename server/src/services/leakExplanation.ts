import OpenAI from "openai";
import fetch from "node-fetch";
import { ThreatContext } from "../types/leakTypes";

const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;

const openaiClient = USE_LOCAL_AI
  ? null
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

type Formatter = (ctx: ThreatContext) => {
  evidence: string;
  static: string;
};

const money = (v: any, cur?: string) => (v ? `${cur || "USD"} ${Number(v).toFixed(2)}` : "N/A");

const explanationMap: Record<string, Formatter> = {
  DUP_IN_BATCH__TXID: (ctx) => {
    const a = ctx.additionalContext || {};
    return {
      evidence: `Duplicate TX ${ctx.txId} found ${
        a.countInUpload || a.priorCount
      } times. Value: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
      static: `Duplicate transaction ID ${ctx.txId} detected ${
        a.countInUpload || a.priorCount
      } times. Total: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
    };
  },
  DUP_IN_DB__TXID: (ctx) => {
    const a = ctx.additionalContext || {};
    return {
      evidence: `TX ${ctx.txId} matches ${a.priorCount} prior records. Cluster: ${money(
        ctx.amount || a.amount,
        ctx.currency || a.currency
      )}.`,
      static: `Transaction ID ${ctx.txId} matches ${
        a.priorCount
      } previous records. Cluster value: ${money(
        ctx.amount || a.amount,
        ctx.currency || a.currency
      )}.`,
    };
  },
  DUP_IN_BATCH__CANONICAL: (ctx) => {
    const a = ctx.additionalContext || {};
    return {
      evidence: `Similar payment pattern detected ${
        a.countInUpload || a.priorCount
      } times. Value: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
      static: `Similar payment pattern detected ${
        a.countInUpload || a.priorCount
      } times. Total: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
    };
  },
  DUP_IN_DB__CANONICAL: (ctx) => {
    const a = ctx.additionalContext || {};
    return {
      evidence: `Payment pattern matches ${
        a.countInUpload || a.priorCount
      } historical records. Cluster: ${money(ctx.amount || a.amount, ctx.currency || a.currency)}.`,
      static: `Payment pattern matches ${
        a.countInUpload || a.priorCount
      } historical records. Cluster value: ${money(
        ctx.amount || a.amount,
        ctx.currency || a.currency
      )}.`,
    };
  },
  SIMILARITY_MATCH: (ctx) => {
    const a = ctx.additionalContext || {};
    const sim = a.similarity?.toFixed(2) || "high";
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

export function generateStaticExplanation(context: ThreatContext): string {
  const formatter = explanationMap[context.threatType] || explanationMap.default;
  return formatter(context).static;
}

export async function generateDetailedExplanation(context: any): Promise<string> {
  try {
    const evidence = buildEvidenceMessage({
      ...context.record,
      threatType: context.threat?.threatType,
      additionalContext: context.additionalContext,
    } as any);

    const prompt = buildOpenAIPrompt(context, evidence);
    const aiText = await callLLM(prompt);

    return `${evidence}\n\n${aiText}`;
  } catch (error) {
    console.error("AI detailed explanation failed:", error);
    return generateStaticExplanation(context);
  }
}

function buildEvidenceMessage(ctx: ThreatContext): string {
  const formatter = explanationMap[ctx.threatType] || explanationMap.default;
  return formatter(ctx).evidence;
}

function buildOpenAIPrompt(context: any, evidence: string): string {
  const safe = (obj: any) => JSON.stringify(obj ?? {}, null, 2);
  return `You are a senior financial risk analyst writing for an investigations dashboard used by fraud and compliance teams.

Use ONLY the information in EVIDENCE, THREAT, RECORD, CONTEXT, and UPLOAD. 
- Do NOT invent missing facts. If a value is missing or null, write “Unknown”.
- Keep the tone concise and professional, free of hedging or disclaimers.
- Dates must be ISO 8601. Currency: use the currency provided, otherwise “USD”.
- Audience: risk analysts and ops. Focus on why it was flagged and what to do next.

EVIDENCE:
${evidence}

THREAT (JSON):
${safe(context?.threat)}

RECORD (JSON):
${safe(context?.record)}

UPLOAD (JSON):
${safe(context?.upload)}

ADDITIONAL CONTEXT (JSON):
${safe(context?.additionalContext)}

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
