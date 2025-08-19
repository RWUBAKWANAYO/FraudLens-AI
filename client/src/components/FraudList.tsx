"use client";
import { Transaction } from "../types";

type Props = {
  fraudTransactions: Transaction[];
};

export default function FraudList({ fraudTransactions }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <h2 className="bg-gray-800 text-white p-3 font-bold">
        Fraud Transactions ({fraudTransactions.length})
      </h2>
      <div className="max-h-64 overflow-y-auto">
        {fraudTransactions.length === 0 ? (
          <p className="p-4 text-gray-500">No fraud detected yet</p>
        ) : (
          <ul>
            {fraudTransactions.map((tx, index) => (
              <li key={index} className="p-3 border-b hover:bg-red-50 transition-colors">
                <div className="flex justify-between">
                  <span className="font-medium">${tx.amount}</span>
                  <span className="text-sm text-red-600">Fraud</span>
                </div>
                <div className="text-sm text-gray-600">
                  User: {tx.userId?.substring(0, 6) ?? "Unknown"}...
                </div>
                <div className="text-xs text-gray-500 mt-1">{new Date().toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
