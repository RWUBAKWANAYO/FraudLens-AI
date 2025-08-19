export type Transaction = {
  transactionId: string;
  amount: number;
  userId: string;
  isFraud: boolean;
  alert?: string;
};
