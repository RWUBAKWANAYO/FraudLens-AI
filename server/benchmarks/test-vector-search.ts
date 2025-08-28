// server/src/benchmarks/test-vector-search.ts
import { findSimilarForEmbedding } from "../src/services/similaritySearch";
import { getEmbeddingsBatch } from "../src/services/aiEmbedding";
import { prisma } from "../src/config/db";

async function testVectorSearch() {
  console.log("🔍 Testing Vector Search Functionality");

  // Get a test company
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("❌ No company found in database");
    return;
  }

  console.log(`🏢 Using company: ${company.name} (${company.id})`);

  // Create a test embedding
  const testText = "payment to amazon online store";
  console.log(`📝 Test text: "${testText}"`);

  const embeddings = await getEmbeddingsBatch([testText]);
  const testEmbedding = embeddings[0];

  console.log(`🧠 Embedding generated: ${testEmbedding.length} dimensions`);

  // Test 1: With vector index (TiDB)
  console.log("\n1. Testing WITH vector index (TiDB):");
  console.time("Vector index search");
  try {
    const withIndex = await findSimilarForEmbedding(company.id, null, testEmbedding, 5, {
      useVectorIndex: true,
    });
    console.timeEnd("Vector index search");
    console.log(
      `✅ Found ${withIndex.localPrev.length} local matches, ${withIndex.global.length} global matches`
    );

    if (withIndex.localPrev.length > 0) {
      console.log("📊 Local matches:");
      withIndex.localPrev.forEach((match) => {
        console.log(
          `   - ${match.partner} (${match.amount} ${
            match.txId
          }), similarity: ${match.similarity.toFixed(4)}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Vector index search failed:", error);
  }

  // Test 2: Without vector index (fallback)
  console.log("\n2. Testing WITHOUT vector index (fallback):");
  console.time("Fallback search");
  try {
    const withoutIndex = await findSimilarForEmbedding(company.id, null, testEmbedding, 5, {
      useVectorIndex: false,
    });
    console.timeEnd("Fallback search");
    console.log(
      `✅ Found ${withoutIndex.localPrev.length} local matches, ${withoutIndex.global.length} global matches`
    );
  } catch (error) {
    console.error("❌ Fallback search failed:", error);
  }

  // Test 3: Performance comparison
  console.log("\n3. Performance comparison (10 queries each):");

  const testQueries = [
    "payment to amazon",
    "online transaction",
    "bank transfer",
    "grocery store",
    "restaurant payment",
  ];

  const testEmbeddings = await getEmbeddingsBatch(testQueries);

  // Test with vector index
  console.time("10 queries with vector index");
  for (let i = 0; i < 10; i++) {
    const embedding = testEmbeddings[i % testEmbeddings.length];
    await findSimilarForEmbedding(company.id, null, embedding, 5, { useVectorIndex: true });
  }
  console.timeEnd("10 queries with vector index");

  // Test without vector index
  console.time("10 queries without vector index");
  for (let i = 0; i < 10; i++) {
    const embedding = testEmbeddings[i % testEmbeddings.length];
    await findSimilarForEmbedding(company.id, null, embedding, 5, { useVectorIndex: false });
  }
  console.timeEnd("10 queries without vector index");

  console.log("\n✅ Test completed!");
}

// Run the test
testVectorSearch()
  .catch(console.error)
  .finally(() => {
    console.log("\n🏁 Test finished");
    process.exit(0);
  });
