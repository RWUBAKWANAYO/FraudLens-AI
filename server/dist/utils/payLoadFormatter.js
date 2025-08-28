"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPayloadForDestination = formatPayloadForDestination;
const constants_1 = require("./constants");
function formatPayloadForDestination(payload, webhookUrl) {
    var _a, _b, _c, _d, _e, _f;
    if (webhookUrl.includes("hooks.slack.com") && payload.event === "upload.complete") {
        const uploadData = ((_a = payload.data) === null || _a === void 0 ? void 0 : _a.upload) || {};
        const summary = ((_b = payload.data) === null || _b === void 0 ? void 0 : _b.summary) || {};
        if (!summary.flagged || summary.flagged === 0) {
            return null;
        }
        const primaryThreat = constants_1.THREAT_TYPE_MAP[(_d = (_c = summary.byRule) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.rule_id] || "N/A";
        const dashboardUrl = process.env.FRONTEND_URL || "https://yourplatform.com";
        const reportId = uploadData.id || "123";
        return {
            text: `📊 Fraud Detection Report Complete\n\n• ${summary.totalRecords} records analyzed\n• ${summary.flagged} suspicious transaction${summary.flagged !== 1 ? "s" : ""} flagged (USD ${((_e = summary.flaggedValue) === null || _e === void 0 ? void 0 : _e.toFixed(2)) || "0.00"})\n\n⚠️ Detected include: ${primaryThreat}\n\n👉 View full details in FraudGuard: ${dashboardUrl}/dashboard/reports/${reportId}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `📊 *Fraud Detection Report Complete*\n\n• ${summary.totalRecords} records analyzed\n• ${summary.flagged} suspicious transaction${summary.flagged !== 1 ? "s" : ""} flagged (USD ${((_f = summary.flaggedValue) === null || _f === void 0 ? void 0 : _f.toFixed(2)) || "0.00"})\n\n⚠️ *Detected:* ${primaryThreat}`,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `👉 View full details in FraudGuard: ${dashboardUrl}/dashboard/reports/${reportId}`,
                    },
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Completed at: ${payload.timestamp || new Date().toISOString()}`,
                        },
                    ],
                },
            ],
        };
    }
    if (webhookUrl.includes("hooks.slack.com") && payload.event === "threat.created") {
        return null;
    }
    return payload;
}
