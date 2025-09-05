"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import pdfFile from "@/../public/assets/pdf-file.svg";
import xlsFile from "@/../public/assets/xls-file.svg";
import csvFile from "@/../public/assets/csv-file.svg";
import jsonFile from "@/../public/assets/json-file.svg";
import Image from "next/image";

type UploadedFile = {
  fileId: string;
  fileName: string;
  fileType: "pdf" | "csv" | "xlsx" | "json";
  fileSize: string;
  startedAt: string;
  completedAt: string;
};

const uploadedFiles: UploadedFile[] = [
  {
    fileId: "UP-1001",
    fileName: "transactions_report.pdf",
    fileType: "pdf",
    fileSize: "2.3 MB",
    startedAt: "2025-09-01 09:15",
    completedAt: "2025-09-01 09:16",
  },
  {
    fileId: "UP-1002",
    fileName: "user_logins.csv",
    fileType: "csv",
    fileSize: "850 KB",
    startedAt: "2025-09-01 10:05",
    completedAt: "2025-09-01 10:05",
  },
  {
    fileId: "UP-1003",
    fileName: "financial_data.xlsx",
    fileType: "xlsx",
    fileSize: "4.7 MB",
    startedAt: "2025-09-02 14:22",
    completedAt: "2025-09-02 14:23",
  },
  {
    fileId: "UP-1004",
    fileName: "system_logs.json",
    fileType: "json",
    fileSize: "1.2 MB",
    startedAt: "2025-09-03 11:30",
    completedAt: "2025-09-03 11:31",
  },
  {
    fileId: "UP-1005",
    fileName: "employee_records.pdf",
    fileType: "pdf",
    fileSize: "3.5 MB",
    startedAt: "2025-09-03 15:47",
    completedAt: "2025-09-03 15:48",
  },
];

export function RecentFiles() {
  return (
    <div className="w-full bg-foreground rounded-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recently Uploaded Files</h2>
        <Button className="colored-button text-colored-primary shadow-none bg-transparent font-semibold">
          View All
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border border-accent">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-tableHover">
            <TableRow className="border-accent text-primary">
              <TableHead className="py-4 text-primary font-bold">File ID</TableHead>
              <TableHead className="py-4 text-primary font-bold">Name</TableHead>
              <TableHead className="py-4 text-primary font-bold">Type</TableHead>
              <TableHead className="py-4 text-primary font-bold">Size</TableHead>
              <TableHead className="py-4 text-primary font-bold">Started At</TableHead>
              <TableHead className="py-4 text-primary font-bold">Completed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploadedFiles.map((file) => (
              <TableRow
                key={file.fileId}
                className="border-b font-normal border-accent hover:bg-tableHover transition-colors"
              >
                <TableCell className="py-3">{file.fileId}</TableCell>
                <TableCell className="py-3 flex items-center gap-3">
                  {file.fileType === "pdf" && (
                    <Image
                      src={pdfFile}
                      alt="PDF File"
                      width={22}
                      height={22}
                      className="w-[22px]"
                    />
                  )}
                  {file.fileType === "csv" && (
                    <Image
                      src={csvFile}
                      alt="CSV File"
                      width={22}
                      height={22}
                      className="w-[22px]"
                    />
                  )}
                  {file.fileType === "xlsx" && (
                    <Image
                      src={xlsFile}
                      alt="XLSX File"
                      width={22}
                      height={22}
                      className="w-[22px]"
                    />
                  )}
                  {file.fileType === "json" && (
                    <Image
                      src={jsonFile}
                      alt="JSON File"
                      width={22}
                      height={22}
                      className="w-[22px]"
                    />
                  )}
                  {file.fileName}
                </TableCell>
                <TableCell className="py-3 uppercase">{file.fileType}</TableCell>
                <TableCell className="py-3">{file.fileSize}</TableCell>
                <TableCell className="py-3">{file.startedAt}</TableCell>
                <TableCell className="py-3">{file.completedAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
