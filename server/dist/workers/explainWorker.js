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
exports.startExplainWorker = startExplainWorker;
const bus_1 = require("../queue/bus");
const db_1 = require("../config/db");
const aiExplanation_1 = require("../services/aiExplanation");
function startExplainWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, bus_1.consume)("threat.explain", (payload) => __awaiter(this, void 0, void 0, function* () {
            const { threatId, context } = payload;
            const full = yield (0, aiExplanation_1.generateThreatExplanation)(context);
            yield db_1.prisma.threat.update({
                where: { id: threatId },
                data: { description: full },
            });
        }));
    });
}
