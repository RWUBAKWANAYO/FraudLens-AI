// server/src/benchmarks/loadTest.ts
import { findSimilarForEmbedding } from "../src/services/similaritySearch";
import { getEmbeddingsBatch } from "../src/services/aiEmbedding";

async function runLoadTest(iterations: number = 100, useVectorIndex: boolean = true) {
  console.log(`Running load test with ${iterations} iterations, vector index: ${useVectorIndex}`);

  // Create test embeddings
  const testTexts = [
    "payment to merchant",
    "online transaction",
    "bank transfer",
    "refund received",
    "grocery store purchase",
  ];

  const testEmbeddings = await getEmbeddingsBatch(testTexts);
  const testCompanyId = "your-test-company-id"; // Replace with actual ID

  const times: number[] = [];
  const memoryUsage: NodeJS.MemoryUsage[] = [];

  for (let i = 0; i < iterations; i++) {
    const embedding = testEmbeddings[i % testEmbeddings.length];
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    await findSimilarForEmbedding(testCompanyId, null, embedding, 10, { useVectorIndex });

    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    times.push(endTime - startTime);
    memoryUsage.push({
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
    });

    // Progress indicator
    if (i % 10 === 0) {
      console.log(`Completed ${i}/${iterations} iterations`);
    }

    // Small delay to avoid overwhelming the system
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Calculate statistics
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`\nLoad test results (vector index: ${useVectorIndex}):`);
  console.log(`Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`Min time: ${minTime}ms`);
  console.log(`Max time: ${maxTime}ms`);
  console.log(`95th percentile: ${calculatePercentile(times, 95).toFixed(2)}ms`);

  return { times, memoryUsage };
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Run tests with and without vector index
async function comparePerformance() {
  console.log("=== Performance Comparison ===");

  console.log("\n1. Testing WITH vector index:");
  const withIndex = await runLoadTest(50, true);

  console.log("\n2. Testing WITHOUT vector index:");
  const withoutIndex = await runLoadTest(50, false);

  console.log("\n=== Comparison Results ===");
  console.log(
    `Vector index average: ${withIndex.times.reduce((a, b) => a + b, 0) / withIndex.times.length}ms`
  );
  console.log(
    `Fallback average: ${
      withoutIndex.times.reduce((a, b) => a + b, 0) / withoutIndex.times.length
    }ms`
  );

  const improvement =
    ((withoutIndex.times.reduce((a, b) => a + b, 0) - withIndex.times.reduce((a, b) => a + b, 0)) /
      withoutIndex.times.reduce((a, b) => a + b, 0)) *
    100;

  console.log(`Performance improvement: ${improvement.toFixed(2)}%`);
}

comparePerformance().catch(console.error);
