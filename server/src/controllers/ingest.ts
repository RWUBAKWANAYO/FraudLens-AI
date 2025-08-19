import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

export async function createEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const emp = await prisma.employee.create({ data: req.body });
    res.json(emp);
  } catch (e) {
    next(e);
  }
}

export async function ingestCommunication(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId, channel, content, timestamp, embeddingJson } = req.body;
    const comm = await prisma.communications.create({
      data: {
        employeeId,
        channel,
        content,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        embeddingJson: embeddingJson ?? null,
      },
    });
    res.json(comm);
  } catch (e) {
    next(e);
  }
}
