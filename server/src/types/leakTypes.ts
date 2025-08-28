import { Record as PrismaRecord } from "@prisma/client";
import { SEVERITY } from "../utils/constants";

export type ThreatContext = {
  threatType: string;
  amount: number | null;
  partner: string | null;
  txId: string | null;
  datasetStats?: { mean: number; max: number; totalRecords: number };
  additionalContext?: any;
};

export type EmitFunction = (
  ruleId: string,
  recordsToFlag: PrismaRecord[],
  context: ThreatContext,
  confidence: number,
  severity: keyof typeof SEVERITY,
  clusterKey: string,
  meta?: { fullCount?: number; fullRecordIds?: string[]; fullAmountSum?: number }
) => Promise<void>;

export type CreatedThreat = {
  id: string;
  recordId: string;
  threatType: string;
  description: string;
  confidenceScore: number;
};

export type ProgressCallback = (progress: number, total: number, threats: number) => Promise<void>;
