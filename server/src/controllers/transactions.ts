import { Request, Response, NextFunction } from "express";
import { checkTransaction } from "../services/fraudDetection";
import { prisma } from "../config/db";

export async function checkFraud(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await checkTransaction(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function testConnection(_req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.employee.findFirst();
    res.json({ message: "Backend and TiDB are working!" });
  } catch (error) {
    next(error);
  }
}
