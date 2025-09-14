import { Request, Response } from "express";
import { ThreatService } from "../services/threatService";
import { ThreatQueryParams } from "../types/threat";
import { QueryBuilder } from "../utils/queryBuilder";
import { handleError, ValidationError } from "../utils/errorHandler";

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

    if (!threatId) {
      throw new ValidationError("Threat ID is required");
    }

    const threatDetails = await ThreatService.getThreatDetails(threatId);

    res.json(threatDetails);
  } catch (error) {
    handleError(error, res);
  }
}
