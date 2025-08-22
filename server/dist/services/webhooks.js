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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchEnterpriseWebhooks = dispatchEnterpriseWebhooks;
const node_fetch_1 = __importDefault(require("node-fetch"));
const db_1 = require("../config/db");
function dispatchEnterpriseWebhooks(companyId, event) {
    return __awaiter(this, void 0, void 0, function* () {
        const subs = yield db_1.prisma.webhookSubscription.findMany({ where: { companyId, active: true } });
        for (const s of subs) {
            try {
                yield (0, node_fetch_1.default)(s.url, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "x-signature": signBody(s.secret, event),
                    },
                    body: JSON.stringify(event),
                });
            }
            catch (e) {
                // store failure for retry (simplified)
                console.error("webhook delivery failed", s.url, e);
            }
        }
    });
}
function signBody(secret, payload) {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}
