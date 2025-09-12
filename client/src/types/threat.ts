export interface Threat {
  id: string;
  companyId: string;
  uploadId: string;
  recordId: string;
  threatType: string;
  description: string;
  confidenceScore: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    aiContext?: {
      additionalContext?: any;
      amount?: number;
      datasetStats?: {
        max: number;
        mean: number;
        totalRecords: number;
      };
      partner?: string;
      threatType?: string;
      txId?: string;
    };
    aiExplanation?: string;
    aiGeneratedAt?: string;
    aiExplanationGenerated?: boolean;
  };
  record: {
    id: string;
    companyId: string;
    uploadId: string;
    txId: string;
    partner: string;
    amount: number;
    currency: string;
    date: string;
    ip: string | null;
    device: string | null;
    geoCountry: string | null;
    geoCity: string | null;
    mcc: string | null;
    channel: string | null;
    createdAt: string;
    updatedAt: string;
  };
  upload: {
    fileName: string;
    createdAt: string;
  };
}

export interface ThreatsResponse {
  data: Threat[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ThreatQueryParams {
  status?: string;
  threatType?: string;
  recordId?: string;
  uploadId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  confidenceMin?: number;
  confidenceMax?: number;
  startDate?: string;
  endDate?: string;
}

export const THREAT_TYPES = [
  "DUP_IN_BATCH__TXID",
  "DUP_IN_DB__TXID",
  "DUP_IN_BATCH__CANONICAL",
  "DUP_IN_DB__CANONICAL",
  "SIMILARITY_MATCH",
] as const;

export type ThreatType = (typeof THREAT_TYPES)[number];
