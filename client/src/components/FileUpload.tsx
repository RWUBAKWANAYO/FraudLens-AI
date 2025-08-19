"use client";

import { useState, ChangeEvent, FormEvent } from "react";

type Props = {
  onUploadComplete: (data: any) => void; // return backend response
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="file" onChange={handleFileChange} />
      {file && <p>Selected: {file.name}</p>}
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {loading ? "Uploading..." : "Upload & Analyze"}
      </button>
    </form>
  );
}
