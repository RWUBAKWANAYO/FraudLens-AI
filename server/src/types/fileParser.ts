export type Parsed = {
  txId?: string;
  partner?: string;
  amount?: number;
  date?: string;
  email?: string;
  currency?: string;
  description?: string;
  status?: string;
  user_id?: string;
  account?: string;
  card?: string;
  bank_account?: string;
  account_number?: string;
  ip?: string;
  device?: string;
  raw?: any;
  embeddingJson?: number[] | null;
};

export interface FieldMappingConfig {
  transactionId?: string[];
  partner?: string[];
  amount?: string[];
  date?: string[];
  currency?: string[];
  email?: string[];
  description?: string[];
  status?: string[];
  userId?: string[];
  account?: string[];
  card?: string[];
  bankAccount?: string[];
  accountNumber?: string[];
  ip?: string[];
  device?: string[];
  // Add more fields as needed
}
