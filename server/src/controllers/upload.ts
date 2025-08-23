import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { parseBuffer } from "../services/fileParser";
import { detectLeaks } from "../services/leakDetection";
import crypto from "crypto";
import { publish } from "../queue/bus";
import { getEmbedding } from "../services/aiEmbedding";

function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function normalizeCurrency(cur?: string | null) {
  return (cur || "USD").toUpperCase().trim();
}
function normalizePartner(p?: string | null) {
  return (p || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function maskAccount(a?: string | null) {
  if (!a) return null;
  const s = String(a).replace(/\s+/g, "");
  return `****${s.slice(-4)}`;
}
function timeBucket(ts: Date | null | undefined, seconds: number) {
  const ms = ts ? ts.getTime() : Date.now();
  return Math.floor(ms / (seconds * 1000));
}
function safeDate(d?: string | Date | null) {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? null : dt;
}
function mkCanonicalKey(args: {
  userKey: string | null;
  normalizedPartner: string | null;
  amount: number | null | undefined;
  currency: string | null;
  bucket30s: number | null;
}) {
  const s = [
    args.userKey || "",
    args.normalizedPartner || "",
    args.amount == null ? "" : String(args.amount),
    args.currency || "",
    args.bucket30s == null ? "" : String(args.bucket30s),
  ].join("|");
  return sha256(s);
}
function mkRecordSignature(args: {
  txId?: string | null;
  amount?: number | null;
  normalizedPartner?: string | null;
  currency?: string | null;
  date?: Date | null;
}) {
  const rounded = args.date ? new Date(Math.floor(args.date.getTime() / 1000) * 1000) : null;
  const s = [
    args.txId || "",
    args.amount == null ? "" : String(args.amount),
    args.normalizedPartner || "",
    args.currency || "",
    rounded ? rounded.toISOString() : "",
  ].join("|");
  return sha256(s);
}

const CREATE_MANY_CHUNK = Number(process.env.CREATE_MANY_CHUNK || 1000);
const EMBEDDINGS_ASYNC = process.env.EMBEDDINGS_ASYNC !== "false";

export async function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const companyId = (req.body.companyId as string) || null;
    if (!companyId) return res.status(400).json({ error: "Missing companyId" });

    const buffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls", "pdf", "txt"].includes(ext)) {
      return res.status(400).json({ error: "Unsupported file format. Upload CSV/Excel/PDF only." });
    }

    // --- Upload-level idempotency (24h) ---
    const fileHash = sha256(buffer);
    const dedupeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const prev = await prisma.upload.findFirst({
      where: { companyId, fileHash, createdAt: { gte: dedupeSince } },
      select: { id: true },
    });
    if (prev) {
      const prevThreats = await prisma.threat.findMany({ where: { uploadId: prev.id } });
      const recs = await prisma.record.findMany({ where: { uploadId: prev.id } });
      const uniqueFlagged = new Set(prevThreats.map((t) => t.recordId).filter(Boolean) as string[]);
      const flaggedValue = Array.from(uniqueFlagged).reduce((sum, rid) => {
        const r = recs.find((x) => x.id === rid);
        return sum + (r?.amount ?? 0);
      }, 0);
      return res.json({
        uploadId: prev.id,
        reuploadOf: prev.id,
        message: "This file matches a recent upload (same content hash). Reusing prior analysis.",
        recordsAnalyzed: recs.length,
        threats: prevThreats,
        summary: {
          totalRecords: recs.length,
          flagged: uniqueFlagged.size,
          flaggedValue,
          message: `Reused prior results from upload ${prev.id}.`,
        },
      });
    }

    // --- Create upload row ---
    const upload = await prisma.upload.create({
      data: { companyId, fileName, fileType, source: "batch", fileHash },
    });

    // --- Parse rows ---
    const parsed = await parseBuffer(buffer, fileName);

    // --- Prepare rows for bulk insert (no per-row awaits) ---
    const toInsert = parsed.map((r) => {
      const normalizedCurrency = normalizeCurrency((r as any).currency);
      const normalizedPartner = normalizePartner(r.partner);
      const txnDate = safeDate(r.date);
      const userKey = (r as any).user_id || r.email || r.device || r.ip || null;

      const accountRaw =
        (r as any).account ||
        (r as any).card ||
        (r as any).bank_account ||
        (r as any).account_number ||
        null;

      const accountKey = accountRaw ? String(accountRaw) : null;
      const accountMasked = maskAccount(accountRaw);
      const bucket30 = timeBucket(txnDate, 30);
      const bucket60 = timeBucket(txnDate, 60);

      const canonicalKey = mkCanonicalKey({
        userKey,
        normalizedPartner,
        amount: r.amount ?? null,
        currency: normalizedCurrency,
        bucket30s: bucket30,
      });

      const recordSignature = mkRecordSignature({
        txId: r.txId ?? null,
        amount: r.amount ?? null,
        normalizedPartner,
        currency: normalizedCurrency,
        date: txnDate,
      });

      return {
        id: crypto.randomUUID(),
        companyId,
        uploadId: upload.id,
        txId: r.txId ?? null,
        partner: r.partner ?? null,
        amount: r.amount ?? null,
        currency: (r as any).currency ?? null,
        date: txnDate,
        raw: r.raw ?? {},
        // "enrichment" from provided fields (avoid async on hot path)
        ip: r.ip || null,
        device: r.device || null,
        geoCountry: (r as any).geoCountry || null,
        geoCity: (r as any).geoCity || null,
        mcc: (r as any).mcc || null,
        channel: (r as any).channel || null,
        // derived
        normalizedPartner,
        normalizedCurrency,
        userKey,
        accountKey,
        accountMasked,
        timeBucket30s: bucket30,
        timeBucket60s: bucket60,
        canonicalKey,
        recordSignature,
      };
    });

    // --- Bulk insert in chunks inside a single transaction ---
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < toInsert.length; i += CREATE_MANY_CHUNK) {
        const chunk = toInsert.slice(i, i + CREATE_MANY_CHUNK);
        await tx.record.createMany({ data: chunk });
      }
    });

    // --- Pull inserted rows (id + fields) for analysis & embedding job ---
    const inserted = await prisma.record.findMany({
      where: { uploadId: upload.id },
      orderBy: { createdAt: "asc" },
    });

    // --- Kick embeddings to background (fast path), or do nothing if disabled ---
    if (EMBEDDINGS_ASYNC) {
      await publish("embeddings.generate", {
        companyId,
        uploadId: upload.id,
        recordIds: inserted.map((r) => r.id),
      });
    } else {
      // 🔥 NEW: Synchronous embedding generation
      console.log("Generating embeddings synchronously...");
      await generateEmbeddingsForRecords(inserted);
    }

    async function generateEmbeddingsForRecords(records: any[]) {
      console.log(`Starting embedding generation for ${records.length} records`);

      for (const record of records) {
        try {
          // Create text for embedding
          const text = [
            record.partner,
            record.amount,
            record.currency,
            record.txId,
            record.normalizedPartner,
            record.normalizedCurrency,
          ]
            .filter(Boolean)
            .join(" ");

          if (text.trim()) {
            const embedding = await getEmbedding(text);
            const embeddingJson = JSON.stringify(embedding);

            // Update using raw SQL to handle both columns
            await prisma.$executeRaw`
          UPDATE Record 
          SET embeddingJson = ${embeddingJson}, 
              embeddingVec = ${embeddingJson}
          WHERE id = ${record.id}
        `;

            console.log(`Generated embedding for record ${record.id}`);
          } else {
            console.log(`Skipping embedding for record ${record.id} - no text content`);
          }
        } catch (error) {
          console.error(`Failed to generate embedding for record ${record.id}:`, error);
        }
      }

      console.log(`Completed embedding generation`);
    }

    const recordsWithEmbeddings = await prisma.record.findMany({
      where: { uploadId: upload.id },
      orderBy: { createdAt: "asc" },
    });

    // --- Run detection synchronously (keeps your existing API contract fast) ---
    const { threatsCreated, summary } = await detectLeaks(
      recordsWithEmbeddings,
      upload.id,
      companyId
    );

    return res.json({
      uploadId: upload.id,
      recordsAnalyzed: inserted.length,
      threats: threatsCreated,
      summary,
      embeddingsQueued: EMBEDDINGS_ASYNC,
    });
  } catch (err) {
    next(err);
  }
}
