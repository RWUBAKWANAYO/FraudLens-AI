import { Rule } from "@prisma/client";

type Ctx = {
  amount?: number | null;
  currency?: string | null;
  partner?: string | null;
  mcc?: string | null;
  countLastHour?: number;
};

export function evaluateRules(rules: Rule[], ctx: Ctx) {
  const triggered: { ruleId: string; reason: string }[] = [];
  for (const r of rules) {
    try {
      const def: any = r.definition || {};
      // examples: { gt: ["amount", 10000] } | { in: ["mcc", ["4829","6011"]] }
      if (def.gt && typeof ctx[def.gt[0] as keyof Ctx] === "number") {
        if ((ctx[def.gt[0] as keyof Ctx] as any) > def.gt[1])
          triggered.push({ ruleId: r.id, reason: `${def.gt[0]}>${def.gt[1]}` });
      }
      if (def.in && Array.isArray(def.in[1])) {
        const v = (ctx as any)[def.in[0]];
        if (v && def.in[1].includes(v))
          triggered.push({ ruleId: r.id, reason: `${def.in[0]} in list` });
      }
      if (def.regex) {
        const [field, pattern] = def.regex;
        const v = (ctx as any)[field];
        if (v && new RegExp(pattern, "i").test(String(v)))
          triggered.push({ ruleId: r.id, reason: `${field}~=${pattern}` });
      }
    } catch {}
  }
  return triggered;
}
