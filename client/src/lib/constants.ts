import { ThreatType } from "@/types/threat";

export const getThreatTypeLabel = (threatType: ThreatType): string => {
  const labels: Record<ThreatType, string> = {
    DUP_IN_BATCH__TXID: "Duplicate in Batch (Transaction ID)",
    DUP_IN_DB__TXID: "Duplicate in Database (Transaction ID)",
    DUP_IN_BATCH__CANONICAL: "Duplicate in Batch (Canonical)",
    DUP_IN_DB__CANONICAL: "Duplicate in Database (Canonical)",
    SIMILARITY_MATCH: "Similarity Match",
  };

  return labels[threatType] || threatType;
};

export const getThreatTypeShortLabel = (threatType: ThreatType): string => {
  const labels: Record<ThreatType, string> = {
    DUP_IN_BATCH__TXID: "Batch Dup - TXID",
    DUP_IN_DB__TXID: "DB Dup - TXID",
    DUP_IN_BATCH__CANONICAL: "Batch Dup - Canonical",
    DUP_IN_DB__CANONICAL: "DB Dup - Canonical",
    SIMILARITY_MATCH: "Similarity Match",
  };

  return labels[threatType] || threatType;
};

export const testCredentials = {
  email: "humblenayo@gmail.com",
  password: "humblenayo@gmail.comlogin",
};
