"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import ThreatSummary from "@/components/ThreatSummary";

export default function HomePage() {
  const [result, setResult] = useState<any>(null);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Fraud & Anomaly Detector</h1>
          <p className="text-gray-600 mt-2">
            Upload CSV, Excel, or PDF transaction data for automated anomaly detection.
          </p>
        </header>

        {/* Upload */}
        <section className="bg-white p-6 rounded-2xl shadow-md">
          <FileUpload onUploadComplete={setResult} />
        </section>

        {/* Results */}
        {result && (
          <section className="bg-white p-6 rounded-2xl shadow-md">
            <ThreatSummary result={result} />
          </section>
        )}
      </div>
    </main>
  );
}

