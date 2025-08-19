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
exports.createEmployee = createEmployee;
exports.ingestCommunication = ingestCommunication;
const db_1 = require("../config/db");
function createEmployee(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const emp = yield db_1.prisma.employee.create({ data: req.body });
            res.json(emp);
        }
        catch (e) {
            next(e);
        }
    });
}
function ingestCommunication(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { employeeId, channel, content, timestamp, embeddingJson } = req.body;
            const comm = yield db_1.prisma.communications.create({
                data: {
                    employeeId,
                    channel,
                    content,
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                    embeddingJson: embeddingJson !== null && embeddingJson !== void 0 ? embeddingJson : null,
                },
            });
            res.json(comm);
        }
        catch (e) {
            next(e);
        }
    });
}
