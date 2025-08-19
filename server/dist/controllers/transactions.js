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
exports.checkFraud = checkFraud;
exports.testConnection = testConnection;
const fraudDetection_1 = require("../services/fraudDetection");
const db_1 = require("../config/db");
function checkFraud(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield (0, fraudDetection_1.checkTransaction)(req.body);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
}
function testConnection(_req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.prisma.employee.findFirst();
            res.json({ message: "Backend and TiDB are working!" });
        }
        catch (error) {
            next(error);
        }
    });
}
