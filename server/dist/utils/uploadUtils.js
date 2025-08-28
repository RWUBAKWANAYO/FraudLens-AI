"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const crypto_1 = __importDefault(require("crypto"));
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
    const allowedExtensions = ["csv", "xlsx", "xls", "pdf", "txt"];
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
