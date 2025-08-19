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
exports.parseCSV = parseCSV;
exports.parseCSVBuffer = parseCSVBuffer;
exports.parseExcelBuffer = parseExcelBuffer;
exports.parsePDFBuffer = parsePDFBuffer;
exports.parseBuffer = parseBuffer;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
// Existing file-based CSV parser
function parseCSV(filePath) {
    const rows = [];
    return new Promise((resolve, reject) => {
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on("data", (row) => {
            const amount = parseFloat(row.amount || row.Amount || row.AMT || 0);
            const partner = row.partner || row.vendor || row.merchant || row.Partner || null;
            const txId = row.txId || row.transaction_id || row.invoice || null;
            const date = row.date || row.Date || null;
            rows.push({
                txId,
                partner,
                amount,
                date,
                raw: row,
                embeddingJson: null,
            });
        })
            .on("end", () => resolve(rows))
            .on("error", (err) => reject(err));
    });
}
// CSV buffer parser
function parseCSVBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = [];
        return new Promise((resolve, reject) => {
            const stream = require("stream");
            const readable = new stream.Readable();
            readable._read = () => { }; // noop
            readable.push(buffer);
            readable.push(null);
            readable
                .pipe((0, csv_parser_1.default)())
                .on("data", (row) => {
                const amount = parseFloat(row.amount || row.Amount || row.AMT || 0);
                const partner = row.partner || row.vendor || row.merchant || row.Partner || null;
                const txId = row.txId || row.transaction_id || row.invoice || null;
                const date = row.date || row.Date || null;
                rows.push({ txId, partner, amount, date, raw: row, embeddingJson: null });
            })
                .on("end", () => resolve(rows))
                .on("error", (err) => reject(err));
        });
    });
}
// Excel buffer parser
function parseExcelBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        return json.map((row) => ({
            txId: row.txId || row.transaction_id || row.invoice || null,
            partner: row.partner || row.vendor || row.merchant || row.Partner || null,
            amount: parseFloat(row.amount || row.Amount || row.AMT || 0),
            date: row.date || row.Date || null,
            raw: row,
            embeddingJson: null,
        }));
    });
}
// PDF buffer parser (simple text-based extraction)
function parsePDFBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield (0, pdf_parse_1.default)(buffer);
        const lines = data.text.split("\n").filter((l) => l.trim() !== "");
        // Simple heuristic: assume CSV-style rows separated by commas
        return lines.map((line) => {
            const parts = line.split(",");
            return {
                txId: parts[0] || undefined,
                partner: parts[1] || undefined,
                amount: parseFloat(parts[2] || "0") || undefined,
                date: parts[3] || undefined,
                raw: line,
                embeddingJson: null,
            };
        });
    });
}
// Buffer parser dispatcher
function parseBuffer(buffer, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!ext)
            return [];
        if (ext === "csv" || ext === "txt")
            return parseCSVBuffer(buffer);
        if (ext === "xlsx" || ext === "xls")
            return parseExcelBuffer(buffer);
        if (ext === "pdf")
            return parsePDFBuffer(buffer);
        return [];
    });
}
