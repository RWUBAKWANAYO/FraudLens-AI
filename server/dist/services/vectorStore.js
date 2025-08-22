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
exports.saveRecordEmbedding = saveRecordEmbedding;
exports.knnByVector = knnByVector;
exports.knnGlobal = knnGlobal;
const db_1 = require("../config/db");
function saveRecordEmbedding(recordId, embedding) {
    return __awaiter(this, void 0, void 0, function* () {
        const vecText = `[${embedding.join(",")}]`;
        yield db_1.prisma.$executeRawUnsafe(`UPDATE Record SET embeddingJson = CAST(? AS JSON), embeddingVec = VEC_FROM_TEXT(?) WHERE id = ?`, JSON.stringify(embedding), vecText, recordId);
    });
}
function knnByVector(companyId_1, embedding_1) {
    return __awaiter(this, arguments, void 0, function* (companyId, embedding, k = 20) {
        const vecText = `[${embedding.join(",")}]`;
        const rows = yield db_1.prisma.$queryRawUnsafe(`SELECT id, companyId, partner, amount, date,
            VEC_COSINE_DISTANCE(embeddingVec, ?) AS distance
       FROM Record
      WHERE companyId = ? AND embeddingVec IS NOT NULL
      ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ?)
      LIMIT ?`, vecText, companyId, vecText, k);
        return rows;
    });
}
function knnGlobal(embedding_1) {
    return __awaiter(this, arguments, void 0, function* (embedding, k = 20) {
        const vecText = `[${embedding.join(",")}]`;
        const rows = yield db_1.prisma.$queryRawUnsafe(`SELECT id, companyId, partner, amount, date,
            VEC_COSINE_DISTANCE(embeddingVec, ?) AS distance
       FROM Record
      WHERE embeddingVec IS NOT NULL
      ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ?)
      LIMIT ?`, vecText, vecText, k);
        return rows;
    });
}
