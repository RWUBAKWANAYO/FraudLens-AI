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
exports.findSimilarity = findSimilarity;
const aiEmbedding_1 = require("../services/aiEmbedding");
const similaritySearch_1 = require("../services/similaritySearch");
function findSimilarity(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { companyId, text } = req.body;
            const embedding = yield (0, aiEmbedding_1.getEmbedding)(text);
            const results = yield (0, similaritySearch_1.findSimilarForEmbedding)(companyId, embedding);
            res.json(results);
        }
        catch (error) {
            res.status(500).json({ error: "Similarity search failed" });
        }
    });
}
