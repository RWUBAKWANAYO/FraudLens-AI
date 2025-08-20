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
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const normalizeData_1 = require("../utils/normalizeData");
// Fixed CSV buffer parser - removed header skipping logic
function parseCSVBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = [];
        return new Promise((resolve, reject) => {
            const stream = require("stream");
            const readable = new stream.Readable();
            readable._read = () => { }; // noop
            readable.push(buffer);
            readable.push(null);
            let headers = [];
            readable
                .pipe((0, csv_parser_1.default)())
                .on("headers", (receivedHeaders) => {
                headers = receivedHeaders;
                console.log("CSV Headers:", headers);
            })
                .on("data", (row) => {
                // Enhanced field detection with multiple possible field names
                const amount = (0, normalizeData_1.normalizeAmount)(row.amount ||
                    row.Amount ||
                    row.AMT ||
                    row.total ||
                    row.Total ||
                    row.amount_captured ||
                    row.amount_refunded ||
                    row.gross ||
                    0) || 0;
                const partner = row.partner ||
                    row.vendor ||
                    row.merchant ||
                    row.Partner ||
                    row.description ||
                    row.Description ||
                    row.business_name ||
                    row.name ||
                    row.account_name ||
                    row["Merchant Name"] ||
                    null;
                const txId = row.txId ||
                    row.transaction_id ||
                    row.invoice ||
                    row.id ||
                    row.charge_id ||
                    row.payment_id ||
                    row["Transaction ID"] ||
                    null;
                const date = (0, normalizeData_1.normalizeDate)(row.date ||
                    row.Date ||
                    row.created ||
                    row.timestamp ||
                    row.time ||
                    row["Created (UTC)"] ||
                    null);
                const email = row.email ||
                    row.Email ||
                    row.customer_email ||
                    row["Customer Email"] ||
                    row.user_email ||
                    null;
                const currency = row.currency ||
                    row.Currency ||
                    row.currency_code ||
                    row.curr ||
                    row["Currency Code"] ||
                    "usd";
                const description = row.description ||
                    row.Description ||
                    row.memo ||
                    row.notes ||
                    row["Transaction Description"] ||
                    null;
                const status = row.status || row.Status || row.state || row["Transaction Status"] || null;
                rows.push({
                    txId,
                    partner,
                    amount,
                    date,
                    email,
                    currency,
                    description,
                    status,
                    raw: row,
                    embeddingJson: null,
                });
            })
                .on("end", () => {
                console.log(`Parsed ${rows.length} rows from CSV`);
                resolve(rows);
            })
                .on("error", (err) => reject(err));
        });
    });
}
// Enhanced Excel buffer parser
function parseExcelBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Get headers
        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
            headers.push(cell ? String(cell.v).toLowerCase() : `col_${C}`);
        }
        const json = XLSX.utils.sheet_to_json(sheet, { header: headers, range: 1 });
        return json.map((row) => {
            var _a, _b;
            const rowLower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
            const dateVal = (0, normalizeData_1.normalizeDate)(rowLower.date || rowLower.created || rowLower.timestamp || rowLower.time || null);
            // Helper to force string
            const asString = (val) => {
                if (val == null)
                    return undefined;
                if (typeof val === "object")
                    return String(val);
                return String(val);
            };
            return {
                txId: asString(rowLower.txid) ||
                    asString(rowLower.transaction_id) ||
                    asString(rowLower.invoice) ||
                    asString(rowLower.id) ||
                    asString(rowLower.charge_id),
                partner: asString(rowLower.partner) ||
                    asString(rowLower.vendor) ||
                    asString(rowLower.merchant) ||
                    asString(rowLower.business_name),
                amount: (_a = (0, normalizeData_1.normalizeAmount)(rowLower.amount || rowLower.total || rowLower.amt || rowLower.value || rowLower.sum || 0)) !== null && _a !== void 0 ? _a : 0,
                date: dateVal ? dateVal.toISOString() : undefined,
                customerEmail: asString(rowLower.email) || asString(rowLower.customer_email),
                currency: asString(rowLower.currency) || asString(rowLower.currency_code),
                description: asString(rowLower.description) || asString(rowLower.memo) || asString(rowLower.notes),
                status: asString(rowLower.status) || asString(rowLower.state),
                fees: (_b = (0, normalizeData_1.normalizeAmount)(rowLower.fee || rowLower["fee"] || 0)) !== null && _b !== void 0 ? _b : 0,
                raw: row,
                embeddingJson: null,
            };
        });
    });
}
// Enhanced PDF buffer parser with proper text extraction
function parsePDFBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = [];
        try {
            const data = yield (0, pdf_parse_1.default)(buffer);
            let text = data.text || "";
            if (!text || text.length < 20) {
                console.log("PDF seems scanned or pdf-parse failed, using OCR...");
                const { data: ocrResult } = yield tesseract_js_1.default.recognize(buffer, "eng", { logger: (m) => { } });
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
                // Attempt to detect txId anywhere
                const txMatch = line.match(txIdRegex);
                if (txMatch)
                    record.txId = txMatch[0].substring(0, 50);
                // Attempt to detect amount anywhere
                const nums = line.match(numberRegex);
                if (nums && nums.length > 0) {
                    // Heuristic: pick the last number in the line as amount
                    const amt = (0, normalizeData_1.normalizeAmount)(nums[nums.length - 1]);
                    if (amt !== null)
                        record.amount = amt;
                }
                // Simple partner extraction: letters before first number
                const partnerMatch = line.match(/([A-Za-z\s]+)\d/);
                if (partnerMatch)
                    record.partner = partnerMatch[1].trim();
                // Add line as description if nothing else
                if (!record.description)
                    record.description = line;
                // Only keep record if we have txId or amount
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
// Enhanced buffer parser dispatcher
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
            // Fallback to simple text extraction
            return [
                {
                    raw: { content: buffer.toString("utf8") },
                    embeddingJson: null,
                },
            ];
        }
        return [];
    });
}
