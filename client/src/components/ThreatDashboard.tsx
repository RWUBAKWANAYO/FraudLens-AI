// components/ThreatDashboard.tsx
import { useState, useEffect } from "react";

interface Threat {
  id: string;
  threatType: string;
  description: string;
  confidenceScore: number;
  status: string;
  createdAt: string;
  record: {
    amount: number;
    partner: string;
    txId: string;
  } | null;
}

export default function ThreatDashboard({ companyId }: { companyId: string }) {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        // This endpoint would need to be implemented in your backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/threats?companyId=${companyId}`
        );
        const data = await response.json();
        setThreats(data);
      } catch (error) {
        console.error("Failed to fetch threats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreats();
  }, [companyId]);

  if (loading) return <div>Loading threats...</div>;

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Threat Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-400 p-4 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold text-red-700">Critical</h3>
          <p className="text-2xl font-bold">
            {threats?.filter((t) => t.confidenceScore >= 0.9).length}
          </p>
        </div>

        <div className="bg-orange-400 p-4 rounded-lg border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-700">High</h3>
          <p className="text-2xl font-bold">
            {threats?.filter((t) => t.confidenceScore >= 0.7 && t.confidenceScore < 0.9).length}
          </p>
        </div>

        <div className="bg-yellow-400 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-700">Medium</h3>
          <p className="text-2xl font-bold">
            {threats?.filter((t) => t.confidenceScore >= 0.5 && t.confidenceScore < 0.7).length}
          </p>
        </div>

        <div className="bg-blue-400 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-700">Total</h3>
          <p className="text-2xl font-bold">{threats.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Partner</th>
              <th className="px-4 py-2 text-left">Confidence</th>
              <th className="px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {threats.slice(0, 10).map((threat) => (
              <tr key={threat.id} className="border-b">
                <td className="px-4 py-2">{threat.threatType}</td>
                <td className="px-4 py-2">
                  {threat.record?.amount ? `$${threat.record.amount.toFixed(2)}` : "N/A"}
                </td>
                <td className="px-4 py-2">{threat.record?.partner || "N/A"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      threat.confidenceScore >= 0.9
                        ? "bg-red-100 text-red-800"
                        : threat.confidenceScore >= 0.7
                        ? "bg-orange-100 text-orange-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {(threat.confidenceScore * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-2">{new Date(threat.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
