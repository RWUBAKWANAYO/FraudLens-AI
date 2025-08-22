import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { parseBuffer } from "../services/fileParser";
import { detectLeaks } from "../services/leakDetection";
import { getEmbedding } from "../services/aiEmbedding";
import { saveRecordEmbedding } from "../services/vectorStore";
import { enrich } from "../services/enrichment";

export async function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const companyId = req.body.companyId as string; // from auth/session in real app
    if (!companyId) return res.status(400).json({ error: "Missing companyId" });

    const buffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      return res
        .status(400)
        .json({ error: "Unsupported file format. Please upload CSV or Excel files only." });
    }

    const upload = await prisma.upload.create({
      data: { companyId, fileName, fileType, source: "batch" },
    });
    const parsedRecords = await parseBuffer(buffer, fileName);

    const created: any[] = [];
    for (const r of parsedRecords) {
      const meta = await enrich(r);
      const rec = await prisma.record.create({
        data: {
          companyId,
          uploadId: upload.id,
          txId: r.txId ?? null,
          partner: r.partner ?? null,
          amount: r.amount ?? null,
          currency: (r as any).currency ?? null,
          date: r.date ? new Date(r.date) : null,
          raw: r.raw ?? {},
          ip: meta.ip,
          device: meta.device,
          geoCountry: meta.geoCountry,
          geoCity: meta.geoCity,
          mcc: meta.mcc,
          channel: meta.channel,
        },
      });
      created.push(rec);
    }

    // Embeddings in small batches to respect rate limits
    for (const rec of created) {
      const text = `${rec.txId ?? ""} ${rec.partner ?? ""} ${rec.amount ?? ""}`;
      try {
        const vector = await getEmbedding(text);
        await saveRecordEmbedding(rec.id, vector);
      } catch (err) {
        console.error("Embedding failed for record:", rec.id, err);
      }
    }

    // Fetch back (with embeddings) for analysis
    const inserted = await prisma.record.findMany({
      where: { uploadId: upload.id },
      orderBy: { createdAt: "asc" },
    });

    const { threatsCreated, summary } = await detectLeaks(inserted, upload.id, companyId);

    return res.json({
      uploadId: upload.id,
      recordsAnalyzed: inserted.length,
      threats: threatsCreated,
      summary,
    });
  } catch (err) {
    next(err);
  }
}
