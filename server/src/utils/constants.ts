import { Prisma } from "@prisma/client";
import { FieldMappingConfig } from "../types/fileParser";

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
  record: {
    select: {
      id: true,
      companyId: true,
      uploadId: true,
      txId: true,
      partner: true,
      amount: true,
      currency: true,
      date: true,
      ip: true,
      device: true,
      geoCountry: true,
      geoCity: true,
      mcc: true,
      channel: true,
      createdAt: true,
      updatedAt: true,
    },
  },
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
  upload: {
    select: {
      fileName: true,
      fileType: true,
      fileSize: true,
      publicId: true,
    },
  },
} satisfies Prisma.AlertInclude;

export const VALID_ALERT_SORT_FIELDS = ["createdAt", "updatedAt", "severity", "delivered"];

export const DEFAULT_FIELD_MAPPING: FieldMappingConfig = {
  transactionId: [
    "txId",
    "transaction_id",
    "invoice",
    "id",
    "charge_id",
    "payment_id",
    "Transaction ID",
    "transactionId",
    "ref",
    "reference",
  ],
  partner: [
    "partner",
    "vendor",
    "merchant",
    "Partner",
    "description",
    "Description",
    "business_name",
    "name",
    "account_name",
    "Merchant Name",
    "supplier",
    "counterparty",
    "beneficiary",
    "payer",
    "payee",
  ],
  amount: [
    "amount",
    "Amount",
    "AMT",
    "total",
    "Total",
    "gross",
    "amount_captured",
    "value",
    "sum",
    "price",
    "cost",
    "debit",
    "credit",
    "transaction_amount",
  ],
  date: [
    "date",
    "Date",
    "created",
    "timestamp",
    "time",
    "Created (UTC)",
    "transaction_date",
    "posting_date",
    "value_date",
    "settlement_date",
  ],
  currency: [
    "currency",
    "Currency",
    "currency_code",
    "curr",
    "Currency Code",
    "ccy",
    "transaction_currency",
    "amount_currency",
  ],
  email: [
    "email",
    "Email",
    "customer_email",
    "Customer Email",
    "user_email",
    "payer_email",
    "payee_email",
    "contact_email",
  ],
  description: [
    "description",
    "Description",
    "memo",
    "notes",
    "Transaction Description",
    "purpose",
    "remark",
    "comments",
    "narration",
  ],
  status: [
    "status",
    "Status",
    "state",
    "Transaction Status",
    "payment_status",
    "invoice_status",
    "clearing_status",
  ],
  userId: [
    "user_id",
    "userId",
    "UserId",
    "customer_id",
    "client_id",
    "user",
    "customer_number",
    "client_number",
  ],
  account: [
    "account",
    "account_id",
    "account_number",
    "account_no",
    "acct",
    "bank_account",
    "iban",
    "account_code",
  ],
  card: [
    "card",
    "card_number",
    "card_no",
    "card_token",
    "payment_card",
    "credit_card",
    "debit_card",
    "masked_card",
  ],
  bankAccount: [
    "bank_account",
    "iban",
    "bank_acct",
    "bank_account_number",
    "bank_account_no",
    "bank_iban",
  ],
  accountNumber: ["account_number", "acct_no", "account_no", "account_num"],
  ip: ["ip", "ip_address", "client_ip", "source_ip", "user_ip"],
  device: [
    "device",
    "device_id",
    "device_fingerprint",
    "device_token",
    "user_agent",
    "browser_fingerprint",
  ],
};

export const pdfMimeTypes = [
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
];

export const csvMimeTypes = [
  "text/csv",
  "text/comma-separated-values",
  "text/tab-separated-values",
  "application/csv",
  "application/excel",
  "application/vnd.ms-excel",
  "application/vnd.msexcel",
];

export const excelMimeTypes = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "application/vnd.ms-excel.template.macroenabled.12",
  "application/vnd.ms-excel.addin.macroenabled.12",
  "application/excel",
  "application/x-excel",
  "application/x-msexcel",
];

export const jsonMimeTypes = [
  "application/json",
  "application/x-json",
  "text/json",
  "text/x-json",
  "application/jsonlines",
  "application/x-ndjson",
];
