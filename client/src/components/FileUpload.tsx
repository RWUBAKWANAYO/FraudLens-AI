// components/FileUpload.tsx (updated)
import { useState } from "react";
import { useUploads } from "../context/UploadContext";
import TransactionForm from "./TransactionForm"; // Import the new form component

interface UploadResponse {
  uploadId: string;
  recordsAnalyzed: number;
  threats: any[];
  summary: any;
}

export default function FileUpload({ companyId }: { companyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "form">("file");
  const { activeUploads, isProcessing } = useUploads();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !companyId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyId", companyId);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/audit/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: process.env.NEXT_PUBLIC_TOKEN!,
        },
      });

      if (response.ok) {
        const data: UploadResponse = await response.json();
        console.log("Upload initiated:", data.uploadId);
        setFile(null);
      } else {
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const currentUploads = Array.from(activeUploads.values());

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Upload Transaction Data</h2>

      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "file" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("file")}
        >
          File Upload
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "form" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("form")}
        >
          Manual Entry
        </button>
      </div>

      {/* File Upload Tab */}
      {activeTab === "file" && (
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileChange}
              className="border p-2 rounded text-sm"
              disabled={isProcessing}
            />
            <button
              onClick={handleUpload}
              disabled={!file || isUploading || isProcessing}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 text-sm"
            >
              {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Upload File"}
            </button>
          </div>
          {file && <p className="text-sm text-gray-400">Selected: {file.name}</p>}
        </div>
      )}

      {/* Manual Entry Form Tab */}
      {activeTab === "form" && <TransactionForm companyId={companyId} />}

      {/* Processing Status (shared between both tabs) */}
      {isProcessing && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="font-semibold mb-2">Active Processing:</h3>
          {currentUploads.map((upload) => (
            <div key={upload.uploadId} className="mb-3 p-3 bg-gray-700 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium capitalize">
                  {upload.stage.replace("_", " ")}
                </span>
                <span className="text-sm">{upload.progress}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${upload.progress}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1 text-gray-400">{upload.message}</p>

              {upload.details && (
                <div className="text-xs text-gray-500 mt-1">
                  {upload.details.recordsProcessed && (
                    <span>
                      Records: {upload.details.recordsProcessed}/{upload.details.totalRecords}{" "}
                    </span>
                  )}
                  {upload.details.threatsFound !== undefined && (
                    <span>Threats: {upload.details.threatsFound} </span>
                  )}
                  {upload.details.currentBatch && (
                    <span>
                      Batch: {upload.details.currentBatch}/{upload.details.totalBatches}{" "}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isProcessing && currentUploads.length === 0 && (
        <p className="text-gray-500 text-sm">No active processing</p>
      )}
    </div>
  );
}
