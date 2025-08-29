import crypto from "crypto";

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
