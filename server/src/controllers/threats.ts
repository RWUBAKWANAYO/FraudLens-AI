import { Request, Response } from "express";
import { prisma } from "../config/db";
import { generateDetailedExplanation } from "../services/leakExplanation";

export async function listThreats(req: Request, res: Response) {
  try {
    const { companyId } = req.query;
    const threats = await prisma.threat.findMany({
      where: { companyId: companyId as string },
      include: { record: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(threats);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch threats" });
  }
}

export async function getThreatDetails(req: Request, res: Response) {
  try {
    const { threatId } = req.params;

    const threat = await prisma.threat.findUnique({
      where: { id: threatId },
      include: { record: true },
    });

    if (!threat) {
      return res.status(404).json({ error: "Threat not found" });
    }

    const metadata = threat.metadata as any;
    if (metadata?.aiExplanation) {
      return res.json({
        threat: {
          id: threat.id,
          threatType: threat.threatType,
          confidenceScore: threat.confidenceScore,
          createdAt: threat.createdAt,
          description: threat.description,
        },
        explanation: metadata.aiExplanation,
        record: threat.record,
        source: "cached",
      });
    }

    const context = metadata?.aiContext || {
      threatType: threat.threatType,
      amount: threat.record?.amount,
      partner: threat.record?.partner,
      txId: threat.record?.txId,
      additionalContext: metadata?.context,
    };

    const detailedExplanation = await generateDetailedExplanation(context);

    const updatedThreat = await prisma.threat.update({
      where: { id: threatId },
      data: {
        metadata: {
          ...metadata,
          aiExplanation: detailedExplanation,
          aiGeneratedAt: new Date().toISOString(),
          aiExplanationGenerated: true,
        },
      },
      include: { record: true },
    });

    res.json({
      threat: {
        id: updatedThreat.id,
        threatType: updatedThreat.threatType,
        confidenceScore: updatedThreat.confidenceScore,
        createdAt: updatedThreat.createdAt,
        description: updatedThreat.description,
      },
      explanation: detailedExplanation,
      record: updatedThreat.record,
      source: "generated",
    });
  } catch (error) {
    console.error("Failed to get threat details:", error);
    res.status(500).json({ error: "Failed to generate detailed analysis" });
  }
}
