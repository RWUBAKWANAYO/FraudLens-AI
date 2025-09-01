import { useState, useEffect } from "react";
import { useUploads } from "../contexts/UploadContext";

interface Alert {
  id: string;
  title: string;
  summary: string;
  severity: string;
  createdAt: string;
  uploadId?: string;
}

export default function RealTimeAlerts({ companyId }: { companyId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { completedUploads } = useUploads();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/audit/alerts?companyId=${companyId}`, {
      headers: {
        Authorization: process.env.NEXT_PUBLIC_API_KEY!,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data?.data);
      })
      .catch((err) => console.error("Failed to load alerts:", err));
  }, [companyId]);

  useEffect(() => {
    const newAlerts: Alert[] = [];
    completedUploads.forEach((upload) => {
      upload.threats.forEach((threat: any) => {
        newAlerts.push({
          id: threat.id,
          title: `Threat detected in upload ${upload.uploadId}`,
          summary: threat.description || "No description",
          severity: "high",
          createdAt: new Date().toISOString(),
          uploadId: upload.uploadId,
        });
      });
    });

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev.slice(0, 19)]);
    }
  }, [completedUploads]);

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Real-time Alerts & Results</h2>
        <span className="text-sm text-green-500">{completedUploads.size} completed uploads</span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded border-l-4 ${
              alert.severity === "critical"
                ? "border-red-500 bg-red-400"
                : alert.severity === "high"
                ? "border-orange-500 bg-orange-400"
                : "border-yellow-500 bg-yellow-400"
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{alert.title}</h3>
              <span className="text-xs text-gray-500">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm mt-1">{alert.summary}</p>
            {alert.uploadId && (
              <p className="text-xs text-gray-600 mt-1">Upload: {alert.uploadId}</p>
            )}
          </div>
        ))}

        {alerts.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No alerts yet. Upload some data to get started.
          </p>
        )}
      </div>

      {/* Show upload results summary */}
      {completedUploads.size > 0 && (
        <div className="mt-6 p-4 bg-gray-700 rounded">
          <h3 className="font-semibold mb-2">Recent Upload Results</h3>
          {Array.from(completedUploads.values()).map((upload) => (
            <div key={upload.uploadId} className="mb-3 p-3 bg-gray-600 rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm">Upload {upload.uploadId.slice(0, 8)}</span>
                <span className="text-sm">{upload.result.recordsAnalyzed} records</span>
              </div>
              <div className="text-sm mt-1">{upload.summary.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
