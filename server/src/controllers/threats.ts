import { Request, Response } from "express";
import { prisma } from "../config/db";

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
    res.status(500).json({ error: "Failed to fetch threats" });
  }
}
