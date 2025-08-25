// components/SimilaritySearch.tsx
import { useState } from "react";

interface SimilarNeighbor {
  id: string;
  companyId: string;
  partner: string | null;
  amount: number | null;
  date: Date | null;
  distance: number;
}

export default function SimilaritySearch({ companyId }: { companyId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    local: SimilarNeighbor[];
    global: SimilarNeighbor[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // This endpoint would need to be implemented in your backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/audit/similarity-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId,
            text: query,
          }),
        }
      );

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Similarity Search</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter transaction description..."
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Similar in your company</h3>
            <div className="space-y-2">
              {results.local.map((item) => (
                <div key={item.id} className="p-3 border rounded">
                  <p className="font-medium">{item.partner}</p>
                  <p>Amount: {item.amount ? `$${item.amount.toFixed(2)}` : "N/A"}</p>
                  <p>Distance: {item.distance.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Similar globally</h3>
            <div className="space-y-2">
              {results.global.map((item) => (
                <div key={item.id} className="p-3 border rounded">
                  <p className="font-medium">{item.partner}</p>
                  <p>Amount: {item.amount ? `$${item.amount.toFixed(2)}` : "N/A"}</p>
                  <p>Distance: {item.distance.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
