import { Request, Response } from "express";
import { AlertService } from "../services/alertService";
import { AlertQueryParams } from "../types/alert";
import { QueryBuilder } from "../utils/queryBuilder";
import { handleError } from "../utils/errorHandler";

export async function listAlerts(req: Request, res: Response) {
  const companyId = req.user!.companyId as string;
  if (!companyId) {
    return res.status(400).json({ error: "Missing companyId" });
  }

  try {
    const queryCompanyId = QueryBuilder.validateCompanyId(companyId as string);

    const queryParams: AlertQueryParams = {
      severity: req.query.severity as string,
      threatId: req.query.threatId as string,
      recordId: req.query.recordId as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    if (req.query.delivered !== undefined) {
      queryParams.delivered = req.query.delivered === "true";
    }

    if (req.query.startDate) queryParams.startDate = req.query.startDate as string;
    if (req.query.endDate) queryParams.endDate = req.query.endDate as string;

    const result = await AlertService.findMany(queryCompanyId, queryParams);

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}
