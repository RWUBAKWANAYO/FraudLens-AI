import { Prisma } from "@prisma/client";

export const SEVERITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;

export const RULE = {
  DUP_IN_BATCH__TXID: "DUP_IN_BATCH__TXID",
  DUP_IN_DB__TXID: "DUP_IN_DB__TXID",
  DUP_IN_BATCH__CANONICAL: "DUP_IN_BATCH__CANONICAL",
  DUP_IN_DB__CANONICAL: "DUP_IN_DB__CANONICAL",
  RULE_TRIGGER: "RULE_TRIGGER",
  SIMILARITY_MATCH: "SIMILARITY_MATCH",
} as const;

export const TS_TOLERANCE_SEC = Number(process.env.DUP_TS_TOLERANCE_SEC ?? 30);
export const AMOUNT_TOLERANCE_CENTS = Number(process.env.DUP_AMOUNT_TOLERANCE_CENTS ?? 0);
export const SIMILARITY_DUP_THRESHOLD = Number(process.env.SIM_DUP_THRESHOLD ?? 0.85);
export const SIMILARITY_SUSPICIOUS_THRESHOLD = Number(process.env.SIM_SUS_THRESHOLD ?? 0.75);
export const SIMILARITY_SEARCH_LIMIT = Number(process.env.SIMILARITY_SEARCH_LIMIT || 50);
export const SIMILARITY_BATCH_SIZE = Number(process.env.SIMILARITY_BATCH_SIZE || 10);

export const THREAT_TYPE_MAP: Record<string, string> = {
  DUP_IN_BATCH__TXID: "Duplicate transaction ID used multiple times",
  DUP_IN_DB__TXID: "Duplicate transaction ID found in historical data",
  DUP_IN_BATCH__CANONICAL: "Suspicious payment pattern detected",
  DUP_IN_DB__CANONICAL: "Historical suspicious payment pattern",
  SIMILARITY_MATCH: "Pattern matching known fraudulent activity",
  RULE_TRIGGER: "Custom security rule violation",
  AMOUNT_ANOMALY: "Unusual transaction amount",
  VELOCITY_ANOMALY: "Unusual transaction frequency",
  GEO_ANOMALY: "Suspicious geographic activity",
  TIME_ANOMALY: "Unusual transaction timing",
};

export const WEBHOOK_QUEUE = "webhook.deliveries";
export const WEBHOOK_RETRY_QUEUE = "webhook.retries";
export const WEBHOOK_DLQ = "webhook.dead_letter";

export const THREAT_INCLUDE = {
  record: true,
  upload: {
    select: {
      fileName: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ThreatInclude;

export const VALID_THREAT_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "confidenceScore",
  "status",
  "threatType",
];

export const ALERT_INCLUDE = {
  threat: {
    select: {
      threatType: true,
      confidenceScore: true,
      status: true,
    },
  },
  record: {
    select: {
      txId: true,
      partner: true,
      amount: true,
      currency: true,
    },
  },
} satisfies Prisma.AlertInclude;

export const VALID_ALERT_SORT_FIELDS = ["createdAt", "updatedAt", "severity", "delivered"];
