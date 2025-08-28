import csvParser from "csv-parser";
import * as XLSX from "xlsx";
import { normalizeAmount, normalizeDate } from "./normalizeData";
import { Parsed } from "../types/fileParser";

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
        const pick = (...keys: string[]) => {
          for (const k of keys) {
            if (row[k] != null && row[k] !== "") return row[k];
          }
          return undefined;
        };

        const amount =
          normalizeAmount(
            pick("amount", "Amount", "AMT", "total", "Total", "gross", "amount_captured")
          ) || 0;

        const partner =
          pick(
            "partner",
            "vendor",
            "merchant",
            "Partner",
            "description",
            "Description",
            "business_name",
            "name",
            "account_name",
            "Merchant Name"
          ) || null;

        const txId =
          pick(
            "txId",
            "transaction_id",
            "invoice",
            "id",
            "charge_id",
            "payment_id",
            "Transaction ID"
          ) || null;

        const date = normalizeDate(
          pick("date", "Date", "created", "timestamp", "time", "Created (UTC)") || null
        ) as any;

        const currency =
          (pick("currency", "Currency", "currency_code", "curr", "Currency Code") as string) ||
          "USD";

        rows.push({
          txId: txId || undefined,
          partner: partner || undefined,
          amount,
          date,
          email:
            (pick("email", "Email", "customer_email", "Customer Email", "user_email") as string) ||
            undefined,
          currency,
          description:
            (pick(
              "description",
              "Description",
              "memo",
              "notes",
              "Transaction Description"
            ) as string) || undefined,
          status: (pick("status", "Status", "state", "Transaction Status") as string) || undefined,
          // identity/instrument hints
          user_id: (pick("user_id", "userId", "UserId") as string) || undefined,
          account: (pick("account", "account_id") as string) || undefined,
          card: (pick("card", "card_number") as string) || undefined,
          bank_account: (pick("bank_account", "iban") as string) || undefined,
          account_number: (pick("account_number") as string) || undefined,
          ip: (pick("ip", "ip_address") as string) || undefined,
          device: (pick("device", "device_id", "device_fingerprint") as string) || undefined,
          raw: row,
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
    const lower = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [String(k).toLowerCase(), v])
    );
    const pick = (...keys: string[]) => {
      for (const k of keys) if (lower[k] != null && lower[k] !== "") return lower[k];
      return undefined;
    };
    const dateVal = normalizeDate(pick("date", "created", "timestamp", "time"));

    return {
      txId: (pick("txid", "transaction_id", "invoice", "id", "charge_id") as string) || undefined,
      partner:
        (pick("partner", "vendor", "merchant", "business_name", "name") as string) || undefined,
      amount: normalizeAmount(pick("amount", "total", "amt", "value", "sum")) ?? 0,
      date: dateVal ? (dateVal as Date).toISOString() : undefined,
      email: (pick("email", "customer_email", "user_email") as string) || undefined,
      currency: (pick("currency", "currency_code") as string) || "USD",
      description: (pick("description", "memo", "notes") as string) || undefined,
      status: (pick("status", "state") as string) || undefined,
      user_id: (pick("user_id", "userid") as string) || undefined,
      account: (pick("account", "account_id") as string) || undefined,
      card: (pick("card", "card_number") as string) || undefined,
      bank_account: (pick("bank_account", "iban") as string) || undefined,
      account_number: (pick("account_number") as string) || undefined,
      ip: (pick("ip", "ip_address") as string) || undefined,
      device: (pick("device", "device_id", "device_fingerprint") as string) || undefined,
      raw: row,
      embeddingJson: null,
    };
  });
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
  } catch (error) {
    console.error(`Error parsing ${ext} file:`, error);
    return [{ raw: { content: buffer.toString("utf8") }, embeddingJson: null }];
  }
  return [];
}
