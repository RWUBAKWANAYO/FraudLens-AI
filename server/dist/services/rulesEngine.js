"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRules = evaluateRules;
function evaluateRules(rules, ctx) {
    const triggered = [];
    for (const r of rules) {
        try {
            const def = r.definition || {};
            // examples: { gt: ["amount", 10000] } | { in: ["mcc", ["4829","6011"]] }
            if (def.gt && typeof ctx[def.gt[0]] === "number") {
                if (ctx[def.gt[0]] > def.gt[1])
                    triggered.push({ ruleId: r.id, reason: `${def.gt[0]}>${def.gt[1]}` });
            }
            if (def.in && Array.isArray(def.in[1])) {
                const v = ctx[def.in[0]];
                if (v && def.in[1].includes(v))
                    triggered.push({ ruleId: r.id, reason: `${def.in[0]} in list` });
            }
            if (def.regex) {
                const [field, pattern] = def.regex;
                const v = ctx[field];
                if (v && new RegExp(pattern, "i").test(String(v)))
                    triggered.push({ ruleId: r.id, reason: `${field}~=${pattern}` });
            }
        }
        catch (_a) { }
    }
    return triggered;
}
