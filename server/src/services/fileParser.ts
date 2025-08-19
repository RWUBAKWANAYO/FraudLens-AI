import fs from "fs";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";
import pdfParse from "pdf-parse";

type Parsed = {
  txId?: string;
  partner?: string;
  amount?: number;
  date?: string;
  raw?: any;
  embeddingJson?: number[] | null;
};

// Existing file-based CSV parser
export function parseCSV(filePath: string): Promise<Parsed[]> {
  const rows: Parsed[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
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
export async function parseCSVBuffer(buffer: Buffer): Promise<Parsed[]> {
  const rows: Parsed[] = [];
  return new Promise((resolve, reject) => {
    const stream = require("stream");
    const readable = new stream.Readable();
    readable._read = () => {}; // noop
    readable.push(buffer);
    readable.push(null);

    readable
      .pipe(csvParser())
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
}

// Excel buffer parser
export async function parseExcelBuffer(buffer: Buffer): Promise<Parsed[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet);

  return json.map((row: any) => ({
    txId: row.txId || row.transaction_id || row.invoice || null,
    partner: row.partner || row.vendor || row.merchant || row.Partner || null,
    amount: parseFloat(row.amount || row.Amount || row.AMT || 0),
    date: row.date || row.Date || null,
    raw: row,
    embeddingJson: null,
  }));
}

// PDF buffer parser (simple text-based extraction)
export async function parsePDFBuffer(buffer: Buffer): Promise<Parsed[]> {
  const data = await pdfParse(buffer);
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
}

// Buffer parser dispatcher
export async function parseBuffer(buffer: Buffer, fileName: string): Promise<Parsed[]> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return [];

  if (ext === "csv" || ext === "txt") return parseCSVBuffer(buffer);
  if (ext === "xlsx" || ext === "xls") return parseExcelBuffer(buffer);
  if (ext === "pdf") return parsePDFBuffer(buffer);

  return [];
}
