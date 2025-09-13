"use client";

import { act, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import FileSelector from "@/components/dashboard/upload/create/file-select";
import FileProgress from "@/components/dashboard/upload/create/file-progress";
import { RealTimeAlerts } from "@/components/dashboard/upload/create/realtime-alert";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { api, getAccessToken } from "@/lib/api";
import { UploadProvider, useUpload } from "@/context/UploadContext";

function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFileAsynced, setIsFileAsynced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string | null>(null);
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const { activeUploads, clearAlerts } = useUpload();
  const latestUpload = Array.from(activeUploads.values()).at(-1);

  useEffect(() => {
    if (latestUpload) {
      if (latestUpload.stage === "complete") {
        setIsFileAsynced(false);
        setStage(null);
        setProgress(0);
        return;
      }
      setStage(latestUpload.stage);
      setProgress(latestUpload.progress);
    }
  }, [latestUpload]);

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      if (!user?.company?.id) {
        return toast({
          title: "Error",
          description: "Company you are uploading for does not exist",
          style: {
            background: "var(--foreground)",
            color: "var(--primary-red)",
            border: "1px solid var(--primary-red)",
          },
        });
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", user.company.id);

      const response = await api.post("/audit/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });

      if (response.data?.reuploadOf) {
        toast({
          title: "File already uploaded",
          description: `The file you are trying to upload is already uploaded for <${response.data.reuploadOf}>`,
          style: {
            background: "var(--foreground)",
            color: "var(--primary-red)",
            border: "1px solid var(--primary-red)",
          },
        });
      } else {
        setProgress(0);
        setStage("initial");
        setIsFileAsynced(true);
      }
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        style: {
          background: "var(--foreground)",
          color: "var(--primary-red)",
          border: "1px solid var(--primary-red)",
        },
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFileSelectHandler = (file: File | null) => {
    clearAlerts();
    setFile(file);
  };

  return (
    <div
      className="rounded-lg flex flex-col xl:flex-row gap-4 sm:gap-6"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      <div className="w-full space-y-4 bg-foreground rounded-lg p-4 sm:p-6 w-full xl:w-[500px]">
        <h2 className="text-lg font-bold">Upload & Send File</h2>

        <FileSelector
          file={file}
          onFileSelect={onFileSelectHandler}
          dragActive={dragActive}
          setDragActive={setDragActive}
          isFileAsynced={isFileAsynced}
        />

        <Button
          onClick={handleSubmit}
          disabled={!file || isSubmitting}
          size="lg"
          className="w-full h-12 bg-colored-primary colored-button text-white font-bold disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Upload className="w-6 h-6 mr-2 animate-bounce" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 mr-2" />
              Submit File {file ? `(1)` : ""}
            </>
          )}
        </Button>

        {isFileAsynced && (
          <FileProgress progress={progress} stage={stage} latestUpload={latestUpload} />
        )}
      </div>
      <div className="bg-foreground rounded-lg p-4 sm:p-6 flex-1">
        <h2 className="text-lg font-bold mb-4 px-2">Real Time Alerts</h2>
        <RealTimeAlerts />
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <UploadProvider>
      <FileUpload />
    </UploadProvider>
  );
}
