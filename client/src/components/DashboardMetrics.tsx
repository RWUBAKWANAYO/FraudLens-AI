"use client";
import { Transaction } from "../types";

type Props = {
  transactions: Transaction[];
  fraudTransactions: Transaction[];
};

export default function DashboardMetrics({ transactions, fraudTransactions }: Props) {
  const totalTransactions = transactions.length;
  const totalFraud = fraudTransactions.length;
  const totalAmountAtRisk = fraudTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-500 p-4 rounded text-center">
        <p className="text-sm font-medium">Total Transactions</p>
        <p className="text-xl font-bold">{totalTransactions}</p>
      </div>
      <div className="bg-red-500 p-4 rounded text-center">
        <p className="text-sm font-medium">Fraud Detected</p>
        <p className="text-xl font-bold">{totalFraud}</p>
      </div>
      <div className="bg-yellow-500 p-4 rounded text-center">
        <p className="text-sm font-medium">Amount at Risk</p>
        <p className="text-xl font-bold">${totalAmountAtRisk}</p>
      </div>
    </div>
  );
}
