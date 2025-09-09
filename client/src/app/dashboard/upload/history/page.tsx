"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { DateRangePicker } from "@/components/common/date-range";
import { Pagination } from "@/components/common/pagination";
import { FileCard, FileItem } from "@/components/dashboard/upload/history/file-card";

const files: FileItem[] = [
  {
    id: "6",
    name: "Shopping_list",
    type: "file",
    size: "1 MB",
    date: "12.07.2019",
    fileType: "csv",
    color: "bg-blue-500",
  },
  {
    id: "7",
    name: "Design_brief",
    type: "file",
    size: "150 KB",
    date: "12.07.2019",
    fileType: "pdf",
    color: "bg-blue-500",
  },
  {
    id: "8",
    name: "Prices",
    type: "file",
    size: "1 MB",
    date: "12.07.2019",
    fileType: "xls",
    color: "bg-green-500",
  },
  {
    id: "9",
    name: "01_project_description",
    type: "file",
    size: "150 MB",
    date: "12.07.2019",
    fileType: "json",
    color: "bg-red-500",
  },
  {
    id: "10",
    name: "02_project_description",
    type: "file",
    size: "160 MB",
    date: "12.07.2019",
    fileType: "csv",
    color: "bg-red-500",
  },
  {
    id: "6",
    name: "Shopping_list",
    type: "file",
    size: "1 MB",
    date: "12.07.2019",
    fileType: "csv",
    color: "bg-blue-500",
  },
  {
    id: "7",
    name: "Design_brief",
    type: "file",
    size: "150 KB",
    date: "12.07.2019",
    fileType: "pdf",
    color: "bg-blue-500",
  },
  {
    id: "8",
    name: "Prices",
    type: "file",
    size: "1 MB",
    date: "12.07.2019",
    fileType: "xls",
    color: "bg-green-500",
  },
  {
    id: "9",
    name: "01_project_description",
    type: "file",
    size: "150 MB",
    date: "12.07.2019",
    fileType: "json",
    color: "bg-red-500",
  },
  {
    id: "10",
    name: "02_project_description",
    type: "file",
    size: "160 MB",
    date: "12.07.2019",
    fileType: "csv",
    color: "bg-red-500",
  },
];

export default function UploadHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSort, setFileSort] = useState("allFile");
  const [page, setPage] = useState(1);

  return (
    <div
      className="bg-foreground rounded-lg p-4 sm:p-6 flex flex-col gap-4"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      <h2 className="text-lg font-bold">Uploaded File List</h2>
      <div className="w-full flex-grow space-y-8 overflow-auto">
        <div className="w-full flex flex-col xl:flex-row items-start xl:items-end justify-between gap-4">
          <DateRangePicker
            title="Date Range"
            startDate={new Date("2025-06-01")}
            endDate={new Date("2025-06-10")}
            onChange={(range) => {
              console.log("Range changed:", range);
            }}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full xl:w-fit">
            <div className="space-y-3">
              <label className="text-sm font-medium px-1">Sort By</label>
              <Select value={fileSort} onValueChange={setFileSort}>
                <SelectTrigger className="w-[200px] bg-foreground border-accent-foreground focus:border-colored-primary focus:ring-colored-primary">
                  <SelectValue placeholder="All File" />
                </SelectTrigger>
                <SelectContent className="bg-foreground border-accent-foreground">
                  <SelectItem value="allFile">All File</SelectItem>
                  <SelectItem value="fileName">File Name</SelectItem>
                  <SelectItem value="fileType">File Type</SelectItem>
                  <SelectItem value="fileSize">File Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 w-full xl:w-80 bg-foreground border-accent-foreground focus:border-colored-primary focus-visible:ring-colored-primary"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <FileCard key={file.id} item={file} />
          ))}
        </div>
      </div>
      <Pagination currentPage={page} totalPages={60} onPageChange={setPage} />
    </div>
  );
}
