"use client";

import { useState, useEffect } from "react";
import FileUpload from "../components/FileUpload";
import RealTimeAlerts from "../components/RealTimeAlerts";
import ThreatDashboard from "../components/ThreatDashboard";
import SimilaritySearch from "../components/SimilaritySearch";
import RuleManager from "../components/RuleManager";
import { UploadProvider } from "../context/UploadContext";
import io, { Socket } from "socket.io-client";
import UploadsList from "@/components/UploadsList";

interface Company {
  id: string;
  name: string;
  slug: string;
}

// Use the seeded company IDs directly
const SEEDED_COMPANIES: Company[] = [
  { id: "04e75f80-a2d9-418d-92e9-057eec3b76475", name: "Globex Inc", slug: "globex-inc" },
  { id: "00a57343-289e-43f9-b5f7-74133323467f", name: "Nayo Group", slug: "nayo-inc" },
  {
    id: "741ea1e3-00a5-4a3b-aec6-392fb99d5b8e",
    name: "Wayne Enterprises",
    slug: "wayne-enterprises",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedCompanyId, setSelectedCompanyId] = useState(SEEDED_COMPANIES[0].id);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    const newSocket = io(socketUrl || "", {
      transports: ["websocket", "polling"],
    });

    // Debug listeners
    newSocket.on("connect", () => {
      console.log("Connected to server with ID:", newSocket.id);
      // Join company room immediately after connection
      newSocket.emit("join_company", selectedCompanyId);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    // Listen for all events to debug
    newSocket.onAny((event, data) => {
      console.log("Received event:", event, data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []); // Keep this empty - we'll handle company changes separately

  // Handle company changes by rejoining the room
  useEffect(() => {
    if (socket && socket.connected) {
      console.log("Joining company:", selectedCompanyId);
      socket.emit("join_company", selectedCompanyId);
    }
  }, [selectedCompanyId, socket]);

  return (
    <UploadProvider socket={socket}>
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
                activeTab === "upload"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("upload")}
            >
              Upload Data
            </button>
            <button
              className={`px-4 py-2 font-medium whitespace-nowrap ${
                activeTab === "alerts"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("alerts")}
            >
              Real-time Alerts
            </button>
            <button
              className={`px-4 py-2 font-medium whitespace-nowrap ${
                activeTab === "uploads"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("uploads")}
            >
              Upload History
            </button>
            <button
              className={`px-4 py-2 font-medium whitespace-nowrap ${
                activeTab === "threats"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
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

            <div className={activeTab !== "uploads" ? "hidden" : ""}>
              <UploadsList companyId={selectedCompanyId} />
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
    </UploadProvider>
  );
}

