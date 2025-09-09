import { Button } from "@/components/ui/button";
import xlsFile from "@/../public/assets/xls-file.svg";
import csvFile from "@/../public/assets/csv-file.svg";
import jsonFile from "@/../public/assets/json-file.svg";
import pdfFile from "@/../public/assets/pdf-file.svg";
import Image from "next/image";
import { Download } from "lucide-react";

export interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size: string;
  date: string;
  fileType?: "csv" | "xls" | "xlsx" | "json" | "pdf";
  color?: string;
}

export function FileCard({ item }: { item: FileItem }) {
  return (
    <div className="bg-foreground rounded-lg p-4 shadow border border-accent-foreground">
      <div className="flex items-start justify-end mb-3">
        <Button className="w-8 h-8 p-0 bg-tableHover text-primary colored-button">
          <Download className="w-4 h-4 hover:text-primary" />
        </Button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="flex items-center justify-center mb-3">
          {item.fileType === "csv" && <Image src={csvFile} alt="csv" className="w-20" />}
          {(item.fileType === "xls" || item.fileType === "xlsx") && (
            <Image src={xlsFile} alt="xls" className="w-20" />
          )}
          {item.fileType === "json" && <Image src={jsonFile} alt="json" className="w-20" />}
          {item.fileType === "pdf" && <Image src={pdfFile} alt="pdf" className="w-20" />}
        </div>
        <h3 className="font-medium text-sm text-primary mt-4 mb-6 truncate w-full">{item.name}</h3>
        <div className="flex items-center justify-between w-full text-xs text-primary-foreground">
          <span>{item.size}</span>
          <span>{item.date}</span>
        </div>
      </div>
    </div>
  );
}
