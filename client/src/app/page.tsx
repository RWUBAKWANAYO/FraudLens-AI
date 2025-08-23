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
  { id: "b2ff1b2a-7378-40bb-ab8c-7c89b0d45e8d", name: "ACME Corporation", slug: "acme-corp" },
  { id: "041cdcdc-37da-4b74-b1ad-23327dedee01", name: "Globex Inc", slug: "globex-inc" },
  {
    id: "2fa65061-ff5f-42c6-b0a6-a4685295eb49",
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

