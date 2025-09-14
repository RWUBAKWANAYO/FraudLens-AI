"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { DateRangePicker } from "@/components/common/date-range";
import { Pagination } from "@/components/common/pagination";
import { FileCard } from "@/components/dashboard/upload/history/file-card";
import { useUploads } from "@/hooks/useUploads";
import { UploadQueryParams } from "@/types/upload";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/common/status-message";
import { useDebounce } from "@/hooks/useDebounce";

const STATUS_OPTIONS = ["completed", "processing", "failed", "pending"];
const FILE_TYPE_OPTIONS = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "application/pdf",
];

export default function UploadHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [queryParams, setQueryParams] = useState<UploadQueryParams>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const {
    data: uploadsResponse,
    isLoading,
    error,
  } = useUploads({
    ...queryParams,
    search: debouncedSearchTerm || undefined,
  });

  const handleSearchInput = (search: string) => {
    setSearchTerm(search);
  };

  const handleSearch = useCallback((search: string) => {
    setQueryParams((prev) => ({
      ...prev,
      search: search || undefined,
      page: 1,
    }));
  }, []);

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, handleSearch]);

  const handleStatusFilter = (status: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: status === "all" ? undefined : status,
      page: 1,
    }));
  };

  const handleFileTypeFilter = (fileType: string) => {
    setQueryParams((prev) => ({
      ...prev,
      fileType: fileType === "all" ? undefined : fileType,
      page: 1,
    }));
  };

  const handleDateRangeChange = (range: { startDate?: Date; endDate?: Date }) => {
    setQueryParams((prev) => ({
      ...prev,
      startDate: range.startDate ? range.startDate.toISOString() : undefined,
      endDate: range.endDate ? range.endDate.toISOString() : undefined,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams((prev) => ({ ...prev, page }));
  };

  const handleSortChange = (sortBy: string) => {
    setQueryParams((prev) => ({
      ...prev,
      sortBy,
      page: 1,
    }));
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setQueryParams({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    searchTerm ||
    queryParams.status ||
    queryParams.fileType ||
    queryParams.startDate ||
    queryParams.endDate ||
    queryParams.sortBy !== "createdAt" ||
    queryParams.sortOrder !== "desc";

  if (isLoading || error) {
    return <StatusMessage isLoading={isLoading} error={error} height="calc(100vh - 120px)" />;
  }

  return (
    <div
      className="bg-foreground rounded-lg p-4 sm:p-6 flex flex-col"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {!isLoading && uploadsResponse?.uploads && (
        <div className="flex flex-col flex-grow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Uploaded File List</h2>
            {uploadsResponse?.uploads.length > 0 && (
              <Button
                onClick={clearAllFilters}
                className="colored-button bg-colored-primary text-white font-semibold "
                disabled={!hasActiveFilters}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
          {uploadsResponse?.uploads.length > 0 && (
            <div className="w-full flex flex-col xl:flex-row items-start xl:items-end justify-between gap-4 mt-4 mb-10">
              <DateRangePicker title="Date Range" onChange={handleDateRangeChange} />

              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full xl:w-auto">
                <div className="space-y-2">
                  <label className="text-sm font-semibold px-1">Status</label>
                  <Select value={queryParams.status || "all"} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-[150px] border-accent-foreground focus:border-colored-primary focus:ring-0">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground border-accent-foreground">
                      <SelectItem value="all">All Status</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold px-1">File Type</label>
                  <Select
                    value={queryParams.fileType || "all"}
                    onValueChange={handleFileTypeFilter}
                  >
                    <SelectTrigger className="w-[150px] border-accent-foreground focus:border-colored-primary focus:ring-0">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground border-accent-foreground">
                      <SelectItem value="all">All Types</SelectItem>
                      {FILE_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type ===
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            ? "XLSX"
                            : type.split("/")[1].toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold px-1">Sort By</label>
                  <Select
                    value={queryParams.sortBy || "createdAt"}
                    onValueChange={handleSortChange}
                  >
                    <SelectTrigger className="w-[150px] border-accent-foreground focus:border-colored-primary focus:ring-0">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="bg-foreground border-accent-foreground">
                      <SelectItem value="fileName">File Name</SelectItem>
                      <SelectItem value="fileType">File Type</SelectItem>
                      <SelectItem value="fileSize">File Size</SelectItem>
                      <SelectItem value="createdAt">Date Created</SelectItem>
                      <SelectItem value="completedAt">Date Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative flex-1 w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="pl-10 h-10 w-full xl:w-[200px] 2xl:w-[250px] border-accent-foreground focus:border-colored-primary focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {uploadsResponse.uploads.map((upload) => (
              <FileCard key={upload.id} upload={upload} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && uploadsResponse?.uploads.length === 0 && (
        <StatusMessage
          height="auto"
          classNames="flex-grow align-start mb-8"
          info="No uploads found."
        />
      )}

      {!isLoading && uploadsResponse && uploadsResponse.pagination.totalPages > 1 && (
        <Pagination
          currentPage={uploadsResponse.pagination.currentPage}
          totalPages={uploadsResponse.pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
