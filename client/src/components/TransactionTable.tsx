"use client";
import { Transaction } from "../types";

type Props = {
  transactions: Transaction[];
};

export default function TransactionTable({ transactions }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden mt-6">
      <h2 className="bg-gray-800 text-white p-3 font-bold">All Transactions</h2>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-500 sticky top-0">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">User</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Fraud</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.transactionId} className="border-b hover:bg-gray-50">
                <td className="p-2">{tx.transactionId}</td>
                <td className="p-2">{tx.userId?.substring(0, 6) ?? "Unknown"}...</td>
                <td className="p-2">${tx.amount}</td>
                <td className={`p-2 font-bold ${tx.isFraud ? "text-red-600" : "text-green-600"}`}>
                  {tx.isFraud ? "⚠️ Fraud" : "✅ Safe"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
