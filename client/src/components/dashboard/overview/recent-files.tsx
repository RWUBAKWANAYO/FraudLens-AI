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
import { useUploads } from "@/hooks/useUploads";
import { StatusMessage } from "@/components/common/status-message";
import moment from "moment";
import Link from "next/link";

export function RecentFiles() {
  const {
    data: uploadedFiles,
    isLoading,
    error,
  } = useUploads({
    page: 1,
    limit: 5,
    sortOrder: "desc",
  });

  return (
    <div className="w-full bg-foreground rounded-lg p-6 h-full min-h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recently Uploaded Files</h2>
        <Link
          href={"/dashboard/upload/history"}
          className="colored-button text-colored-primary shadow-none bg-transparent font-semibold py-1.5 px-3 rounded-md text-sm"
        >
          View All
        </Link>
      </div>
      {(isLoading || error) && (
        <StatusMessage
          isLoading={isLoading}
          error={error}
          height={"calc(100% - 70px)"}
          classNames="bg-foreground items-center"
        />
      )}
      {uploadedFiles?.uploads.length === 0 && (
        <StatusMessage
          info="No files uploaded yet"
          height={"calc(100% - 70px)"}
          classNames="bg-foreground items-center"
        />
      )}
      {uploadedFiles?.uploads && uploadedFiles?.uploads.length > 0 && (
        <div className="overflow-hidden rounded-md border border-accent">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-tableHover">
              <TableRow className="border-accent text-primary">
                <TableHead className="py-4 text-primary font-bold">Name</TableHead>
                <TableHead className="py-4 text-primary font-bold">Type</TableHead>
                <TableHead className="py-4 text-primary font-bold">Size</TableHead>
                <TableHead className="py-4 text-primary font-bold">Completed At</TableHead>
                <TableHead className="py-4 text-primary font-bold">Records</TableHead>
                <TableHead className="py-4 text-primary font-bold">Threats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadedFiles?.uploads.map((file) => (
                <TableRow
                  key={file.id}
                  className="border-b font-normal border-accent hover:bg-tableHover transition-colors"
                >
                  <TableCell className="py-3 flex items-center gap-3">
                    {file.fileType === "application/pdf" && (
                      <Image
                        src={pdfFile}
                        alt="PDF File"
                        width={22}
                        height={22}
                        className="w-[22px]"
                      />
                    )}
                    {file.fileType === "text/csv" && (
                      <Image
                        src={csvFile}
                        alt="CSV File"
                        width={22}
                        height={22}
                        className="w-[22px]"
                      />
                    )}
                    {(file.fileType ===
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                      file.fileType === "xlsx") && (
                      <Image
                        src={xlsFile}
                        alt="XLSX File"
                        width={22}
                        height={22}
                        className="w-[22px]"
                      />
                    )}
                    {file.fileType === "application/json" && (
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
                  <TableCell className="py-3 uppercase">
                    {file.fileType ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      ? "XLSX"
                      : file.fileType}
                  </TableCell>
                  <TableCell className="py-3">{file.fileSize}</TableCell>
                  <TableCell className="py-3">
                    {moment(file.completedAt).format("yyyy-MM-DD HH:mm")}
                  </TableCell>
                  <TableCell className="py-3">{file._count?.records || "-"}</TableCell>
                  <TableCell className="py-3">{file._count?.threats || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
