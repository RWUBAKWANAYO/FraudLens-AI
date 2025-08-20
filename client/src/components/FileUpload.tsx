"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  onUploadComplete: (data: any) => void;
};

export default function FileUpload({ onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const allowed = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/pdf",
      ];
      if (!allowed.includes(selected.type)) {
        setError("Only CSV, Excel or PDF files are allowed");
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError("No file selected");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/v1/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploadComplete(data);
    } catch (err: any) {
      setError(err.message || "Upload error");
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 text-center">
      <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400">
        <Upload className="w-10 h-10 text-gray-400 mb-2" />
        <span className="text-gray-600">
          {file ? file.name : "Click to upload or drag & drop file"}
        </span>
        <input type="file" onChange={handleFileChange} className="hidden" />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!file || loading}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" /> Uploading...
          </>
        ) : (
          "Upload & Analyze"
        )}
      </button>
    </form>
  );
}
