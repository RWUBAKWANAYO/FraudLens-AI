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
exports.createAndDispatchAlert = createAndDispatchAlert;
const db_1 = require("../config/db");
const socket_1 = require("../config/socket");
function createAndDispatchAlert(input) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Creating alert for company:", input.companyId);
        const alert = yield db_1.prisma.alert.create({
            data: {
                companyId: input.companyId,
                recordId: input.recordId || null,
                threatId: input.threatId || null,
                title: input.title,
                summary: input.summary,
                severity: input.severity || "medium",
                payload: input.payload || {},
            },
        });
        console.log("ALERT CREATED:", alert.id, "for company:", input.companyId);
        // Realtime push to UI
        try {
            (0, socket_1.pushAlert)(input.companyId, Object.assign(Object.assign({ type: "threat", alertId: alert.id }, input), { createdAt: new Date().toISOString() }));
            console.log("Alert pushed via socket for company:", input.companyId);
        }
        catch (error) {
            console.error("Failed to push alert via socket:", error);
        }
        return alert;
    });
}
