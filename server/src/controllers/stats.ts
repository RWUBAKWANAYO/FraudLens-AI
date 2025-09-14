import { Request, Response, NextFunction } from "express";
import { StatsService } from "../services/statsService";

export async function getCompanyStats(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId as string;
    const stats = await StatsService.getCompanyStats(companyId);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
