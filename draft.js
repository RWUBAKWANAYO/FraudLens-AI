I don 't understand purpose of below windows(DUP_TXID_DAYS: 7, DUP_CANONICAL_MINUTES: 30) code since my target is to identify duplicates(across compony'
s db data like client charged multiple times), and similarities(across entire db, vector search to find suspicious transaction which can be performed by employyes / client like similar transaction across entire DB), I want to rely on vector search
for performance purpose and project requirements.look at below data, think deep and give enhancenced / modified version of affected files:


    // =============================================
    // .env.ts
    // =============================================
    PORT = 8080
USE_LOCAL_AI = true
LOCAL_AI_URL = "http://localhost:5001"
DATABASE_URL = "mysql://4XbqL1XoaseKDcN.root:wOZVk5QLPUr1M0Yh@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/fraud-detection?sslaccept=strict"
OPENAI_API_KEY = "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"

PUBLIC_WS_ORIGIN = "http://localhost:3000"

#
Redis Cloud
REDIS_URL = "redis://default:KbjpGVtwNTLDERnuNOk9XAnR2iQ1yDi3@redis-18431.c321.us-east-1-2.ec2.redns.redis-cloud.com:18431"

#
RabbitMQ CloudAMQP
RABBIT_URL = "amqps://gexhxwdg:KLXF1HBxDnedx8g3tJ8_yCZBO3NlVCC_@possum.lmq.cloudamqp.com/gexhxwdg"

#-- - Performance flags-- -
EMBEDDINGS_ASYNC = false
AI_EXPLAIN_ASYNC = true
CREATE_MANY_CHUNK = 1000
EMBED_BATCH = 64
WORKER_PREFETCH = 8
WORKER_CONCURRENCY = 6
DUP_TS_TOLERANCE_SEC = 30
DUP_AMOUNT_TOLERANCE_CENTS = 0
SIM_DUP_THRESHOLD = 0.82
SIM_SUS_THRESHOLD = 0.70


// =============================================
// server/dist/config/redis.js
// =============================================
    "use strict";
var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
    return new(P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }

        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }

        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
const redis_1 = require("redis");
let client = null;

function getRedis() {
    return __awaiter(this, void 0, void 0, function*() {
        if (client && client.isOpen)
            return client;
        const url = process.env.REDIS_URL;
        if (!url)
            throw new Error("REDIS_URL is not set");
        client = (0, redis_1.createClient)({ url });
        client.on("error", (e) => console.error("Redis error:", e));
        yield client.connect();
        return client;
    });
}


// =============================================
// src/config/socket.ts  (Socket.IO for realtime alerts)
// =============================================

import { Server } from "socket.io";

let io: Server | null = null;

export function attachSocket(ioInstance: Server) {
    io = ioInstance;

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("join_company", (companyId: string) => {
            socket.join(`company:${companyId}`);
            console.log(`Socket ${socket.id} joined company:${companyId}`);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });
}

export function pushAlert(companyId: string, event: any) {
    if (!io) {
        console.error("Socket.IO server not initialized!");
        return;
    }
    console.log("SOCKET EVENT EMITTED to company:", companyId, event);
    io.to(`company:${companyId}`).emit("alert", event);
}


// =============================================
// src/controllers/upload.ts  (UPDATED for company + TiDB vector writes)
// =============================================

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

function normalizeCurrency(cur ? : string | null) {
    return (cur || "USD").toUpperCase().trim();
}

