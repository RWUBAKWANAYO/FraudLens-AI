"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import FileSelector from "@/components/dashboard/upload/create/file-select";
import FileProgress from "@/components/dashboard/upload/create/file-progress";
import { RealTimeAlerts } from "@/components/dashboard/upload/create/realtime-alert";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { UploadProvider, useUpload as useUploadContext } from "@/context/UploadContext";
import { useUpload } from "@/hooks/useUploads";

function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isFileAsynced, setIsFileAsynced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string | null>(null);

  const { user } = useRequireAuth();
  const { toast } = useToast();
  const { activeUploads, clearAlerts, failedUploads } = useUploadContext();
  const latestUpload = Array.from(activeUploads.values()).at(-1);

  const uploadMutation = useUpload();

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

  useEffect(() => {
    if (failedUploads.size > 0) {
      setProgress(0);
      setStage(null);
      setIsFileAsynced(false);
      clearAlerts();
    }
  }, [failedUploads]);

  const handleSubmit = () => {
    if (!file) return;

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

    uploadMutation.mutate(
      { file, companyId: user.company.id },
      {
        onSuccess: (data) => {
          if (data?.reuploadOf) {
            toast({
              title: "File already uploaded",
              description: `The file you are trying to upload is already uploaded for <${data.reuploadOf}>`,
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
        },
        onError: (_error) => {
          setProgress(0);
          setStage(null);
          setIsFileAsynced(false);
          clearAlerts();
        },
      }
    );
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
          disabled={!file || uploadMutation.isPending}
          size="lg"
          className="w-full bg-colored-primary colored-button text-white font-bold disabled:cursor-not-allowed"
        >
          {uploadMutation.isPending ? (
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
