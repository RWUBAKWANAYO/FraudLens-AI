"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listThreats = listThreats;
exports.getThreatDetails = getThreatDetails;
const db_1 = require("../config/db");
const leakExplanation_1 = require("../services/leakExplanation");
function listThreats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { companyId } = req.query;
            const threats = yield db_1.prisma.threat.findMany({
                where: { companyId: companyId },
                include: { record: true },
                orderBy: { createdAt: "desc" },
                take: 100,
            });
            res.json(threats);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ error: "Failed to fetch threats" });
        }
    });
}
function getThreatDetails(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const { threatId } = req.params;
            const threat = yield db_1.prisma.threat.findUnique({
                where: { id: threatId },
                include: { record: true },
            });
            if (!threat) {
                return res.status(404).json({ error: "Threat not found" });
            }
            // Check if we already have an AI explanation
            const metadata = threat.metadata;
            if (metadata === null || metadata === void 0 ? void 0 : metadata.aiExplanation) {
                return res.json({
                    threat: {
                        id: threat.id,
                        threatType: threat.threatType,
                        confidenceScore: threat.confidenceScore,
                        createdAt: threat.createdAt,
                        description: threat.description,
                    },
                    explanation: metadata.aiExplanation,
                    record: threat.record,
                    source: "cached",
                });
            }
            // Use stored context or build basic context from threat data
            const context = (metadata === null || metadata === void 0 ? void 0 : metadata.aiContext) || {
                threatType: threat.threatType,
                amount: (_a = threat.record) === null || _a === void 0 ? void 0 : _a.amount,
                partner: (_b = threat.record) === null || _b === void 0 ? void 0 : _b.partner,
                txId: (_c = threat.record) === null || _c === void 0 ? void 0 : _c.txId,
                additionalContext: metadata === null || metadata === void 0 ? void 0 : metadata.context,
            };
            // Generate AI explanation ON-DEMAND (only when user requests)
            const detailedExplanation = yield (0, leakExplanation_1.generateDetailedExplanation)(context);
            // Save the AI explanation to prevent regeneration
            const updatedThreat = yield db_1.prisma.threat.update({
                where: { id: threatId },
                data: {
                    metadata: Object.assign(Object.assign({}, metadata), { aiExplanation: detailedExplanation, aiGeneratedAt: new Date().toISOString(), aiExplanationGenerated: true }),
                },
                include: { record: true },
            });
            res.json({
                threat: {
                    id: updatedThreat.id,
                    threatType: updatedThreat.threatType,
                    confidenceScore: updatedThreat.confidenceScore,
                    createdAt: updatedThreat.createdAt,
                    description: updatedThreat.description,
                },
                explanation: detailedExplanation,
                record: updatedThreat.record,
                source: "generated",
            });
        }
        catch (error) {
            console.error("Failed to get threat details:", error);
            res.status(500).json({ error: "Failed to generate detailed analysis" });
        }
    });
}
