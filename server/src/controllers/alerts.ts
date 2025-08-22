import { Request, Response } from "express";
import { prisma } from "../config/db";

export async function listAlerts(req: Request, res: Response) {
  const companyId = req.query.companyId as string;
  const rows = await prisma.alert.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(rows);
}