function normalizePartner(p ? : string | null) {
    return (p || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function maskAccount(a ? : string | null) {
    if (!a) return null;
    const s = String(a).replace(/\s+/g, "");
    return `****${s.slice(-4)}`;
}

function timeBucket(ts: Date | null | undefined, seconds: number) {
    const ms = ts ? ts.getTime() : Date.now();
    return Math.floor(ms / (seconds * 1000));
}

function safeDate(d ? : string | Date | null) {
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
    txId ? : string | null;
    amount ? : number | null;
    normalizedPartner ? : string | null;
    currency ? : string | null;
    date ? : Date | null;
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

        const ext = fileName.split(".").pop() ? .toLowerCase();
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
                return sum + (r ? .amount ? ? 0);
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
                amount: r.amount ? ? null,
                currency: normalizedCurrency,
                bucket30s: bucket30,
            });

            const recordSignature = mkRecordSignature({
                txId: r.txId ? ? null,
                amount: r.amount ? ? null,
                normalizedPartner,
                currency: normalizedCurrency,
                date: txnDate,
            });

            return {
                id: crypto.randomUUID(),
                companyId,
                uploadId: upload.id,
                txId: r.txId ? ? null,
                partner: r.partner ? ? null,
                amount: r.amount ? ? null,
                currency: (r as any).currency ? ? null,
                date: txnDate,
                raw: r.raw ? ? {},
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
        await prisma.$transaction(async(tx) => {
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
                        await prisma.$executeRaw `
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


// =============================================
// src/services/leakDetection.ts (UPDATED to use similarity + rules + ML)
// =============================================
// server/src/services/leakDetection.ts
import { prisma } from "../config/db";
import type { Record as PrismaRecord, Prisma } from "@prisma/client";
import { generateThreatExplanation, type ThreatContext } from "./aiExplanation";
import { findSimilarForEmbedding } from "./similaritySearch";
import { createAndDispatchAlert } from "./alerts";
import { dispatchEnterpriseWebhooks } from "./webhooks";
import { publish } from "../queue/bus";

// --- Severities & Rule IDs ---
const SEVERITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" }
as
const;
const RULE = {
    DUP_IN_BATCH__TXID: "DUP_IN_BATCH__TXID",
    DUP_IN_DB__TXID: "DUP_IN_DB__TXID",
    DUP_IN_BATCH__CANONICAL: "DUP_IN_BATCH__CANONICAL",
    DUP_IN_DB__CANONICAL: "DUP_IN_DB__CANONICAL",
    RULE_TRIGGER: "RULE_TRIGGER",
    SIMILARITY_MATCH: "SIMILARITY_MATCH",
}
as
const;

// --- Tunable thresholds (env) ---
const TS_TOLERANCE_SEC = Number(process.env.DUP_TS_TOLERANCE_SEC ? ? 30);
const AMOUNT_TOLERANCE_CENTS = Number(process.env.DUP_AMOUNT_TOLERANCE_CENTS ? ? 0);
const SIMILARITY_DUP_THRESHOLD = Number(process.env.SIM_DUP_THRESHOLD ? ? 0.85);
const SIMILARITY_SUSPICIOUS_THRESHOLD = Number(process.env.SIM_SUS_THRESHOLD ? ? 0.75);

// --- Performance settings ---
const DB_QUERY_TIMEOUT = Number(process.env.DB_QUERY_TIMEOUT || 30000);
const SIMILARITY_SEARCH_LIMIT = Number(process.env.SIMILARITY_SEARCH_LIMIT || 50);
const SIMILARITY_BATCH_SIZE = Number(process.env.SIMILARITY_BATCH_SIZE || 10);

// --- CreatedThreat shape ---
type CreatedThreat = {
    id: string;
    recordId: string;
    threatType: string;
    description: string;
    confidenceScore: number;
};

// --- Local helpers ---
function parseEmbedding(json: Prisma.JsonValue | null): number[] | null {
    if (json == null) return null;
    if (Array.isArray(json)) {
        const arr = (json as unknown[]).map(Number);
        return arr.every(Number.isFinite) ? arr : null;
    }
    if (typeof json === "string") {
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return null;
            const arr = parsed.map((x: unknown) => Number(x));
            return arr.every(Number.isFinite) ? arr : null;
        } catch {
            return null;
        }
    }
    if (typeof json === "object") {
        const arr = Object.values(json as Record < string, unknown > ).map((v) => Number(v));
        return arr.every(Number.isFinite) ? arr : null;
    }
    return null;
}

function cents(amt ? : number | null): number | null {
    if (amt == null) return null;
    return Math.round(amt * 100);
}

function amountEq(
    a ? : number | null,
    b ? : number | null,
    tolCents = AMOUNT_TOLERANCE_CENTS
): boolean {
    const ca = cents(a);
    const cb = cents(b);
    if (ca == null || cb == null) return ca === cb;
    return Math.abs(ca - cb) <= tolCents;
}

function normCur(cur ? : string | null): string {
    return (cur || "USD").toUpperCase().trim();
}

function strEq(a ? : string | null, b ? : string | null): boolean {
    return (a || "") === (b || "");
}

function datesClose(a ? : Date | null, b ? : Date | null, tolSec = TS_TOLERANCE_SEC): boolean {
    if (!a || !b) return true;
    const diff = Math.abs(a.getTime() - b.getTime());
    if (diff <= tolSec * 1000) return true;
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/** All attributes must match (with tolerances) for a strict duplicate */
function isStrictDuplicate(a: PrismaRecord, b: PrismaRecord): boolean {
    const aCur = a.normalizedCurrency || a.currency;
    const bCur = b.normalizedCurrency || b.currency;
    return (
        strEq(a.normalizedPartner || a.partner, b.normalizedPartner || b.partner) &&
        amountEq(a.amount, b.amount) &&
        strEq(normCur(aCur), normCur(bCur)) &&
        datesClose(a.date, b.date)
    );
}

export async function detectLeaks(records: PrismaRecord[], uploadId: string, companyId: string) {
    console.time("Total leak detection time");
    console.log(
        `[DETECT_LEAKS] Starting for upload ${uploadId}, company ${companyId}, ${records.length} records`
    );

    const threatsCreated: CreatedThreat[] = [];
    const flaggedByRule: Map < string, Set < string >> = new Map();
    const byRuleClusters: Map < string, { impact: number;clusters: number;details: any[] } > =
        new Map();

    // Track duplicates to avoid double counting across rules
    const alreadyFlaggedRecordIds = new Set < string > ();
    const emittedClusterKeys = new Set < string > ();

    const total = records.length;
    const positive = records.filter((r) => (r.amount ? ? 0) > 0).map((r) => r.amount as number);
    const mean = positive.length ? positive.reduce((a, b) => a + b) / positive.length : 0;
    const max = positive.length ? Math.max(...positive) : 0;
    const baseStats = { mean, max, totalRecords: total };

    // Index current upload for batch-level passes
    const byTxId = new Map < string,
        PrismaRecord[] > ();
    const byCanonical = new Map < string,
        PrismaRecord[] > ();
    for (const r of records) {
        if (r.txId) {
            const arr = byTxId.get(r.txId) || [];
            arr.push(r);
            byTxId.set(r.txId, arr);
        }
        if (r.canonicalKey) {
            const arr = byCanonical.get(r.canonicalKey) || [];
            arr.push(r);
            byCanonical.set(r.canonicalKey, arr);
        }
    }

    /**
     * Emit helper that bookkeeps ONLY the provided recordsToFlag (duplicates),
     * while the context can still describe the whole cluster.
     */
    async function emit(
        ruleId: string,
        recordsToFlag: PrismaRecord[],
        context: ThreatContext,
        confidence: number,
        severity: keyof typeof SEVERITY,
        clusterKey: string,
        meta ? : { fullCount ? : number;fullRecordIds ? : string[];fullAmountSum ? : number }
    ) {
        if (recordsToFlag.length === 0) return;
        if (emittedClusterKeys.has(`${ruleId}:${clusterKey}`)) return;

        console.log(
            `[EMIT] Creating threat for rule ${ruleId}, cluster ${clusterKey}, ${recordsToFlag.length} records`
        );

        const anchor = recordsToFlag[0];
        const t = await createAIContextualizedThreat(
            companyId,
            uploadId,
            anchor.id,
            ruleId,
            confidence, {
                ...context,
                additionalContext: {
                    ...context.additionalContext,
                    clusterTotalRecords: meta ? .fullCount,
                    clusterRecordIds: meta ? .fullRecordIds,
                    clusterTotalAmount: meta ? .fullAmountSum,
                    flaggedRecordIds: recordsToFlag.map((r) => r.id),
                },
            }
        );

        emittedClusterKeys.add(`${ruleId}:${clusterKey}`);
        threatsCreated.push(t as CreatedThreat);

        if (!flaggedByRule.has(ruleId)) flaggedByRule.set(ruleId, new Set());
        const set = flaggedByRule.get(ruleId) !;
        let impact = 0;
        for (const r of recordsToFlag) {
            set.add(r.id);
            alreadyFlaggedRecordIds.add(r.id);
            impact += r.amount ? ? 0;
        }

        const agg = byRuleClusters.get(ruleId) || { impact: 0, clusters: 0, details: [] as any[] };
        agg.impact += impact;
        agg.clusters += 1;
        agg.details.push({
            key: clusterKey,
            count: recordsToFlag.length,
            total_amount: impact,
            example_txIds: recordsToFlag
                .map((r) => r.txId)
                .filter(Boolean)
                .slice(0, 5),
            record_ids: recordsToFlag.map((r) => r.id),
            cluster_total_records: meta ? .fullCount,
        });
        byRuleClusters.set(ruleId, agg);

        const summaryTxt = t.description || "";
        await createAndDispatchAlert({
            companyId,
            recordId: anchor.id,
            threatId: (t as any).id,
            title: ruleId.replace(/_/g, " "),
            summary: summaryTxt,
            severity: SEVERITY[severity],
            payload: { ruleId, clusterKey, context: t },
        });
        await dispatchEnterpriseWebhooks(companyId, { type: "threat.created", data: t });
    }

    // ------------------ DEBUG: Check embeddings first ------------------
    const recordsWithEmbeddings = records.filter((r) => r.embeddingJson);
    console.log(
        `[SIMILARITY] Total records: ${records.length}, with embeddings: ${recordsWithEmbeddings.length}`
    );

    if (recordsWithEmbeddings.length === 0) {
        console.log(
            "[SIMILARITY] WARNING: No records have embeddings! Similarity search will not work."
        );
    }

    // Check if we have previous records to compare against
    const previousRecordCount = await prisma.record.count({
        where: {
            companyId,
            uploadId: { not: uploadId },
            embeddingJson: { not: null },
        },
    });
    console.log(`[SIMILARITY] Previous records with embeddings: ${previousRecordCount}`);

    // --- Bulk fetch existing TXIDs and Canonical Keys for duplicate detection ---
    console.time("Bulk duplicate check preparation");
    const existingTxIds = new Set < string > ();
    const existingCanonicalKeys = new Set < string > ();

    // Fetch existing records in bulk
    const txIds = records.map((r) => r.txId).filter(Boolean) as string[];
    const canonicalKeys = records.map((r) => r.canonicalKey).filter(Boolean) as string[];

    if (txIds.length > 0) {
        const existingTxRecords = await prisma.record.findMany({
            where: {
                companyId,
                txId: { in: txIds },
                uploadId: { not: uploadId },
            },
            select: { txId: true, id: true },
            take: 1000,
        });
        existingTxRecords.forEach((r) => existingTxIds.add(r.txId as string));
    }

    if (canonicalKeys.length > 0) {
        const existingCanonicalRecords = await prisma.record.findMany({
            where: {
                companyId,
                canonicalKey: { in: canonicalKeys },
                uploadId: { not: uploadId },
            },
            select: { canonicalKey: true, id: true },
            take: 1000,
        });
        existingCanonicalRecords.forEach((r) => existingCanonicalKeys.add(r.canonicalKey as string));
    }
    console.timeEnd("Bulk duplicate check preparation");

    // ---------------- Stage A: Historical (DB) strict duplicates ----------------
    console.time("Historical duplicate detection");
    console.log("[DUPLICATES] Starting historical duplicate detection...");

    // Pre-identify potential duplicates using bulk data
    const historicalDuplicates: PrismaRecord[] = [];

    for (const rec of records) {
        if (alreadyFlaggedRecordIds.has(rec.id)) continue;

        // Quick pre-check before expensive database query
        if (rec.txId && existingTxIds.has(rec.txId)) {
            historicalDuplicates.push(rec);
        } else if (rec.canonicalKey && existingCanonicalKeys.has(rec.canonicalKey)) {
            historicalDuplicates.push(rec);
        }
    }

    // Process historical duplicates
    for (const rec of historicalDuplicates) {
        if (rec.txId && !alreadyFlaggedRecordIds.has(rec.id)) {
            const prev = await prisma.record.findMany({
                where: {
                    companyId,
                    txId: rec.txId,
                    uploadId: { not: uploadId },
                },
                select: {
                    id: true,
                    txId: true,
                    partner: true,
                    normalizedPartner: true,
                    amount: true,
                    currency: true,
                    normalizedCurrency: true,
                    date: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            });

            const matches = prev.filter((p) => isStrictDuplicate(rec, p));
            if (matches.length > 0) {
                await emit(
                    RULE.DUP_IN_DB__TXID, [rec], {
                        threatType: RULE.DUP_IN_DB__TXID,
                        amount: rec.amount ? ? null,
                        partner: rec.partner ? ? null,
                        txId: rec.txId ? ? null,
                        datasetStats: baseStats,
                        additionalContext: {
                            scope: "db_prior_same_txid",
                            priorCount: matches.length,
                            priorIds: matches.slice(0, 5).map((m) => m.id),
                        },
                    },
                    0.98,
                    "HIGH",
                    `dbtx:${rec.txId}:${rec.id}`
                );
            }
        }

        if (rec.canonicalKey && !alreadyFlaggedRecordIds.has(rec.id)) {
            const prev = await prisma.record.findMany({
                where: {
                    companyId,
                    canonicalKey: rec.canonicalKey,
                    uploadId: { not: uploadId },
                },
                select: { id: true },
                orderBy: { createdAt: "desc" },
                take: 50,
            });

            if (prev.length > 0) {
                await emit(
                    RULE.DUP_IN_DB__CANONICAL, [rec], {
                        threatType: RULE.DUP_IN_DB__CANONICAL,
                        amount: rec.amount ? ? null,
                        partner: rec.partner ? ? null,
                        txId: rec.txId ? ? null,
                        datasetStats: baseStats,
                        additionalContext: {
                            scope: "db_prior_same_canonical",
                            canonicalKey: rec.canonicalKey,
                            priorCount: prev.length,
                            priorIds: prev.slice(0, 5).map((m) => m.id),
                        },
                    },
                    0.95,
                    "HIGH",
                    `dbcanon:${rec.canonicalKey}:${rec.id}`
                );
            }
        }
    }
    console.timeEnd("Historical duplicate detection");

    // ---------------- Stage B: Batch (current upload) strict duplicates ----------------
    console.time("Batch duplicate detection");
    console.log("[BATCH] Starting batch duplicate detection...");
    // B1. TXID clusters
    for (const [txId, list] of byTxId.entries()) {
        if (list.length < 2) continue;
        const sorted = list.slice().sort((a, b) => (a.date ? .getTime() || 0) - (b.date ? .getTime() || 0));
        const [head, ...rest] = sorted;
        const duplicates = rest.filter(
            (r) => isStrictDuplicate(r, head) && !alreadyFlaggedRecordIds.has(r.id)
        );

        if (duplicates.length === 0) continue;
        await emit(
            RULE.DUP_IN_BATCH__TXID,
            duplicates, {
                threatType: RULE.DUP_IN_BATCH__TXID,
                amount: head.amount ? ? null,
                partner: head.partner ? ? null,
                txId,
                datasetStats: baseStats,
                additionalContext: {
                    scope: "current_upload",
                    countInUpload: list.length,
                    firstTs: head.date || head.createdAt,
                    lastTs: sorted[sorted.length - 1].date || sorted[sorted.length - 1].createdAt,
                    currency: head.normalizedCurrency || head.currency || "USD",
                },
            },
            0.97,
            "HIGH",
            `txid_batch:${txId}`, {
                fullCount: sorted.length,
                fullRecordIds: sorted.map((x) => x.id),
                fullAmountSum: sorted.reduce((s, r) => s + (r.amount ? ? 0), 0),
            }
        );
    }

    // B2. Canonical clusters
    for (const [canon, list] of byCanonical.entries()) {
        if (list.length < 2) continue;
        const sorted = list.slice().sort((a, b) => (a.date ? .getTime() || 0) - (b.date ? .getTime() || 0));
        const duplicates = sorted.slice(1).filter((r) => !alreadyFlaggedRecordIds.has(r.id));
        if (duplicates.length === 0) continue;

        const head = sorted[0];
        await emit(
            RULE.DUP_IN_BATCH__CANONICAL,
            duplicates, {
                threatType: RULE.DUP_IN_BATCH__CANONICAL,
                amount: head.amount ? ? null,
                partner: head.partner ? ? null,
                txId: head.txId ? ? null,
                datasetStats: baseStats,
                additionalContext: {
                    scope: "current_upload",
                    canonicalKey: canon,
                    userKey: head.userKey,
                    partner: head.normalizedPartner || head.partner,
                    amount: head.amount,
                    currency: head.normalizedCurrency || head.currency,
                    timeBucketSeconds: 30,
                },
            },
            0.93,
            "HIGH",
            `canon_batch:${canon}`, {
                fullCount: sorted.length,
                fullRecordIds: sorted.map((x) => x.id),
                fullAmountSum: sorted.reduce((s, r) => s + (r.amount ? ? 0), 0),
            }
        );
    }
    console.timeEnd("Batch duplicate detection");

    // ------------------ Stage C: Vector similarity with batching ----------------
    console.time("Similarity detection");
    console.log("[SIMILARITY] Starting similarity detection...");

    // Track which records have already been flagged by similarity to prevent double-counting
    const similarityFlaggedRecordIds = new Set < string > ();

    if (recordsWithEmbeddings.length > 0) {
        await processSimilarityInBatches(
            records.filter((r) => !alreadyFlaggedRecordIds.has(r.id) && r.embeddingJson),
            companyId,
            uploadId,
            alreadyFlaggedRecordIds,
            similarityFlaggedRecordIds,
            emit
        );
    }
    console.timeEnd("Similarity detection");

    // ---------------- Summary ----------------
    const uniqueFlaggedRecords = new Set < string > (
        Array.from(flaggedByRule.values()).flatMap((s) => Array.from(s))
    );
    const flagged = uniqueFlaggedRecords.size;
    const flaggedValue = Array.from(uniqueFlaggedRecords).reduce((sum, recordId) => {
        const record = records.find((r) => r.id === recordId);
        return sum + (record ? .amount ? ? 0);
    }, 0);

    const byRule = Array.from(byRuleClusters.entries()).map(([rule_id, agg]) => {
        const detailsSorted = agg.details.sort((a, b) => b.total_amount - a.total_amount).slice(0, 5);
        return {
            rule_id,
            clusters: agg.clusters,
            records_impacted: flaggedByRule.get(rule_id) ? .size || 0,
            impacted_value: agg.impact,
            top_clusters: detailsSorted,
        };
    });

    console.log(`[SUMMARY] Total records: ${total}, Flagged: ${flagged}, By rule:`, byRule);

    const summary = {
        totalRecords: total,
        flagged,
        flaggedValue,
        message: `Analyzed ${total} rows → flagged ${flagged} unique records (${(
      (flagged / Math.max(total, 1)) *
      100
    ).toFixed(1)}%), worth ~${flaggedValue.toFixed(2)}.`,
        byRule,
    };

    console.timeEnd("Total leak detection time");
    return { threatsCreated, summary };
}

// New function for batched similarity processing
async function processSimilarityInBatches(
    records: PrismaRecord[],
    companyId: string,
    uploadId: string,
    alreadyFlaggedRecordIds: Set < string > ,
    similarityFlaggedRecordIds: Set < string > ,
    emit: Function
) {
    const batches = [];

    for (let i = 0; i < records.length; i += SIMILARITY_BATCH_SIZE) {
        batches.push(records.slice(i, i + SIMILARITY_BATCH_SIZE));
    }

    console.log(`Processing similarity in ${batches.length} batches`);

    for (const [batchIndex, batch] of batches.entries()) {
        console.log(`Similarity batch ${batchIndex + 1}/${batches.length}`);

        const batchPromises = batch.map(async(rec) => {
            if (alreadyFlaggedRecordIds.has(rec.id) || similarityFlaggedRecordIds.has(rec.id)) {
                return;
            }

            const embedding = parseEmbedding(rec.embeddingJson);
            if (!embedding) return;

            try {
                const { localPrev, global } = await findSimilarForEmbedding(
                    companyId,
                    uploadId,
                    embedding,
                    SIMILARITY_SEARCH_LIMIT, { minScore: 0.5, useVectorIndex: true }
                );

                // Local near-duplicate
                const bestLocal = localPrev
                    .filter((m) => m.similarity >= SIMILARITY_DUP_THRESHOLD)
                    .sort((a, b) => b.similarity - a.similarity)[0];

                // Global suspicious similarity
                const bestGlobal = global
                    .filter((m) => m.similarity >= SIMILARITY_SUSPICIOUS_THRESHOLD)
                    .sort((a, b) => b.similarity - a.similarity)[0];

                // Prioritize local duplicates over global similarities
                if (bestLocal) {
                    similarityFlaggedRecordIds.add(rec.id); // Mark as flagged by similarity
                    console.log(
                        `[SIMILARITY] FOUND LOCAL MATCH: ${rec.id} -> ${
              bestLocal.id
            } (similarity: ${bestLocal.similarity.toFixed(4)})`
                    );
                    await emit(
                        RULE.SIMILARITY_MATCH, [rec], {
                            threatType: RULE.SIMILARITY_MATCH,
                            amount: rec.amount ? ? null,
                            partner: rec.partner ? ? null,
                            txId: rec.txId ? ? null,
                            datasetStats: {
                                mean: 0,
                                max: 0,
                                totalRecords: 0,
                            },
                            additionalContext: {
                                scope: "vector_local_prev",
                                neighborId: bestLocal.id,
                                neighborPartner: bestLocal.partner,
                                neighborAmount: bestLocal.amount,
                                similarity: bestLocal.similarity,
                            },
                        },
                        0.96,
                        "HIGH",
                        `vecdup_prev:${rec.id}->${bestLocal.id}`
                    );
                } else if (bestGlobal) {
                    similarityFlaggedRecordIds.add(rec.id); // Mark as flagged by similarity
                    console.log(
                        `[SIMILARITY] FOUND GLOBAL MATCH: ${rec.id} -> ${
              bestGlobal.id
            } (similarity: ${bestGlobal.similarity.toFixed(4)})`
                    );
                    await emit(
                        RULE.SIMILARITY_MATCH, [rec], {
                            threatType: RULE.SIMILARITY_MATCH,
                            amount: rec.amount ? ? null,
                            partner: rec.partner ? ? null,
                            txId: rec.txId ? ? null,
                            datasetStats: {
                                mean: 0,
                                max: 0,
                                totalRecords: 0,
                            },
                            additionalContext: {
                                scope: "vector_global",
                                neighborId: bestGlobal.id,
                                neighborCompany: bestGlobal.companyId,
                                neighborPartner: bestGlobal.partner,
                                neighborAmount: bestGlobal.amount,
                                similarity: bestGlobal.similarity,
                            },
                        },
                        0.87,
                        "MEDIUM",
                        `vecsim:${rec.id}->${bestGlobal.id}`
                    );
                }
            } catch (error) {
                console.error(`Similarity search failed for record ${rec.id}:`, error);
            }
        });

        // Process batch with timeout
        await Promise.allSettled(batchPromises);
    }
}

const AI_EXPLAIN_ASYNC = process.env.AI_EXPLAIN_ASYNC !== "false";

async function createAIContextualizedThreat(
    companyId: string,
    uploadId: string,
    recordId: string,
    threatType: string,
    confidenceScore: number,
    context: ThreatContext
) {
    if (AI_EXPLAIN_ASYNC) {
        const short = `[${threatType}] ${JSON.stringify(context.additionalContext).slice(0, 180)}...`;
        const t = await prisma.threat.create({
            data: { companyId, uploadId, recordId, threatType, description: short, confidenceScore },
        });
        await publish("threat.explain", { threatId: t.id, context });
        return t;
    } else {
        const aiExplanation = await generateThreatExplanation(context);
        return prisma.threat.create({
            data: {
                companyId,
                uploadId,
                recordId,
                threatType,
                description: aiExplanation,
                confidenceScore,
            },
        });
    }
}


// =============================================
// src/services/vectorStore.ts
// =============================================
import { prisma } from "../config/db";

export async function saveRecordEmbedding(recordId: string, embedding: number[]) {
    const vecText = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
        `UPDATE Record SET embeddingJson = CAST(? AS JSON), embeddingVec = VEC_FROM_TEXT(?) WHERE id = ?`,
        JSON.stringify(embedding),
        vecText,
        recordId
    );
}

export async function knnByVector(companyId: string, embedding: number[], k = 20) {
    const vecText = `[${embedding.join(",")}]`;
    const rows = await prisma.$queryRawUnsafe < any[] > (
        `SELECT id, companyId, partner, amount, date,
            VEC_COSINE_DISTANCE(embeddingVec, ?) AS distance
       FROM Record
      WHERE companyId = ? AND embeddingVec IS NOT NULL
      ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ?)
      LIMIT ?`,
        vecText,
        companyId,
        vecText,
        k
    );
    return rows;
}

export async function knnGlobal(embedding: number[], k = 20) {
    const vecText = `[${embedding.join(",")}]`;
    const rows = await prisma.$queryRawUnsafe < any[] > (
        `SELECT id, companyId, partner, amount, date,
            VEC_COSINE_DISTANCE(embeddingVec, ?) AS distance
       FROM Record
      WHERE embeddingVec IS NOT NULL
      ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ?)
      LIMIT ?`,
        vecText,
        vecText,
        k
    );
    return rows;
}



// =============================================
// src/services/similaritySearch.ts
// =============================================
// server/src/services/similaritySearch.ts
import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";

export type SimilarRecord = {
    id: string;
    companyId: string;
    uploadId: string;
    txId: string | null;
    partner: string | null;
    amount: number | null;
    date: Date | null;
    similarity: number;
};

/** Cosine similarity */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0,
        na = 0,
        nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}

/** Parse embedding stored in Prisma JsonValue into number[] safely */
export function parseEmbedding(json: Prisma.JsonValue | null): number[] | null {
    if (json == null) return null;

    if (Array.isArray(json)) {
        const arr = (json as unknown[]).map((x) => Number(x));
        return arr.every(Number.isFinite) ? arr : null;
    }

    if (typeof json === "string") {
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return null;
            const arr = parsed.map((x: unknown) => Number(x));
            return arr.every(Number.isFinite) ? arr : null;
        } catch {
            return null;
        }
    }

    if (typeof json === "object") {
        const arr = Object.values(json as Record < string, unknown > ).map((v) => Number(v));
        return arr.every(Number.isFinite) ? arr : null;
    }

    return null;
}

/**
 * Vector search using TiDB VEC_COSINE_DISTANCE with safe fallback.
 * Optimized with parallel queries and timeout protection.
 */
export async function findSimilarForEmbedding(
    companyId: string,
    uploadId: string | null,
    embedding: number[],
    k: number = 10,
    opts ? : { minScore ? : number;useVectorIndex ? : boolean }
): Promise < { localPrev: SimilarRecord[];global: SimilarRecord[] } > {
    const minScore = opts ? .minScore ? ? 0.5;
    const preferVector = opts ? .useVectorIndex ? ? true;

    console.log(
        `[SIMILARITY_SEARCH] Starting for company ${companyId}, embedding length: ${embedding.length}`
    );

    // Set timeout for similarity search (15 seconds)
    const timeoutPromise = new Promise < { localPrev: SimilarRecord[];global: SimilarRecord[] } > (
        (resolve) => {
            setTimeout(() => {
                console.log("[SIMILARITY_SEARCH] Timeout reached, returning empty results");
                resolve({ localPrev: [], global: [] });
            }, 15000);
        }
    );

    const searchPromise = (async() => {
        // ---- Prefer native vector index if available ----
        if (preferVector) {
            try {
                console.log("[SIMILARITY_SEARCH] Attempting TiDB vector search...");
                const vecText = JSON.stringify(embedding);

                // Use Promise.all for parallel searches
                const [localRows, globalRows] = await Promise.all([
                    prisma.$queryRaw < Array < SimilarRecord & { distance ? : number } >> `
            SELECT
              id, companyId, uploadId, txId, partner, amount, date,
              1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
            FROM Record
            WHERE companyId = ${companyId}
              AND (${uploadId} IS NULL OR uploadId <> ${uploadId})
              AND embeddingVec IS NOT NULL
            ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
            LIMIT ${k}
          `,
                    prisma.$queryRaw < Array < SimilarRecord & { distance ? : number } >> `
            SELECT
              id, companyId, uploadId, txId, partner, amount, date,
              1 - VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) AS similarity
            FROM Record
            WHERE companyId <> ${companyId}
              AND embeddingVec IS NOT NULL
            ORDER BY VEC_COSINE_DISTANCE(embeddingVec, ${vecText}) ASC
            LIMIT ${k}
          `,
                ]);

                console.log(
                    `[SIMILARITY_SEARCH] TiDB local search returned ${localRows?.length || 0} rows`
                );
                console.log(
                    `[SIMILARITY_SEARCH] TiDB global search returned ${globalRows?.length || 0} rows`
                );

                const localPrev = (localRows ? ? [])
                    .map((r) => ({...r, similarity: r.similarity ? ? 1 - (r as any).distance }))
                    .filter((r) => r.similarity >= minScore && r.similarity < 0.9999);

                const global = (globalRows ? ? [])
                    .map((r) => ({...r, similarity: r.similarity ? ? 1 - (r as any).distance }))
                    .filter((r) => r.similarity >= minScore && r.similarity < 0.9999);

                console.log(
                    `[SIMILARITY_SEARCH] TiDB results - local: ${localPrev.length}, global: ${global.length}`
                );
                return { localPrev, global };
            } catch (err) {
                console.warn("[SIMILARITY_SEARCH] TiDB vector search failed; falling back:", err);
            }
        }

        // ---- Fallback: compute cosine over JSON embeddings ----
        console.log("[SIMILARITY_SEARCH] Using fallback JSON embedding search");

        const [localCandidates, globalCandidates] = await Promise.all([
            prisma.record.findMany({
                where: {
                    companyId,
                    ...(uploadId ? { uploadId: { not: uploadId } } : {}),
                    NOT: { embeddingJson: { equals: null } },
                },
                select: {
                    id: true,
                    companyId: true,
                    uploadId: true,
                    txId: true,
                    partner: true,
                    amount: true,
                    date: true,
                    embeddingJson: true,
                },
                orderBy: { createdAt: "desc" },
                take: 100, // Reduced from 1000 for performance
            }),
            prisma.record.findMany({
                where: {
                    companyId: { not: companyId },
                    NOT: { embeddingJson: { equals: null } },
                },
                select: {
                    id: true,
                    companyId: true,
                    uploadId: true,
                    txId: true,
                    partner: true,
                    amount: true,
                    date: true,
                    embeddingJson: true,
                },
                orderBy: { createdAt: "desc" },
                take: 100, // Reduced from 1000 for performance
            }),
        ]);

        console.log(
            `[SIMILARITY_SEARCH] Found ${localCandidates.length} local and ${globalCandidates.length} global candidates with embeddings`
        );

        const localPrev = localCandidates
            .map((r) => {
                const emb = parseEmbedding(r.embeddingJson);
                if (!emb) return null;
                const similarity = cosineSimilarity(embedding, emb);
                return {
                    id: r.id,
                    companyId: r.companyId,
                    uploadId: r.uploadId,
                    txId: r.txId,
                    partner: r.partner,
                    amount: r.amount,
                    date: r.date,
                    similarity,
                }
                as SimilarRecord;
            })
            .filter((x): x is SimilarRecord => !!x && x.similarity >= minScore && x.similarity < 0.9999)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);

        const global = globalCandidates
            .map((r) => {
                const emb = parseEmbedding(r.embeddingJson);
                if (!emb) return null;
                const similarity = cosineSimilarity(embedding, emb);
                return {
                    id: r.id,
                    companyId: r.companyId,
                    uploadId: r.uploadId,
                    txId: r.txId,
                    partner: r.partner,
                    amount: r.amount,
                    date: r.date,
                    similarity,
                }
                as SimilarRecord;
            })
            .filter((x): x is SimilarRecord => !!x && x.similarity >= minScore && x.similarity < 0.9999)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);

        console.log(
            `[SIMILARITY_SEARCH] Fallback results - local: ${localPrev.length}, global: ${global.length}`
        );
        return { localPrev, global };
    })();

    // Race between search and timeout
    return Promise.race([searchPromise, timeoutPromise]);
}




// =============================================
// src/services/alerts.ts
// =============================================
import { prisma } from "../config/db";
import { pushAlert } from "../config/socket";

export async function createAndDispatchAlert(input: {
    companyId: string;
    title: string;
    summary: string;
    severity ? : "info" | "low" | "medium" | "high" | "critical";
    recordId ? : string | null;
    threatId ? : string | null;
    payload ? : any;
}) {
    console.log("Creating alert for company:", input.companyId);

    const alert = await prisma.alert.create({
        data: {
            companyId: input.companyId,
            recordId: input.recordId || null,
            threatId: input.threatId || null,
            title: input.title,
            summary: input.summary,
            severity: input.severity || "medium",
            payload: input.payload || {},
        },
    });

    console.log("ALERT CREATED:", alert.id, "for company:", input.companyId);

    // Realtime push to UI
    try {
        pushAlert(input.companyId, {
            type: "threat",
            alertId: alert.id,
            ...input,
            createdAt: new Date().toISOString(),
        });
        console.log("Alert pushed via socket for company:", input.companyId);
    } catch (error) {
        console.error("Failed to push alert via socket:", error);
    }

    return alert;
}



// =============================================
// src/services/webhooks.ts
// =============================================
import fetch from "node-fetch";
import { prisma } from "../config/db";

export async function dispatchEnterpriseWebhooks(companyId: string, event: any) {
    const subs = await prisma.webhookSubscription.findMany({ where: { companyId, active: true } });
    for (const s of subs) {
        try {
            await fetch(s.url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-signature": signBody(s.secret, event),
                },
                body: JSON.stringify(event),
            });
        } catch (e) {
            // store failure for retry (simplified)
            console.error("webhook delivery failed", s.url, e);
        }
    }
}

function signBody(secret: string, payload: any) {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}



// =============================================
// server/src/app.ts
// =============================================
import express from "express";
import "dotenv/config";
import cors from "cors";

import { router } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", router);

export default app;

// =============================================
// server/src/server.ts
// =============================================
import app from "./app";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import { attachSocket } from "./config/socket";

const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
    cors: {
        origin: process.env.PUBLIC_WS_ORIGIN || "*",
        methods: ["GET", "POST"],
    },
});

attachSocket(io);

async function startServer() {
    await connectDB();
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Socket.IO enabled with CORS origin: ${process.env.PUBLIC_WS_ORIGIN}`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});


