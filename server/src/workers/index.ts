import { startEmbeddingWorker } from "./embeddingWorker";
import { startExplainWorker } from "./explainWorker";
import { getChannel } from "../queue/bus";

(async function main() {
  await getChannel(); // establish connection early
  await Promise.all([startEmbeddingWorker(), startExplainWorker()]);
  console.log("Workers running: embeddings.generate, threat.explain");
})();
