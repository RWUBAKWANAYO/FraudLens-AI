"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Alert, UploadContextType, UploadProgress, UploadResult } from "./types";

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [activeUploads, setActiveUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [completedUploads, setCompletedUploads] = useState<Map<string, UploadResult>>(new Map());
  const [failedUploads, setFailedUploads] = useState<Map<string, UploadResult>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertSummary, setAlertSummary] = useState<Alert[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const { toast } = useToast();
  const { user } = useRequireAuth();
  const isProcessing = activeUploads.size > 0;

  const joinCompanyRoom = useCallback(
    (companyId: string, targetSocket?: Socket) => {
      const activeSocket = targetSocket ?? socket;
      if (activeSocket && activeSocket.connected) {
        console.log("Joining company room:", companyId);
        activeSocket.emit("join_company", companyId);
      }
    },
    [socket]
  );

  useEffect(() => {
    let newSocket: Socket | null = null;

    const initializeSocket = async () => {
      try {
        const { default: io } = await import("socket.io-client");
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

        if (!socketUrl) {
          console.error("Socket server URL not configured");
          return;
        }

        newSocket = io(socketUrl, {
          transports: ["websocket"],
          auth: { token: getAccessToken() },
        });

        newSocket.on("connect", () => {
          console.log("Connected to WebSocket server");
        });

        newSocket.on("disconnect", () => {
          console.log("Disconnected from WebSocket server");
        });

        newSocket.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error);
        });

        newSocket.on("upload_progress", (data: UploadProgress) => {
          setActiveUploads((prev) => new Map(prev).set(data.uploadId, data));
        });

        newSocket.on("alert", (data: any) => {
          const alert: Alert = {
            id: data.alertId,
            title: data.title || "New Alert",
            description: data.summary || "No description provided",
            severity: (data.severity as Alert["severity"]) || "medium",
            createdAt: data.timestamp || new Date().toISOString(),
            uploadId: data.uploadId,
            threatId: data.threatId,
          };
          setAlerts((prev) => [alert, ...prev.slice(0, 49)]);
        });

        newSocket.on("upload_complete", (data: UploadResult) => {
          setActiveUploads((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.uploadId);
            return newMap;
          });
          setCompletedUploads((prev) => new Map(prev).set(data.uploadId, data));

          const summary: Alert = {
            id: `upload-${data.uploadId}`,
            title: "Upload Analysis Complete",
            description: `Found ${data.threats.length} threats in ${data.summary.recordsAnalyzed} records`,
            severity: data.threats.length > 0 ? "high" : "low",
            createdAt: new Date().toISOString(),
            uploadId: data.uploadId,
          };
          setAlertSummary((prev) => [summary, ...prev.slice(0, 49)]);
        });

        newSocket.on("upload_error", (data) => {
          setFailedUploads((prev) => {
            console.error("Upload failed:", data);
            const newMap = new Map(prev).set(data.uploadId, data);
            return newMap;
          });

          toast({
            title: "Upload Failed",
            description: data.error || "Unknown error occurred",
            style: {
              background: "var(--foreground)",
              color: "var(--primary-red)",
              border: "1px solid var(--primary-red)",
            },
          });
        });

        newSocket.on("threat_detected", (threat: any) => {
          const threatAlert: Alert = {
            id: `threat-${threat.id}`,
            title: "Threat Detected",
            description: threat.description || "Potential fraud pattern detected",
            severity: "high",
            createdAt: new Date().toISOString(),
            threatId: threat.id,
            uploadId: threat.uploadId,
          };
          setAlerts((prev) => [threatAlert, ...prev.slice(0, 49)]);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error("Failed to initialize WebSocket:", error);
      }
    };

    initializeSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
        newSocket = null;
      }
    };
  }, [toast]);

  useEffect(() => {
    if (socket && user?.company?.id) {
      console.log("Joining company room:", user.company.id);
      socket.emit("join_company", user.company.id);
    }
  }, [socket, user?.company?.id]);

  useEffect(() => {
    if (user?.company?.id) {
      joinCompanyRoom(user.company.id);
    }
  }, [user?.company?.id, joinCompanyRoom]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setAlertSummary([]);
    setActiveUploads(new Map());
    setCompletedUploads(new Map());
    setFailedUploads(new Map());
  }, []);
  const dismissAlert = useCallback(
    (alertId: string) => setAlerts((prev) => prev.filter((alert) => alert.id !== alertId)),
    []
  );

  const value: UploadContextType = {
    activeUploads,
    completedUploads,
    failedUploads,
    isProcessing,
    alerts,
    alertSummary,
    clearAlerts,
    dismissAlert,
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
