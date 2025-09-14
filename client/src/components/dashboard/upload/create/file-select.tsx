"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import claudUpload from "@/../public/assets/cloud-upload.svg";
import xlsFile from "@/../public/assets/xls-file.svg";
import csvFile from "@/../public/assets/csv-file.svg";
import jsonFile from "@/../public/assets/json-file.svg";

const ACCEPTED_FILE_TYPES = {
  "text/csv": ".csv",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/json": ".json",
};

type Props = {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
  isFileAsynced: boolean;
};

export default function FileSelector({
  file,
  onFileSelect,
  dragActive,
  setDragActive,
  isFileAsynced,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (Object.keys(ACCEPTED_FILE_TYPES).includes(droppedFile.type) ||
        Object.values(ACCEPTED_FILE_TYPES).some((ext) =>
          droppedFile.name.toLowerCase().endsWith(ext)
        ))
    ) {
      onFileSelect(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const getFilePreview = (file: File | null) => {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase();

    return (
      <div
        className={`flex items-center justify-between p-2 border shadow-sm rounded-lg ${
          ext === "csv"
            ? "border-primary-blue bg-shadow-blue text-primary-blue"
            : ext === "xls" || ext === "xlsx"
            ? "border-primary-green bg-shadow-green text-primary-green"
            : ext === "json"
            ? "border-primary-purple bg-shadow-purple text-primary-purple"
            : "border-accent-foreground bg-accent text-primary"
        }`}
      >
        <div className="flex items-center space-x-2">
          {ext === "csv" && <Image src={csvFile} alt="csv" className="w-7" />}
          {(ext === "xls" || ext === "xlsx") && <Image src={xlsFile} alt="xls" className="w-7" />}
          {ext === "json" && <Image src={jsonFile} alt="json" className="w-7" />}
          <span className="text-sm font-medium truncate">{file.name}</span>
        </div>
        <button onClick={removeFile} className="text-sm">
          <X className="w-4 h-4 hover:text-primary" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed border-colored-primary rounded-lg p-4 xl:p-6 text-center transition-colors hover:bg-colored-shadow hover:border-colored-primary",
          dragActive && "bg-colored-shadow hover:border-colored-primary"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.json"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          <div className="mx-auto w-[70px] xl:w-[90px] h-[70px] xl:h-[90px]">
            <Image src={claudUpload} alt="cloud-upload" className="w-full h-full" />
          </div>

          <div>
            <p className="text-base font-bold text-primary">Drop file here</p>
            <p className="text-sm font-bold text-primary-foreground mt-1">OR</p>
          </div>

          <Button
            type="button"
            size={"sm"}
            onClick={() => inputRef.current?.click()}
            className="bg-colored-primary colored-button text-white"
          >
            Upload File
          </Button>

          <p className="text-xs text-primary-foreground">
            Only CSV, XLS, XLSX and JSON files are supported
          </p>
        </div>
      </div>

      {file && !isFileAsynced && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">Selected File:</h3>
          {getFilePreview(file)}
        </div>
      )}
    </div>
  );
}