// =============================================
// server/src/workers/embeddingWorker.ts
// =============================================




// =============================================
// server/src/workers/index.ts
// =============================================
import { startEmbeddingWorker } from "./embeddingWorker";
import { startExplainWorker } from "./explainWorker";
import { getChannel } from "../queue/bus";

(async function main() {
    await getChannel(); // establish connection early
    await Promise.all([startEmbeddingWorker(), startExplainWorker()]);
    console.log("Workers running: embeddings.generate, threat.explain");
})();


// =============================================
// server/src/queue/bus.ts
// =============================================
import * as amqp from "amqplib";

// Type assertions for the connection and channel
interface ExtendedConnection extends amqp.Connection {
    createChannel(): Promise < amqp.Channel > ;
}

let conn: ExtendedConnection | null = null;
let ch: amqp.Channel | null = null;

export async function getChannel(): Promise < amqp.Channel > {
    if (ch) return ch;

    const url = process.env.RABBIT_URL!;
    conn = (await amqp.connect(url)) as ExtendedConnection;
    ch = await conn.createChannel();

    await ch.prefetch(Number(process.env.WORKER_PREFETCH || 8));
    return ch;
}

export async function publish(queue: string, msg: any) {
    const channel = await getChannel();
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), { persistent: true });
}

export async function consume(queue: string, handler: (payload: any) => Promise < void > ) {
    const channel = await getChannel();
    await channel.assertQueue(queue, { durable: true });
    await channel.consume(queue, async(msg) => {
        if (!msg) return;
        try {
            const payload = JSON.parse(msg.content.toString());
            await handler(payload);
            channel.ack(msg);
        } catch (err) {
            console.error(`[worker:${queue}]`, err);
            channel.nack(msg, false, false); // dead-letter on failure
        }
    });
}
