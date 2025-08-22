import { Request, Response } from "express";
import { getEmbedding } from "../services/aiEmbedding";
import { findSimilarForEmbedding } from "../services/similaritySearch";

export async function findSimilarity(req: Request, res: Response) {
  try {
    const { companyId, text } = req.body;
    const embedding = await getEmbedding(text);
    const results = await findSimilarForEmbedding(companyId, embedding);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Similarity search failed" });
  }
}
