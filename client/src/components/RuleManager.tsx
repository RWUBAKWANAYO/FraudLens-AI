// components/RuleManager.tsx
import { useState, useEffect } from "react";

interface Rule {
  id: string;
  name: string;
  definition: any;
  enabled: boolean;
}

export default function RuleManager({ companyId }: { companyId: string }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("{}");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [companyId]);

  const fetchRules = async () => {
    try {
      // This endpoint would need to be implemented in your backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/rules?companyId=${companyId}`
      );
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    }
  };

  const createRule = async () => {
    try {
      setLoading(true);
      // This endpoint would need to be implemented in your backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          name,
          definition: JSON.parse(definition),
          enabled: true,
        }),
      });

      if (response.ok) {
        setName("");
        setDefinition("{}");
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      // This endpoint would need to be implemented in your backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/rules/${ruleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to update rule:", error);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Rule Management</h2>

      <div className="mb-6 p-4 border rounded-lg bg-gray-900">
        <h3 className="font-semibold mb-2">Create New Rule</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rule name"
            className="w-full border p-2 rounded"
          />
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Rule definition (JSON)"
            className="w-full border p-2 rounded font-mono text-sm"
            rows={4}
          />
          <button
            onClick={createRule}
            disabled={loading || !name || !definition}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            Create Rule
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Existing Rules</h3>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <h4 className="font-medium">{rule.name}</h4>
                <pre className="text-xs text-gray-600 mt-1">
                  {JSON.stringify(rule.definition, null, 2)}
                </pre>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id, !rule.enabled)}
                    className="sr-only"
                  />
                  <div
                    className={`block w-14 h-8 rounded-full ${
                      rule.enabled ? "bg-blue-400" : "bg-gray-400"
                    }`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
                      rule.enabled ? "transform translate-x-6" : ""
                    }`}
                  ></div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
