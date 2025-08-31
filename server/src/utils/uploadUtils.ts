import crypto from "crypto";
import { normalizeAmount, normalizeDate } from "./normalizeData";
import { FieldMappingConfig, Parsed } from "../types/fileParser";
import { DEFAULT_FIELD_MAPPING } from "./constants";

export function sha256(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function normalizeCurrency(cur?: string | null): string {
  return (cur || "USD").toUpperCase().trim();
}

export function normalizePartner(p?: string | null): string {
  return (p || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function maskAccount(a?: string | null): string | null {
  if (!a) return null;
  const s = String(a).replace(/\s+/g, "");
  return `****${s.slice(-4)}`;
}

export function timeBucket(ts: Date | null | undefined, seconds: number): number {
  const ms = ts ? ts.getTime() : Date.now();
  return Math.floor(ms / (seconds * 1000));
}

export function safeDate(d?: string | Date | null): Date | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? null : dt;
}

export function mkCanonicalKey(args: {
  userKey: string | null;
  normalizedPartner: string | null;
  amount: number | null | undefined;
  currency: string | null;
  bucket30s: number | null;
}): string {
  const s = [
    args.userKey || "",
    args.normalizedPartner || "",
    args.amount == null ? "" : String(args.amount),
    args.currency || "",
    args.bucket30s == null ? "" : String(args.bucket30s),
  ].join("|");
  return sha256(s);
}

export function mkRecordSignature(args: {
  txId?: string | null;
  amount?: number | null;
  normalizedPartner?: string | null;
  currency?: string | null;
  date?: Date | null;
}): string {
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

export function validateFileExtension(fileName: string): void {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["csv", "xlsx", "xls", "json"];

  if (!ext || !allowedExtensions.includes(ext)) {
    throw new Error("Unsupported file format. Upload CSV/Excel/PDF only.");
  }
}

export function prepareRecordData(rawRecord: any, companyId: string, uploadId: string) {
  const normalizedCurrency = normalizeCurrency(rawRecord.currency);
  const normalizedPartner = normalizePartner(rawRecord.partner);
  const txnDate = safeDate(rawRecord.date);
  const userKey = rawRecord.user_id || rawRecord.email || rawRecord.device || rawRecord.ip || null;

  const accountRaw =
    rawRecord.account ||
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
    amount: rawRecord.amount ?? null,
    currency: normalizedCurrency,
    bucket30s: bucket30,
  });

  const recordSignature = mkRecordSignature({
    txId: rawRecord.txId ?? null,
    amount: rawRecord.amount ?? null,
    normalizedPartner,
    currency: normalizedCurrency,
    date: txnDate,
  });

  return {
    id: crypto.randomUUID(),
    companyId,
    uploadId,
    txId: rawRecord.txId ?? null,
    partner: rawRecord.partner ?? null,
    amount: rawRecord.amount ?? null,
    currency: rawRecord.currency ?? null,
    date: txnDate,
    raw: rawRecord.raw ?? {},
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

export function validateUploadFile(
  file: Express.Multer.File | undefined,
  jsonData: any
): string | null {
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

export class FieldMapper {
  private data: Record<string, any>;
  private config: FieldMappingConfig;
  private normalizedData: Record<string, any>;

  constructor(data: Record<string, any>, config: FieldMappingConfig = DEFAULT_FIELD_MAPPING) {
    this.data = data;
    this.config = config;
    this.normalizedData = this.normalizeKeys(data);
  }

  private normalizeKeys(data: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Create multiple normalized versions
      const lowerKey = key.toLowerCase().trim();
      const snakeKey = key.replace(/\s+/g, "_").toLowerCase();
      const camelKey = key
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
          index === 0 ? match.toLowerCase() : match.toUpperCase()
        )
        .replace(/\s+/g, "");

      normalized[lowerKey] = value;
      normalized[snakeKey] = value;
      normalized[camelKey] = value;
      normalized[key] = value; // Keep original
    }

    return normalized;
  }

  private pick(fieldNames: string[]): any {
    for (const field of fieldNames) {
      const value = this.normalizedData[field];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return undefined;
  }

  // Public mapping methods
  getTransactionId(): string | undefined {
    return this.pick(this.config.transactionId || []);
  }

  getPartner(): string | undefined {
    return this.pick(this.config.partner || []);
  }

  getAmount(): number {
    const amountValue = this.pick(this.config.amount || []);
    return normalizeAmount(amountValue) || 0;
  }

  getDate(): string | undefined {
    const dateValue = this.pick(this.config.date || []);
    const normalized = normalizeDate(dateValue);
    return normalized ? normalized.toISOString() : undefined;
  }

  getCurrency(): string {
    return (this.pick(this.config.currency || []) as string) || "USD";
  }

  getEmail(): string | undefined {
    return this.pick(this.config.email || []);
  }

  getDescription(): string | undefined {
    return this.pick(this.config.description || []);
  }

  getStatus(): string | undefined {
    return this.pick(this.config.status || []);
  }

  getUserId(): string | undefined {
    return this.pick(this.config.userId || []);
  }

  getAccount(): string | undefined {
    return this.pick(this.config.account || []);
  }

  getCard(): string | undefined {
    return this.pick(this.config.card || []);
  }

  getBankAccount(): string | undefined {
    return this.pick(this.config.bankAccount || []);
  }

  getAccountNumber(): string | undefined {
    return this.pick(this.config.accountNumber || []);
  }

  getIp(): string | undefined {
    return this.pick(this.config.ip || []);
  }

  getDevice(): string | undefined {
    return this.pick(this.config.device || []);
  }

  getAllMappedFields(): any {
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

export function mapFields(data: Record<string, any>, config?: FieldMappingConfig): any {
  const mapper = new FieldMapper(data, config);
  return mapper.getAllMappedFields();
}

export function parseJsonData(data: any[]): Parsed[] {
  return data.map((item: any, index: number) => {
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
