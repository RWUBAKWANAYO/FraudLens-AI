import csvParser from "csv-parser";
import * as XLSX from "xlsx";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import { normalizeAmount, normalizeDate } from "../utils/normalizeData";

type Parsed = {
  txId?: string;
  partner?: string;
  amount?: number;
  date?: string;
  email?: string;
  currency?: string;
  description?: string;
  status?: string;
  raw?: any;
  embeddingJson?: number[] | null;
};

// Fixed CSV buffer parser - removed header skipping logic
export async function parseCSVBuffer(buffer: Buffer): Promise<Parsed[]> {
  const rows: Parsed[] = [];
  return new Promise((resolve, reject) => {
    const stream = require("stream");
    const readable = new stream.Readable();
    readable._read = () => {}; // noop
    readable.push(buffer);
    readable.push(null);

    let headers: string[] = [];

    readable
      .pipe(csvParser())
      .on("headers", (receivedHeaders: string[]) => {
        headers = receivedHeaders;
        console.log("CSV Headers:", headers);
      })
      .on("data", (row) => {
        // Enhanced field detection with multiple possible field names
        const amount =
          normalizeAmount(
            row.amount ||
              row.Amount ||
              row.AMT ||
              row.total ||
              row.Total ||
              row.amount_captured ||
              row.amount_refunded ||
              row.gross ||
              0
          ) || 0;

        const partner =
          row.partner ||
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

        const txId =
          row.txId ||
          row.transaction_id ||
          row.invoice ||
          row.id ||
          row.charge_id ||
          row.payment_id ||
          row["Transaction ID"] ||
          null;

        const date = normalizeDate(
          row.date ||
            row.Date ||
            row.created ||
            row.timestamp ||
            row.time ||
            row["Created (UTC)"] ||
            null
        ) as any;

        const email =
          row.email ||
          row.Email ||
          row.customer_email ||
          row["Customer Email"] ||
          row.user_email ||
          null;

        const currency =
          row.currency ||
          row.Currency ||
          row.currency_code ||
          row.curr ||
          row["Currency Code"] ||
          "usd";

        const description =
          row.description ||
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
}

// Enhanced Excel buffer parser
export async function parseExcelBuffer(buffer: Buffer): Promise<Parsed[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get headers
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const headers: string[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
    headers.push(cell ? String(cell.v).toLowerCase() : `col_${C}`);
  }

  const json = XLSX.utils.sheet_to_json(sheet, { header: headers, range: 1 });

  return json.map((row: any) => {
    const rowLower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));

    const dateVal = normalizeDate(
      rowLower.date || rowLower.created || rowLower.timestamp || rowLower.time || null
    );

    // Helper to force string
    const asString = (val: any): string | undefined => {
      if (val == null) return undefined;
      if (typeof val === "object") return String(val);
      return String(val);
    };

    return {
      txId:
        asString(rowLower.txid) ||
        asString(rowLower.transaction_id) ||
        asString(rowLower.invoice) ||
        asString(rowLower.id) ||
        asString(rowLower.charge_id),
      partner:
        asString(rowLower.partner) ||
        asString(rowLower.vendor) ||
        asString(rowLower.merchant) ||
        asString(rowLower.business_name),
      amount:
        normalizeAmount(
          rowLower.amount || rowLower.total || rowLower.amt || rowLower.value || rowLower.sum || 0
        ) ?? 0,
      date: dateVal ? dateVal.toISOString() : undefined,
      customerEmail: asString(rowLower.email) || asString(rowLower.customer_email),
      currency: asString(rowLower.currency) || asString(rowLower.currency_code),
      description:
        asString(rowLower.description) || asString(rowLower.memo) || asString(rowLower.notes),
      status: asString(rowLower.status) || asString(rowLower.state),
      fees: normalizeAmount(rowLower.fee || rowLower["fee"] || 0) ?? 0,
      raw: row,
      embeddingJson: null,
    };
  });
}

// Enhanced PDF buffer parser with proper text extraction
export async function parsePDFBuffer(buffer: Buffer): Promise<Parsed[]> {
  const rows: Parsed[] = [];

  try {
    const data = await pdfParse(buffer);
    let text = data.text || "";

    if (!text || text.length < 20) {
      console.log("PDF seems scanned or pdf-parse failed, using OCR...");
      const { data: ocrResult } = await Tesseract.recognize(buffer, "eng", { logger: (m) => {} });
      text = ocrResult.text;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const txIdRegex = /[A-Z0-9]{6,}/;
    const numberRegex = /[\d,.]+/g;

    for (const line of lines) {
      const record: Parsed = { raw: line, embeddingJson: null };

      // Attempt to detect txId anywhere
      const txMatch = line.match(txIdRegex);
      if (txMatch) record.txId = txMatch[0].substring(0, 50);

      // Attempt to detect amount anywhere
      const nums = line.match(numberRegex);
      if (nums && nums.length > 0) {
        // Heuristic: pick the last number in the line as amount
        const amt = normalizeAmount(nums[nums.length - 1]);
        if (amt !== null) record.amount = amt;
      }

      // Simple partner extraction: letters before first number
      const partnerMatch = line.match(/([A-Za-z\s]+)\d/);
      if (partnerMatch) record.partner = partnerMatch[1].trim();

      // Add line as description if nothing else
      if (!record.description) record.description = line;

      // Only keep record if we have txId or amount
      if (record.txId || record.amount) rows.push(record);
    }
  } catch (err) {
    console.error("PDF parsing error:", err);
  }

  console.log(`Parsed ${rows.length} records from PDF`);
  return rows;
}

// Enhanced buffer parser dispatcher
export async function parseBuffer(buffer: Buffer, fileName: string): Promise<Parsed[]> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return [];

  try {
    if (ext === "csv" || ext === "txt") return await parseCSVBuffer(buffer);
    if (ext === "xlsx" || ext === "xls") return await parseExcelBuffer(buffer);
    if (ext === "pdf") return await parsePDFBuffer(buffer);
  } catch (error) {
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
}
