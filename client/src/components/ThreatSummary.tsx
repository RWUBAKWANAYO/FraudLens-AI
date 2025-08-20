"use client";

type Props = {
  result: any;
};

export default function ThreatSummary({ result }: Props) {
  const { summary, threats } = result || {};
  const threatList = threats ?? []; // fallback to []

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Analysis Summary</h2>
        <p className="text-gray-600 mt-1">{summary?.message ?? "No summary available."}</p>
      </div>

      {/* Detailed Threats */}
      {threatList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Confidence</th>
                <th className="px-4 py-2">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {threatList.map((t: any, i: number) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{t.threatType}</td>
                  <td className="px-4 py-2">{t.amount ? `$${t.amount}` : "—"}</td>
                  <td className="px-4 py-2">
                    {t.confidenceScore ? `${(t.confidenceScore * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">✅ No suspicious activity detected.</p>
      )}
    </div>
  );
}
