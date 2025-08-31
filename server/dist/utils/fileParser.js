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
exports.parseJsonBuffer = parseJsonBuffer;
exports.parsePDFBuffer = parsePDFBuffer;
exports.parseBuffer = parseBuffer;
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const normalizeData_1 = require("./normalizeData");
const uploadUtils_1 = require("../utils/uploadUtils");
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
                const mapped = (0, uploadUtils_1.mapFields)(row);
                rows.push(Object.assign(Object.assign({}, mapped), { embeddingJson: null }));
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
            const mapped = (0, uploadUtils_1.mapFields)(row);
            return Object.assign(Object.assign({}, mapped), { embeddingJson: null });
        });
    });
}
function parseJsonBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const jsonString = buffer.toString("utf8");
            const jsonData = JSON.parse(jsonString);
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            return dataArray.map((item, index) => {
                const mapped = (0, uploadUtils_1.mapFields)(item);
                return Object.assign(Object.assign({}, mapped), { txId: mapped.txId || `json-file-${Date.now()}-${index}`, embeddingJson: null });
            });
        }
        catch (error) {
            console.error("Error parsing JSON file:", error);
            throw new Error("Invalid JSON file format");
        }
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
            if (ext === "json")
                return yield parseJsonBuffer(buffer);
        }
        catch (error) {
            console.error(`Error parsing ${ext} file:`, error);
            return [{ raw: { content: buffer.toString("utf8") }, embeddingJson: null }];
        }
        return [];
    });
}
