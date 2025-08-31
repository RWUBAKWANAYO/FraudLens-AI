"use strict";
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FIELD_MAPPING = exports.VALID_ALERT_SORT_FIELDS = exports.ALERT_INCLUDE = exports.VALID_THREAT_SORT_FIELDS = exports.THREAT_INCLUDE = exports.WEBHOOK_DLQ = exports.WEBHOOK_RETRY_QUEUE = exports.WEBHOOK_QUEUE = exports.THREAT_TYPE_MAP = exports.SIMILARITY_BATCH_SIZE = exports.SIMILARITY_SEARCH_LIMIT = exports.SIMILARITY_SUSPICIOUS_THRESHOLD = exports.SIMILARITY_DUP_THRESHOLD = exports.AMOUNT_TOLERANCE_CENTS = exports.TS_TOLERANCE_SEC = exports.RULE = exports.SEVERITY = void 0;
exports.SEVERITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" };
exports.RULE = {
    DUP_IN_BATCH__TXID: "DUP_IN_BATCH__TXID",
    DUP_IN_DB__TXID: "DUP_IN_DB__TXID",
    DUP_IN_BATCH__CANONICAL: "DUP_IN_BATCH__CANONICAL",
    DUP_IN_DB__CANONICAL: "DUP_IN_DB__CANONICAL",
    RULE_TRIGGER: "RULE_TRIGGER",
    SIMILARITY_MATCH: "SIMILARITY_MATCH",
};
exports.TS_TOLERANCE_SEC = Number((_a = process.env.DUP_TS_TOLERANCE_SEC) !== null && _a !== void 0 ? _a : 30);
exports.AMOUNT_TOLERANCE_CENTS = Number((_b = process.env.DUP_AMOUNT_TOLERANCE_CENTS) !== null && _b !== void 0 ? _b : 0);
exports.SIMILARITY_DUP_THRESHOLD = Number((_c = process.env.SIM_DUP_THRESHOLD) !== null && _c !== void 0 ? _c : 0.85);
exports.SIMILARITY_SUSPICIOUS_THRESHOLD = Number((_d = process.env.SIM_SUS_THRESHOLD) !== null && _d !== void 0 ? _d : 0.75);
exports.SIMILARITY_SEARCH_LIMIT = Number(process.env.SIMILARITY_SEARCH_LIMIT || 50);
exports.SIMILARITY_BATCH_SIZE = Number(process.env.SIMILARITY_BATCH_SIZE || 10);
exports.THREAT_TYPE_MAP = {
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
exports.WEBHOOK_QUEUE = "webhook.deliveries";
exports.WEBHOOK_RETRY_QUEUE = "webhook.retries";
exports.WEBHOOK_DLQ = "webhook.dead_letter";
exports.THREAT_INCLUDE = {
    record: true,
    upload: {
        select: {
            fileName: true,
            createdAt: true,
        },
    },
};
exports.VALID_THREAT_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "confidenceScore",
    "status",
    "threatType",
];
exports.ALERT_INCLUDE = {
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
};
exports.VALID_ALERT_SORT_FIELDS = ["createdAt", "updatedAt", "severity", "delivered"];
exports.DEFAULT_FIELD_MAPPING = {
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
