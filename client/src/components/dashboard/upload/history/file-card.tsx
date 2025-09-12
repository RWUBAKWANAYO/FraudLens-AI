import { Button } from "@/components/ui/button";
import xlsFile from "@/../public/assets/xls-file.svg";
import csvFile from "@/../public/assets/csv-file.svg";
import jsonFile from "@/../public/assets/json-file.svg";
import pdfFile from "@/../public/assets/pdf-file.svg";
import Image from "next/image";
import { Download, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDownloadUpload } from "@/hooks/useUploads";
import { Upload } from "@/types/upload";
import { formatFileSize, downloadBlob } from "@/lib/file-utils";
import { useState } from "react";
import moment from "moment";

interface FileCardProps {
  upload: Upload;
}

export function FileCard({ upload }: FileCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadMutation = useDownloadUpload();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const blob = await downloadMutation.mutateAsync(upload.id);
      downloadBlob(blob, upload.fileName);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getFileExtension = (fileName: string): string => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  const getFileIcon = (fileType: string) => {
    const extension = getFileExtension(upload.fileName);
    return (
      <div className="flex items-center justify-center mb-3">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border">
          <span className="text-lg font-bold text-gray-600">{extension}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-foreground rounded-lg p-4 shadow border border-accent-foreground h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <Badge className="text-primary text-xs bg-accent-foreground px-2 py-1 shadow-none">
          {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
        </Badge>
        <Button
          className="w-8 h-8 p-0 bg-transparent border border-colored-primary shadow-none text-colored-primary colored-button"
          onClick={handleDownload}
          disabled={isDownloading || downloadMutation.isPending}
        >
          {isDownloading || downloadMutation.isPending ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-col items-center text-center flex-grow">
        <div className="flex items-center justify-center">
          {upload.fileType === "text/csv" && <Image src={csvFile} alt="csv" className="w-20" />}
          {(upload.fileType ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            upload.fileType === "xlsx") && <Image src={xlsFile} alt="xls" className="w-20" />}
          {upload.fileType === "application/json" && (
            <Image src={jsonFile} alt="json" className="w-20" />
          )}
          {upload.fileType === "application/pdf" && (
            <Image src={pdfFile} alt="pdf" className="w-20" />
          )}
        </div>

        <div className="my-4 space-y-4">
          <h3 className="font-bold text-sm text-primary truncate w-full">{upload.fileName}</h3>

          <span className="text-sm font-medium text-colored-primary">
            Record: {upload._count.records} , Threats: {upload._count.threats}
          </span>
        </div>
        <div className="flex items-center justify-between w-full text-sm text-primary-foreground">
          <span>{moment(upload.createdAt).format("YYYY-MM-DD")}</span>
          <span>{formatFileSize(upload.fileSize)}</span>
        </div>
      </div>
    </div>
  );
}
