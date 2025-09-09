"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import FileSelector from "@/components/dashboard/upload/create/file-select";
import FileProgress from "@/components/dashboard/upload/create/file-progress";
import { RealTimeAlerts } from "@/components/dashboard/upload/create/realtime-alert";

const MOCK_STAGES = [
  { label: "Uploading file...", progress: 20 },
  { label: "Analyzing data...", progress: 50 },
  { label: "Detecting fraud patterns...", progress: 80 },
  { label: "Finalizing...", progress: 100 },
];

export default function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setProgress(0);
    setStage("Starting...");

    let i = 0;
    const interval = setInterval(() => {
      if (i < MOCK_STAGES.length) {
        setStage(MOCK_STAGES[i].label);
        setProgress(MOCK_STAGES[i].progress);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          alert(`Fraud analysis completed for ${file.name}!`);
          setFile(null);
          setIsSubmitting(false);
          setProgress(0);
          setStage(null);
        }, 1000);
      }
    }, 3000);
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
          onFileSelect={setFile}
          dragActive={dragActive}
          setDragActive={setDragActive}
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
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 mr-2" />
              Submit File {file ? `(1)` : ""}
            </>
          )}
        </Button>

        {isSubmitting && <FileProgress progress={progress} stage={stage} />}
      </div>
      <div className="w-full space-y-4 bg-foreground rounded-lg p-4 sm:p-6 flex-1">
        <h2 className="text-lg font-bold">Real Time Alerts</h2>
        <RealTimeAlerts />
      </div>
    </div>
  );
}
