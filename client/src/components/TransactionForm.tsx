import { useState } from "react";
import { useUploads } from "../contexts/UploadContext";

interface TransactionFormProps {
  companyId: string;
}

interface Transaction {
  txId: string;
  partner: string;
  amount: number;
  date: string;
  currency?: string;
  email?: string;
  description?: string;
  status?: string;
  [key: string]: any;
}

interface UploadResponse {
  uploadId: string;
  recordsAnalyzed: number;
  threats: any[];
  summary: any;
}

export default function TransactionForm({ companyId }: TransactionFormProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([
    { txId: "", partner: "", amount: 0, date: "", currency: "USD" },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const { isProcessing } = useUploads();

  const addTransaction = () => {
    setTransactions([
      ...transactions,
      { txId: "", partner: "", amount: 0, date: "", currency: "USD" },
    ]);
  };

  const removeTransaction = (index: number) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter((_, i) => i !== index));
    }
  };

  const updateTransaction = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...transactions];
    updated[index][field] = value;
    setTransactions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    const hasEmptyFields = transactions.some(
      (tx) => !tx.txId.trim() || !tx.partner.trim() || !tx.date.trim() || tx.amount <= 0
    );

    if (hasEmptyFields) {
      alert("Please fill in all required fields (Tx ID, Partner, Amount, Date)");
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/audit/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.NEXT_PUBLIC_TOKEN!,
        },
        body: JSON.stringify({
          data: transactions,
        }),
      });

      if (response.ok) {
        const data: UploadResponse = await response.json();
        console.log("Transactions uploaded:", data.uploadId);
        // Reset form
        setTransactions([{ txId: "", partner: "", amount: 0, date: "", currency: "USD" }]);
      } else {
        const error = await response.text();
        console.error("Upload failed:", error);
      }
    } catch (error) {
      console.error("Error uploading transactions:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (date: string) => {
    return date ? new Date(date).toISOString().split("T")[0] : "";
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <h3 className="text-lg font-semibold mb-4">Add Transactions Manually</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {transactions.map((transaction, index) => (
          <div key={index} className="p-4 border border-gray-600 rounded-lg bg-gray-750">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Transaction #{index + 1}</h4>
              {transactions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTransaction(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Required Fields */}
              <div>
                <label className="block text-sm font-medium mb-1">Transaction ID *</label>
                <input
                  type="text"
                  value={transaction.txId}
                  onChange={(e) => updateTransaction(index, "txId", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                  required
                  placeholder="TX12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Partner *</label>
                <input
                  type="text"
                  value={transaction.partner}
                  onChange={(e) => updateTransaction(index, "partner", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                  required
                  placeholder="Amazon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transaction.amount || ""}
                  onChange={(e) =>
                    updateTransaction(index, "amount", parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                  required
                  placeholder="99.99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={formatDate(transaction.date)}
                  onChange={(e) => updateTransaction(index, "date", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                  required
                />
              </div>

              {/* Optional Fields */}
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={transaction.currency || "USD"}
                  onChange={(e) => updateTransaction(index, "currency", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={transaction.email || ""}
                  onChange={(e) => updateTransaction(index, "email", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                  placeholder="customer@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={transaction.description || ""}
                  onChange={(e) => updateTransaction(index, "description", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                  placeholder="Purchase description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={transaction.status || ""}
                  onChange={(e) => updateTransaction(index, "status", e.target.value)}
                  className="w-full p-2 border border-gray-500 rounded bg-gray-700 text-white text-sm"
                >
                  <option value="">Select status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addTransaction}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
          >
            + Add Another Transaction
          </button>

          <button
            type="submit"
            disabled={isUploading || isProcessing}
            className="bg-green-600 text-white px-6 py-2 rounded disabled:bg-gray-400 text-sm"
          >
            {isUploading ? "Uploading..." : `Upload ${transactions.length} Transaction(s)`}
          </button>
        </div>

        <div className="text-xs text-gray-400 mt-3">
          <p>* Required fields</p>
          <p>Transactions will be processed in real-time for threat detection</p>
        </div>
      </form>
    </div>
  );
}
