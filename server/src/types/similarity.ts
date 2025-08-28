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
