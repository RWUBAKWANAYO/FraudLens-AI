"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";

export default function HomePage() {
  const [result, setResult] = useState<any>(null);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload CSV, Excel, or PDF</h1>
      <FileUpload onUploadComplete={setResult} />

      {result && (
        <div className="mt-6 border rounded p-4 bg-gray-800">
          <h2 className="font-bold mb-2">Analysis Result</h2>
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}

