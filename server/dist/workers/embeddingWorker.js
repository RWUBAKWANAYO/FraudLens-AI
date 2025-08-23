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
exports.startEmbeddingWorker = startEmbeddingWorker;
const bus_1 = require("../queue/bus");
const db_1 = require("../config/db");
const aiEmbedding_1 = require("../services/aiEmbedding");
const vectorStore_1 = require("../services/vectorStore");
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 6);
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
function startEmbeddingWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, bus_1.consume)("embeddings.generate", (payload) => __awaiter(this, void 0, void 0, function* () {
            const { recordIds } = payload;
            // Grab only what we need to build the embedding text
            const recs = yield db_1.prisma.record.findMany({
                where: { id: { in: recordIds } },
                select: {
                    id: true,
                    normalizedPartner: true,
                    amount: true,
                    normalizedCurrency: true,
                    userKey: true,
                },
            });
            const texts = recs.map((r) => {
                var _a, _b, _c, _d;
                return `${(_a = r.normalizedPartner) !== null && _a !== void 0 ? _a : ""} | ${(_b = r.amount) !== null && _b !== void 0 ? _b : ""} ${(_c = r.normalizedCurrency) !== null && _c !== void 0 ? _c : ""} | ${(_d = r.userKey) !== null && _d !== void 0 ? _d : ""}`;
            });
            // Batch call embedding API
            const embeddings = yield (0, aiEmbedding_1.getEmbeddingsBatch)(texts);
            // Persist (limited parallelism)
            const tasks = embeddings.map((emb, i) => () => __awaiter(this, void 0, void 0, function* () {
                yield (0, vectorStore_1.saveRecordEmbedding)(recs[i].id, emb);
            }));
            const groups = chunk(tasks, CONCURRENCY);
            for (const g of groups) {
                yield Promise.all(g.map((fn) => fn()));
            }
        }));
    });
}
