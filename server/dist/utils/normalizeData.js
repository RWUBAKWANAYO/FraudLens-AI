"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAmount = normalizeAmount;
exports.normalizeDate = normalizeDate;
function normalizeAmount(val) {
    if (!val)
        return null;
    let s = val.toString().replace(/[^0-9.-]+/g, "");
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
}
function normalizeDate(val) {
    if (!val)
        return null;
    try {
        return new Date(val);
    }
    catch (_a) {
        return null;
    }
}
