import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { parseBuffer } from "../services/fileParser";
import { detectLeaks } from "../services/leakDetection";
import { getEmbedding } from "../services/AIEmbedding";
import { Prisma } from "@prisma/client";

export async function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    console.log({ fileName, fileType, bufferLength: buffer.length });

    // Create Upload record
    const upload = await prisma.upload.create({
      data: { fileName, fileType },
    });

    // Parse file into normalized records
    const parsedRecords = await parseBuffer(buffer, fileName);

    const toCreate: Prisma.RecordCreateManyInput[] = [];

    for (const r of parsedRecords) {
      const text = `${r.txId ?? ""} ${r.partner ?? ""} ${r.amount ?? ""}`;
      let vector: number[] = [];

      try {
        vector = await getEmbedding(text);
      } catch (err) {
        console.error("Embedding failed for record:", r, err);
        vector = [];
      }

      toCreate.push({
        uploadId: upload.id,
        txId: r.txId ?? null,
        partner: r.partner ?? null,
        amount: r.amount ?? null,
        date: r.date ? new Date(r.date) : null,
        raw: r.raw ?? {},
        embeddingJson: vector,
      });
    }

    if (toCreate.length > 0) {
      await prisma.record.createMany({ data: toCreate });
    }

    // Fetch back inserted records for analysis
    const inserted = await prisma.record.findMany({
      where: { uploadId: upload.id },
      take: 10000, // safe upper limit
      orderBy: { createdAt: "asc" },
    });

    // Run leak detection
    const threats = await detectLeaks(inserted, upload.id);

    return res.json({
      uploadId: upload.id,
      recordsAnalyzed: inserted.length,
      threats,
    });
  } catch (err) {
    next(err);
  }
}
