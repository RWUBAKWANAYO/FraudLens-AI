"use client";

import { useState, useEffect } from "react";
import FileUpload from "../components/FileUpload";
import RealTimeAlerts from "../components/RealTimeAlerts";
import ThreatDashboard from "../components/ThreatDashboard";
import SimilaritySearch from "../components/SimilaritySearch";
import RuleManager from "../components/RuleManager";

interface Company {
  id: string;
  name: string;
  slug: string;
}

// Use the seeded company IDs directly
const SEEDED_COMPANIES: Company[] = [
  { id: "6a1b4af3-81a0-429d-8be3-e80169b0829f", name: "ACME Corporation", slug: "acme-corp" },
  { id: "f4f475aa-f0da-407d-ae45-0dd1fa5cc4ae", name: "Globex Inc", slug: "globex-inc" },
  {
    id: "bb97dc03-44f9-4020-a1ca-5f768aeda7de",
    name: "Wayne Enterprises",
    slug: "wayne-enterprises",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedCompanyId, setSelectedCompanyId] = useState(SEEDED_COMPANIES[0].id);

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Fraud Detection Dashboard</h1>

          <div className="flex items-center">
            <label htmlFor="company-select" className="mr-2">
              Company:
            </label>
            <select
              id="company-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="border rounded p-1"
            >
              {SEEDED_COMPANIES.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex border-b mb-6 overflow-x-auto">
          <button
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === "upload" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            Upload Data
          </button>
          <button
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === "alerts" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("alerts")}
          >
            Real-time Alerts
          </button>
          <button
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === "threats" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("threats")}
          >
            Threat Dashboard
          </button>
          <button
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === "similarity"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("similarity")}
          >
            Similarity Search
          </button>
          <button
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === "rules" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("rules")}
          >
            Rule Management
          </button>
        </div>

        <>
          <div className={activeTab !== "upload" ? "hidden" : ""}>
            <FileUpload companyId={selectedCompanyId} />
          </div>

          <div className={activeTab !== "alerts" ? "hidden" : ""}>
            <RealTimeAlerts companyId={selectedCompanyId} />
          </div>

          <div className={activeTab !== "threats" ? "hidden" : ""}>
            <ThreatDashboard companyId={selectedCompanyId} />
          </div>

          <div className={activeTab !== "similarity" ? "hidden" : ""}>
            <SimilaritySearch companyId={selectedCompanyId} />
          </div>

          <div className={activeTab !== "rules" ? "hidden" : ""}>
            <RuleManager companyId={selectedCompanyId} />
          </div>
        </>
      </main>
    </div>
  );
}

