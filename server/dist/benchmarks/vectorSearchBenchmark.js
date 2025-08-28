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
// server/src/benchmarks/vectorSearchBenchmark.ts
const similaritySearch_1 = require("../services/similaritySearch");
const db_1 = require("../config/db");
const aiEmbedding_1 = require("../services/aiEmbedding");
function runBenchmark() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting vector search benchmark...");
        // Get a test embedding
        const testText = "test transaction merchant payment";
        const testEmbedding = (yield (0, aiEmbedding_1.getEmbeddingsBatch)([testText]))[0];
        // Get a test company
        const testCompany = yield db_1.prisma.company.findFirst();
        if (!testCompany) {
            console.error("No companies found in database");
            return;
        }
        // Test with vector index (TiDB)
        console.time("Vector index search");
        const withIndex = yield (0, similaritySearch_1.findSimilarForEmbedding)(testCompany.id, null, testEmbedding, 10, {
            useVectorIndex: true,
        });
        console.timeEnd("Vector index search");
        console.log(`With index results: ${withIndex.localPrev.length} local, ${withIndex.global.length} global`);
        // Test without vector index (fallback)
        console.time("Fallback search");
        const withoutIndex = yield (0, similaritySearch_1.findSimilarForEmbedding)(testCompany.id, null, testEmbedding, 10, {
            useVectorIndex: false,
        });
        console.timeEnd("Fallback search");
        console.log(`Without index results: ${withoutIndex.localPrev.length} local, ${withoutIndex.global.length} global`);
        // Test with different result sizes
        const sizes = [5, 10, 20, 50];
        for (const size of sizes) {
            console.time(`Vector search with ${size} results`);
            yield (0, similaritySearch_1.findSimilarForEmbedding)(testCompany.id, null, testEmbedding, size, {
                useVectorIndex: true,
            });
            console.timeEnd(`Vector search with ${size} results`);
        }
    });
}
runBenchmark().catch(console.error);
