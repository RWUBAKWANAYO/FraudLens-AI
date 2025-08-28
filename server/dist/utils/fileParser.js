"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.parseCSVBuffer = parseCSVBuffer;
exports.parseExcelBuffer = parseExcelBuffer;
exports.parsePDFBuffer = parsePDFBuffer;
exports.parseBuffer = parseBuffer;
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const normalizeData_1 = require("./normalizeData");
function parseCSVBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = [];
        return new Promise((resolve, reject) => {
            const stream = require("stream");
            const readable = new stream.Readable();
            readable._read = () => { };
            readable.push(buffer);
            readable.push(null);
            readable
                .pipe((0, csv_parser_1.default)())
                .on("data", (row) => {
                const pick = (...keys) => {
                    for (const k of keys) {
                        if (row[k] != null && row[k] !== "")
                            return row[k];
                    }
                    return undefined;
                };
                const amount = (0, normalizeData_1.normalizeAmount)(pick("amount", "Amount", "AMT", "total", "Total", "gross", "amount_captured")) || 0;
                const partner = pick("partner", "vendor", "merchant", "Partner", "description", "Description", "business_name", "name", "account_name", "Merchant Name") || null;
                const txId = pick("txId", "transaction_id", "invoice", "id", "charge_id", "payment_id", "Transaction ID") || null;
                const date = (0, normalizeData_1.normalizeDate)(pick("date", "Date", "created", "timestamp", "time", "Created (UTC)") || null);
                const currency = pick("currency", "Currency", "currency_code", "curr", "Currency Code") ||
                    "USD";
                rows.push({
                    txId: txId || undefined,
                    partner: partner || undefined,
                    amount,
                    date,
                    email: pick("email", "Email", "customer_email", "Customer Email", "user_email") ||
                        undefined,
                    currency,
                    description: pick("description", "Description", "memo", "notes", "Transaction Description") || undefined,
                    status: pick("status", "Status", "state", "Transaction Status") || undefined,
                    // identity/instrument hints
                    user_id: pick("user_id", "userId", "UserId") || undefined,
                    account: pick("account", "account_id") || undefined,
                    card: pick("card", "card_number") || undefined,
                    bank_account: pick("bank_account", "iban") || undefined,
                    account_number: pick("account_number") || undefined,
                    ip: pick("ip", "ip_address") || undefined,
                    device: pick("device", "device_id", "device_fingerprint") || undefined,
                    raw: row,
                    embeddingJson: null,
                });
            })
                .on("end", () => resolve(rows))
                .on("error", (err) => reject(err));
        });
    });
}
function parseExcelBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        return json.map((row) => {
            var _a;
            const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [String(k).toLowerCase(), v]));
            const pick = (...keys) => {
                for (const k of keys)
                    if (lower[k] != null && lower[k] !== "")
                        return lower[k];
                return undefined;
            };
            const dateVal = (0, normalizeData_1.normalizeDate)(pick("date", "created", "timestamp", "time"));
            return {
                txId: pick("txid", "transaction_id", "invoice", "id", "charge_id") || undefined,
                partner: pick("partner", "vendor", "merchant", "business_name", "name") || undefined,
                amount: (_a = (0, normalizeData_1.normalizeAmount)(pick("amount", "total", "amt", "value", "sum"))) !== null && _a !== void 0 ? _a : 0,
                date: dateVal ? dateVal.toISOString() : undefined,
                email: pick("email", "customer_email", "user_email") || undefined,
                currency: pick("currency", "currency_code") || "USD",
                description: pick("description", "memo", "notes") || undefined,
                status: pick("status", "state") || undefined,
                user_id: pick("user_id", "userid") || undefined,
                account: pick("account", "account_id") || undefined,
                card: pick("card", "card_number") || undefined,
                bank_account: pick("bank_account", "iban") || undefined,
                account_number: pick("account_number") || undefined,
                ip: pick("ip", "ip_address") || undefined,
                device: pick("device", "device_id", "device_fingerprint") || undefined,
                raw: row,
                embeddingJson: null,
            };
        });
    });
}
function parsePDFBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = [];
        try {
            const pdfParse = (yield Promise.resolve().then(() => __importStar(require("pdf-parse")))).default;
            let text = (yield pdfParse(buffer)).text || "";
            if (!text || text.length < 20) {
                console.log("PDF seems scanned or pdf-parse failed, using OCR...");
                const Tesseract = (yield Promise.resolve().then(() => __importStar(require("tesseract.js")))).default;
                const { data: ocrResult } = yield Tesseract.recognize(buffer, "eng");
                text = ocrResult.text;
            }
            const lines = text
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);
            const txIdRegex = /[A-Z0-9]{6,}/;
            const numberRegex = /[\d,.]+/g;
            for (const line of lines) {
                const record = { raw: line, embeddingJson: null };
                const txMatch = line.match(txIdRegex);
                if (txMatch)
                    record.txId = txMatch[0].substring(0, 50);
                const nums = line.match(numberRegex);
                if (nums && nums.length > 0) {
                    const amt = (0, normalizeData_1.normalizeAmount)(nums[nums.length - 1]);
                    if (amt !== null)
                        record.amount = amt;
                }
                const partnerMatch = line.match(/([A-Za-z\s]+)\d/);
                if (partnerMatch)
                    record.partner = partnerMatch[1].trim();
                if (!record.description)
                    record.description = line;
                if (record.txId || record.amount)
                    rows.push(record);
            }
        }
        catch (err) {
            console.error("PDF parsing error:", err);
        }
        console.log(`Parsed ${rows.length} records from PDF`);
        return rows;
    });
}
function parseBuffer(buffer, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!ext)
            return [];
        try {
            if (ext === "csv" || ext === "txt")
                return yield parseCSVBuffer(buffer);
            if (ext === "xlsx" || ext === "xls")
                return yield parseExcelBuffer(buffer);
            if (ext === "pdf")
                return yield parsePDFBuffer(buffer);
        }
        catch (error) {
            console.error(`Error parsing ${ext} file:`, error);
            return [{ raw: { content: buffer.toString("utf8") }, embeddingJson: null }];
        }
        return [];
    });
}
