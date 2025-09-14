import { Request, Response } from "express";
import { prisma } from "../config/db";

export async function listRules(req: Request, res: Response) {
  try {
    const { companyId } = req.query;
    const rules = await prisma.rule.findMany({
      where: { companyId: companyId as string },
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rules" });
  }
}

export async function createRule(req: Request, res: Response) {
  try {
    const { companyId, name, definition, enabled } = req.body;
    const rule = await prisma.rule.create({
      data: { companyId, name, definition, enabled },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: "Failed to create rule" });
  }
}

export async function updateRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const rule = await prisma.rule.update({
      where: { id },
      data: { enabled },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: "Failed to update rule" });
  }
}
