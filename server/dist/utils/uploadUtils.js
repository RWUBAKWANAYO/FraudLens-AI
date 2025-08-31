"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldMapper = void 0;
exports.sha256 = sha256;
exports.normalizeCurrency = normalizeCurrency;
exports.normalizePartner = normalizePartner;
exports.maskAccount = maskAccount;
exports.timeBucket = timeBucket;
exports.safeDate = safeDate;
exports.mkCanonicalKey = mkCanonicalKey;
exports.mkRecordSignature = mkRecordSignature;
exports.validateFileExtension = validateFileExtension;
exports.prepareRecordData = prepareRecordData;
exports.validateUploadFile = validateUploadFile;
exports.mapFields = mapFields;
exports.parseJsonData = parseJsonData;
const crypto_1 = __importDefault(require("crypto"));
const normalizeData_1 = require("./normalizeData");
const constants_1 = require("./constants");
function sha256(buf) {
    return crypto_1.default.createHash("sha256").update(buf).digest("hex");
}
function normalizeCurrency(cur) {
    return (cur || "USD").toUpperCase().trim();
}
function normalizePartner(p) {
    return (p || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function maskAccount(a) {
    if (!a)
        return null;
    const s = String(a).replace(/\s+/g, "");
    return `****${s.slice(-4)}`;
}
function timeBucket(ts, seconds) {
    const ms = ts ? ts.getTime() : Date.now();
    return Math.floor(ms / (seconds * 1000));
}
function safeDate(d) {
    if (!d)
        return null;
    const dt = typeof d === "string" ? new Date(d) : d;
    return isNaN(dt.getTime()) ? null : dt;
}
function mkCanonicalKey(args) {
    const s = [
        args.userKey || "",
        args.normalizedPartner || "",
        args.amount == null ? "" : String(args.amount),
        args.currency || "",
        args.bucket30s == null ? "" : String(args.bucket30s),
    ].join("|");
    return sha256(s);
}
function mkRecordSignature(args) {
    const rounded = args.date ? new Date(Math.floor(args.date.getTime() / 1000) * 1000) : null;
    const s = [
        args.txId || "",
        args.amount == null ? "" : String(args.amount),
        args.normalizedPartner || "",
        args.currency || "",
        rounded ? rounded.toISOString() : "",
    ].join("|");
    return sha256(s);
}
function validateFileExtension(fileName) {
    var _a;
    const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const allowedExtensions = ["csv", "xlsx", "xls", "json"];
    if (!ext || !allowedExtensions.includes(ext)) {
        throw new Error("Unsupported file format. Upload CSV/Excel/PDF only.");
    }
}
function prepareRecordData(rawRecord, companyId, uploadId) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const normalizedCurrency = normalizeCurrency(rawRecord.currency);
    const normalizedPartner = normalizePartner(rawRecord.partner);
    const txnDate = safeDate(rawRecord.date);
    const userKey = rawRecord.user_id || rawRecord.email || rawRecord.device || rawRecord.ip || null;
    const accountRaw = rawRecord.account ||
        rawRecord.card ||
        rawRecord.bank_account ||
        rawRecord.account_number ||
        null;
    const accountKey = accountRaw ? String(accountRaw) : null;
    const accountMasked = maskAccount(accountRaw);
    const bucket30 = timeBucket(txnDate, 30);
    const bucket60 = timeBucket(txnDate, 60);
    const canonicalKey = mkCanonicalKey({
        userKey,
        normalizedPartner,
        amount: (_a = rawRecord.amount) !== null && _a !== void 0 ? _a : null,
        currency: normalizedCurrency,
        bucket30s: bucket30,
    });
    const recordSignature = mkRecordSignature({
        txId: (_b = rawRecord.txId) !== null && _b !== void 0 ? _b : null,
        amount: (_c = rawRecord.amount) !== null && _c !== void 0 ? _c : null,
        normalizedPartner,
        currency: normalizedCurrency,
        date: txnDate,
    });
    return {
        id: crypto_1.default.randomUUID(),
        companyId,
        uploadId,
        txId: (_d = rawRecord.txId) !== null && _d !== void 0 ? _d : null,
        partner: (_e = rawRecord.partner) !== null && _e !== void 0 ? _e : null,
        amount: (_f = rawRecord.amount) !== null && _f !== void 0 ? _f : null,
        currency: (_g = rawRecord.currency) !== null && _g !== void 0 ? _g : null,
        date: txnDate,
        raw: (_h = rawRecord.raw) !== null && _h !== void 0 ? _h : {},
        ip: rawRecord.ip || null,
        device: rawRecord.device || null,
        geoCountry: rawRecord.geoCountry || null,
        geoCity: rawRecord.geoCity || null,
        mcc: rawRecord.mcc || null,
        channel: rawRecord.channel || null,
        normalizedPartner,
        normalizedCurrency,
        userKey,
        accountKey,
        accountMasked,
        timeBucket30s: bucket30,
        timeBucket60s: bucket60,
        canonicalKey,
        recordSignature,
    };
}
const ALLOWED_EXTENSIONS = [".json", ".csv", ".xlsx", ".xls"];
function validateUploadFile(file, jsonData) {
    if (jsonData) {
        return null;
    }
    if (!file) {
        return "No file uploaded";
    }
    const fileExtension = file.originalname.toLowerCase();
    const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileExtension.endsWith(ext));
    if (!isValidExtension) {
        return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    return null;
}
class FieldMapper {
    constructor(data, config = constants_1.DEFAULT_FIELD_MAPPING) {
        this.data = data;
        this.config = config;
        this.normalizedData = this.normalizeKeys(data);
    }
    normalizeKeys(data) {
        const normalized = {};
        for (const [key, value] of Object.entries(data)) {
            // Create multiple normalized versions
            const lowerKey = key.toLowerCase().trim();
            const snakeKey = key.replace(/\s+/g, "_").toLowerCase();
            const camelKey = key
                .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => index === 0 ? match.toLowerCase() : match.toUpperCase())
                .replace(/\s+/g, "");
            normalized[lowerKey] = value;
            normalized[snakeKey] = value;
            normalized[camelKey] = value;
            normalized[key] = value; // Keep original
        }
        return normalized;
    }
    pick(fieldNames) {
        for (const field of fieldNames) {
            const value = this.normalizedData[field];
            if (value !== undefined && value !== null && value !== "") {
                return value;
            }
        }
        return undefined;
    }
    // Public mapping methods
    getTransactionId() {
        return this.pick(this.config.transactionId || []);
    }
    getPartner() {
        return this.pick(this.config.partner || []);
    }
    getAmount() {
        const amountValue = this.pick(this.config.amount || []);
        return (0, normalizeData_1.normalizeAmount)(amountValue) || 0;
    }
    getDate() {
        const dateValue = this.pick(this.config.date || []);
        const normalized = (0, normalizeData_1.normalizeDate)(dateValue);
        return normalized ? normalized.toISOString() : undefined;
    }
    getCurrency() {
        return this.pick(this.config.currency || []) || "USD";
    }
    getEmail() {
        return this.pick(this.config.email || []);
    }
    getDescription() {
        return this.pick(this.config.description || []);
    }
    getStatus() {
        return this.pick(this.config.status || []);
    }
    getUserId() {
        return this.pick(this.config.userId || []);
    }
    getAccount() {
        return this.pick(this.config.account || []);
    }
    getCard() {
        return this.pick(this.config.card || []);
    }
    getBankAccount() {
        return this.pick(this.config.bankAccount || []);
    }
    getAccountNumber() {
        return this.pick(this.config.accountNumber || []);
    }
    getIp() {
        return this.pick(this.config.ip || []);
    }
    getDevice() {
        return this.pick(this.config.device || []);
    }
    getAllMappedFields() {
        return {
            txId: this.getTransactionId(),
            partner: this.getPartner(),
            amount: this.getAmount(),
            date: this.getDate(),
            currency: this.getCurrency(),
            email: this.getEmail(),
            description: this.getDescription(),
            status: this.getStatus(),
            user_id: this.getUserId(),
            account: this.getAccount(),
            card: this.getCard(),
            bank_account: this.getBankAccount(),
            account_number: this.getAccountNumber(),
            ip: this.getIp(),
            device: this.getDevice(),
            raw: this.data,
        };
    }
}
exports.FieldMapper = FieldMapper;
function mapFields(data, config) {
    const mapper = new FieldMapper(data, config);
    return mapper.getAllMappedFields();
}
function parseJsonData(data) {
    return data.map((item, index) => {
        const mapped = mapFields(item);
        return {
            txId: mapped.txId || `json-${Date.now()}-${index}`,
            partner: mapped.partner,
            amount: mapped.amount,
            date: mapped.date,
            currency: mapped.currency,
            email: mapped.email,
            description: mapped.description,
            status: mapped.status,
            user_id: mapped.user_id,
            account: mapped.account,
            card: mapped.card,
            bank_account: mapped.bank_account,
            account_number: mapped.account_number,
            ip: mapped.ip,
            device: mapped.device,
            raw: item,
            embeddingJson: null,
        };
    });
}
