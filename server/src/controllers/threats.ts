import { Request, Response } from "express";
import { ThreatService } from "../services/threatService";
import { ThreatQueryParams } from "../types/threat";
import { QueryBuilder } from "../utils/queryBuilder";
import { handleError, ValidationError } from "../utils/errorHandler";
import { generateDetailedExplanation } from "../services/leakExplanation";
import { prisma } from "../config/db";

export async function listThreats(req: Request, res: Response) {
  const companyId = req.user!.companyId as string;
  if (!companyId) {
    return res.status(400).json({ error: "Missing companyId" });
  }
  try {
    const queryCompanyId = QueryBuilder.validateCompanyId(companyId as string);

    const queryParams: ThreatQueryParams = {
      status: req.query.status as string,
      threatType: req.query.threatType as string,
      recordId: req.query.recordId as string,
      uploadId: req.query.uploadId as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    if (req.query.confidenceMin) {
      queryParams.confidenceMin = parseFloat(req.query.confidenceMin as string);
    }
    if (req.query.confidenceMax) {
      queryParams.confidenceMax = parseFloat(req.query.confidenceMax as string);
    }

    if (req.query.startDate) queryParams.startDate = req.query.startDate as string;
    if (req.query.endDate) queryParams.endDate = req.query.endDate as string;

    const result = await ThreatService.findMany(queryCompanyId, queryParams);

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getThreatDetails(req: Request, res: Response) {
  try {
    const { threatId } = req.params;

    const threat = await ThreatService.findById(threatId);

    if (!threat) {
      throw new ValidationError("Threat not found");
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
    handleError(error, res);
  }
}
