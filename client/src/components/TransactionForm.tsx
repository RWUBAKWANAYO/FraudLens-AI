"use client";
import { useState } from "react";

type Props = {
  onSubmit: (amount: number) => void;
  onRequestNotification: () => void;
};

export default function TransactionForm({ onSubmit, onRequestNotification }: Props) {
  const [amount, setAmount] = useState(0);

  return (
    <div className="flex gap-2 mb-4">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Enter amount"
        className="border p-2 rounded flex-1"
      />
      <button
        onClick={() => onSubmit(amount)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Check Transaction
      </button>
      <button
        onClick={onRequestNotification}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Enable Notifications
      </button>
    </div>
  );
}
