"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEmbedding = parseEmbedding;
exports.cents = cents;
exports.amountEq = amountEq;
exports.normCur = normCur;
exports.strEq = strEq;
exports.datesClose = datesClose;
exports.isStrictDuplicate = isStrictDuplicate;
function parseEmbedding(json) {
    if (json == null)
        return null;
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
        }
        catch (_a) {
            return null;
        }
    }
    if (typeof json === "object") {
        const arr = Object.values(json).map((v) => Number(v));
        return arr.every(Number.isFinite) ? arr : null;
    }
    return null;
}
function cents(amt) {
    if (amt == null)
        return null;
    return Math.round(amt * 100);
}
function amountEq(a, b, tolCents = 0) {
    const ca = cents(a);
    const cb = cents(b);
    if (ca == null || cb == null)
        return ca === cb;
    return Math.abs(ca - cb) <= tolCents;
}
function normCur(cur) {
    return (cur || "USD").toUpperCase().trim();
}
function strEq(a, b) {
    return (a || "") === (b || "");
}
function datesClose(a, b, tolSec = 30) {
    if (!a || !b)
        return true;
    const diff = Math.abs(a.getTime() - b.getTime());
    if (diff <= tolSec * 1000)
        return true;
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
function isStrictDuplicate(a, b) {
    const aCur = a.normalizedCurrency || a.currency;
    const bCur = b.normalizedCurrency || b.currency;
    return (strEq(a.normalizedPartner || a.partner, b.normalizedPartner || b.partner) &&
        amountEq(a.amount, b.amount) &&
        strEq(normCur(aCur), normCur(bCur)) &&
        datesClose(a.date, b.date));
}
