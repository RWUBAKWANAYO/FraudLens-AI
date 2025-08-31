import csvParser from "csv-parser";
import * as XLSX from "xlsx";
import { normalizeAmount } from "./normalizeData";
import { Parsed } from "../types/fileParser";
import { mapFields } from "../utils/uploadUtils";

export async function parseCSVBuffer(buffer: Buffer): Promise<Parsed[]> {
  const rows: Parsed[] = [];
  return new Promise((resolve, reject) => {
    const stream = require("stream");
    const readable = new stream.Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);

    readable
      .pipe(csvParser())
      .on("data", (row) => {
        const mapped = mapFields(row);
        rows.push({
          ...mapped,
          embeddingJson: null,
        });
      })
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

export async function parseExcelBuffer(buffer: Buffer): Promise<Parsed[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

  return json.map((row: any) => {
    const mapped = mapFields(row);
    return {
      ...mapped,
      embeddingJson: null,
    };
  });
}

export async function parseJsonBuffer(buffer: Buffer): Promise<Parsed[]> {
  try {
    const jsonString = buffer.toString("utf8");
    const jsonData = JSON.parse(jsonString);
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

    return dataArray.map((item: any, index: number) => {
      const mapped = mapFields(item);
      return {
        ...mapped,
        txId: mapped.txId || `json-file-${Date.now()}-${index}`,
        embeddingJson: null,
      };
    });
  } catch (error) {
    console.error("Error parsing JSON file:", error);
    throw new Error("Invalid JSON file format");
  }
}

export async function parsePDFBuffer(buffer: Buffer): Promise<Parsed[]> {
  const rows: any[] = [];
  try {
    const pdfParse = (await import("pdf-parse")).default;
    let text = (await pdfParse(buffer)).text || "";

    if (!text || text.length < 20) {
      console.log("PDF seems scanned or pdf-parse failed, using OCR...");
      const Tesseract = (await import("tesseract.js")).default;
      const { data: ocrResult } = await Tesseract.recognize(buffer, "eng");
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

      const txMatch = line.match(txIdRegex);
      if (txMatch) record.txId = txMatch[0].substring(0, 50);

      const nums = line.match(numberRegex);
      if (nums && nums.length > 0) {
        const amt = normalizeAmount(nums[nums.length - 1]);
        if (amt !== null) record.amount = amt;
      }

      const partnerMatch = line.match(/([A-Za-z\s]+)\d/);
      if (partnerMatch) record.partner = partnerMatch[1].trim();

      if (!record.description) record.description = line;

      if (record.txId || record.amount) rows.push(record);
    }
  } catch (err) {
    console.error("PDF parsing error:", err);
  }

  console.log(`Parsed ${rows.length} records from PDF`);
  return rows;
}

export async function parseBuffer(buffer: Buffer, fileName: string): Promise<Parsed[]> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return [];
  try {
    if (ext === "csv" || ext === "txt") return await parseCSVBuffer(buffer);
    if (ext === "xlsx" || ext === "xls") return await parseExcelBuffer(buffer);
    if (ext === "pdf") return await parsePDFBuffer(buffer);
    if (ext === "json") return await parseJsonBuffer(buffer);
  } catch (error) {
    console.error(`Error parsing ${ext} file:`, error);
    return [{ raw: { content: buffer.toString("utf8") }, embeddingJson: null }];
  }
  return [];
}
