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
exports.checkTransaction = checkTransaction;
const db_1 = require("../config/db");
const server_1 = require("../server");
function checkTransaction(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { amount, userId, transactionType = "expense", notes, timestamp = new Date().toISOString(), } = input;
        const employee = yield db_1.prisma.employee.findUnique({
            where: { id: userId },
        });
        if (!employee) {
            throw new Error(`Employee with ID ${userId} not found. Use a seeded employee ID.`);
        }
        const isFraud = amount > 1000 || /gift\s?cards?/i.test(notes || "");
        const tx = yield db_1.prisma.financialLog.create({
            data: {
                employeeId: userId,
                transactionType,
                amount,
                notes,
                timestamp: new Date(timestamp),
            },
        });
        let threatId = null;
        if (isFraud) {
            const threat = yield db_1.prisma.threat.create({
                data: {
                    employeeId: userId,
                    threatType: "fraud",
                    description: `Suspicious transaction ${tx.id} amount ${amount}`,
                    confidenceScore: amount > 5000 ? 0.9 : 0.7,
                    status: "open",
                },
            });
            threatId = threat.id;
            server_1.io.emit("fraudDetected", {
                threatId: threat.id,
                transactionId: tx.id,
                employeeId: userId,
                amount,
                timestamp: tx.timestamp,
            });
        }
        return {
            transactionId: tx.id,
            isFraud,
            threatId,
            alert: isFraud ? "⚠️ Fraud suspected!" : "✅ Safe transaction",
        };
    });
}
