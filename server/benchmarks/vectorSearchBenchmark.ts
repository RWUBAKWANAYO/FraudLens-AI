// server/src/benchmarks/vectorSearchBenchmark.ts
import { findSimilarForEmbedding } from "../src/services/similaritySearch";
import { prisma } from "../src/config/db";
import { getEmbeddingsBatch } from "../src/services/aiEmbedding";

async function runBenchmark() {
  console.log("Starting vector search benchmark...");

  // Get a test embedding
  const testText = "test transaction merchant payment";
  const testEmbedding = (await getEmbeddingsBatch([testText]))[0];

  // Get a test company
  const testCompany = await prisma.company.findFirst();
  if (!testCompany) {
    console.error("No companies found in database");
    return;
  }

  // Test with vector index (TiDB)
  console.time("Vector index search");
  const withIndex = await findSimilarForEmbedding(testCompany.id, null, testEmbedding, 10, {
    useVectorIndex: true,
  });
  console.timeEnd("Vector index search");
  console.log(
    `With index results: ${withIndex.localPrev.length} local, ${withIndex.global.length} global`
  );

  // Test without vector index (fallback)
  console.time("Fallback search");
  const withoutIndex = await findSimilarForEmbedding(testCompany.id, null, testEmbedding, 10, {
    useVectorIndex: false,
  });
  console.timeEnd("Fallback search");
  console.log(
    `Without index results: ${withoutIndex.localPrev.length} local, ${withoutIndex.global.length} global`
  );

  // Test with different result sizes
  const sizes = [5, 10, 20, 50];
  for (const size of sizes) {
    console.time(`Vector search with ${size} results`);
    await findSimilarForEmbedding(testCompany.id, null, testEmbedding, size, {
      useVectorIndex: true,
    });
    console.timeEnd(`Vector search with ${size} results`);
  }
}

runBenchmark().catch(console.error);
