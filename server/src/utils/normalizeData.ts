export function normalizeAmount(val: any): number | null {
  if (!val) return null;
  let s = val.toString().replace(/[^0-9.-]+/g, "");
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

export function normalizeDate(val: any): Date | null {
  if (!val) return null;
  try {
    return new Date(val);
  } catch {
    return null;
  }
}
