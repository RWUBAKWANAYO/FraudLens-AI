"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Socket } from "socket.io-client";

interface UploadProgress {
  uploadId: string;
  progress: number;
  stage: string;
  message: string;
  details?: any;
  timestamp: string;
}

interface UploadResult {
  uploadId: string;
  result: any;
  threats: any[];
  summary: any;
  timestamp: string;
}

interface UploadError {
  uploadId: string;
  error: string;
  timestamp: string;
}

interface UploadContextType {
  activeUploads: Map<string, UploadProgress>;
  completedUploads: Map<string, UploadResult>;
  failedUploads: Map<string, UploadError>;
  isProcessing: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({
  children,
  socket,
}: {
  children: React.ReactNode;
  socket: Socket | null;
}) {
  const [activeUploads, setActiveUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [completedUploads, setCompletedUploads] = useState<Map<string, UploadResult>>(new Map());
  const [failedUploads, setFailedUploads] = useState<Map<string, UploadError>>(new Map());

  // In your UploadContext
  useEffect(() => {
    if (!socket) return;

    const handleUploadProgress = (data: UploadProgress) => {
      console.log("Received upload_progress:", data); // Debug
      setActiveUploads((prev) => new Map(prev).set(data.uploadId, data));
    };

    const handleUploadComplete = (data: UploadResult) => {
      console.log("Received upload_complete:", data); // Debug
      setActiveUploads((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.uploadId);
        return newMap;
      });
      setCompletedUploads((prev) => new Map(prev).set(data.uploadId, data));
    };

    const handleUploadError = (data: UploadError) => {
      console.log("Received upload_error:", data); // Debug
      setActiveUploads((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.uploadId);
        return newMap;
      });
      setFailedUploads((prev) => new Map(prev).set(data.uploadId, data));
    };

    // Add listeners for other events if needed
    socket.on("alert", (data) => {
      console.log("Received alert:", data);
      // Handle alerts if needed
    });

    socket.on("threat_update", (data) => {
      console.log("Received threat_update:", data);
      // Handle threat updates if needed
    });

    socket.on("upload_progress", handleUploadProgress);
    socket.on("upload_complete", handleUploadComplete);
    socket.on("upload_error", handleUploadError);

    return () => {
      socket.off("upload_progress", handleUploadProgress);
      socket.off("upload_complete", handleUploadComplete);
      socket.off("upload_error", handleUploadError);
      socket.off("alert");
      socket.off("threat_update");
    };
  }, [socket]);

  const isProcessing = activeUploads.size > 0;

  return (
    <UploadContext.Provider
      value={{
        activeUploads,
        completedUploads,
        failedUploads,
        isProcessing,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUploads must be used within an UploadProvider");
  }
  return context;
}
