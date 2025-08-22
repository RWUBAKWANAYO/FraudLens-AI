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
exports.listRules = listRules;
exports.createRule = createRule;
exports.updateRule = updateRule;
const db_1 = require("../config/db");
function listRules(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { companyId } = req.query;
            const rules = yield db_1.prisma.rule.findMany({
                where: { companyId: companyId },
            });
            res.json(rules);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch rules" });
        }
    });
}
function createRule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { companyId, name, definition, enabled } = req.body;
            const rule = yield db_1.prisma.rule.create({
                data: { companyId, name, definition, enabled },
            });
            res.json(rule);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to create rule" });
        }
    });
}
function updateRule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { enabled } = req.body;
            const rule = yield db_1.prisma.rule.update({
                where: { id },
                data: { enabled },
            });
            res.json(rule);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to update rule" });
        }
    });
}
