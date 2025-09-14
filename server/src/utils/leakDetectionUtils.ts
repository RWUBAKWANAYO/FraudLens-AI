import { Prisma } from "@prisma/client";

export function parseEmbedding(json: Prisma.JsonValue | null): number[] | null {
  if (json == null) return null;

  if (Array.isArray(json)) {
    const arr = json.map(Number);
    return arr.every(Number.isFinite) ? arr : null;
  }

  if (typeof json === "string") {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) && parsed.every((x) => Number.isFinite(Number(x)))
        ? parsed.map(Number)
        : null;
    } catch {
      return null;
    }
  }

  if (typeof json === "object") {
    const arr = Object.values(json).map((v) => Number(v));
    return arr.every(Number.isFinite) ? arr : null;
  }

  return null;
}

export function cents(amt?: number | null): number | null {
  if (amt == null) return null;
  return Math.round(amt * 100);
}

export function amountEq(a?: number | null, b?: number | null, tolCents = 0): boolean {
  const ca = cents(a);
  const cb = cents(b);
  if (ca == null || cb == null) return ca === cb;
  return Math.abs(ca - cb) <= tolCents;
}

export function normCur(cur?: string | null): string {
  return (cur || "USD").toUpperCase().trim();
}

export function strEq(a?: string | null, b?: string | null): boolean {
  return (a || "") === (b || "");
}

export function datesClose(a?: Date | null, b?: Date | null, tolSec = 30): boolean {
  if (!a || !b) return true;
  const diff = Math.abs(a.getTime() - b.getTime());
  if (diff <= tolSec * 1000) return true;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export function isStrictDuplicate(a: any, b: any): boolean {
  const aCur = a.normalizedCurrency || a.currency;
  const bCur = b.normalizedCurrency || b.currency;
  return (
    strEq(a.normalizedPartner || a.partner, b.normalizedPartner || b.partner) &&
    amountEq(a.amount, b.amount) &&
    strEq(normCur(aCur), normCur(bCur)) &&
    datesClose(a.date, b.date)
  );
}
