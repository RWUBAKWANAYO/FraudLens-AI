import OpenAI from "openai";
import fetch from "node-fetch";

// Configuration - same pattern as AIEmbedding.ts
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ThreatContext = {
  threatType: string;
  amount: number | null;
  partner: string | null;
  txId: string | null;
  datasetStats?: {
    mean: number;
    std?: number;
    max: number;
    totalRecords: number;
  };
  additionalContext?: any; // For specific threat types
};

export async function generateThreatExplanation(context: ThreatContext): Promise<string> {
  // Build the prompt based on threat type
  const prompt = buildPrompt(context);

  if (USE_LOCAL_AI) {
    try {
      // Call your local AI server's chat endpoint
      const res = await fetch(`${LOCAL_AI_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model", // Adjust based on your local server
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        throw new Error(`Local AI server error: ${res.statusText}`);
      }

      const data = await res.json();
      return data.choices[0]?.message?.content || fallbackExplanation(context);
    } catch (error) {
      console.error("Local AI explanation failed:", error);
      return fallbackExplanation(context);
    }
  } else {
    // Use OpenAI
    try {
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo", // or "gpt-4" for better results
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3, // Lower temperature for more factual responses
      });

      return response.choices[0]?.message?.content || fallbackExplanation(context);
    } catch (error) {
      console.error("OpenAI explanation failed:", error);
      return fallbackExplanation(context);
    }
  }
}

function buildPrompt(context: ThreatContext): string {
  const { threatType, amount, partner, txId, datasetStats, additionalContext } = context;

  // Collect transaction details
  const transactionDetails: string[] = [];
  if (amount !== null && amount !== undefined) {
    transactionDetails.push(`Amount: $${amount}`);
  }
  if (partner) {
    transactionDetails.push(`Vendor/Partner: ${partner}`);
  }
  if (txId) {
    transactionDetails.push(`Transaction ID: ${txId}`);
  }

  // Base role instruction
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
      specificPrompt = `\n\nISSUE: This transaction ID appears ${additionalContext?.count} times in the dataset. 
POSSIBLE RISK: Duplicate billing or accidental multiple payments.`;
      break;

    case "amount_outlier":
      specificPrompt = `\n\nISSUE: The transaction amount is far outside the normal range.  
DATASET CONTEXT:
- Average transaction: $${datasetStats?.mean.toFixed(2)}
- This transaction is ${
        additionalContext?.zScore?.toFixed(1) || "many"
      } standard deviations away from the mean.
- Largest historical transaction: $${datasetStats?.max}`;
      break;

    case "invalid_amount":
      specificPrompt = `\n\nISSUE: Transaction amount is $${amount}, which is invalid (zero or negative).  
POSSIBLE RISK: Data entry error, refund misclassification, or system issue.`;
      break;

    case "ml_outlier":
      specificPrompt = `\n\nISSUE: This payment stands out compared to others based on anomaly analysis.  
DATASET CONTEXT:
- Average transaction: $${datasetStats?.mean.toFixed(2)}
- Largest transaction: $${datasetStats?.max}
- Dataset size: ${datasetStats?.totalRecords} transactions.`;
      break;

    default:
      specificPrompt = `\n\nISSUE: This transaction has been flagged as potentially suspicious.`;
  }

  return `${basePrompt}

TRANSACTION DETAILS:
${
  transactionDetails.length > 0
    ? transactionDetails.join("\n")
    : "No transaction details available."
}

${specificPrompt}

Please write a short, business-friendly explanation (3–5 sentences) that states the issue, explains why it was flagged, highlights the business impact, and recommends what action should be taken.`;
}

function fallbackExplanation(context: ThreatContext): string {
  // Build transaction info dynamically for fallback too
  const transactionInfo: string[] = [];

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
