import { useState } from "react";

interface UploadResponse {
  uploadId: string;
  recordsAnalyzed: number;
  threats: any[];
  summary: any;
}

export default function FileUpload({ companyId }: { companyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Upload Transaction Data</h2>
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {isUploading ? "Processing..." : "Upload"}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-900 rounded">
          <h3 className="font-semibold">Upload Results:</h3>
          <p>Records Analyzed: {result.recordsAnalyzed}</p>
          <p>Threats Detected: {result.threats.length}</p>
          <pre className="text-sm mt-2">{JSON.stringify(result.summary, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
